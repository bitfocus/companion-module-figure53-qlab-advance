import { combineRgb } from '@companion-module/base'
import Icons from './icons.js'
import * as Colors from './colors.js'
import * as Choices from './choices.js'

// determine text color for a background color
function textColor(pbin) {
	const r = pbin >> 16
	const g = (pbin >> 8) & 0xff
	const b = pbin & 0xff
	const lum = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b))

	// determine whether the color is light or dark
	if (lum > 127.5) {
		return 0
	} else {
		return 0xffffff
	}
}

export function compilePresetDefinitions(self) {
	const presets = {}

	presets['cuelist-go'] = {
		type: 'button',
		category: 'CueList',
		name: 'GO Action. Includes double-GO feedback.',
		style: {
			text: '',
			png64: Icons.ICON_PLAY_INACTIVE,
			pngalignment: 'center:center',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: 0,
		},
		steps: [
			{
				down: [
					{
						actionId: 'go',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'min_go',
				options: {
					goMode: 1,
				},
				style: {
					color: 16777215,
					bgcolor: combineRgb(0, 102, 0),
				},
			},
			{
				feedbackId: 'ws_mode',
				options: {
					showMode: 2,
				},
				style: {
					color: 16777215,
					bgcolor: combineRgb(0, 102, 153),
				},
			},
			{
				feedbackId: 'min_go',
				options: {
					goMode: 0,
				},
				style: {
					color: 16777215,
					bgcolor: combineRgb(153, 0, 0),
				},
			},
		],
	}

	presets['cuelist-pause-resume'] = {
		type: 'button',
		category: 'CueList',
		name: 'Pause Toggle',
		style: {
			text: '',
			png64: Icons.ICON_PAUSE_INACTIVE,
			pngalignment: 'center:center',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: 0,
		},
		steps: [
			{
				down: [
					{
						actionId: 'new_togglePause',
						options: {
							scope: 'R',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'q_paused',
				options: {
					scope: 'R',
				},
				style: {
					bgcolor: combineRgb(102, 0, 102),
					color: combineRgb(255, 255, 255),
				},
			},
		],
	}

	presets['cuelist-pause'] = {
		type: 'button',
		category: 'CueList',
		name: 'Pause',
		style: {
			text: 'Pause',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: 0,
		},
		steps: [
			{
				down: [
					{
						actionId: 'pause',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-resume'] = {
		type: 'button',
		category: 'CueList',
		name: 'Resume',
		style: {
			text: 'Resume',
			size: '18',
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(0, 255, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'resume',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-stop'] = {
		type: 'button',
		category: 'CueList',
		name: 'Stop',
		style: {
			text: 'Stop',
			size: '30',
			color: '16777215',
			bgcolor: combineRgb(255, 0, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'stop',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-stop-selected'] = {
		type: 'button',
		category: 'CueList',
		name: 'Stop selected',
		style: {
			text: 'Stop selected',
			size: '18',
			color: '16777215',
			bgcolor: combineRgb(255, 0, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'stopSelected',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-panic'] = {
		type: 'button',
		category: 'CueList',
		name: 'Panic',
		style: {
			text: '',
			png64: Icons.ICON_STOP_INACTIVE,
			pngalignment: 'center:center',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: 0,
		},
		steps: [
			{
				down: [
					{
						actionId: 'panic',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-reset'] = {
		type: 'button',
		category: 'CueList',
		name: 'Reset',
		style: {
			text: 'Reset',
			size: '24',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'reset',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-preview'] = {
		type: 'button',
		category: 'CueList',
		name: 'Preview',
		style: {
			text: 'Preview',
			size: '18',
			color: '16777215',
			bgcolor: combineRgb(0, 128, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'preview',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-previous-cue'] = {
		type: 'button',
		category: 'CueList',
		name: 'Previous Cue',
		style: {
			text: '',
			png64: Icons.ICON_REW_INACTIVE,
			pngalignment: 'center:center',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: 0,
		},
		steps: [
			{
				down: [
					{
						actionId: 'previous',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-next-cue'] = {
		type: 'button',
		category: 'CueList',
		name: 'Next Cue',
		style: {
			text: '',
			png64: Icons.ICON_FWD_INACTIVE,
			pngalignment: 'center:center',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: 0,
		},
		steps: [
			{
				down: [
					{
						actionId: 'next',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-load-cue'] = {
		type: 'button',
		category: 'CueList',
		name: 'Load Cue',
		style: {
			text: 'Load\\nCue',
			size: '24',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'load',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-show-mode'] = {
		type: 'button',
		category: 'CueList',
		name: 'Show Mode',
		style: {
			text: 'Show\\nMode',
			size: '24',
			color: '16777215',
			bgcolor: combineRgb(0, 128, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'showMode',
						options: {
							onOff: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-edit-mode'] = {
		type: 'button',
		category: 'CueList',
		name: 'Edit Mode',
		style: {
			text: 'Edit\\nMode',
			size: '24',
			color: '16777215',
			bgcolor: combineRgb(72, 96, 96),
		},
		steps: [
			{
				down: [
					{
						actionId: 'showMode',
						options: {
							onOff: '0',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-audition-on'] = {
		type: 'button',
		category: 'CueList',
		name: 'Audition ON',
		style: {
			text: 'Audition\\nON',
			size: '18',
			color: '16777215',
			tooltip: 'Opens the Audition Window',
			bgcolor: combineRgb(0, 64, 128),
		},
		steps: [
			{
				down: [
					{
						actionId: 'auditMode',
						options: {
							onOff: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['cuelist-audition-off'] = {
		type: 'button',
		category: 'CueList',
		name: 'Audition OFF',
		style: {
			text: 'Audition\\nOFF',
			size: '18',
			color: '16777215',
			tooltip: 'Closes the Audition Window',
			bgcolor: combineRgb(64, 96, 96),
		},
		steps: [
			{
				down: [
					{
						actionId: 'auditMode',
						options: {
							onOff: '0',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	// Workspace Overrides

	let dSteps = []
	let eSteps = []
	const ver = self.qVer
	for (let o of Choices.OVERRIDE) {
		if (o.preset.includes(`${ver}`)) {
			dSteps.push({
				actionId: 'overrides',
				options: {
					which: o.id,
					onOff: '0',
				},
			})
			eSteps.push({
				actionId: 'overrides',
				options: {
					which: o.id,
					onOff: '1',
				},
			})
		}
	}

	presets['ws-disable'] = {
		type: 'button',
		category: 'Workspace',
		name: 'Disable a Workspace',
		style: {
			bgcolor: combineRgb(192, 0, 0),
			text: 'Disable Workspace',
			tooltip: 'Turn output overrides ON (for a Backup System).\nPrevents transmitting control commands twice.',
			size: 13,
			color: combineRgb(250, 250, 250),
		},
		steps: [
			{
				down: [
					...dSteps,
					{
						actionId: 'overrideWindow',
						options: {
							onOff: '0',
						},
					},
				],
				up: [],
			},
		],
	}
	presets['ws-enable'] = {
		type: 'button',
		category: 'Workspace',
		name: 'Enable a Workspace',
		style: {
			bgcolor: combineRgb(0, 192, 0),
			text: 'Enable Workspace',
			tooltip: 'Turn output overrides OFF (for a Primary System).\nAllows transmitting control commands.',
			size: 13,
			color: combineRgb(250, 250, 250),
		},
		steps: [
			{
				down: [
					...eSteps,
					{
						actionId: 'overrideWindow',
						options: {
							onOff: '0',
						},
					},
				],
				up: [],
			},
		],
	}
	// Editing presets
	presets['edit-prewait-1s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'PreWait Dec 1 sec',
		style: {
			text: 'PreWait\\nDecrease\\n1 sec',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'prewait_dec',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-prewait-10s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'PreWait Dec 10 sec',
		style: {
			text: 'PreWait\\nDecrease\\n10 sec',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'prewait_dec',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-prewait-10s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'PreWait inc 10 sec',
		style: {
			text: 'PreWait\\nIncrease\\n10 sec',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'prewait_inc',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-prewait-1s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'PreWait inc 1sec',
		style: {
			text: 'PreWait\\nIncrease\\n1 sec',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'prewait_inc',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-postwait-1s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'PostWait Dec 1 sec ',
		style: {
			text: 'PostWait\\nDecrease\\n1 sec',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'postwait_dec',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-postwait-10s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'PostWait Dec 10 Sec',
		style: {
			text: 'PostWait\\nDecrease\\n10 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'postwait_dec',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-postwait-10s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'PostWait Inc 10 Sec',
		style: {
			text: 'PostWait\\nIncrease\\n10sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'postwait_inc',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-postwait-1s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'PostWait Inc 1 Sec',
		style: {
			text: 'PostWait\\nIncrease\\n1 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'postwait_inc',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-duration-1s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'Duration Dec 1 sec',
		style: {
			text: 'Duration\\nDecrease\\n1 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'duration_dec',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-duration-10s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'Duration Dec 10sec',
		style: {
			text: 'Duration\\nDecrease\\n10sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'duration_dec',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-duration-10s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'Duration inc 10sec',
		style: {
			text: 'Duration\\nIncrease\\n10 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'duration_inc',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-duration-1s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'Duration Inc 1sec',
		style: {
			text: 'Duration\\nIncrease\\n1 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'duration_inc',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-starttime-1s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'Start Time Inc 1sec',
		style: {
			text: 'Start Time\\nIncrease\\n1 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'startTime_inc',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-starttime-10s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'Start Time Inc 10sec',
		style: {
			text: 'Start Time\\nIncrease\\n10 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'startTime_inc',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-starttime-1s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'Start Time Dec 1sec',
		style: {
			text: 'Start Time\\nDecrease\\n1 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'startTime_dec',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-starttime-10s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'Start Time Dec 10sec',
		style: {
			text: 'Start Time\\nDecrease\\n10 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'startTime_dec',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-endtime-1s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'End Time Inc 1sec',
		style: {
			text: 'End Time\\nIncrease\\n1 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'endTime_inc',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-endtime-10s+'] = {
		type: 'button',
		category: 'Edit',
		name: 'End Time Inc 10sec',
		style: {
			text: 'End Time\\nIncrease\\n10 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'endTime_inc',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-endtime-1s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'End Time Dec 1sec',
		style: {
			text: 'End Time\\nDecrease\\n1 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'endTime_dec',
						options: {
							time: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-endtime-10s-'] = {
		type: 'button',
		category: 'Edit',
		name: 'End Time Dec 10sec',
		style: {
			text: 'End Time\\nDecrease\\n10 sec',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'endTime_dec',
						options: {
							time: '10',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-continue-mode-dnc'] = {
		type: 'button',
		category: 'Edit',
		name: 'Continue Mode DNC',
		style: {
			text: 'Do Not Continue',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'continue',
						options: {
							contId: '0',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-continue-mode-auto-continue'] = {
		type: 'button',
		category: 'Edit',
		name: 'Continue mode Auto continue',
		style: {
			text: 'Auto Continue',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'continue',
						options: {
							contId: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-continue-mode-auto-follow'] = {
		type: 'button',
		category: 'Edit',
		name: 'Continue mode Auto Follow',
		style: {
			text: 'Auto Follow',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'continue',
						options: {
							contId: '2',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-disarm'] = {
		type: 'button',
		category: 'Edit',
		name: 'Disarm',
		style: {
			text: 'Disarm',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'arm',
						options: {
							armId: '0',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-arm'] = {
		type: 'button',
		category: 'Edit',
		name: 'Arm',
		style: {
			text: 'Arm',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'arm',
						options: {
							armId: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-autoload-enable'] = {
		type: 'button',
		category: 'Edit',
		name: 'Autoload Enable',
		style: {
			text: 'Autoload Enable',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'autoload',
						options: {
							autoId: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-autoload-disable'] = {
		type: 'button',
		category: 'Edit',
		name: 'Autoload Disable',
		style: {
			text: 'Autoload Disable',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'autoload',
						options: {
							autoId: '0',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-flagged'] = {
		type: 'button',
		category: 'Edit',
		name: 'Flagged',
		style: {
			text: 'Flagged',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'flagged',
						options: {
							flagId: '1',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['edit-unflagged'] = {
		type: 'button',
		category: 'Edit',
		name: 'Unflagged',
		style: {
			text: 'Unflagged',
			size: '14',
			color: '16777215',
			bgcolor: combineRgb(0, 0, 100),
		},
		steps: [
			{
				down: [
					{
						actionId: 'flagged',
						options: {
							flagId: '0',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	for (let c of Colors.colorName) {
		presets[`edit-cue-color-${c.id}`] = {
			type: 'button',
			category: 'Edit',
			name: 'Cue Color',
			style: {
				text: 'Cue Color ' + c.label,
				//size: '14',
				color: textColor(Colors.colorRGB[c.id]),
				bgcolor: Colors.colorRGB[c.id],
			},
			steps: [
				{
					down: [
						{
							actionId: 'cueColor',
							options: {
								colorId: c.id,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	return presets
}
