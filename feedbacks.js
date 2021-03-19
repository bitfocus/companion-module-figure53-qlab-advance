module.exports = {

	setFeedbacks: function() {

		var feedbacks = {
			playhead_bg: {
				label: 'Playhead Color for Background',
				description: 'Use the QLab color for the Playhead (next) cue as background',
				callback: function(feedback, bank) {
					var nc = this.wsCues[this.nextCue] ? this.wsCues[this.nextCue].qColor : 0;
					return { bgcolor: nc };
				}.bind(this)
			},
			run_bg: {
				label: 'Running Que color for Background',
				description: 'Use the QLab color of the running cue as background',
				callback: function(feedback, bank) {
					return { bgcolor: this.runningCue.qColor };
				}.bind(this)
			},
			q_bg: {
				label: 'Cue Number color for background',
				description: 'Use the QLab color of the specified cue number as background',
				options: [{
					type: 'textinput',
					label: 'Cue Number',
					id: 'cue',
					default: ""
				}],
				callback: function(feedback, bank) {
					return { bgcolor: this.cueColors[ (feedback.options.cue).replace(/[^\w\.]/gi,'_') ] };
				}.bind(this)
			},
			min_go: {
				label: 'Color for Go button Status',
				description: 'Set Button colors for Go button Status',
				options: [{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: '16777215'
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(0,102,0)
				},
				{
					type: 'dropdown',
					label: 'Status?',
					id: 'goMode',
					default: '1',
					choices: [
						{ id: '0', label: 'Disabled' },
						{ id: '1', label: 'Enabled' }
					]

				}],
				callback: function(feedback, bank) {
					var ret = {};
					var options = feedback.options;

					if (this.goDisabled && (options.goMode == '0')) {
						ret = { color: options.fg, bgcolor: options.bg };
					} else if ((options.goMode == '1')) {
						ret = { color: options.fg, bgcolor: options.bg };
					}
					return ret;
				}.bind(this)
			},
			ws_mode: {
				label: 'Color for Workspace Mode',
				description: 'Set Button colors for Show/Edit/Audition Mode',
				options: [{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: '16777215'
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(0, 128, 0)
				},
				{
					type: 'dropdown',
					label: 'Which Mode?',
					id: 'showMode',
					default: '1',
					choices: [
						{ id: '0', label: 'Edit' },
						{ id: '1', label: 'Show' },
						{ id: '2', label: 'Audition'}
					]
				}],
				callback: function(feedback, bank) {
					var ret = {};
					var options = feedback.options;

					if (this.auditMode && (options.showMode == '2')) {
						ret = { color: options.fg, bgcolor: options.bg };
					} else if (this.showMode && (options.showMode == '1')) {
						ret = { color: options.fg, bgcolor: options.bg };
					} else if (!this.showMode && (options.showMode == '0')) {
						ret = { color: options.fg, bgcolor: options.bg };
					}
					return ret;
				}.bind(this)
			},
			override: {
				label: 'Color for Master Override OFF',
				description: 'Set Button colors when Override is OFF',
				options: [{
					type: 'dropdown',
					label: 'Override',
					id: 'which',
					choices: this.choices.OVERRIDE
				},
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: '16777215'
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(102, 0, 0)
				}],
				callback: function(feedback, bank) {
					var ret = {};
					var options = feedback.options;

					if (!this.overrides[options.which]) {
						ret = { color: options.fg, bgcolor: options.bg };
					}
					return ret;
				}.bind(this)
			},
		};
		return(feedbacks);
	}
};
