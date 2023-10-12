import * as Colors from './colors.js'
import * as Choices from './choices.js'

const cueListActions = ['go', 'next', 'panic', 'previous', 'reset', 'stop', 'togglePause']

// actions for QLab module
export function compileActionDefinitions(self) {
	const sendCommand = async (action, cmd, args) => {
		args = args ?? []

		if (self.cl && cueListActions.includes(action.actionId)) {
			cmd = '/cue_id/' + self.cl + cmd
		}

		if (self.useTCP && !self.ready) {
			self.log('debug', `Not connected to ${self.config.host}`)
		} else if (cmd !== undefined) {
			self.log('debug', `sending ${cmd} ${JSON.stringify(args)} to ${self.config.host}`)
			// everything except 'auditionWindow' and 'overrideWindow' works on a specific workspace
			self.sendOSC(cmd, args, ['/auditionWindow', '/alwaysAudition', '/overrideWindow'].includes(cmd))
		}
		// QLab does not send window updates so ask for status
		if (self.useTCP && ['/auditionWindow', '/alwaysAudition', '/overrideWindow'].includes(cmd)) {
			self.sendOSC(cmd, [], true)
			self.sendOSC('/cue/playhead/valuesForKeys', self.qCueRequest)
		}
	}
	const getTimeArg = async (action, context) => {
		let optTime = await context.parseVariablesInString(action.options.time)
		optTime = parseFloat(optTime)

		return {
			type: optTime.isInteger ? 'i' : 'f',
			value: optTime,
		}
	}

	const setToggle = (oldVal, opt) => {
		return '2' == opt ? 1 - (oldVal ? 1 : 0) : parseInt(opt)
	}

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
				await sendCommand(action, '/cue/selected/armed', {
					type: 'i',
					value: setToggle(nc.isArmed, action.options.armId),
				})
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
				await sendCommand(action, '/cue/selected/holdLastFrame', {
					type: 'i',
					value: setToggle(nc.holdLastFrame, action.options.choice),
				})
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
