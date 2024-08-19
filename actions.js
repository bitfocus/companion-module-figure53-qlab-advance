import * as Colors from './colors.js'
import * as Choices from './choices.js'
import { Regex } from '@companion-module/base'

const cueListActions = ['go', 'next', 'panic', 'previous', 'reset', 'stop', 'togglePause']

// actions for QLab module
export function compileActionDefinitions(self) {
	/**
	 *
	 * @param {Object} action - action object from callback
	 * @param {string} cmd - OSC command address to send to QLab
	 * @param {Object[]} args - optional OSC arguments to command
	 * @param {string} args.type - OSC argument type 's','i','f', etc.
	 * @param {object} args.value - OSC argument value, should match type
	 */
	const sendCommand = async (action, cmd, args) => {
		args = args ?? []
		let global = ['/auditionWindow', '/alwaysAudition', '/overrideWindow'].includes(cmd)

		if (self.cl && cueListActions.includes(action.actionId)) {
			cmd = '/cue_id/' + self.cl + cmd
		}

		if (self.useTCP && !self.ready) {
			self.log('debug', `Not connected to ${self.config.host}`)
		} else if (cmd !== undefined) {
			self.log('debug', `sending ${cmd} ${JSON.stringify(args)} to ${self.config.host}`)
			// everything except 'auditionWindow' and 'overrideWindow' works on a specific workspace
			self.sendOSC(cmd, args, global)
		}
		// QLab does not send window updates so ask for status
		if (self.useTCP && global) {
			self.sendOSC(cmd, [], true)
			self.sendOSC('/cue/playhead/valuesForKeys', self.qCueRequest)
		}
	}
	/**
	 * Format time argument for OSC
	 * @param {Object} action - action object from callback, must have a 'time' option
	 * @param {Object} context - context object from callback
	 * @returns {OSCArgument} OSC formatted argument for tim
	 */
	const getTimeArg = async (action, context) => {
		let optTime = await context.parseVariablesInString(action.options.time)
		optTime = parseFloat(optTime)

		return {
			type: optTime.isInteger ? 'i' : 'f',
			value: optTime,
		}
	}

	/**
	 * Calculate toggle value or forced on/off
	 * @param {*} oldVal - Flag is on or off
	 * @param {*} opt - Desired value
	 * @returns {Integer}
	 */
	const setToggle = (oldVal, opt) => {
		const o = parseInt(+opt)
		return 2 === o ? 1 - parseInt(+oldVal) : o
	}

	// build list of actions
	return {
		go: {
			name: 'GO',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/go')
			},
		},
		audition_go: {
			name: 'Audition GO',
			description: 'QLab 5 ONLY',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/auditionGo')
			},
		},
		stop: {
			name: 'Stop',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/stop')
			},
		},
		new_Go: {
			name: 'Go Cue(s)',
			description: 'GO with optional cue selection',
			options: [
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'D',
					choices: Choices.SCOPE,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'q_num',
					default: self.nextCue.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue.q_id,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const scope = opt.scope
				let cmd = '/go'
				let pfx = ''

				switch (scope) {
					case 'S':
						pfx = '/cue/selected'
						break
					case 'N':
						let qnum = await context.parseVariablesInString(opt.q_num.trim())
						pfx = `/cue/${qnum}`
						break
					case 'I':
						let qid = await context.parseVariablesInString(opt.q_id.trim())
						pfx = `/cue_id/${qid}`
				}
				await sendCommand(action, pfx + cmd)
			},
		},
		new_auditGo: {
			name: 'Audition Cue(s)',
			description: 'Audition with optional cue selection. QLab5 only',
			options: [
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'D',
					choices: Choices.SCOPE,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'q_num',
					default: self.nextCue.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue.q_id,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const scope = opt.scope
				let cmd = '/auditionGo'
				let pfx = ''

				switch (scope) {
					case 'S':
						pfx = '/cue/selected'
						break
					case 'N':
						let qnum = await context.parseVariablesInString(opt.q_num.trim())
						pfx = `/cue/${qnum}`
						break
					case 'I':
						let qid = await context.parseVariablesInString(opt.q_id.trim())
						pfx = `/cue_id/${qid}`
				}
				await sendCommand(action, pfx + cmd)
			},
		},
		new_stop: {
			name: 'Stop Cue(s)',
			description: 'Stop with optional cue selection',
			options: [
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'D',
					choices: Choices.SCOPE,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'q_num',
					default: self.nextCue.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue.q_id,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const scope = opt.scope
				let cmd = '/stop'
				let pfx = ''

				switch (scope) {
					case 'S':
						pfx = '/cue/selected'
						break
					case 'N':
						let qnum = await context.parseVariablesInString(opt.q_num.trim())
						pfx = `/cue/${qnum}`
						break
					case 'I':
						let qid = await context.parseVariablesInString(opt.q_id.trim())
						pfx = `/cue_id/${qid}`
				}
				await sendCommand(action, pfx + cmd)
			},
		},
		new_loadAt: {
			name: 'Load Cue(s) At',
			description: 'Load to Time with optional cue selection',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'S',
					choices: Choices.TIME_MODE,
				},
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'D',
					choices: Choices.SCOPE,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'q_num',
					default: self.nextCue.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue.q_id,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
				{
					type: 'textinput',
					label: 'Hour',
					id: 'hh',
					length: 2,
					default: 0,
					useVariables: true,
					regex: Regex.NUMBER,
					isVisible: (options, data) => {
						return options.mode === 'S'
					},
				},
				{
					type: 'textinput',
					label: 'Minute',
					id: 'mm',
					length: 2,
					default: 0,
					useVariables: true,
					regex: Regex.NUMBER,
					isVisible: (options, data) => {
						return options.mode === 'S'
					},
				},
				{
					type: 'textinput',
					label: 'Seconds',
					id: 'ss',
					default: 0,
					useVariables: true,
					regex: Regex.FLOAT,
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const scope = opt.scope
				let cmd = '/loadAt'
				let pfx = ''
				let sfx = opt.mode == 'D' ? '/-' : opt.mode == 'I' ? '/+' : ''

				switch (scope) {
					case 'S':
						pfx = '/cue/selected'
						break
					case 'N':
						let qnum = await context.parseVariablesInString(opt.q_num.trim())
						pfx = `/cue/${qnum}`
						break
					case 'I':
						let qid = await context.parseVariablesInString(opt.q_id.trim())
						pfx = `/cue_id/${qid}`
				}

				let s = parseFloat(await context.parseVariablesInString(opt.ss))
				let args = []

				if (opt.mode === 'S') {
					let h = parseInt(await context.parseVariablesInString(opt.hh))
					let m = parseInt(await context.parseVariablesInString(opt.mm))
					if (Math.abs(h) + Math.abs(m) > 0) {
						args.push({ type: 'i', value: h })
						args.push({ type: 'i', value: m })
					}
				}
				args.push({ type: 'f', value: s })

				await sendCommand(action, pfx + cmd + sfx, args)
			},
		},
		add_slice: {
			name: 'Add Slice',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/cue/selected/addSliceMarker')
			},
		},
		previous: {
			name: 'Previous Cue',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/playhead/previous')
			},
		},
		next: {
			name: 'Next Cue',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/playhead/next')
			},
		},
		pause: {
			name: 'Pause',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/pause')
			},
		},
		resume: {
			name: 'Resume',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/resume')
			},
		},
		togglePause: {
			name: 'Toggle Pause',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/cue/selected/togglePause')
			},
		},
		new_togglePause: {
			name: 'Pause/Resume toggle with optional Cue selection',
			options: [
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'D',
					choices: Choices.FB_SCOPE,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'q_num',
					default: self.nextCue.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue.q_id,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const scope = opt.scope
				let cmd = ''
				let pfx = ''

				switch (scope) {
          case 'D':
            pfx = '/cue/playhead/'
            cmd =  self.nextCue.isPaused ? 'resume' : 'pause'
            break
					case 'R':
            let rc = self.runningCue
            cmd = self.runningCue.isPaused ? 'resume' : 'pause'
						pfx = `/cue/active/`
						break
					case 'N':
						let qnum = await context.parseVariablesInString(opt.q_num.trim())
						pfx = `/cue/${qnum}/`
            cmd = self.wsCues[self.cueByNum[qnum]].isPaused ? 'resume' : 'pause'
						break
					case 'I':
						let qid = await context.parseVariablesInString(opt.q_id.trim())
						pfx = `/cue_id/${qid}/`
            cmd = self.wsCues[qid].isPaused ? 'resume' : 'pause'
				}
				await sendCommand(action, pfx + cmd)
			},
		},
		stopSelected: {
			name: 'Stop selected',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/cue/selected/stop')
			},
		},
		panic: {
			name: 'Panic (ALL)',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/panic')
			},
		},
		panicInTime: {
			name: 'Panic (ALL) In Time',
			options: [
				{
					type: 'textinput',
					label: 'Time in Seconds',
					id: 'time',
					default: 0,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/panicInTime', timeArg)
			},
		},
		reset: {
			name: 'Reset',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/reset')
			},
		},
		load: {
			name: 'Load Cue',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/cue/selected/load')
			},
		},
		preview: {
			name: 'Preview',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/cue/selected/preview')
			},
		},
		audition_preview: {
			name: 'Audition Preview',
			description: 'QLab5 ONLY',
			options: [],
			callback: async (action, context) => {
				await sendCommand(action, '/cue/selected/auditionPreview')
			},
		},
		goto: {
			name: 'Go To (cue)',
			options: [
				{
					type: 'textinput',
					label: 'Cue',
					id: 'cue',
					default: self.nextCue.qNumber,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCue = await context.parseVariablesInString(action.options.cue)
				await sendCommand(action, '/playhead/' + optCue)
			},
		},
		start: {
			name: 'Start (cue)',
			options: [
				{
					type: 'textinput',
					label: 'Cue',
					id: 'cue',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCue = await context.parseVariablesInString(action.options.cue)
				await sendCommand(action, '/cue/' + optCue + '/start')
			},
		},
		stop_cue: {
			name: 'Stop (cue)',
			options: [
				{
					type: 'textinput',
					label: 'Cue',
					id: 'cue',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCue = await context.parseVariablesInString(action.options.cue)
				await sendCommand(action, '/cue/' + optCue + '/stop')
			},
		},
		panic_cue: {
			name: 'Panic (Cue)',
			options: [
				{
					type: 'textinput',
					label: 'Cue',
					id: 'cue',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCue = await context.parseVariablesInString(action.options.cue)
				await sendCommand(action, '/cue/' + optCue + '/panic')
			},
		},
		panicInTime_cue: {
			name: 'Panic (Cue) In Time',
			options: [
				{
					type: 'textinput',
					label: 'Cue',
					id: 'cue',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Time in Seconds',
					id: 'time',
					default: 0,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCue = await context.parseVariablesInString(action.options.cue)
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/' + optCue + '/panicInTime', timeArg)
			},
		},
		audition_go_cue: {
			name: 'Audition Cue',
			description: 'QLab5 ONLY',
			options: [
				{
					type: 'textinput',
					label: 'Cue',
					id: 'cue',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCue = await context.parseVariablesInString(action.options.cue)
				await sendCommand(action, '/cue/' + optCue + '/audition')
			},
		},
		audition_go_id: {
			name: 'Audition Cue ID',
			description: 'QLab5 ONLY',
			options: [
				{
					type: 'textinput',
					label: 'Cue',
					id: 'cueId',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCueId = await context.parseVariablesInString(action.options.cueId)
				await sendCommand(action, '/cue_id/' + optCueId + '/audition')
			},
		},
		goto_id: {
			name: 'Goto (Cue ID)',
			options: [
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'cueId',
					default: self.nextCue,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCueId = await context.parseVariablesInString(action.options.cueId)
				const phID = self.qVer < 5 ? 'Id' : 'ID'
				await sendCommand(action, `/playhead${phID}/` + optCueId)
			},
		},
		start_id: {
			name: 'Start (Cue ID)',
			options: [
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'cueId',
					default: self.nextCue,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCueId = await context.parseVariablesInString(action.options.cueId)
				await sendCommand(action, '/cue_id/' + optCueId + '/start')
			},
		},
		stop_id: {
			name: 'Stop (Cue ID)',
			options: [
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'cueId',
					default: self.nextCue,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCueId = await context.parseVariablesInString(action.options.cueId)
				await sendCommand(action, '/cue_id/' + optCueId + '/stop')
			},
		},
		panic_id: {
			name: 'Panic (Cue ID)',
			options: [
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'cueId',
					default: self.nextCue,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCueId = await context.parseVariablesInString(action.options.cueId)
				await sendCommand(action, '/cue_id/' + optCueId + '/panic')
			},
		},
		panicInTime_id: {
			name: 'Panic (Cue ID) In Time',
			options: [
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'cueId',
					default: self.nextCue,
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Time in Seconds',
					id: 'time',
					default: 0,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const optCueId = await context.parseVariablesInString(action.options.cueId)
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue_id/' + optCueId + '/panicInTime', timeArg)
			},
		},
		liveFadePreview: {
			name: 'Live Fade Preview mode',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'onOff',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				await sendCommand(action, '/liveFadePreview', {
					type: 'i',
					value: setToggle(self.liveFadePreview, action.options.onOff),
				})
			},
		},
		showMode: {
			name: 'Show mode',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'onOff',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				await sendCommand(action, '/showMode', {
					type: 'i',
					value: setToggle(self.showMode, action.options.onOff),
				})
			},
		},
		auditMode: {
			name: 'Audition',
			description: `QLab 5 sets 'Always Audition' mode\nOtherwise Show/Hide 'Audition Window'`,
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'onOff',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				const act = self.qVer < 5 ? '/auditionWindow' : '/alwaysAudition'
				await sendCommand(action, act, {
					type: 'i',
					value: setToggle(self.auditMode, action.options.onOff),
				})
			},
		},
		auditWindows: {
			name: 'Audition Monitors',
			description: 'QLab 5 only, open/close ALL audition monitors',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'onOff',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				await sendCommand(action, '/auditionMonitors', {
					type: 'i',
					value: setToggle(self.auditMonitors, action.options.onOff),
				})
			},
		},
		overrideWindow: {
			name: 'Override Controls Window',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'onOff',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				await sendCommand(action, '/overrideWindow', {
					type: 'i',
					value: setToggle(self.overrideWindow, action.options.onOff),
				})
			},
		},
		overrides: {
			name: 'Master Override',
			options: [
				{
					type: 'dropdown',
					label: 'Override',
					id: 'which',
					default: Choices.OVERRIDE[0].id,
					choices: Choices.OVERRIDE,
				},
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'onOff',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				await sendCommand(action, '/overrides/' + action.options.which, {
					type: 'i',
					value: setToggle(self.overrides[action.options.which], action.options.onOff),
				})
			},
		},
		minGo: {
			name: 'Minimum Go',
			options: [
				{
					type: 'textinput',
					tooltip: 'Double Go Protection Time',
					label: 'Time in Seconds',
					id: 'time',
					default: 0,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/settings/general/minGoTime', timeArg)
			},
		},
		prewait_dec: {
			name: 'Decrease Prewait',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/preWait/-', timeArg)
			},
		},
		prewait_inc: {
			name: 'Increase Prewait',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/preWait/+', timeArg)
			},
		},
		postwait_dec: {
			name: 'Decrease Postwait',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/postWait/-', timeArg)
			},
		},
		postwait_inc: {
			name: 'Increase Postwait',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/postWait/+', timeArg)
			},
		},
		duration_dec: {
			name: 'Decrease Duration',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/duration/-', timeArg)
			},
		},
		duration_inc: {
			name: 'Increase Duration',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/duration/+', timeArg)
			},
		},
		startTime_dec: {
			name: 'Decrease Start Time',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/startTime/-', timeArg)
			},
		},
		startTime_inc: {
			name: 'Increase Start Time',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/startTime/+', timeArg)
			},
		},
		endTime_dec: {
			name: 'Decrease End Time',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/endTime/-', timeArg)
			},
		},
		endTime_inc: {
			name: 'Increase End Time',
			options: [
				{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					default: 1,
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const timeArg = await getTimeArg(action, context)
				await sendCommand(action, '/cue/selected/endTime/+', timeArg)
			},
		},
		continue: {
			name: 'Set Continue Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Continue Mode',
					id: 'contId',
					choices: Choices.CONTINUE_MODE,
				},
			],
			callback: async (action, context) => {
				await sendCommand(action, '/cue/selected/continueMode', {
					type: 'i',
					value: parseInt(action.options.contId),
				})
			},
		},
		arm: {
			name: 'Arm Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Arm',
					id: 'armId',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				const nc = self.wsCues[self.nextCue]
				if (!nc) {
					return
				}
				await sendCommand(action, '/cue/selected/armed', {
					type: 'i',
					value: setToggle(nc.isArmed, action.options.armId),
				})
				// request immediate feedback
				await sendCommand(action, '/cue_id/selected/armed', [])
			},
		},
		new_arm: {
			name: 'Arm Cue(s)',
			description: 'Arm with optional cue selection',
			options: [
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'D',
					choices: Choices.SCOPE,
				},
				{
					type: 'dropdown',
					label: 'Arm',
					id: 'tog',
					default: 1,
					choices: Choices.TOGGLE,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'q_num',
					default: self.nextCue.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue.q_id,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const scope = opt.scope
				let cmd = '/armed'
				let req = opt.tog
				let pfx = ''
				let newVal = -1

				try {
					switch (scope) {
						case 'S':
							pfx = '/cue/selected'
							newVal = setToggle(self.wsCues[self.selectedCues[0]].isArmed, req)
							break
						case 'N':
							let qnum = await context.parseVariablesInString(opt.q_num.trim())
							pfx = `/cue/${qnum}`
							newVal = setToggle(self.wsCues[self.cueByNum[qnum.replace(/[^\w\.]/gi, '_')]]?.isArmed, req)
							break
						case 'I':
							let qid = await context.parseVariablesInString(opt.q_id.trim())
							pfx = `/cue_id/${qid}`
							newVal = setToggle(self.wsCues[qid].isArmed, req)
							break
						default:
							pfx = '/cue/playhead'
							newVal = setToggle(self.wsCues[self.nextCue].isArmed, req)
					}
				} catch {
					return // bad cue number, id, no playhead, no selection
				}
				await sendCommand(action, pfx + cmd, {
					type: 'i',
					value: newVal,
				})
				await sendCommand(action, pfx + cmd, [])
			},
		},
		new_flag: {
			name: 'Flag Cue(s)',
			description: 'Flag with optional cue selection',
			options: [
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'D',
					choices: Choices.SCOPE,
				},
				{
					type: 'dropdown',
					label: 'Flag',
					id: 'tog',
					default: 1,
					choices: Choices.TOGGLE,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'q_num',
					default: self.nextCue.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue.q_id,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const scope = opt.scope
				let cmd = '/flagged'
				let req = opt.tog
				let pfx = ''
				let newVal = -1

				try {
					switch (scope) {
						case 'S':
							pfx = '/cue/selected'
							newVal = setToggle(self.wsCues[self.selectedCues[0]].isFlagged, req)
							break
						case 'N':
							let qnum = await context.parseVariablesInString(opt.q_num.trim())
							pfx = `/cue/${qnum}`
							newVal = setToggle(self.wsCues[self.cueByNum[qnum.replace(/[^\w\.]/gi, '_')]]?.isFlagged, req)
							break
						case 'I':
							let qid = await context.parseVariablesInString(opt.q_id.trim())
							pfx = `/cue_id/${qid}`
							newVal = setToggle(self.wsCues[qid].isFlagged, req)
							break
						default:
							pfx = '/cue/playhead'
							newVal = setToggle(self.wsCues[self.nextCue].isFlagged, req)
					}
				} catch {
					return // bad cue number, id, no playhead, no selection
				}
				await sendCommand(action, pfx + cmd, {
					type: 'i',
					value: newVal,
				})
				await sendCommand(action, pfx + cmd, [])
			},
		},

		autoload: {
			name: 'Autoload Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Autoload',
					id: 'autoId',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				const nc = self.wsCues[self.nextCue]
				if (!!nc) {
					return
				}
				await sendCommand(action, '/cue/selected/autoLoad', {
					type: 'i',
					value: setToggle(nc.autoLoad, action.options.autoId),
				})
			},
		},
		flagged: {
			name: 'Flag Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Flagged',
					id: 'flagId',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				const nc = self.wsCues[self.nextCue]
				if (!!nc) {
					return
				}
				await sendCommand(action, '/cue/selected/flagged', {
					type: 'i',
					value: setToggle(nc.isFlagged, action.options.flagId),
				})
			},
		},
		cueColor: {
			name: 'Set Selected Cue Color',
			options: [
				{
					type: 'dropdown',
					label: 'Color',
					id: 'colorId',
					choices: Colors.colorName,
				},
			],
			callback: async (action, context) => {
				await sendCommand(action, '/cue/selected/colorName', {
					type: 's',
					value: '' + action.options.colorId,
				})
			},
		},
		infiniteLoop: {
			name: 'Set selected to infinite loop',
			options: [
				{
					type: 'dropdown',
					label: 'on/off',
					id: 'choice',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				const nc = self.wsCues[self.nextCue]
				if (!!nc) {
					return
				}
				await sendCommand(action, '/cue/selected/infiniteLoop', {
					type: 'i',
					value: setToggle(nc.infiniteLoop, action.options.choice),
				})
			},
		},
		holdLastFrame: {
			name: 'Set selected to hold last frame',
			options: [
				{
					type: 'dropdown',
					label: 'on/off',
					id: 'choice',
					default: 1,
					choices: Choices.TOGGLE,
				},
			],
			callback: async (action, context) => {
				const nc = self.wsCues[self.nextCue]
				if (!!nc) {
					return
				}
				await sendCommand(action, '/cue/selected/holdLastFrame', {
					type: 'i',
					value: setToggle(nc.holdLastFrame, action.options.choice),
				})
			},
		},
		manual: {
			name: 'Send custom OSC command',
			description: 'Please consider filing a feature request',
			options: [
				{
					type: 'textinput',
					label: 'OSC Address',
					id: 'node',
					default: '',
					useVariables: true,
				},
				{
					type: 'dropdown',
					label: 'Argument Type',
					id: 'argType',
					default: 'n',
					choices: [
						{ id: 'n', label: 'None' },
						{ id: 's', label: 'String' },
						{ id: 'i', label: 'Integer' },
						{ id: 'f', label: 'Float' },
					],
				},
				{
					type: 'textinput',
					label: 'String',
					id: 'argS',
					default: '',
					useVariables: true,
					isVisible: (option, data) => {
						return option.argType === 's'
					},
				},
				{
					type: 'textinput',
					label: 'Integer',
					id: 'argI',
					default: 0,
					useVariables: true,
					isVisible: (option, data) => {
						return option.argType === 'i'
					},
				},
				{
					type: 'textinput',
					label: 'Float',
					id: 'argF',
					default: 0.0,
					useVariables: true,
					isVisible: (option, data) => {
						return option.argType === 'f'
					},
				},
			],
			callback: async (action, context) => {
				let arg = []
				const argT = action.options.argType === 'n' ? '' : action.options.argType
				switch (argT) {
					case 's':
						arg = { type: argT, value: await context.parseVariablesInString(action.options.argS) }
						break
					case 'i':
						arg = {
							type: argT,
							value: parseInt(await context.parseVariablesInString(action.options.argI)),
						}
						break
					case 'f':
						arg = {
							type: argT,
							value: parseFloat(await context.parseVariablesInString(action.options.argF)),
						}
						break
				}
				const cmd = await context.parseVariablesInString(action.options.node)
				await sendCommand(action, cmd, arg)
			},
		},
		copyCueID: {
			name: 'Copy Unique Cue ID',
			options: [],
			callback: async (action, context) => {
				self.init_actions()
				self.init_feedbacks()
			},
		},
	}
}
