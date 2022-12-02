// actions for QLab module
module.exports = {
	setActions: function () {
		var actions = {
			go: { label: 'GO' },
			stop: { label: 'Stop' },
			previous: { label: 'Previous Cue' },
			next: { label: 'Next Cue' },
			pause: { label: 'Pause' },
			resume: { label: 'Resume' },
			togglePause: { label: 'Toggle Pause' },
			stopSelected: { label: 'Stop selected' },
			panic: { label: 'Panic (ALL)' },
			panicInTime: {
				label: 'Panic (ALL) In Time',
				options: [
					{
						type: 'textinput',
						label: 'Time in Seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 0,
					},
				],
			},
			reset: { label: 'Reset' },
			load: { label: 'Load Cue' },
			preview: { label: 'Preview' },
			goto: {
				label: 'Go To (cue)',
				options: [
					{
						type: 'textinput',
						label: 'Cue',
						id: 'cue',
						default: '1',
						default: this.nextCue.qNumber,
					},
				],
			},
			start: {
				label: 'Start (cue)',
				options: [
					{
						type: 'textinput',
						label: 'Cue',
						id: 'cue',
						default: '1',
					},
				],
			},
			stop_cue: {
				label: 'Stop (cue)',
				options: [
					{
						type: 'textinput',
						label: 'Cue',
						id: 'cue',
						default: '1',
					},
				],
			},
			panic_cue: {
				label: 'Panic (Cue)',
				options: [
					{
						type: 'textinput',
						label: 'Cue',
						id: 'cue',
					},
				],
			},
			panicInTime_cue: {
				label: 'Panic (Cue) In Time',
				options: [
					{
						type: 'textinput',
						label: 'Cue',
						id: 'cue',
					},
					{
						type: 'textinput',
						label: 'Time in Seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 0,
					},
				],
			},
			goto_id: {
				label: 'Goto (Cue ID)',
				options: [
					{
						type: 'textinput',
						label: 'Cue ID',
						id: 'cueId',
						default: this.nextCue,
					},
				],
			},
			start_id: {
				label: 'Start (Cue ID)',
				options: [
					{
						type: 'textinput',
						label: 'Cue ID',
						id: 'cueId',
						default: this.nextCue,
					},
				],
			},
			stop_id: {
				label: 'Stop (Cue ID)',
				options: [
					{
						type: 'textinput',
						label: 'Cue ID',
						id: 'cueId',
						default: this.nextCue,
					},
				],
			},
			panic_id: {
				label: 'Panic (Cue ID)',
				options: [
					{
						type: 'textinput',
						label: 'Cue ID',
						id: 'cueId',
						default: this.nextCue,
					},
				],
			},
			panicInTime_id: {
				label: 'Panic (Cue ID) In Time',
				options: [
					{
						type: 'textinput',
						label: 'Cue ID',
						id: 'cueId',
						default: this.nextCue,
					},
					{
						type: 'textinput',
						label: 'Time in Seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 0,
					},
				],
			},
			showMode: {
				label: 'Show mode',
				options: [
					{
						type: 'dropdown',
						label: 'Mode',
						id: 'onOff',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			auditMode: {
				label: 'Audition Window',
				options: [
					{
						type: 'dropdown',
						label: 'Mode',
						id: 'onOff',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			overrideWindow: {
				label: 'Override Controls Window',
				options: [
					{
						type: 'dropdown',
						label: 'Mode',
						id: 'onOff',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			overrides: {
				label: 'Master Override',
				options: [
					{
						type: 'dropdown',
						label: 'Override',
						id: 'which',
						default: this.choices.OVERRIDE[0].id,
						choices: this.choices.OVERRIDE,
					},
					{
						type: 'dropdown',
						label: 'Mode',
						id: 'onOff',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			minGo: {
				label: 'Minimum Go',
				options: [
					{
						type: 'textinput',
						tooltip: 'Double Go Protection Time',
						label: 'Time in Seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 0,
					},
				],
			},
			prewait_dec: {
				label: 'Decrease Prewait',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			prewait_inc: {
				label: 'Increase Prewait',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			postwait_dec: {
				label: 'Decrease Postwait',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			postwait_inc: {
				label: 'Increase Postwait',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			duration_dec: {
				label: 'Decrease Duration',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			duration_inc: {
				label: 'Increase Duration',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			startTime_dec: {
				label: 'Decrease Start Time',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			startTime_inc: {
				label: 'Increase Start Time',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			endTime_dec: {
				label: 'Decrease End Time',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			endTime_inc: {
				label: 'Increase End Time',
				options: [
					{
						type: 'textinput',
						label: 'Time in seconds',
						id: 'time',
						regex: this.REGEX_FLOAT,
						default: 1,
					},
				],
			},
			continue: {
				label: 'Set Continue Mode',
				options: [
					{
						type: 'dropdown',
						label: 'Continue Mode',
						id: 'contId',
						choices: this.choices.CONTINUE_MODE,
					},
				],
			},
			arm: {
				label: 'Arm Cue',
				options: [
					{
						type: 'dropdown',
						label: 'Arm',
						id: 'armId',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			autoload: {
				label: 'Autoload Cue',
				options: [
					{
						type: 'dropdown',
						label: 'Autoload',
						id: 'autoId',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			flagged: {
				label: 'Flag Cue',
				options: [
					{
						type: 'dropdown',
						label: 'Flagged',
						id: 'flagId',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			cueColor: {
				label: 'Set Selected Cue Color',
				options: [
					{
						type: 'dropdown',
						label: 'Color',
						id: 'colorId',
						choices: this.colors.colorName,
					},
				],
			},
			infiniteLoop: {
				label: 'Set selected to infinite loop',
				options: [
					{
						type: 'dropdown',
						label: 'on/off',
						id: 'choice',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			holdLastFrame: {
				label: 'Set selected to hold last frame',
				options: [
					{
						type: 'dropdown',
						label: 'on/off',
						id: 'choice',
						default: 1,
						choices: this.choices.TOGGLE,
					},
				],
			},
			copyCueID: {
				label: 'Copy Unique Cue ID',
			},
		}
		return actions
	},
}
