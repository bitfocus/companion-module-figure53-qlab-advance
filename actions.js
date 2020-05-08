// actions for QLab module
var continueMode = [
	{ label: 'Do Not Continue', id: '0' },
	{ label: 'Auto Continue',   id: '1' },
	{ label: 'Auto Follow',     id: '2' }
];

var colorName = [
	{ label: 'None',   id: 'none' },
	{ label: 'Red',    id: 'red' },
	{ label: 'Orange', id: 'orange' },
	{ label: 'Green',  id: 'green' },
	{ label: 'Blue',   id: 'blue' },
	{ label: 'Purple', id: 'purple' }
];

module.exports = {

	setActions: function () {

		var actions = {
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
			'continue': {
				label: 'Set Continue Mode',
				options: [{
					type: 'dropdown',
					label: 'Continue Mode',
					id: 'contId',
					choices: this.continueMode
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
					choices: this.colorName
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
			'go':               { label: 'GO' },
			'pause':            { label: 'Pause' },
			'stop':             { label: 'Stop' },
			'stopSelected':     { label: 'Stop selected' },
			'panic':            { label: 'Panic' },
			'reset':            { label: 'Reset' },
			'previous':         { label: 'Previous Cue' },
			'next':             { label: 'Next Cue' },
			'resume':           { label: 'Resume' },
			'load':             { label: 'Load Cue' },
			'preview':          { label: 'Preview'}
		};
		return(actions);
	}
};
