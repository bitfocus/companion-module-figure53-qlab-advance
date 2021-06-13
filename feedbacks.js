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
			q_run: {
				type: 'boolean',
				label: 'Indicate Cue is running',
				description: 'Indicate on button when the specified cue is running',
				options: [ {
					type: 'textinput',
					label: 'Cue Number',
					id: 'cue',
					default: ""
				} ],
				style: {
					bgcolor: this.rgb(102,0,0),
					color: this.rgb(255,255,255),
				},
				callback: function(feedback, bank) {
					var opt = feedback.options;
					var rqID = this.cueByNum[opt.cue.replace(/[^\w\.]/gi,'_')];
					var rq = (rqID && this.wsCues[rqID]);
					return (rq && rq.isRunning);
				}.bind(this)
			},
			min_go: {
				type: 'boolean',
				label: 'Indicate Go button Status',
				description: 'Indicate on Button the QLab Go button Status',
				options: [ {
					type: 'dropdown',
					label: 'Status?',
					id: 'goMode',
					default: '1',
					choices: [
						{ id: '0', label: 'Disabled' },
						{ id: '1', label: 'Enabled' }
					]
				}],
				style: {
					color: this.rgb(255,255,255),
					bgcolor: this.rgb(0,102,0),
				},
				callback: function(feedback, bank) {
					var ret = false;
					var options = feedback.options;

					if (this.goDisabled && (options.goMode == '0')) {
						ret = true;
					} else if ((options.goMode == '1')) {
						ret = true;
					}
					return ret;
				}.bind(this)
			},
			ws_mode: {
				type: 'boolean',
				label: 'Indicate Workspace Mode',
				description: 'Indicate on Button QLab Show/Edit/Audition Mode',
				options: [{
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
				style: {
					color: this.rgb(255,255,255),
					bgcolor: this.rgb(0, 128, 0)
				},
				callback: function(feedback, bank) {
					var ret = false;
					var options = feedback.options;

					if (this.auditMode && (options.showMode == '2')) {
						ret = true;
					} else if (this.showMode && (options.showMode == '1')) {
						ret = true;
					} else if (!this.showMode && (options.showMode == '0')) {
						ret = true;
					}
					return ret;
				}.bind(this)
			},
			override: {
				type: 'boolean',
				label: 'Color for Master Override',
				description: 'Set Button colors when Override is Active',
				options: [{
					type: 'dropdown',
					label: 'Override',
					id: 'which',
					choices: this.choices.OVERRIDE
				}],
				style: {
					color: this.rgb(255,255,255),
					bgcolor: this.rgb(102, 0, 0)
				},
				callback: function(feedback, bank) {
					var ret = false;
					var options = feedback.options;

					if (!this.overrides[options.which]) {
						ret = true;
					}
					return ret;
				}.bind(this)
			},
		};
		return(feedbacks);
	}
};
