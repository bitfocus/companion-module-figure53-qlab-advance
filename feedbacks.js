import { combineRgb } from '@companion-module/base'
import * as Choices from './choices.js'
import { cleanCueNumber } from './common.js'

export function compileFeedbackDefinitions(self) {
	function getScope(opt) {
		let cue
		switch (opt.scope) {
			case 'D':
				cue = self.nextCue
				break
			case 'R':
				cue = self.runningCue.uniqueID
				break
			case 'N':
				cue = self.cueByNum[cleanCueNumber(opt.q_num)]
				break
			case 'I':
				cue = opt.q_id
		}
		return cue
	}
	return {
		playhead_bg: {
			type: 'advanced',
			name: 'Playhead Color for Background',
			description: 'Use the QLab color for the Playhead (next) cue as background',
			options: [],
			callback: (feedback, context) => {
				const nc = self.wsCues[self.nextCue] ? self.wsCues[self.nextCue].qColor : 0
				return { bgcolor: nc }
			},
		},
		run_bg: {
			type: 'advanced',
			name: 'Running Que color for Background',
			description: 'Use the QLab color of the running cue as background',
			options: [],
			callback: (feedback, context) => {
				return { bgcolor: self.runningCue.qColor }
			},
		},
		q_bg: {
			type: 'advanced',
			name: 'Cue Number color for background',
			description: 'Use the QLab color of the specified cue number as background',
			options: [
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'cue',
					default: '',
				},
			],
			callback: (feedback, context) => {
				const bg = self.cueColors[feedback.options.cue.replace(/[^\w\.]/gi, '_')]
				return { bgcolor: bg || 0 }
			},
		},
		qid_bg: {
			type: 'advanced',
			name: 'Cue ID color for background',
			description: 'Use the QLab color of the specified cue ID as background',
			options: [
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'cueId',
					default: self.nextCue,
				},
			],
			callback: (feedback, context) => {
				const tc = self.wsCues[feedback.options.cueId]
				const bg = tc && tc.qColor
				return { bgcolor: bg || 0 }
			},
		},
		q_armed: {
			type: 'boolean',
			name: 'Cue is Armed',
			description: 'Indicate on button when the specified cue is Armed',
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
					default: self.wsCues[self.nextCue]?.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			defaultStyle: {
				bgcolor: combineRgb(0, 102, 0),
				color: combineRgb(255, 255, 255),
			},
			callback: async (feedback, context) => {
				const opt = feedback.options
				let cue = getScope(opt)

				return self.wsCues[cue]?.isArmed
			},
		},
		q_selected: {
			type: 'boolean',
			name: 'Cue is Selected',
			description: 'Indicate on button when the specified cue is Selected',
			options: [
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'N',
					choices: [
						{ id: 'N', label: 'Cue Number' },
						{ id: 'I', label: 'Cue ID' },
					],
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
			defaultStyle: {
				bgcolor: combineRgb(0, 0, 102),
				color: combineRgb(255, 255, 255),
			},
			callback: async (feedback, context) => {
				const opt = feedback.options
				let cue = getScope(opt)

				return self.wsCues[cue]?.isSelected
			},
		},
		q_flagged: {
			type: 'boolean',
			name: 'Cue is Flagged',
			description: 'Indicate on button when the specified cue is Flagged',
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
					default: self.wsCues[self.nextCue]?.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			defaultStyle: {
				bgcolor: combineRgb(0, 102, 0),
				color: combineRgb(255, 255, 255),
			},
			callback: async (feedback, context) => {
				const opt = feedback.options
				let cue = getScope(opt)
				return self.wsCues[cue]?.isFlagged
			},
		},
		q_paused: {
			type: 'boolean',
			name: 'Cue is Paused',
			description: 'Indicate on button when the specified cue is Paused',
			options: [
				{
					type: 'dropdown',
					label: 'Scope',
					id: 'scope',
					default: 'R',
					choices: Choices.FB_SCOPE,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'q_num',
					default: self[self.nextCue]?.q_num,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'N'
					},
				},
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'q_id',
					default: self.nextCue,
					useVariables: true,
					isVisible: (options, data) => {
						return options.scope === 'I'
					},
				},
			],
			defaultStyle: {
				bgcolor: combineRgb(102, 0, 102),
				color: combineRgb(255, 255, 255),
			},
			callback: async (feedback, context) => {
				const opt = feedback.options
				let cue = getScope(opt)

				return self.wsCues[cue]?.isPaused
			},
		},

		q_run: {
			type: 'boolean',
			name: 'Indicate Cue is running',
			description: 'Indicate on button when the specified cue is running',
			options: [
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'cue',
					default: '',
				},
			],
			defaultStyle: {
				bgcolor: combineRgb(102, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			callback: (feedback, context) => {
				const opt = feedback.options
				const rqID = self.cueByNum[opt.cue.replace(/[^\w\.]/gi, '_')]
				const rq = self.wsCues[rqID]
				return rq && rq.isRunning
			},
		},
		qid_run: {
			type: 'boolean',
			name: 'Indicate Cue ID is running',
			description: 'Indicate on button when cue ID is running',
			options: [
				{
					type: 'textinput',
					label: 'Cue ID',
					id: 'cueID',
					default: self.nextCue,
				},
			],
			defaultStyle: {
				bgcolor: combineRgb(204, 0, 204),
				color: combineRgb(255, 255, 255),
			},
			callback: (feedback, context) => {
				const opt = feedback.options
				// const rqID = self.cueByNum[opt.cue.replace(/[^\w\.]/gi,'_')];
				const rq = self.wsCues[opt.cueID]
				return rq && rq.isRunning
			},
		},

		any_run: {
			type: 'boolean',
			name: 'Indicate if any Cue is running',
			description: 'Indicate on button when any cue is running',
			options: [],
			defaultStyle: {
				bgcolor: combineRgb(0, 102, 0),
				color: combineRgb(255, 255, 255),
			},
			callback: (feedback, context) => {
				const rq = self.runningCue
				return rq && rq.isRunning
			},
		},
		min_go: {
			type: 'boolean',
			name: 'Indicate Go button Status',
			description: 'Indicate on Button when the Minimum Go Time is active',
			options: [
				{
					type: 'dropdown',
					label: 'Status?',
					id: 'goMode',
					default: '1',
					choices: [
						{ id: '0', label: 'Disabled' },
						{ id: '1', label: 'Enabled' },
					],
				},
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 102, 0),
			},
			callback: (feedback, context) => {
				const options = feedback.options

				if (self.goDisabled && options.goMode == '0') {
					return true
				} else if (options.goMode == '1') {
					return true
				} else {
					return false
				}
			},
		},
		ws_mode: {
			type: 'boolean',
			name: 'Indicate Workspace Mode',
			description: 'Indicate on Button QLab Show/Edit/Audition Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Which Mode?',
					id: 'showMode',
					default: '1',
					choices: [
						{ id: '0', label: 'Edit' },
						{ id: '1', label: 'Show' },
						{ id: '2', label: 'Audition' },
					],
				},
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 128, 0),
			},
			callback: (feedback, context) => {
				const options = feedback.options

				if (self.auditMode && options.showMode == '2') {
					return true
				} else if (self.showMode && options.showMode == '1') {
					return true
				} else if (!self.showMode && options.showMode == '0') {
					return true
				} else {
					return false
				}
			},
		},
		liveFadePreview: {
			type: 'boolean',
			name: 'Live Fade Preview',
			description: 'Set Button when Live Fade Preview is active ',
			options: [
				// {
				// 	type: 'dropdown',
				// 	label: 'Override',
				// 	id: 'which',
				// 	default: 1,
				// 	choices: Choices.ON_OFF,
				// },
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 102),
			},
			callback: (feedback, context) => {
				return !!self.liveFadePreview
			},
		},
		ws_audit: {
			type: 'boolean',
			name: 'Audit Monitors',
			description: 'Set Button when ALL Audit monitors are open',
			options: [
				// {
				// 	type: 'dropdown',
				// 	label: 'Override',
				// 	id: 'which',
				// 	default: 1,
				// 	choices: Choices.ON_OFF,
				// },
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(102, 0, 0),
			},
			callback: (feedback, context) => {
				return !!self.auditMonitors
			},
		},
		override: {
			type: 'boolean',
			name: 'Master Override',
			description: 'Set Button when Override is Active',
			options: [
				{
					type: 'dropdown',
					label: 'Override',
					id: 'which',
					default: Choices.OVERRIDE[0].id,
					choices: Choices.OVERRIDE,
				},
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(102, 0, 0),
			},
			callback: (feedback, context) => {
				const options = feedback.options

				return !self.overrides[options.which]
			},
		},
		override_visible: {
			type: 'boolean',
			name: 'Override Window Visible',
			description: 'Set Button when Override Window is visible',
			options: [
				// {
				// 	type: 'dropdown',
				// 	label: 'Override',
				// 	id: 'which',
				// 	default: 1,
				// 	choices: Choices.ON_OFF,
				// },
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(102, 0, 0),
			},
			callback: (feedback, context) => {
				return !!self.overrideWindow
			},
		},
	}
}
