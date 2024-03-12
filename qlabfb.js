/* eslint-disable no-useless-escape */
import OSC from 'osc'
import { runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { compileActionDefinitions } from './actions.js'
import { compileFeedbackDefinitions } from './feedbacks.js'
import { compilePresetDefinitions } from './presets.js'
import { compileVariableDefinition } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { GetConfigFields } from './config.js'
import Cue from './cues.js'
import Workspace from './workspaces.js'
import * as Choices from './choices.js'

function cueToStatusChar(cue) {
	if (cue.isBroken) return '\u2715'
	if (cue.isAuditioning) return '\u2772\u23F5\u2773'
	if (cue.isRunning) return '\u23F5'
	if (cue.isPaused) return '\u23F8'
	if (cue.isLoaded) return '\u23FD'
	return '\u00b7'
}

/**
 * Returns the passed integer left-padded with '0's
 * Will truncate result length is greater than 'len'
 * @param {Number} num - number to pad
 * @param {Number} [len=2] - optional length of result, defaults to 2
 * @since 2.3.0
 */
function pad0(num, len = 2) {
	const zeros = '0'.repeat(len)
	return (zeros + num).slice(-len)
}

var crc16b = function (data) {
	const POLY = 0x8408
	const XOROUT = 0
	let crc = 0 // INIT

	for (let i = 0; i < data.length; i++) {
		crc = crc ^ data[i]
		for (let j = 0; j < 8; j++) {
			crc = crc & 1 ? (crc >> 1) ^ POLY : crc >> 1
		}
	}
	return (crc ^ XOROUT) & 0xffff
}

class QLabInstance extends InstanceBase {
	qCueRequest = [
		{
			type: 's',
			value:
				'["number","uniqueID","listName","type","mode","isPaused","duration","actionElapsed","parent",' +
				'"flagged","notes","autoLoad","colorName","isRunning","isAuditioning","isLoaded","armed",' +
				'"isBroken","continueMode","percentActionElapsed","cartPosition","infiniteLoop","holdLastFrame"]',
		},
	]
	fb2check = ['q_run', 'qid_run', 'any_run', 'q_armed','qid_armed', 'q_bg', 'qid_bg']

	constructor(internal) {
		super(internal)

		this.instanceOptions.disableVariableValidation = true
		this.connecting = false
		this.needPasscode = false
		this.useTCP = false
		this.qVer = 4
		this.hasError = false
		this.disabled = true
		this.pollCount = 0
		this.wrongPasscode = ''
		this.loggedErrors = []

		this.resetVars()
	}

	logError(e) {
		if (!this.loggedErrors.includes(e)) {
			this.log('info', `Address "${e}" returned an error`)
			this.loggedErrors.push(e)
			this.setVariableValues({ 'errs': this.loggedErrors.length })
		}
	}

	applyConfig(config) {
		let ws = config.workspace || 'default'
		let cl = config.cuelist || 'default'

		if (config.cuelist == undefined) {
			config.cuelist = cl
		}

		if (config.workspace == undefined) {
			config.workspace = ws
		}

		if (ws !== '' && ws !== 'default') {
			this.ws = '/workspace/' + ws
		} else {
			this.ws = ''
		}

		if (cl !== '' && cl !== 'default') {
			this.cl = cl
		} else {
			this.cl = ''
		}

		if (config.useTCP == undefined) {
			config.useTCP = true
		}

		this.useTCP = config.useTCP
		this.exposeVariables = config.exposeVariables || false
	}

	resetVars(doUpdate) {
		// play head info
		this.nextCue = ''
		// most recent running cue
		this.runningCue = new Cue()

		// clear 'variables'
		if (doUpdate && this.useTCP) {
			let newValues = {}

			for (const [cue, cueObj] of Object.entries(this.wsCues)) {
				let qNum = cueObj.qNumber.replace(/[^\w\.]/gi, '_')
				let qName = cueObj.qName
				let qID = cueObj.uniqueID
				if (qName && qNum) {
					delete this.cueColors[qNum]
					newValues['q_' + qNum + '_name'] = undefined
				}

				newValues['id_' + qID + '_name'] = undefined
			}

			this.setVariableValues(newValues)
		}
		// need a valid QLab reply
		this.needWorkspace = true
		this.needPasscode = false

		// list of cues and info for this QLab workspace
		this.wsCues = {}
		this.cueColors = {}
		this.cueOrder = []
		this.cueByNum = {}
		this.cueList = {}
		this.wsList = {}
		this.requestedCues = {}
		this.overrides = {}
		this.lastRunID = '-' + this.lastRunID
		this.showMode = false
		this.liveFadePreview = false
		this.audition = false
		this.goDisabled = false
		this.goAfter = 0
		this.minGo = 0
		this.checkFeedbacks()
		this.updateQVars()
		this.updateNextCue()
		this.updatePlaying()
		this.wrongPasscode = ''
		this.wrongPasscodeAt = 0
		this.loggedErrors = []
		this.selectedCues = []
	}

	updateNextCue() {
		const nc = this.wsCues[this.nextCue] || new Cue()

		this.setVariableValues({
			n_id: nc.uniqueID,
			n_name: nc.qName,
			n_num: nc.qNumber,
			n_type: nc.qType,
			n_notes: nc.Notes,
			n_stat: cueToStatusChar(nc),
			n_cont: ['NoC', 'Con', 'Fol'][nc.continueMode],
		})
		this.checkFeedbacks('playhead_bg')
	}
	updateQVars(q) {
		q = q || new Cue()

		const qID = q.uniqueID
		const qNum = q.qNumber.replace(/[^\w\.]/gi, '_')
		const qType = q.qType
		const qColor = q.qColor
		let oqNum = null
		let oqName = null
		let oqType = null
		let oqColor = 0
		let oqOrder = -1

		let variableValues = {}
		let variableDefs = []
		let oldVariables = []

		// unset old variable?
		if (qID in this.wsCues) {
			oqNum = this.wsCues[qID].qNumber.replace(/[^\w\.]/gi, '_')
			oqName = this.wsCues[qID].qName
			oqType = this.wsCues[qID].qType
			oqColor = this.wsCues[qID].qColor
			oqOrder = this.wsCues[qID].qOrder
			if (oqNum != '' && oqNum != q.qNumber) {
				// cue number changed
				let vId = `q_${oqNum}_name`
				variableValues[vId] = undefined
				oldVariables.push(vId)
				this.cueColors[oqNum] = 0
				delete this.cueByNum[oqNum]
				oqName = ''
			}
		}
		// set new value
		if ((q.uniqueID != '' && q.qName != oqName) || qColor != oqColor) {
			if (qNum != '') {
				let vId = `q_${qNum}_name`
				variableValues[vId] = q.qName
				variableDefs.push({
					variableId: vId,
					name: `Name of cue number '${qNum}'`,
				})
				this.cueColors[qNum] = q.qColor
				this.cueByNum[qNum] = qID
			}
			let vId = `id_${qID}_name`
			variableValues[vId] = q.qName
			variableDefs.push({ variableId: vId, name: `Name of cue ID ${qID}` })

			this.checkFeedbacks(this.fb2check)
		}

		if (this.exposeVariables) {
			if (variableDefs.length) {
				//remove old qNum's
				this.variableDefs.filter((variableId) => {
					return !oldVariables.includes(variableId)
				})
				this.variableDefs = [...this.variableDefs, ...variableDefs]
				this.setVariableDefinitions(this.variableDefs)
			}
		}
		this.setVariableValues(variableValues)
	}

	updateRunning() {
		const tenths = this.config.useTenths ? 0 : 1
		const rc = this.runningCue

		const tElapsed = rc.duration * rc.pctElapsed

		const ehh = pad0(Math.floor(tElapsed / 3600))
		const emm = pad0(Math.floor(tElapsed / 60) % 60)
		const ess = pad0(Math.floor(tElapsed % 60))

		let eft = ''

		if (ehh > 0) {
			eft = ehh + ':'
		}
		if (emm > 0) {
			eft = eft + emm + ':'
		}
		eft = eft + ess

		let tLeft = rc.duration * (1 - rc.pctElapsed)
		if (tLeft > 0) {
			tLeft += tenths
		}

		const hh = pad0(Math.floor(tLeft / 3600))
		const mm = pad0(Math.floor(tLeft / 60) % 60)
		const ss = pad0(Math.floor(tLeft % 60))
		let ft = ''

		if (hh > 0) {
			ft = hh + ':'
		}
		if (mm > 0) {
			ft = ft + mm + ':'
		}
		ft = ft + ss

		if (tenths == 0) {
			const f = Math.floor((tLeft - Math.trunc(tLeft)) * 10)
			const ms = pad0(f, 1)
			if (tLeft < 5 && tLeft != 0) {
				ft = ft.slice(-1) + '.' + ms
			}
		}

		this.setVariableValues({
			r_id: rc.uniqueID,
			r_name: rc.qName,
			r_num: rc.qNumber,
			r_notes: rc.Notes,

			r_stat: cueToStatusChar(rc),

			r_hhmmss: hh + ':' + mm + ':' + ss,
			r_hh: hh,
			r_mm: mm,
			r_ss: ss,
			r_left: ft,
			e_hhmmss: ehh + ':' + emm + ':' + ess,
			e_hh: ehh,
			e_mm: emm,
			e_ss: ess,
			e_time: eft,
		})

		this.checkFeedbacks('run_bg', 'any_run')
	}
	async configUpdated(config) {
		this.config = config
		this.applyConfig(config)

		this.resetVars()
		this.init_osc()
		this.init_actions()
		this.init_presets()
		this.init_variables()
		this.init_feedbacks()
	}

	async init(config) {
		this.config = config

		this.disabled = false
		this.updateStatus(InstanceStatus.Connecting)

		await this.configUpdated(config)
	}
	init_actions() {
		this.setActionDefinitions(compileActionDefinitions(this))
	}
	init_presets() {
		this.setPresetDefinitions(compilePresetDefinitions(this))
	}
	init_feedbacks() {
		if (this.useTCP) {
			this.setFeedbackDefinitions(compileFeedbackDefinitions(this))
		} else {
			this.setFeedbackDefinitions({})
		}
	}
	init_variables() {
		if (this.useTCP) {
			this.variableDefs = compileVariableDefinition(this)
			this.setVariableDefinitions(this.variableDefs)
			this.updateRunning()
			this.updateNextCue()
		} else {
			this.setVariableDefinitions([])
		}
	}
	/**
	 * Sends an OSC command to QLab
	 * @param {string} node - OSC Node/Address
	 * @param {Object[]} [arg] - optional arguments
	 * @param {string} arg.type - type ('s','i','f')
	 * @param {any} arg.value - value
	 * @param {boolean} [bare=false] - if true, do not add workspace id prefix to command
	 * @since 2.0.0
	 */
	sendOSC(node, arg, bare) {
		const ws = bare ? '' : this.ws

		if (!this.useTCP) {
			const host = ''
			if (this.config.host !== undefined && this.config.host !== '') {
				host = this.config.host
			}
			if (this.config.passcode !== undefined && this.config.passcode !== '') {
				this.oscSend(host, 53000, ws + '/connect', {
					type: 's',
					value: this.config.passcode,
				})
			}
			this.oscSend(host, 53000, ws + node, arg)
		} else if (this.ready) {
			this.qSocket.send({
				address: ws + node,
				args: arg,
			})
		}
	}
	connect() {
		if (!this.hasError) {
			this.updateStatus(InstanceStatus.Connecting)
		}
		if (!this.disabled) {
			this.init_osc()
		}
	}
	/**
	 * Get current status of QLab cues and playhead
	 * query for workspace/application settings
	 * @param {string} ws - specific workspace ID
	 */
	prime_vars(ws) {
		if (this.needPasscode && !this.config.passcode) {
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Need a Passcode')
			this.log('debug', 'waiting for passcode')
			this.sendOSC('/connect', [])
			if (this.timer !== undefined) {
				clearTimeout(this.timer)
				this.timer = undefined
			}
			if (this.pulse !== undefined) {
				clearInterval(this.pulse)
				this.pulse = undefined
			}
			this.timer = setTimeout(() => {
				this.prime_vars(ws)
			}, 5000)
		} else if (this.needWorkspace && this.ready) {
			this.sendOSC('/version', [], true) // app global, not workspace
			this.sendOSC('/workspaces', [], true)
			if (this.config.passcode) {
				if (
					this.config.passcode != this.wrongPasscode ||
					Date.now() - this.wrongPasscodeAt > 15000
				) {
					this.log('debug', 'sending passcode to ' + this.config.host)
					this.sendOSC('/connect', [
						{
							type: 's',
							value: this.config.passcode,
						},
					])
				}
			} else {
				this.sendOSC('/connect', [])
			}
			if (this.timer !== undefined) {
				clearTimeout(this.timer)
				this.timer = undefined
			}
			this.timer = setTimeout(() => {
				this.prime_vars(ws)
			}, 5000)
		} else if (this.wrongPasscode == '') {
			// should have a workspace now
			this.ws = ws

			// request variable/feedback info
			// get list of running cues
			this.sendOSC('/cue/playhead/uniqueID', [])
			this.sendOSC('/updates', [])
			this.sendOSC('/updates', [
				{
					type: 'i',
					value: 1,
				},
			])

			this.sendOSC('/cueLists', [])
			if (this.qVer < 5) {
				this.sendOSC('/auditionWindow', [], true)
			} else {
				this.sendOSC('/alwaysAudition', [], true)
				this.sendOSC('/auditionMonitors', [], true)
			}
			this.sendOSC('/overrideWindow', [], true)
			this.sendOSC('/showMode', [])
			this.sendOSC('/liveFadePreview', [], true)
			this.sendOSC('/settings/general/minGoTime')
			for (const o in Choices.OVERRIDE) {
				this.sendOSC('/overrides/' + Choices.OVERRIDE[o].id, [], true)
			}
			if (this.timer !== undefined) {
				clearTimeout(this.timer)
				this.timer = undefined
			}
		}
	}

	/**
	 * heartbeat/poll function for 'updates' that aren't automatic
	 */
	rePulse() {
		const now = Date.now()
		const phID = this.qVer < 5 ? 'Id' : 'ID'

		if (0 == this.pollCount % (this.config.useTenths ? 10 : 4)) {
			this.sendOSC('/overrideWindow', [], true)

			this.sendOSC((this.cl ? '/cue/' + this.cl : '') + `/playhead${phID}`, [])

			if (5 == this.qVer) {
				this.sendOSC('/alwaysAudition', [], true)
				this.sendOSC('/auditionMonitors', [], true)
				this.sendOSC('/selectedCues', [], true)
			}
			if (4 == this.qVer) {
				this.sendOSC('/auditionWindow', [], true)
			}
			if (3 == this.qVer) {
				this.sendOSC('/showMode', [])
			}
		}
		this.pollCount++

		if (Object.keys(this.requestedCues).length > 0) {
			let variableValues = {}
			const checkFeedbacks = []
			const timeOut = now - 500
			for (let k in this.requestedCues) {
				if (this.requestedCues[k] < timeOut) {
					// no response from QLab for at least 500ms
					// so delete the cue from our list
					const cueObj = this.wsCues[k]
					if (cueObj) {
						// QLab sometimes sends 'reload the whole cue list'
						// so a cue we were waiting for may have been moved/deleted between checks
						const qNum = cueObj.qNumber.replace(/[^\w\.]/gi, '_')
						const qName = cueObj.qName
						if (qNum && qName) {
							delete this.cueColors[qNum]
							variableValues['q_' + qNum + '_name'] = undefined
						}
						variableValues['id_' + cueObj.uniqueID + '_name'] = undefined
						checkFeedbacks.push(...this.fb2check)
					}
					delete this.requestedCues[k]
				}
			}

			this.setVariableValues(variableValues)
			if (checkFeedbacks.size > 0) {
				this.checkFeedbacks(...checkFeedbacks)
			}
		}

		if (this.goDisabled && this.goAfter < now) {
			this.goDisabled = false
			this.checkFeedbacks('min_go')
		}

		let rc = this.runningCue
		if (rc && rc.pctElapsed > 0) {
			if (3 == this.qVer) {
				this.sendOSC('/runningOrPausedCues', [])
			} else {
				this.sendOSC('/cue/active/valuesForKeys', this.qCueRequest)
			}
		}
	}

	init_osc() {
		const ws = this.ws

		if (this.connecting) {
			return
		}

		if (this.qSocket) {
			this.ready = false
			this.qSocket.close()
			delete this.qSocket
		}

		if (this.config.host) {
			if (this.useTCP) {
				this.qSocket = new OSC.TCPSocketPort({
					localAddress: '0.0.0.0',
					localPort: 0, // 53000 + this.port_offset,
					address: this.config.host,
					port: this.config.port,
					metadata: true,
				})
				this.connecting = true
			} else {
				this.qSocket = new OSC.UDPPort({
					localAddress: '0.0.0.0',
					// QLab only sends UDP responses to port 53001
					localPort: 53001, // 53000 + this.port_offset,
					remoteAddress: this.config.host,
					remotePort: 53000,
					metadata: true,
				})
				this.updateStatus(InstanceStatus.Ok, 'UDP Mode')
			}

			this.qSocket.open()

			this.qSocket.on('error', (err) => {
				this.log('debug', 'Error: ' + err)
				this.connecting = false
				if (!this.hasError) {
					this.log('error', 'Error: ' + err.message)
					this.updateStatus(InstanceStatus.UnknownError, "Can't connect to QLab " + err.message)
					this.hasError = true
				}
				if (err.code == 'ECONNREFUSED') {
					if (this.qSocket) {
						this.qSocket.removeAllListeners()
					}
					if (this.timer !== undefined) {
						clearTimeout(this.timer)
					}
					if (this.pulse !== undefined) {
						clearInterval(this.pulse)
						this.pulse = undefined
					}
					this.timer = setTimeout(() => {
						this.connect()
					}, 5000)
				}
			})

			this.qSocket.on('close', () => {
				if (!this.hasError && this.ready) {
					this.log('error', 'TCP Connection to QLab Closed')
				}
				this.connecting = false
				if (this.ready) {
					this.needWorkspace = true
					this.needPasscode = false
					this.resetVars(true)
					// the underlying socket issues a final close after
					// the OSC socket is closed, which gets deleted on 'destroy'
					if (this.qSocket != undefined) {
						this.qSocket.removeAllListeners()
					}
					this.log('debug', 'Connection closed')
					this.ready = false
					if (this.disabled) {
						this.updateStatus(InstanceStatus.Disconnected, 'Disabled')
					} else {
						this.updateStatus(InstanceStatus.Disconnected, 'CLOSED')
					}
				}
				if (this.timer !== undefined) {
					clearTimeout(this.timer)
					this.timer = undefined
				}
				if (this.pulse !== undefined) {
					clearInterval(this.pulse)
					this.pulse = undefined
				}
				if (!this.disabled) {
					// don't restart if instance was disabled
					this.timer = setTimeout(() => {
						this.connect()
					}, 5000)
				}
				this.hasError = true
			})

			this.qSocket.on('ready', () => {
				this.ready = true
				this.connecting = false
				this.hasError = false
				this.log('info', 'Connected to QLab:' + this.config.host)
				if (this.useTCP) {
					this.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
					this.needWorkspace = true
					this.prime_vars(ws)
				} else {
					this.needWorkspace = false
					this.qSocket.send({
						address: '/version',
						args: [],
					})
				}
			})

			this.qSocket.on('message', (message, timetag, info) => {
				//this.log('debug', 'received ' + JSON.stringify(message) + `from ${this.qSocket.options.address}`)
				if (message.address.match(/^\/update\//)) {
					// debug("readUpdate");
					this.readUpdate(message)
				} else if (message.address.match(/^\/reply\//)) {
					// debug("readReply");
					this.readReply(message)
				} else {
					this.log('debug', message.address + ' ' + JSON.stringify(message.args))
				}
			})
		}
		// this.qSocket.on("data", (data) => {
		// 	debug ("Got",data, "from",this.qSocket.options.address);
		// });
	}
	/**
	 * update list cues
	 */
	updateCues(jCue, stat, ql) {
		// list of useful cue types we're interested in
		const qTypes = [
			'audio',
			'mic',
			'video',
			'camera',
			'text',
			'light',
			'fade',
			'network',
			'midi',
			'midi file',
			'timecode',
			'group',
			'start',
			'stop',
			'pause',
			'load',
			'reset',
			'devamp',
			'goto',
			'target',
			'cart',
			'cue list',
			'arm',
			'disarm',
			'wait',
			'memo',
			'script',
		]
		let q = {}

		if (Array.isArray(jCue)) {
			const idCount = {}
			const dupIds = false
			for (let i = 0; i < jCue.length; i++) {
				q = new Cue(jCue[i], this)
				q.qOrder = i
				if (ql) {
					q.qList = ql
					if (!this.cueList[ql]) {
						this.cueList[ql] = []
					}
				}
				if (stat == 'u') {
					if (!this.cueList[ql].includes(q.uniqueID)) {
						this.cueList[ql].push(q.uniqueID)
					}
				} else {
					if (q.uniqueID in idCount) {
						idCount[q.uniqueID] += 1
						dupIds = true
					} else {
						idCount[q.uniqueID] = 1
					}

					if (qTypes.includes(q.qType)) {
						this.updateQVars(q)
						this.wsCues[q.uniqueID] = q
					}
					if (stat == 'l') {
						this.cueOrder[i] = q.uniqueID
						if (ql) {
							this.cueList[ql].push(q.uniqueID)
						}
					}
				}
				delete this.requestedCues[q.uniqueID]
			}
			this.checkFeedbacks(...this.fb2check)
			if (dupIds) {
				this.updateStatus(InstanceStatus.UnknownWarning, 'Multiple cues\nwith the same cue_id')
			}
		} else {
			q = new Cue(jCue, this)
			if (qTypes.includes(q.qType)) {
				this.updateQVars(q)
				this.wsCues[q.uniqueID] = q
				if (3 == this.qVer) {
					// QLab3 seems to send cue lists as 'group' cues
					if ('group' == q.qType) {
						if (!this.cueList[q.uniqueID]) this.cueList[q.uniqueID] = []
					}
				} else {
					// a 'cart' is a special 'cue list'
					if (['cue list', 'cart'].includes(q.qType)) {
						if (!this.cueList[q.uniqueID]) {
							this.cueList[q.uniqueID] = []
						} else {
							this.sendOSC('/cue_id/' + q.uniqueID + '/children', [])
						}
					}
				}
				this.checkFeedbacks(...this.fb2check)
				this.updatePlaying()
				if (
					'' == this.cl ||
					(this.cueList[this.cl] && this.cueList[this.cl].includes(q.uniqueID))
				) {
					if (q.uniqueID == this.nextCue) {
						this.updateNextCue()
					}
				}
			}
			delete this.requestedCues[q.uniqueID]
		}
	}
	/**
	 * update list of running cues
	 */
	updatePlaying() {
		function qState(q) {
			return crc16b(JSON.stringify(q))
			// let ret = q.uniqueID + ':'
			// ret += q.isBroken ? '0' : q.isRunning ? '1' : q.isPaused ? '2' : q.isLoaded ? '3' : q.isAuditioning ? '4' : 5
			// ret += ':' + q.duration + ':' + q.pctElapsed
			// return ret
		}

		let hasGroup = false
		let hasDuration = false
		const cl = this.cl
		const cues = this.wsCues
		const lastRun = qState(this.runningCue)
		let runningCues = []

		for (const cue in cues) {
			//		Object.keys(cues).forEach((cue) => {
			const q = cues[cue]
			// some cuelists (for example all manual slides) may not have a pre-programmed duration
			if (q.isRunning || q.isPaused) {
				if (
					('' == cl && 'cue list' != q.qType) ||
					(this.cueList[cl] && this.cueList[cl].includes(cue))
				) {
					runningCues.push([cue, q.startedAt])
					// if group does not have a duration, ignore
					// it is probably a playlist, not simultaneous playback
					hasGroup = hasGroup || (q.qType == 'group' && q.duration > 0)
					hasDuration = hasDuration || q.duration > 0
				}
			}
		} //)

		runningCues.sort((a, b) => b[1] - a[1])

		if (runningCues.length == 0) {
			this.runningCue = new Cue()
			this.checkFeedbacks('any_run')
		} else {
			let i = 0
			if (hasGroup) {
				while (i < runningCues.length && cues[runningCues[i][0]].qType != 'group') {
					i += 1
				}
			} else if (hasDuration) {
				while (i < runningCues.length && cues[runningCues[i][0]].duration == 0) {
					i += 1
				}
			}
			if (i < runningCues.length) {
				this.runningCue = cues[runningCues[i][0]]
				// to reduce network traffic, the query interval logic only asks for running 'updates'
				// if the playback elapsed is > 0%. Sometimes, the first status response of a new running cue
				// is exactly when the cue starts, with 0% elapsed and the countdown timer won't run.
				// Set a new cue with 0% value to 1 here to cause at least one more query to see if the cue is
				// actually playing.
				if (0 == this.runningCue.pctElapsed) {
					this.runningCue.pctElapsed = 1
				}
			}
		}
		// update if changed
		if (qState(this.runningCue) != lastRun) {
			this.updateRunning(true)
		}
	}
	updateSelectedCues(c) {
		let newHash = crc16b(JSON.stringify(c))
		if (this.lastSel == newHash) {
			return // no changes since last run
		}
		let newSel = []
		// collect all unique IDs
		const subq = (q) => {
			newSel.push(q.uniqueID)
			q.cues.forEach(subq)
		}
		c.forEach(subq)

		// let sel = newSel.filter((qId) => {
		// 	return !!this.wsCues[qId]
		// })

		// newSel = sel

		// set 'isSelected'
		for (const id of newSel) {
			if (!this.wsCues[id]) {
				this.wsCues[id] = new Cue()
			}
			this.sendOSC(`/cue_id/${id}/valuesForKeys`, this.qCueRequest)
			this.requestedCues[id] = Date.now()
			this.wsCues[id].isSelected = true
		}

		// remove anything not 'selected' anymore
		for (const id of this.selectedCues) {
			if (!newSel.includes(id)) {
				if (this.wsCues[id]) this.wsCues[id].isSelected = false
			}
		}
		this.selectedCues = newSel
		this.lastSel = newHash
	}
	/**
	 * process QLab 'update'
	 */
	readUpdate(message) {
		const ws = this.ws
		const ma = message.address
		const ms = ma.split('/').slice(1)

		/**
		 * A QLab 'update' message is just the uniqueID for a cue where something 'changed'.
		 * We have to request any other information we need (name, number, isRunning, etc.)
		 */

		switch (ms.slice(-1)[0]) {
			case 'playbackPosition':
				const cl = ms[3]
				if (message.args.length > 0) {
					const oa = message.args[0].value
					if (this.cl) {
						// if a cue is inserted, QLab sends playback changed cue
						// before sending the new cue's id update, insert this id into
						// the cuelist just in case so the playhead check will find it until then
						if (!this.cueList[cl].includes(oa)) {
							this.cueList[cl].push(oa)
						}
					}
					if ((this.cl == '' || cl == this.cl) && oa !== this.nextCue) {
						// playhead changed
						this.nextCue = oa
						this.log('debug', 'playhead: ' + oa)
						this.sendOSC('/cue_id/' + oa + '/valuesForKeys', this.qCueRequest)
						this.requestedCues[oa] = Date.now()
					}
					break
				}
			case '[root group of cue lists]':
				this.sendOSC('/doubleGoWindowRemaining')
				break
			case 'disconnect':
				this.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
				this.needWorkspace = true
				this.needPasscode = false
				this.lastRunID = 'x'
				if (this.pulse != undefined) {
					clearInterval(this.pulse)
					this.pulse = undefined
				}
				this.resetVars(true)
				this.prime_vars(ws)
				break
			case 'general':
				// ug. 8 more bytes and they could have sent the 'new' value :(
				this.sendOSC('/settings/general/minGoTime')
				break
			case 'overrides':
				for (const o in Choices.OVERRIDE) {
					this.sendOSC('/overrides/' + Choices.OVERRIDE[o].id, [], true)
				}
				break
			case 'dashboard': // lighting, ignore for now
				break
			default:
				if (ms.length == 3 && 'workspace' == ms[1]) {
					// update to 'workspace'
					this.sendOSC('/showMode', [])
					this.sendOSC('/auditionWindow', [], true)
					this.sendOSC('/overrideWindow', [], true)
				} else if ('cue_id' == ms[3]) {
					// get cue information for 'updated' cue
					const node = '/' + ms.slice(1).join('/') + '/valuesForKeys'
					const uniqueID = ms[4]
					this.sendOSC(node, this.qCueRequest, true)
					// save info request time to verify a response.
					// QLab sends an update when a cue is deleted
					// but fails to respond to a request for info.
					// If there is no response after a few pulses
					// we delete our copy of the cue
					this.requestedCues[uniqueID] = Date.now()
				} else {
					this.log('debug', `====> unknown OSC message: ${ma} ` + JSON.stringify(message.args))
				}
		}
	}
	/**
	 * process QLab 'reply'
	 */
	readReply(message) {
		let ws = this.ws
		const ma = message.address
		const mn = ma.split('/').slice(1)
		let j = {}
		const i = 0
		const cl = this.cl
		const qr = this.qCueRequest

		try {
			j = JSON.parse(message.args[0].value)
		} catch (error) {
			/* ingnore errors */
		}

		if ('error' == j.status) {
			this.logError(j.address)
			return
			// qlab 5.3+ returns an error when asked '/cue/active/valuesForKeys'
			// if no cue is active.
		}
		switch (
			mn.slice(-1)[0] // last segment of address
		) {
			case 'workspaces':
				this.wsList = {}
				if (j.data.length == 0) {
					this.needPasscode = false
					this.wrongPasscode = ''
					this.needWorkspace = true
					this.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
				} else {
					for (const w of j.data) {
						ws = new Workspace(w)
						this.wsList[ws.uniqueID] = ws
					}
					this.setVariableValues({ ws_id: Object.keys(this.wsList)[0] })
				}
				break
			case 'connect':
				if (['badpass', 'denied'].includes(j.data)) {
					if (!this.needPasscode) {
						this.needPasscode = true
						this.updateStatus(InstanceStatus.ConnectionFailure, 'Wrong Passcode')
						this.wrongPasscode = this.config.passcode
						this.wrongPasscodeAt = Date.now()
						this.prime_vars(ws)
					}
				} else if (j.data == 'error') {
					this.needPasscode = false
					this.needWorkspace = true
					this.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
				} else if (j.data.slice(0, 2) == 'ok') {
					this.needPasscode = false
					this.needWorkspace = false
					this.wrongPasscode = ''
					this.updateStatus(InstanceStatus.Ok, 'Connected to ' + this.host)
				}
				break
			case 'updates':
				// only works on QLab > 3
				if ('denied' != j.status) {
					this.needWorkspace = false
					this.updateStatus(InstanceStatus.Ok, 'Connected to QLab')
					if (this.pulse !== undefined) {
						this.log('debug', 'cleared stray interval (u)')
						clearInterval(this.pulse)
					}
					this.pulse = setInterval(
						() => {
							this.rePulse()
						},
						this.config.useTenths ? 100 : 250,
					)
				}
				break
			case 'version':
				if (j.data != undefined) {
					this.qVer = parseInt(j.data)
					this.setVariableValues({ q_ver: j.data })
				}
				if (3 == this.qVer) {
					// QLab3 always has a 'workspace' (it may be empty)
					if (this.pulse !== undefined) {
						this.log('debug', 'cleared stray interval (v)')
						clearInterval(this.pulse)
					}
					this.pulse = setInterval(
						() => {
							this.rePulse()
						},
						this.config.useTenths ? 100 : 250,
					)
				} else {
					this.needWorkspace = this.qVer > 3 && this.useTCP
				}
				break
			case 'uniqueID':
				if (j.data) {
					this.nextCue = j.data
					this.updateNextCue()
					this.sendOSC('/cue/playhead/valuesForKeys', qr)
				}
				break
			case 'selectedCues': // selected cues
				if (j.data) {
					this.updateSelectedCues(j.data)
				}
				break
			case 'playheadId': // pre q5
			case 'playheadID': // q5
				if (j.data) {
					const playheadId = j.data
					const uniqueID = j.data // ma.substr(14, 36)
					delete this.requestedCues[uniqueID]
					if ((cl == '' || uniqueID == cl) && this.nextCue != playheadId) {
						// playhead changed due to cue list change in QLab
						if (playheadId == 'none') {
							this.nextCue = ''
						} else {
							this.nextCue = playheadId
						}
						this.updateNextCue()
						this.sendOSC('/cue_id/' + j.data + '/children')
					}
				}
				break
			case 'cueLists':
				if (j.data) {
					for (const i in j.data) {
						const q = j.data[i]
						this.updateCues(q, 'l')
						this.updateCues(q.cues, 'l', q.uniqueID)
					}
					// QLab 5.3+ returns error if no que is active/playing
					// this.sendOSC('/cue/active/valuesForKeys', qr)
				}
				break
			case 'children':
				if (j.data) {
					let uniqueID = ma.substr(14, 36)
					this.updateCues(j.data, 'u', uniqueID)
				}
				break
			case 'runningOrPausedCues':
				if (j.data != undefined) {
					for (const i in j.data) {
						const q = j.data[i]
						this.sendOSC('/cue_id/' + q.uniqueID + '/valuesForKeys', qr)
					}
				}
				break
			case 'valuesForKeys':
				this.updateCues(j.data, 'v')
				delete this.requestedCues[j.data.uniqueID]
				break
			case 'showMode':
				if (this.showMode != j.data) {
					this.showMode = j.data
					this.checkFeedbacks('ws_mode')
				}
				break
			case 'liveFadePreview':
				if (this.liveFadePreview != j.data) {
					this.liveFadePreview = j.data
					this.checkFeedbacks('liveFadePreview')
				}
			case 'auditionWindow': // pre q5
			case 'alwaysAudition': // q5
				if (this.auditMode != j.data) {
					this.auditMode = j.data
					this.checkFeedbacks('ws_mode')
				}
				break
			case 'auditionMonitors': // q5
				if (this.auditMonitors != j.data) {
					this.auditMonitors = j.data
					this.checkFeedbacks('ws_audit')
				}
				break
			case 'overrideWindow':
				if (this.overrideWindow != j.data) {
					this.overrideWindow = j.data
					this.checkFeedbacks('override_visible')
				}
				break
			case 'minGoTime':
				this.minGo = j.data
				this.setVariableValues({ min_go: (Math.round(j.data * 100) / 100).toFixed(2) })
				break
			case 'doubleGoWindowRemaining':
				const goLeft = Math.round(j.data * 1000)
				this.goDisabled = goLeft > 0
				this.goAfter = Date.now() + goLeft
				this.checkFeedbacks('min_go')
				break
			case 'armed':
				let cue_id = j.address.split('/')[4]
				if ('cue' == j.address.split('/')[3]) {
					cue_id = this.cueByNum[cue_id]
				}
				this.wsCues[cue_id].isArmed = j.data
				this.checkFeedbacks('q_armed')
				break

			default:
				if ('overrides' == mn[1]) {
					this.overrides[mn[2]] = j.data
					this.checkFeedbacks('override')
				} else {
					this.log('debug', `====> unknown OSC message: ${ma} ` + JSON.stringify(message.args))
				}
		}
	}

	// Return config fields for web config
	getConfigFields() {
		return GetConfigFields(this)
	}

	// When module gets deleted
	async destroy() {
		this.disabled = true
		this.resetVars(true)
		if (this.timer !== undefined) {
			clearTimeout(this.timer)
			delete this.timer
		}
		if (this.pulse !== undefined) {
			clearInterval(this.pulse)
			delete this.pulse
		}
		if (this.qSocket) {
			this.ready = false
			this.qSocket.close()
			delete this.qSocket
		}
	}
}

runEntrypoint(QLabInstance, UpgradeScripts)
