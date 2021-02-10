// actions for QLab module


var continueMode = [
	{ label: 'Do Not Continue', id: '0' },
	{ label: 'Auto Continue',   id: '1' },
	{ label: 'Auto Follow',     id: '2' }
];

module.exports = {

	setActions: function () {

		var actions = {
			'go':               { label: 'GO' },
			'stop':             { label: 'Stop' },
			'previous':         { label: 'Previous Cue' },
			'next':             { label: 'Next Cue' },
			'pause':            { label: 'Pause' },
			'resume':           { label: 'Resume' },
			'togglePause':		{ label: 'Toggle Pause'},
			'stopSelected':     { label: 'Stop selected' },
			'panic':            { label: 'Panic' },
			'reset':            { label: 'Reset' },
			'load':             { label: 'Load Cue' },
			'preview':          { label: 'Preview'},
			'start': {
				label: 'Start (cue)',
				options: [{
					type: 'textinput',
					label: 'Cue',
					id: 'cue',
					default: "1"
				}]
			},
			'goto': {
				label: 'Go To (cue)',
				options: [{
					type: 'textinput',
					label: 'Cue',
					id: 'cue',
					default: "1"
				}]
			},
			'showMode': {
				label: 'Show mode',
				options: [{
					type: 	'dropdown',
					label: 	'Mode',
					id:		'onOff',
					choices: [{
						id: '1',
						label: 'On'
					}, {
						id: '0',
						label: 'Off',
					}, {
						id: '2',
						label: 'Toggle'
					}]
				}]
			},
			'auditMode': {
				label: 'Audition Window',
				options: [{
					type: 	'dropdown',
					label: 	'Mode',
					id:		'onOff',
					choices: [{
						id: '1',
						label: 'On'
					}, {
						id: '0',
						label: 'Off',
					}, {
						id: '2',
						label: 'Toggle'
					}]
				}]
			},
			'minGo': {
				label: 'Minimum Go',
				options: [{
					type: 'textinput',
					tooltip: 'Double Go Protection Time',
					label: 'Time in Seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "0"
				}]
			},
			'prewait_dec': {
				label: 'Decrease Prewait',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'prewait_inc': {
				label: 'Increase Prewait',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'postwait_dec': {
				label: 'Decrease Postwait',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'postwait_inc': {
				label: 'Increase Postwait',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'duration_dec': {
				label: 'Decrease Duration',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'duration_inc': {
				label: 'Increase Duration',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'startTime_dec': {
				label: 'Decrease Start Time',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'startTime_inc': {
				label: 'Increase Start Time',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'endTime_dec': {
				label: 'Decrease End Time',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'endTime_inc': {
				label: 'Increase End Time',
				options: [{
					type: 'textinput',
					label: 'Time in seconds',
					id: 'time',
					regex: this.REGEX_FLOAT,
					default: "1"
				}]
			},
			'continue': {
				label: 'Set Continue Mode',
				options: [{
					type: 'dropdown',
					label: 'Continue Mode',
					id: 'contId',
					choices: continueMode
				}]
			},
			'arm': {
				label: 'Arm Cue',
				options: [{
					type: 'dropdown',
					label: 'Arm',
					id: 'armId',
					choices: [{
						id: '0',
						label: 'Disable'
					}, {
						id: '1',
						label: 'Enable'
					}, {
						id: '2',
						label: 'Toggle'
					}]
				}]
			},
			'autoload': {
				label: 'Autoload Cue',
				options: [{
					type: 'dropdown',
					label: 'Autoload',
					id: 'autoId',
					choices: [{
						id: '0',
						label: 'Disable'
					}, {
						id: '1',
						label: 'Enable'
					}, {
						id: '2',
						label: 'Toggle'
					}]
				}]
			},
			'flagged': {
				label: 'Flag Cue',
				options: [{
					type: 'dropdown',
					label: 'Flagged',
					id: 'flagId',
					choices: [{
						id: '0',
						label: 'Disable'
					}, {
						id: '1',
						label: 'Enable'
					}, {
						id: '2',
						label: 'Toggle'
					}]
				}]
			},
			'cueColor': {
				label: 'Set Selected Cue Color',
				options: [{
					type: 'dropdown',
					label: 'Color',
					id: 'colorId',
					choices: this.colors.colorName
				}]
			},
			'infiniteLoop': {
				label: 'Set selected to infinite loop',
				options: [{
					type: 'dropdown',
					label: 'on/off',
					id: 'choice',
					choices: [{id: 1, label: "on"}, {id: 0, label: "off"}],
					default: 1
				}]
			},
			'holdLastFrame': {
				label: 'Set selected to hold last frame',
				options: [{
					type: 'dropdown',
					label: 'on/off',
					id: 'choice',
					choices: [{id: 1, label: "on"}, {id: 0, label: "off"}],
					default: 1
				}]
			}
		};
		return(actions);
	}
};
