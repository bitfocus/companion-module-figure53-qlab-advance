/* eslint-disable no-useless-escape */
import OSC from 'osc'
import { runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { compileActionDefinitions } from './actions.js'
import { compileFeedbackDefinitions } from './feedbacks.js'
import { compilePresetDefinitions } from './presets.js'
import { compileVariableDefinition } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { GetConfigFields } from './config.js'
import { pad0, crc16b, cueToStatusChar, cleanCueNumber } from './common.js'
import Cue from './cues.js'
import Workspace from './workspaces.js'
import * as Choices from './choices.js'

class QLabInstance extends InstanceBase {
	qCueRequest = [
		{
			type: 's',
			value:
				'["number","uniqueID","listName","type","mode","isPaused","duration","actionElapsed", "preWait", "postWait","parent",' +
				'"flagged","notes","autoLoad","colorName","isRunning","isAuditioning","isLoaded","armed",' +
				'"isBroken","continueMode","percentActionElapsed","cartPosition","infiniteLoop","holdLastFrame"]',
		},
	]
	fb2check = ['q_run', 'qid_run', 'any_run', 'q_armed', 'q_bg', 'qid_bg', 'q_flagged', 'q_paused']
	otherVars = {
		name: { desc: 'Name', id: 'qName', type: 's' },
		elapsed: { desc: 'Elapsed time', id: 'elapsed', type: 'n' },
		id: { desc: 'Unique ID', id: 'uniqueID', type: 's' },
		num: { desc: 'Cue Number', id: 'qNumber', type: 's' },
	}
	// list of useful cue types we're interested in
	qTypes = [
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
	cueListActions = ['go', 'next', 'panic', 'panicInTime', 'previous', 'reset', 'stop', 'togglePause']

	constructor(internal) {
		super(internal)

		this.instanceOptions.disableVariableValidation = true
		this.connecting = false
		this.needPasscode = false
		this.passcodeOK = false
		this.useTCP = false
		this.qVer = 5
		this.phID = 'ID'
		this.hasError = false
		this.disabled = true
		this.pollCount = 0
		this.wrongPasscode = ''
		this.loggedErrors = []
		this.debugLevel = process.env.DEVELOPER ? 2 : 0

		this.resetVars()
	}

	logError(e) {
		if (e != '/showMode' && !this.loggedErrors.includes(e)) {
			this.log('info', `Address "${e}" returned an error`)
			this.loggedErrors.push(e)
			this.setVariableValues({ errs: this.loggedErrors.length })
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

	resetVars(doUpdate = false) {
		// play head info
		this.nextCue = ''
		// most recent running cue
		this.runningCue = new Cue()

		// clear 'variables'
		if (doUpdate && this.useTCP) {
			this.init_variables()
		}
		// need a valid QLab reply
		this.needWorkspace = true
		this.needPasscode = false
		this.passcodeOK = false

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
			n_preWait: nc.preWait,
			n_postWait: nc.postWait,
			n_elapsed: nc.elapsed,
			n_cont: ['NoC', 'Con', 'Fol'][nc.continueMode],
		})
		this.checkFeedbacks('playhead_bg')
	}
	updateQVars(q) {
		q = q || new Cue()

		const qID = q.uniqueID
		const qNum = cleanCueNumber(q.qNumber)
		const qName = q.qName
		const qType = q.qType
		const qColor = q.qColor
		const qElapsed = q.elapsed
		const qSelected = q.isSelected
		let oqNum = null
		let oqName = null
		let oqType = null
		let oqColor = 0
		let oqOrder = -1
		let oqElapsed = 0
		let oqSelected = false

		let variableValues = {}
		let variableDefs = []
		let oldVariables = []

		const oq = this.wsCues[qID]

		// update existing cue?
		if (oq?.qNumber) {
			oqNum = cleanCueNumber(oq.qNumber)
			oqName = oq.qName
			oqType = oq.qType
			oqColor = oq.qColor
			oqOrder = oq.qOrder
			oqElapsed = oq.elapsed
			oqSelected = oq.isSelected
			if (oqNum != '' && oqNum != qNum) {
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
		if (qID != '' && (qName != oqName || qColor != oqColor || qElapsed != oqElapsed)) {
			if (q.isPaused) {
				q.elapsed = Math.max(q.elapsed, oqElapsed ? oqElapsed : 0)
				q.pctElapsed = Math.max(q.pctElapsed, oq.pctElapsed ? oq.pctElapsed : 0)
			}

			for (const [varName, info] of Object.entries(this.otherVars)) {
				if (qNum != '' && varName != 'num') {
					let vId = `q_${qNum}_${varName}`
					variableValues[vId] = q[info.id] || (info.type == 's' ? '' : 0) // .qName
					variableDefs.push({
						variableId: vId,
						name: `${info.desc} of cue number '${qNum}'`,
					})
					this.cueColors[qNum] = q.qColor
					this.cueByNum[qNum] = qID
				}
				if (varName != 'id') {
					let vId = `id_${qID}_${varName}`
					variableValues[vId] = q[info.id] || (info.type == 's' ? '' : 0) // .qName
					variableDefs.push({ variableId: vId, name: `${info.desc} of cue ID '${qID}'` })
				}
			}
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
		// rc.elapsed not reliable as 'groups' update until duration then stop
		// cue 'elapsed' time is total time and can be multiples of duration if cue is looped
		// TRT is in 'e_total'

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

		let tLeft = rc.duration - tElapsed // * (1 - rc.pctElapsed)
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
			r_secs: tLeft,

			e_hhmmss: ehh + ':' + emm + ':' + ess,
			e_hh: ehh,
			e_mm: emm,
			e_ss: ess,
			e_time: eft,
			e_secs: tElapsed,
			e_total: rc.elapsed,
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
	 * Sends a command to QLab
	 * @param {Object} action - action object from callback
	 * @param {string} cmd - OSC command address to send to QLab
	 * @param {Object[]} args - optional OSC arguments to command
	 * @param {string} args.type - OSC argument type 's','i','f', etc.
	 * @param {object} args.value - OSC argument value, should match type
	 */
	sendCommand = async (action, cmd, args, no_cueList) => {
		args = args ?? []
		no_cueList = no_cueList ?? false
		let global = ['/auditionWindow', '/alwaysAudition', '/overrideWindow'].includes(cmd)

		// some actions will pre-attach a cue list ID, which may be different than the module config cue list
		if (!no_cueList && this.cl && this.cueListActions.includes(action.actionId)) {
			cmd = '/cue_id/' + this.cl + cmd
		}

		if (this.useTCP && !this.ready) {
			this.log('debug', `Not connected to ${this.config.host}`)
		} else if (cmd !== undefined) {
			this.log('debug', `sending ${cmd} ${JSON.stringify(args)} to ${this.config.host}`)
			// everything except 'auditionWindow' and 'overrideWindow' works on a specific workspace
			this.sendOSC(cmd, args, global)
		}
		// QLab does not send window updates so ask for status
		if (this.useTCP && global) {
			this.sendOSC(cmd, [], true)
			//this.sendOSC('/cue/playhead/valuesForKeys', this.qCueRequest)
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
	sendOSC(node, arg = [], bare) {
		const ws = bare ? '' : this.ws == 'default' ? '' : this.ws

		if (!this.useTCP) {
			let host = ''
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
			this.debugLevel > 0 && this.log('debug', `OSC>> ${ws + node}` + JSON.stringify(arg))
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
		if (this.needPasscode && this.config.passcode == '' && this.wrongPasscodeAt == 0) {
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Need a Passcode')
			this.log('debug', 'Workspace needs a passcode')
			this.wrongPasscode = null
			this.wrongPasscodeAt = Date.now()
			//this.sendOSC('/connect', [])
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
			if (this.config.passcode != '') {
				if (this.config.passcode != this.wrongPasscode) {
					this.log('debug', 'sending passcode to ' + this.config.host)
					this.sendOSC('/connect', [
						{
							type: 's',
							value: this.config.passcode,
						},
					])
					this.sendOSC('/showMode', [])
					this.passcodeOK = false
					this.wrongPasscode = ''
					this.needPasscode = true
					this.wrongPasscodeAt = Date.now()
				}
			} else if (this.wrongPasscodeAt == 0) {
				this.passcodeOK = true
				this.sendOSC('/connect', [])
			}
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
		} else if (this.wrongPasscode == '' && this.passcodeOK) {
			// should have a workspace now
			this.ws = ws

			// request variable/feedback info
			// get list of running cues
			this.sendOSC((this.cl ? '/cue_id/' + this.cl : '') + `/playhead${this.phID}`, [])
			this.sendOSC('/updates', [])
			this.sendOSC('/updates', [
				{
					type: 'i',
					value: 1,
				},
			])

			this.sendOSC('/cueLists', [])
			this.sendOSC('/selectedCues/uniqueIDs', [], true)

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

		if (0 == this.pollCount % (this.config.useTenths ? 10 : 4)) {
			this.sendOSC('/overrideWindow', [], true)

			// //still needed, QLab does not notify when playhead is cleared/reset
			// OK, my bad, missed the entire 'empty' message = no playhead
			// this.sendOSC((this.cl ? '/cue_id/' + this.cl : '') + `/playhead${phID}`, [])

			if (5 == this.qVer) {
				this.sendOSC('/alwaysAudition', [], true)
				this.sendOSC('/auditionMonitors', [], true)
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
			// TODO: use Map ?
			for (let k in this.requestedCues) {
				if (this.requestedCues[k] < timeOut) {
					// no response from QLab for at least 500ms
					// so delete the cue from our list
					const cueObj = this.wsCues[k]
					if (cueObj) {
						// QLab sometimes sends 'reload the whole cue list'
						// so a cue we were waiting for may have been moved/deleted between checks
						const qNum = cleanCueNumber(cueObj.qNumber)
						const qName = cueObj.qName
						if (qNum && qName) {
							delete this.cueColors[qNum]
							for (const [varName, info] of Object.entries(this.otherVars)) {
								variableValues[`q_${qNum}_${varName}`] = undefined
							}
						}
						for (const [varName, info] of Object.entries(this.otherVars)) {
							variableValues[`id_${cueObj.uniqueID}_${varName}`] = undefined
						}
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
		if (rc && (rc.isRunning || rc.isPaused)) {
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
				this.debugLevel > 0 && console.log('debug', 'Error: ' + err.message + '\n' + err.stack)
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
				this.log('info', 'Connecting to QLab:' + this.config.host)
				if (this.useTCP) {
					this.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
					this.needWorkspace = true
					// check for passcode
					this.qSocket.send({
						address: '/connect',
						args: [],
					})
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
				const node = message.address.split('/')
				this.debugLevel > 0 &&
					this.log('debug', 'received ' + JSON.stringify(message) + `from ${this.qSocket.options.address}`)
				if ('update' == node[1]) {
					// debug("readUpdate");
					this.readUpdate(message)
				} else if ('reply' == node[1]) {
					// debug("readReply");
					this.readReply(message)
				} else {
					this.log('debug', `Unknown response: ${message.address}  ` + JSON.stringify(message.args))
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
		let q = {}

		if (Array.isArray(jCue)) {
			const idCount = {}
			const dupIds = false
			jCue.forEach((j, i) => {
				q = new Cue(j, this)
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

					if (this.qTypes.includes(q.qType)) {
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
				if (j.cues && j.cues.length) {
					// next level cues
					this.updateCues(j.cues)
				}
				delete this.requestedCues[q.uniqueID]
			})
			this.checkFeedbacks(...this.fb2check)
			if (dupIds) {
				this.updateStatus(InstanceStatus.UnknownWarning, 'Multiple cues\nwith the same cue_id')
			}
		} else {
			q = new Cue(jCue, this)
			if (this.qTypes.includes(q.qType)) {
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
				if ('' == this.cl || (this.cueList[this.cl] && this.cueList[this.cl].includes(q.uniqueID))) {
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
		const junk = Object.keys(cues).length
		const lastRun = qState(this.runningCue)
		let runningCues = []
		let rc = this.runningCue

		Object.keys(cues).forEach((qid) => {
			const q = cues[qid]
			// some cuelists (for example all manual slides) may not have a pre-programmed duration
			if (q.isRunning || q.isPaused) {
				if (('' == cl && 'cue list' != q.qType) || (this.cueList[cl] && this.cueList[cl].includes(qid))) {
					runningCues.push([qid, q.startedAt])
					// if group does not have a duration, ignore
					// it is probably a playlist, not simultaneous playback
					hasGroup = hasGroup || (q.qType == 'group' && q.duration > 0)
					hasDuration = hasDuration || q.duration > 0
				}
			}
		})

		runningCues.sort((a, b) => a[1] - b[1])
		//console.info(pad0('0',runningCues.length,'='),runningCues)
		//console.info(runningCues.length)
		//console.info(Object.keys(cues).length)

		if (runningCues.length == 0) {
			rc = new Cue()
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
				rc = cues[runningCues[i][0]]
				// to reduce network traffic, the query interval logic only asks for running 'updates'
				// if the playback elapsed is > 0%. Sometimes, the first status response of a new running cue
				// is exactly when the cue starts, with 0% elapsed and the countdown timer won't run.
				// Set a new cue with 0% value to 1 here to cause at least one more query to see if the cue is
				// actually playing.
				if (0 == rc.pctElapsed) {
					rc.pctElapsed = .01
				}
			}
		}
		// update if changed
		if (qState(rc) != lastRun) {
			this.runningCue = rc
			this.updateRunning(true)
		}
	}

	updateSelectedCues(c) {
		let newHash = crc16b(JSON.stringify(c))
		if (this.lastSel == newHash) {
			return // no changes since last run
		}
		let newSel = new Set()
		const cl = this.cl

		// collect all unique IDs
		const subq = (q) => {
			if (cl == '' || cl == this.wsCues[q]?.qList) newSel.add(q.uniqueID)
			q.cues.forEach(subq, this)
		}

		c.forEach(subq, this)

		newSel.forEach((id) => {
			if (!this.wsCues[id]) {
				this.wsCues[id] = new Cue()
			}
			this.sendOSC(`/cue_id/${id}/valuesForKeys`, this.qCueRequest)
			this.requestedCues[id] = Date.now()
			this.wsCues[id].isSelected = true
		})

		// remove anything not 'selected' anymore
		this.selectedCues.forEach((id) => {
			if (!newSel.has(id)) {
				if (this.wsCues[id]) thfis.wsCues[id].isSelected = false
			}
		})
		this.selectedCues = [...newSel]
		this.lastSel = newHash
		this.setVariableValues({
			s_id: newSel.size == 0 ? '' : this.selectedCues[0],
			s_count: newSel.size,
			s_ids: this.selectedCues.join(':'),
		})
		this.checkFeedbacks('q_selected')
		console.log('debug', 'Selected cues updated')
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
				const cl = ms[4]
				let oa = message.args[0]?.value || 'none'
				this.debugLevel > 0 && this.log('debug', 'playhead: ' + oa)

				this.sendOSC('/selectedCues/uniqueIDs', [], true)
				//this.init_actions()

				if ('none' == oa) {
					this.nextCue = ''
					this.updateNextCue()
				} else {
					if (cl) {
						// if a cue is inserted, QLab sends playback changed message
						// before sending the new cue's id updates, insert this id into
						// the cuelist just in case so the playhead check will find something until then
						if (!this.cueList[cl].includes(oa)) {
							this.cueList[cl].push(oa)
						}
					}
					if ((this.cl == '' || cl == this.cl) && oa !== this.nextCue) {
						this.sendOSC('/cue_id/' + oa + '/valuesForKeys', this.qCueRequest)
						this.requestedCues[oa] = Date.now()
						this.nextCue = oa
						this.updateNextCue()
					}
				}
				break
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
				// apparently, a dashboard update includes selected cues
				this.sendOSC('/selectedCues/uniqueIDs', [], true)
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
		//let ws = this.ws
		const ma = message.address
		const mn = ma.split('/').slice(1)
		let j = {}
		let q_id
		const i = 0
		const cl = this.cl
		const qr = this.qCueRequest

		try {
			j = JSON.parse(message.args[0].value)
		} catch (error) {
			/* ingnore errors */
		}

		if ('error' == j.status) {
			// qlab 5.3+ returns an error when asked '/cue/active/valuesForKeys'
			// if no cue is active.
			if (!['valuesForKeys', 'uniqueID'].includes(mn.slice(-1)[0])) {
				this.logError(j.address)
			}
			return
		}
		if ('denied' == j.status) {
			// qLab 5+ returns 'denied' for most requests
			// if passcode is not correct
			this.needPasscode = true
			this.wrongPasscode = this.config.passcode
			this.wrongPasscodeAt = Date.now()
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Passcode denied')
			this.log('debug', 'Passcode denied')
			return
		}
		switch (
			mn.slice(-1)[0] // last segment of address
		) {
			case 'workspaces':
				this.wsList = {}
				if (j.data.length == 0) {
					this.needPasscode = false
					this.wrongPasscode = ''
					this.wrongPasscodeAt = 0
					this.needWorkspace = true
					this.passcodeOK = false
					this.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
				} else {
					for (const w of j.data) {
						const ws = new Workspace(w)
						this.wsList[ws.uniqueID] = ws
					}
					this.setVariableValues({ ws_id: Object.keys(this.wsList)[0] })
					this.needWorkspace = false
					this.init_actions()
				}
				break
			case 'connect':
				if (['badpass', 'denied'].includes(j.data)) {
					if (!this.needPasscode) {
						this.needPasscode = true
						this.updateStatus(InstanceStatus.ConnectionFailure, 'Wrong Passcode')
						this.log('debug', 'Wrong passcode')
						this.wrongPasscode = this.config.passcode
						this.wrongPasscodeAt = Date.now()
					}
				} else if (j.data == 'error') {
					this.needPasscode = false
					this.needWorkspace = true
					this.updateStatus(InstanceStatus.UnknownWarning, `Configured Workspace ID ${this.config.workspace} not open`)
				} else if (j.data == 'ok:') {
					this.needPasscode = false
					this.needWorkspace = false
					this.wrongPasscode = ''
					this.wrongPasscodeAt = 0
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
						this.config.useTenths ? 100 : 250
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
						this.config.useTenths ? 100 : 250
					)
				} else {
					this.init_presets()
					this.needWorkspace = this.qVer > 3 && this.useTCP
				}
				break
			case 'uniqueID': // only asked for playhead
				if (j.data) {
					this.nextCue = j.data
					this.updateNextCue()
					this.sendOSC(`/cue_id/${j.data}/valuesForKeys`, qr)
				}
				break
			case 'selectedCues': // selected cues
			case 'uniqueIDs':
				if (j.data) {
					this.updateSelectedCues(j.data)
				}
				break
			case 'playheadId': // pre q5
			case 'playheadID': // q5
				if (j.data) {
					const uniqueID = j.data // ma.substr(14, 36)
					delete this.requestedCues[uniqueID]
					if ((cl == '' || uniqueID == cl) && this.nextCue != uniqueID) {
						// playhead changed due to cue list change in QLab
						if (uniqueID == 'none') {
							this.nextCue = ''
							this.sendOSC('/selectedCues/uniqueIDs', [], true)
						} else {
							this.nextCue = uniqueID
							this.sendOSC('/cue_id/' + j.data + '/children')
						}
						this.updateNextCue()
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
					this.sendOSC('/cue/active/valuesForKeys', qr)
					this.init_actions()
				}
				break
			case 'children':
				if (j.data) {
					// extract cue list id
					let uniqueID = ma.split('/')[ma.includes('/workspace') ? 5 : 3] // substr(17, 36)
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
				if (j.status != 'denied') {
					this.passcodeOK = true
					if (this.showMode != j.data) {
						this.showMode = j.data
						this.checkFeedbacks('ws_mode')
					}
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
				q_id = j.address.split('/')[4]
				if ('cue' == j.address.split('/')[3]) {
					q_id = this.cueByNum[q_id]
				}
				this.wsCues[q_id].isArmed = j.data
				this.checkFeedbacks('q_armed')
				break
			case 'flagged':
				q_id = j.address.split('/')[4]
				if ('cue' == j.address.split('/')[3]) {
					q_id = this.cueByNum[q_id]
				}
				this.wsCues[q_id].isFlagged = j.data
				this.checkFeedbacks('q_flagged')
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
