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
import * as Choices from './choices.js'

function cueToStatusChar(cue) {
	if (cue.isBroken) return '\u2715'
	if (cue.isRunning) return '\u23F5'
	if (cue.isPaused) return '\u23F8'
	if (cue.isLoaded) return '\u23FD'
	return '\u00b7'
}

class QLabInstance extends InstanceBase {
	qCueRequest = [
		{
			type: 's',
			value:
				'["number","uniqueID","listName","type","isPaused","duration","actionElapsed","parent","flagged","notes",' +
				'"autoLoad","colorName","isRunning","isLoaded","armed","isBroken","percentActionElapsed","cartPosition",' +
				'"infiniteLoop","holdLastFrame"]',
		},
	]

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

		this.resetVars()
	}

	applyConfig(config) {
		let ws = config.workspace
		let cl = config.cuelist

		if (ws !== undefined && ws !== '' && ws !== 'default') {
			this.ws = '/workspace/' + ws
		} else {
			this.ws = ''
		}

		if (cl && cl !== '' && cl !== 'default') {
			this.cl = cl
		} else {
			this.cl = ''
		}

		if (config.useTCP == undefined) {
			config.useTCP = true
		}

		this.useTCP = config.useTCP
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
		this.requestedCues = {}
		this.overrides = {}
		this.lastRunID = '-' + this.lastRunID
		this.showMode = false
		this.audition = false
		this.goDisabled = false
		this.goAfter = 0
		this.minGo = 0
		this.checkFeedbacks()
		this.updateQVars()
		this.updateNextCue()
		this.updatePlaying()
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
		})
		this.checkFeedbacks('playhead_bg')
	}
	updateQVars(q) {
		q = q || new Cue()
		var self = this
		var qID = q.uniqueID
		var qNum = q.qNumber.replace(/[^\w\.]/gi, '_')
		var qType = q.qType
		var qColor = q.qColor
		var oqNum = null
		var oqName = null
		var oqType = null
		var oqColor = 0
		var oqOrder = -1

		let variableValues = {}

		// unset old variable?
		if (qID in self.wsCues) {
			oqNum = self.wsCues[qID].qNumber.replace(/[^\w\.]/gi, '_')
			oqName = self.wsCues[qID].qName
			oqType = self.wsCues[qID].qType
			oqColor = self.wsCues[qID].qColor
			oqOrder = self.wsCues[qID].qOrder
			if (oqNum != '' && oqNum != q.qNumber) {
				variableValues['q_' + oqNum + '_name'] = undefined
				self.cueColors[oqNum] = 0
				delete self.cueByNum[oqNum]
				oqName = ''
			}
		}
		// set new value
		if (q.qName != oqName || qColor != oqColor) {
			if (qNum != '') {
				variableValues['q_' + qNum + '_name'] = q.qName
				self.cueColors[qNum] = q.qColor
				self.cueByNum[qNum] = qID
			}
			variableValues['id_' + qID + '_name'] = q.qName

			this.checkFeedbacks('q_bg', 'qid_bg')
		}

		this.setVariableValues(variableValues)
	}

	updateRunning() {
		var self = this
		var tenths = self.config.useTenths ? 0 : 1
		var rc = self.runningCue

		var tElapsed = rc.duration * rc.pctElapsed

		var eh = Math.floor(tElapsed / 3600)
		var ehh = ('00' + eh).slice(-2)
		var em = Math.floor(tElapsed / 60) % 60
		var emm = ('00' + em).slice(-2)
		var es = Math.floor(tElapsed % 60)
		var ess = ('00' + es).slice(-2)
		var eft = ''

		if (ehh > 0) {
			eft = ehh + ':'
		}
		if (emm > 0) {
			eft = eft + emm + ':'
		}
		eft = eft + ess

		var tLeft = rc.duration * (1 - rc.pctElapsed)
		if (tLeft > 0) {
			tLeft += tenths
		}

		var h = Math.floor(tLeft / 3600)
		var hh = ('00' + h).slice(-2)
		var m = Math.floor(tLeft / 60) % 60
		var mm = ('00' + m).slice(-2)
		var s = Math.floor(tLeft % 60)
		var ss = ('00' + s).slice(-2)
		var ft = ''

		if (hh > 0) {
			ft = hh + ':'
		}
		if (mm > 0) {
			ft = ft + mm + ':'
		}
		ft = ft + ss

		if (tenths == 0) {
			var f = Math.floor((tLeft - Math.trunc(tLeft)) * 10)
			var ms = ('0' + f).slice(-1)
			if (tLeft < 5 && tLeft != 0) {
				ft = ft.slice(-1) + '.' + ms
			}
		}

		this.setVariableValues({
			r_id: rc.uniqueID,
			r_name: rc.qName,
			r_num: rc.qNumber,

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

		this.checkFeedbacks('run_bg')
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
			this.setVariableDefinitions(compileVariableDefinition(this))
			this.updateRunning()
			this.updateNextCue()
		} else {
			this.setVariableDefinitions([])
		}
	}
	sendOSC(node, arg, bare) {
		var ws = bare ? '' : this.ws

		if (!this.useTCP) {
			var host = ''
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
	// get current status of QLab cues and playhead
	// and ask for updates
	prime_vars(ws) {
		var self = this

		if (self.needPasscode && (self.config.passcode == undefined || self.config.passcode == '')) {
			self.updateStatus(InstanceStatus.ConnectionFailure, 'Wrong Passcode')
			self.log('debug', 'waiting for passcode')
			self.sendOSC('/connect', [])
			if (self.timer !== undefined) {
				clearTimeout(self.timer)
				self.timer = undefined
			}
			if (self.pulse !== undefined) {
				clearInterval(self.pulse)
				self.pulse = undefined
			}
			self.timer = setTimeout(() => {
				self.prime_vars(ws)
			}, 5000)
		} else if (self.needWorkspace && self.ready) {
			self.sendOSC('/version', [], true) // app global, not workspace
			if (self.config.passcode !== undefined && self.config.passcode !== '') {
				self.log('debug', 'sending passcode to ' + self.config.host)
				self.sendOSC('/connect', [
					{
						type: 's',
						value: self.config.passcode,
					},
				])
			} else {
				self.sendOSC('/connect', [])
			}
			if (self.timer !== undefined) {
				clearTimeout(self.timer)
				self.timer = undefined
			}
			self.timer = setTimeout(() => {
				self.prime_vars(ws)
			}, 5000)
		} else {
			// should have a workspace now

			// request variable/feedback info
			// get list of running cues
			self.sendOSC('/cue/playhead/uniqueID', [])
			self.sendOSC('/updates', [])
			self.sendOSC('/updates', [
				{
					type: 'i',
					value: 1,
				},
			])

			self.sendOSC('/cueLists', [])
			if (self.qVer < 5) {
				self.sendOSC('/auditionWindow', [], true)
			}
			self.sendOSC('/overrideWindow', [], true)
			self.sendOSC('/showMode', [])
			self.sendOSC('/settings/general/minGoTime')
			for (var o in Choices.OVERRIDE) {
				self.sendOSC('/overrides/' + Choices.OVERRIDE[o].id, [], true)
			}
			if (self.timer !== undefined) {
				clearTimeout(self.timer)
				self.timer = undefined
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
			const checkFeedbacks = new Set()

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
						checkFeedbacks.add('q_bg')
						checkFeedbacks.add('qid_bg')
					}
					delete this.requestedCues[k]
				}
			}

			this.setVariableValues(variableValues)
			if (checkFeedbacks.size > 0) {
				this.checkFeedbacks(...Array.from(checkFeedbacks))
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
		var self = this
		var ws = self.ws

		if (self.connecting) {
			return
		}

		if (self.qSocket) {
			self.ready = false
			self.qSocket.close()
			delete self.qSocket
		}

		if (self.config.host) {
			if (self.useTCP) {
				self.qSocket = new OSC.TCPSocketPort({
					localAddress: '0.0.0.0',
					localPort: 0, // 53000 + self.port_offset,
					address: self.config.host,
					port: 53000,
					metadata: true,
				})
				self.connecting = true
			} else {
				self.qSocket = new OSC.UDPPort({
					localAddress: '0.0.0.0',
					localPort: 53001, // 53000 + self.port_offset,
					remoteAddress: self.config.host,
					remotePort: 53000,
					metadata: true,
				})
				self.updateStatus(InstanceStatus.Ok, 'UDP Mode')
			}

			self.qSocket.open()

			self.qSocket.on('error', (err) => {
				self.log('debug', 'Error: ' + err)
				self.connecting = false
				if (!self.hasError) {
					self.log('error', 'Error: ' + err.message)
					self.updateStatus(InstanceStatus.UnknownError, "Can't connect to QLab " + err.message)
					self.hasError = true
				}
				if (err.code == 'ECONNREFUSED') {
					if (self.qSocket) {
						self.qSocket.removeAllListeners()
					}
					if (self.timer !== undefined) {
						clearTimeout(self.timer)
					}
					if (self.pulse !== undefined) {
						clearInterval(self.pulse)
						self.pulse = undefined
					}
					self.timer = setTimeout(() => {
						self.connect()
					}, 5000)
				}
			})

			self.qSocket.on('close', () => {
				if (!self.hasError && self.ready) {
					self.log('error', 'TCP Connection to QLab Closed')
				}
				self.connecting = false
				if (self.ready) {
					self.needWorkspace = true
					self.needPasscode = false
					self.resetVars(true)
					// the underlying socket issues a final close after
					// the OSC socket is closed, which gets deleted on 'destroy'
					if (self.qSocket != undefined) {
						self.qSocket.removeAllListeners()
					}
					self.log('debug', 'Connection closed')
					self.ready = false
					if (self.disabled) {
						self.updateStatus(InstanceStatus.Disconnected, 'Disabled')
					} else {
						self.updateStatus(InstanceStatus.Disconnected, 'CLOSED')
					}
				}
				if (self.timer !== undefined) {
					clearTimeout(self.timer)
					self.timer = undefined
				}
				if (self.pulse !== undefined) {
					clearInterval(self.pulse)
					self.pulse = undefined
				}
				if (!self.disabled) {
					// don't restart if instance was disabled
					self.timer = setTimeout(() => {
						self.connect()
					}, 5000)
				}
				self.hasError = true
			})

			self.qSocket.on('ready', () => {
				self.ready = true
				self.connecting = false
				self.hasError = false
				self.log('info', 'Connected to QLab:' + self.config.host)
				if (self.useTCP) {
					self.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
					self.needWorkspace = true
					self.prime_vars(ws)
				} else {
					self.needWorkspace = false
					self.qSocket.send({
						address: '/version',
						args: [],
					})
				}
			})

			self.qSocket.on('message', (message, timetag, info) => {
				//self.log('debug', 'received ' + JSON.stringify(message) + `from ${self.qSocket.options.address}`)
				if (message.address.match(/^\/update\//)) {
					// debug("readUpdate");
					self.readUpdate(message)
				} else if (message.address.match(/^\/reply\//)) {
					// debug("readReply");
					self.readReply(message)
				} else {
					self.log('debug', message.address + ' ' + JSON.stringify(message.args))
				}
			})
		}
		// self.qSocket.on("data", (data) => {
		// 	debug ("Got",data, "from",self.qSocket.options.address);
		// });
	}
	/**
	 * update list cues
	 */
	updateCues(jCue, stat, ql) {
		var self = this
		// list of useful cue types we're interested in
		var qTypes = [
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
		var q = {}

		if (Array.isArray(jCue)) {
			var idCount = {}
			var dupIds = false
			for (let i = 0; i < jCue.length; i++) {
				q = new Cue(jCue[i], self)
				q.qOrder = i
				if (ql) {
					q.qList = ql
				}
				if (stat == 'u') {
					if (!self.cueList[ql].includes(q.uniqueID)) {
						self.cueList[ql].push(q.uniqueID)
					}
				} else {
					if (q.uniqueID in idCount) {
						idCount[q.uniqueID] += 1
						dupIds = true
					} else {
						idCount[q.uniqueID] = 1
					}

					if (qTypes.includes(q.qType)) {
						self.updateQVars(q)
						self.wsCues[q.uniqueID] = q
					}
					if (stat == 'l') {
						self.cueOrder[i] = q.uniqueID
						if (ql) {
							self.cueList[ql].push(q.uniqueID)
						}
					}
				}
				delete self.requestedCues[q.uniqueID]
			}
			this.checkFeedbacks('q_bg', 'qid_bg', 'q_run', 'qid_run')
			if (dupIds) {
				self.updateStatus(InstanceStatus.UnknownWarning, 'Multiple cues\nwith the same cue_id')
			}
		} else {
			q = new Cue(jCue, self)
			if (qTypes.includes(q.qType)) {
				self.updateQVars(q)
				self.wsCues[q.uniqueID] = q
				if (3 == self.qVer) {
					// QLab3 seems to send cue lists as 'group' cues
					if ('group' == q.qType) {
						if (!self.cueList[q.uniqueID]) self.cueList[q.uniqueID] = []
					}
				} else {
					// a 'cart' is a special 'cue list'
					if (['cue list', 'cart'].includes(q.qType)) {
						if (!self.cueList[q.uniqueID]) {
							self.cueList[q.uniqueID] = []
						} else {
							self.sendOSC('/cue_id/' + q.uniqueID + '/children', [])
						}
					}
				}
				this.checkFeedbacks('q_run', 'qid_run')
				this.updatePlaying()
				if ('' == self.cl || (self.cueList[self.cl] && self.cueList[self.cl].includes(q.uniqueID))) {
					if (q.uniqueID == self.nextCue) {
						self.updateNextCue()
					}
				}
			}
			delete self.requestedCues[q.uniqueID]
		}
	}
	/**
	 * update list of running cues
	 */
	updatePlaying() {
		function qState(q) {
			var ret = q.uniqueID + ':'
			ret += q.isBroken ? '0' : q.isRunning ? '1' : q.isPaused ? '2' : q.isLoaded ? '3' : '4'
			ret += ':' + q.duration + ':' + q.pctElapsed
			return ret
		}

		var self = this
		var hasGroup = false
		var hasDuration = false
		var i
		var cl = self.cl
		var cues = self.wsCues
		var lastRun = qState(self.runningCue)
		var runningCues = []
		var q

		Object.keys(cues).forEach((cue) => {
			q = cues[cue]
			// some cuelists (for example all manual slides) may not have a pre-programmed duration
			if (q.isRunning || q.isPaused) {
				if (('' == cl && 'cue list' != q.qType) || (self.cueList[cl] && self.cueList[cl].includes(cue))) {
					runningCues.push([cue, q.startedAt])
					// if group does not have a duration, ignore
					// it is probably a playlist, not simultaneous playback
					hasGroup = hasGroup || (q.qType == 'group' && q.duration > 0)
					hasDuration = hasDuration || q.duration > 0
				}
			}
		})

		// } else {
		// 	var cue;
		// 	var clist = self.cueList[self.cl];
		// 	for(i in clist) {
		// 		cue = cues[clist[i]];
		// 		if (cue.duration > 0  && (cue.isRunning || cue.isPaused)) {
		// 			if (clist[i] != cue.uniqueID) {
		// 				var x = 1;
		// 			}
		// 			runningCues.push([cue.uniqueID, cue.startedAt]);
		// 			if (cue.qType == "group") {
		// 				hasGroup = true;
		// 			}
		// 		}
		// 	}
		// }
		runningCues.sort((a, b) => b[1] - a[1])

		if (runningCues.length == 0) {
			self.runningCue = new Cue()
		} else {
			i = 0
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
				self.runningCue = cues[runningCues[i][0]]
				// to reduce network traffic, the query interval logic only asks for running 'updates'
				// if the playback elapsed is > 0%. Sometimes, the first status response of a new running cue
				// is exactly when the cue starts, with 0% elapsed and the countdown timer won't run.
				// Set a new cue with 0% value to 1 here to cause at least one more query to see if the cue is
				// actually playing.
				if (0 == self.runningCue.pctElapsed) {
					self.runningCue.pctElapsed = 1
				}
			}
		}
		// update if changed
		if (qState(self.runningCue) != lastRun) {
			self.updateRunning(true)
		}
	}
	/**
	 * process QLab 'update'
	 */
	readUpdate(message) {
		var self = this
		var ws = self.ws
		var ma = message.address
		var mf = ma.split('/')

		/**
		 * A QLab 'update' message is just the uniqueID for a cue where something 'changed'.
		 * We have to request any other information we need (name, number, isRunning, etc.)
		 */
		if (ma.match(/playbackPosition$/)) {
			var cl = ma.substr(63, 36)
			if (message.args.length > 0) {
				var oa = message.args[0].value
				if (self.cl) {
					// if a cue is inserted, QLab sends playback changed cue
					// before sending the new cue's id update, insert this id into
					// the cuelist just in case so the playhead check will find it until then
					if (!self.cueList[cl].includes(oa)) {
						self.cueList[cl].push(oa)
					}
				}
				if ((self.cl == '' || cl == self.cl) && oa !== self.nextCue) {
					// playhead changed
					self.nextCue = oa
					self.log('debug', 'playhead: ' + oa)
					self.sendOSC('/cue_id/' + oa + '/valuesForKeys', self.qCueRequest)
					self.requestedCues[oa] = Date.now()
				}
			} else if (self.cl == '' || cl == self.cl) {
				// no playhead
				self.nextCue = ''
				self.updateNextCue()
			}
		} else if (ma.match(/cue lists\]$/)) {
			self.sendOSC('/doubleGoWindowRemaining')
		} else if (ma.match(/\/cue_id\//)) {
			// get cue information for 'updated' cue
			var node = ma.substring(7) + '/valuesForKeys'
			var uniqueID = ma.slice(-36)
			self.sendOSC(node, self.qCueRequest)
			// save info request time to verify a response.
			// QLab sends an update when a cue is deleted
			// but fails to respond to a request for info.
			// If there is no response after a few pulses
			// we delete our copy of the cue
			self.requestedCues[uniqueID] = Date.now()
		} else if (ma.match(/\/disconnect$/)) {
			self.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
			self.needWorkspace = true
			self.needPasscode = false
			self.lastRunID = 'x'
			if (self.pulse != undefined) {
				clearInterval(self.pulse)
				self.pulse = undefined
			}
			self.resetVars(true)
			self.prime_vars(ws)
		} else if (mf.length == 4 && mf[2] == 'workspace') {
			self.sendOSC('/showMode', [])
			self.sendOSC('/auditionWindow', [], true)
			self.sendOSC('/overrideWindow', [], true)
		} else if (ma.match(/\/settings\/general$/)) {
			// ug. 8 more bytes and they could have sent the 'new' value :(
			self.sendOSC('/settings/general/minGoTime')
		} else if (ma.match(/\/settings\/overrides$/)) {
			for (var o in Choices.OVERRIDE) {
				self.sendOSC('/overrides/' + Choices.OVERRIDE[o].id, [], true)
			}
		}
		// self.log('debug', '=====> OSC message: ' + ma + ' ' + JSON.stringify(message.args))
	}
	/**
	 * process QLab 'reply'
	 */
	readReply(message) {
		var self = this
		var ws = self.ws
		var ma = message.address
		var j = {}
		var i = 0
		var q
		var uniqueID
		var playheadId
		var cl = self.cl
		var qr = self.qCueRequest

		try {
			j = JSON.parse(message.args[0].value)
		} catch (error) {
			/* ingnore errors */
		}

		if (ma.match(/\/connect$/)) {
			if (j.data == 'badpass') {
				if (!self.needPasscode) {
					self.needPasscode = true
					self.updateStatus(InstanceStatus.ConnectionFailure, 'Wrong Passcode')
					self.prime_vars(ws)
				}
			} else if (j.data == 'error') {
				self.needPasscode = false
				self.needWorkspace = true
				self.updateStatus(InstanceStatus.UnknownWarning, 'No Workspaces')
			} else if (j.data.slice(0, 2) == 'ok') {
				self.needPasscode = false
				self.needWorkspace = false
				self.updateStatus(InstanceStatus.Ok, 'Connected to ' + self.host)
			}
		} else if (ma.match(/updates$/)) {
			// only works on QLab > 3
			if ('denied' != j.status) {
				self.needWorkspace = false
				self.updateStatus(InstanceStatus.Ok, 'Connected to QLab')
				if (self.pulse !== undefined) {
					self.log('debug', 'cleared stray interval (u)')
					clearInterval(self.pulse)
				}
				self.pulse = setInterval(
					() => {
						self.rePulse()
					},
					self.config.useTenths ? 100 : 250
				)
			}
		} else if (ma.match(/version$/)) {
			if (j.data != undefined) {
				self.qVer = parseInt(j.data)
				self.setVariableValues({ q_ver: j.data })
			}
			if (3 == self.qVer) {
				// QLab3 always has a 'workspace' (it may be empty)
				if (self.pulse !== undefined) {
					self.log('debug', 'cleared stray interval (v)')
					clearInterval(self.pulse)
				}
				self.pulse = setInterval(
					() => {
						self.rePulse()
					},
					self.config.useTenths ? 100 : 250
				)
			} else {
				self.needWorkspace = self.qVer > 3 && self.useTCP
			}
		} else if (ma.match(/uniqueID$/)) {
			if (j.data) {
				self.nextCue = j.data
				self.updateNextCue()
				self.sendOSC('/cue/playhead/valuesForKeys', qr)
			}
		} else if (ma.match(/playheadI[dD]$/)) {
			if (j.data) {
				playheadId = j.data
				uniqueID = ma.substr(14, 36)
				delete self.requestedCues[uniqueID]
				if ((cl == '' || uniqueID == cl) && self.nextCue != playheadId) {
					// playhead changed due to cue list change in QLab
					if (playheadId == 'none') {
						self.nextCue = ''
					} else {
						self.nextCue = playheadId
					}
					self.updateNextCue()
					//self.sendOSC("/cue/" + j.data + "/children");
				}
			}
		} else if (ma.match(/\/cueLists$/)) {
			if (j.data) {
				i = 0
				while (i < j.data.length) {
					q = j.data[i]
					self.updateCues(q, 'l')
					self.updateCues(q.cues, 'l', q.uniqueID)
					i++
				}
				self.sendOSC('/cue/active/valuesForKeys', qr)
			}
		} else if (ma.match(/children$/)) {
			if (j.data) {
				uniqueID = ma.substr(14, 36)
				self.updateCues(j.data, 'u', uniqueID)
			}
		} else if (ma.match(/runningOrPausedCues$/)) {
			if (j.data != undefined) {
				i = 0
				while (i < j.data.length) {
					q = j.data[i]
					self.sendOSC('/cue_id/' + q.uniqueID + '/valuesForKeys', qr)
					i++
				}
			}
		} else if (ma.match(/valuesForKeys$/)) {
			self.updateCues(j.data, 'v')
			uniqueID = ma.substr(14, 36)
			delete self.requestedCues[uniqueID]
		} else if (ma.match(/showMode$/)) {
			if (self.showMode != j.data) {
				self.showMode = j.data
				self.checkFeedbacks('ws_mode')
			}
		} else if (ma.match(/auditionWindow$/)) {
			if (self.auditMode != j.data) {
				self.auditMode = j.data
				self.checkFeedbacks('ws_mode')
			}
		} else if (ma.match(/overrideWindow$/)) {
			if (self.overrideWindow != j.data) {
				self.overrideWindow = j.data
				self.checkFeedbacks('override_visible')
			}
		} else if (ma.match(/minGoTime$/)) {
			self.minGo = j.data
			self.setVariableValues({ min_go: (Math.round(j.data * 100) / 100).toFixed(2) })
		} else if (ma.match(/\/doubleGoWindowRemaining$/)) {
			var goLeft = Math.round(j.data * 1000)
			self.goDisabled = goLeft > 0
			self.goAfter = Date.now() + goLeft
			self.checkFeedbacks('min_go')
		} else if (ma.match(/^\/reply\/overrides\//)) {
			var o = ma.split('/')[3]
			self.overrides[o] = j.data
			self.checkFeedbacks('override')
		} else {
			self.log('debug', '=====> OSC message: ' + ma + ' ' + JSON.stringify(message.args))
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
