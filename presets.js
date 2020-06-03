var rgb = require('../../image').rgb;
var colors = require('./colors.js');
var icons = require('../../resources/icons.js');

// determine text color for a background color
textColor = function(pbin){

    var r = pbin >> 16;
    var g = pbin >> 8 & 0xFF;
	var b = pbin & 0xFF;
	var lum = Math.sqrt(
		0.299 * (r * r) +
		0.587 * (g * g) +
		0.114 * (b * b)
		);

	// determine whether the color is light or dark
	if (lum>127.5) {
		return '0';
	} else {
		return '16777215';
	}
};

module.exports = {

	setPresets: function() {

		var presets = [];

		presets.push({
			category: 'CueList',
			label: 'Pause',
			bank: {
				style: 'png',
				text: '',
				png64: icons.ICON_PAUSE_INACTIVE,
				pngalignment: 'center:center',
				size: '18',
				color: rgb(255, 255, 255),
				bgcolor: 0
			},
			actions: [
				{
					action: 'pause',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'GO',
			bank: {
				style: 'png',
				text: '',
				png64: icons.ICON_PLAY_INACTIVE,
				pngalignment: 'center:center',
				size: '18',
				color: rgb(255,255,255),
				bgcolor: 0
			},
			actions: [
				{
					action: 'go',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Resume',
			bank: {
				style: 'text',
				text: 'Resume',
				size: '18',
				color: rgb(0, 0, 0),
				bgcolor: rgb(0, 255, 0)
			},
			actions: [
				{
					action: 'resume',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Stop',
			bank: {
				style: 'text',
				text: 'Stop',
				size: '30',
				color: '16777215',
				bgcolor: rgb(255, 0, 0)
			},
			actions: [
				{
					action: 'stop',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Stop selected',
			bank: {
				style: 'text',
				text: 'Stop selected',
				size: '18',
				color: '16777215',
				bgcolor: rgb(255, 0, 0)
			},
			actions: [
				{
					action: 'stopSelected',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Panic',
			bank: {
				style: 'png',
				text: '',
				png64: icons.ICON_STOP_INACTIVE,
				pngalignment: 'center:center',
				size: '18',
				color: rgb(255,255,255),
				bgcolor: 0
			},
			actions: [
				{
					action: 'panic',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Reset',
			bank: {
				style: 'text',
				text: 'Reset',
				size: '24',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'reset',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Preview',
			bank: {
				style: 'text',
				text: 'Preview',
				size: '18',
				color: '16777215',
				bgcolor: rgb(0, 128, 0)
			},
			actions: [
				{
					action: 'preview',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Previous Cue',
			bank: {
				style: 'png',
				text: '',
				png64: icons.ICON_REW_INACTIVE,
				pngalignment: 'center:center',
				size: '18',
				color: rgb(255,255,255),
				bgcolor: 0
			},
			actions: [
				{
					action: 'previous',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Next Cue',
			bank: {
				style: 'png',
				text: '',
				png64: icons.ICON_FWD_INACTIVE,
				pngalignment: 'center:center',
				size: '18',
				color: rgb(255,255,255),
				bgcolor: 0
			},
			actions: [
				{
					action: 'next',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Load Cue',
			bank: {
				style: 'text',
				text: 'Load\\nCue',
				size: '24',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'load',
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Show Mode',
			bank: {
				style: 'text',
				text: 'Show\\nMode',
				size: '24',
				color: '16777215',
				bgcolor: rgb(0, 128, 0)
			},
			actions: [
				{
					action: 'showMode',
					options: {
						onOff: '1'
					}
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Edit Mode',
			bank: {
				style: 'text',
				text: 'Edit\\nMode',
				size: '24',
				color: '16777215',
				bgcolor: rgb(72, 96, 96)
			},
			actions: [
				{
					action: 'showMode',
					options: {
						onOff: '0'
					}
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Audition ON',
			bank: {
				style: 'text',
				text: 'Audition\\nON',
				size: '18',
				color: '16777215',
				tooltip: 'Opens the Audition Window',
				bgcolor: rgb(0, 64, 128)
			},
			actions: [
				{
					action: 'auditMode',
					options: {
						onOff: '1'
					}
				}
			]
		});

		presets.push({
			category: 'CueList',
			label: 'Audition OFF',
			bank: {
				style: 'text',
				text: 'Audition\\nOFF',
				size: '18',
				color: '16777215',
				tooltip: 'Closes the Audition Window',
				bgcolor: rgb(64, 96, 96)
			},
			actions: [
				{
					action: 'auditMode',
					options: {
						onOff: '0'
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'PreWait Dec 1 sec',
			bank: {
				style: 'text',
				text: 'PreWait\\nDecrease\\n1 sec',
				size: '14',
				color: rgb(255, 255, 255),
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'prewait_dec',
					options: {
						time: '1',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'PreWait Dec 10 sec',
			bank: {
				style: 'text',
				text: 'PreWait\\nDecrease\\n10 sec',
				size: '14',
				color: rgb(255, 255, 255),
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'prewait_dec',
					options: {
						time: '10',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'PreWait inc 10 sec',
			bank: {
				style: 'text',
				text: 'PreWait\\nIncrease\\n10 sec',
				size: '14',
				color: rgb(255, 255, 255),
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'prewait_inc',
					options: {
						time: '10',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'PreWait inc 1sec',
			bank: {
				style: 'text',
				text: 'PreWait\\nIncrease\\n1 sec',
				size: '14',
				color: rgb(255, 255, 255),
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'prewait_inc',
					options: {
						time: '1',
					}
				}
			]
		});


		presets.push({
			category: 'Edit',
			label: 'PostWait Dec 1 sec ',
			bank: {
				style: 'text',
				text: 'PostWait\\nDecrease\\n1 sec',
				size: '14',
				color: rgb(255, 255, 255),
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'postwait_dec',
					options: {
						time: '1',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'PostWait Dec 10 Sec',
			bank: {
				style: 'text',
				text: 'PostWait\\nDecrease\\n10 sec',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'postwait_dec',
					options: {
						time: '10',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'PostWait Inc 10 Sec',
			bank: {
				style: 'text',
				text: 'PostWait\\nIncrease\\n10sec',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'postwait_inc',
					options: {
						time: '10',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'PostWait Inc 1 Sec',
			bank: {
				style: 'text',
				text: 'PostWait\\nIncrease\\n1 sec',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'postwait_inc',
					options: {
						time: '1',
					}
				}
			]
		});


		presets.push({
			category: 'Edit',
			label: 'Duration Dec 1 sec',
			bank: {
				style: 'text',
				text: 'Duration\\nDecrease\\n1 sec',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'duration_dec',
					options: {
						time: '1',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Duration Dec 10sec',
			bank: {
				style: 'text',
				text: 'Duration\\nDecrease\\n10sec',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'duration_dec',
					options: {
						time: '10',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Duration inc 10sec',
			bank: {
				style: 'text',
				text: 'Duration\\nIncrease\\n10 sec',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'duration_inc',
					options: {
						time: '10',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Duration Inc 1sec',
			bank: {
				style: 'text',
				text: 'Duration\\nIncrease\\n1 sec',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'duration_inc',
					options: {
						time: '1',
					}
				}
			]
		});


		presets.push({
			category: 'Edit',
			label: 'Continue Mode DNC',
			bank: {
				style: 'text',
				text: 'Do Not Continue',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'continue',
					options: {
						contId: '0',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Continue mode Auto continue',
			bank: {
				style: 'text',
				text: 'Auto Continue',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'continue',
					options: {
						contId: '1',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Continue mode Auto Follow',
			bank: {
				style: 'text',
				text: 'Auto Follow',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'continue',
					options: {
						contId: '2',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Disarm',
			bank: {
				style: 'text',
				text: 'Disarm',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'arm',
					options: {
						armId: '0',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Arm',
			bank: {
				style: 'text',
				text: 'Arm',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'arm',
					options: {
						armId: '1',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Autoload Enable',
			bank: {
				style: 'text',
				text: 'Autoload Enable',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'autoload',
					options: {
						autoId: '1',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Autoload Disable',
			bank: {
				style: 'text',
				text: 'Autoload Disable',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'autoload',
					options: {
						autoId: '0',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Flagged',
			bank: {
				style: 'text',
				text: 'Flagged',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'flagged',
					options: {
						flaggId: '1',
					}
				}
			]
		});

		presets.push({
			category: 'Edit',
			label: 'Unflagged',
			bank: {
				style: 'text',
				text: 'Unflagged',
				size: '14',
				color: '16777215',
				bgcolor: rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'flagged',
					options: {
						flaggId: '0',
					}
				}
			]
		});

		var i;
		var c;

		for(i in colors.colorName) {
			c = colors.colorName[i];
			presets.push({
				category: 'Edit',
				label: 'Cue Colour',
				bank: {
					style: 'text',
					text: 'Cue Colour ' + c.label,
					//size: '14',
					color: textColor(colors.colorRGB[c.id]),
					bgcolor: colors.colorRGB[c.id]
				},
				actions: [
					{
						action: 'cueColor',
						options: {
							colorId: c.id
						}
					}
				]
			});
		}

		return(presets);
	}
};

