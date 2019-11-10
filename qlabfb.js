var instance_skel = require('../../instance_skel');
var debug;
// eslint-disable-next-line no-unused-vars
var log;
var OSC = require('osc');

// eslint-disable-next-line no-unused-vars
function instance(system, id, config) {
	var self = this;
	var po = 0;
	self.connecting = false;
	self.needPasscode = false;
	self.useTCP = config.useTCP;

	self.ws = '';

	self.resetVars();

	self.colorRGB = {
		none: 	self.rgb(32, 32, 32),
		red: 	self.rgb(160, 0, 0),
		orange: self.rgb(160, 100, 0),
		green: 	self.rgb(0, 160, 0),
		blue: 	self.rgb(0, 0, 160),
		purple: self.rgb(160, 0, 160)
	};

	// each instance needs a separate local port
	id.split('').forEach(function (c) {
		po += c.charCodeAt(0);
	});

	self.port_offset = po;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions
	self.addUpgradeScript(function (config, actions) {
		var changed = false;

		for (var k in actions) {
			var action = actions[k];

			if (action.action == "autoLoad") {
				if (action.options.autoId == 1) {
					action.action = "autoload";
					action.label = action.id + ":" + action.action;
					changed = true;
				}
			}
		}
		if (config.useTenths == undefined) {
			config.useTenths = false;
			changed = true;
		}
		return changed;
	});

	return self;
}

var qCueRequest = [
	{
		type: "s",
		value: '["number","uniqueID","listName","type","isPaused","currentDuration","actionElapsed",' +
			'"colorName","isRunning","isLoaded","armed","isBroken","percentActionElapsed","cartPosition"]'
	}
];

instance.prototype.resetVars = function (doUpdate) {
	var self = this;
	var qName = '';
	var qNum = '';
	var cues = self.cueList;

	// play head info
	self.nextCue = {
		ID: '',
		Name: '[none]',
		Num: '',
		Loaded: false,
		Broken: false,
		Running: false,
		Paused: false,
		Color: self.rgb(0, 0, 0)
	};
	// most recent running cue
	self.runningCue = {
		ID: '',
		Name: '[none]',
		Num: '',
		Loaded: false,
		Broken: false,
		Running: false,
		Paused: false,
		Duration: 0,
		PctElapsed: 0,
		Color: self.rgb(0, 0, 0)
	};
	// clear 'variables'
	if (doUpdate && self.useTCP) {
		self.updateNextCue();
		self.updatePlaying();

		Object.keys(cues).forEach(function (cue) {
			qNum = cues[cue].qNumber;
			qName = cues[cue].qName;
			if (qNum != '' && qName != '') {
				self.setVariable('q_' + qNum + '_name');
			}
		});
	}

	// need a valid QLab reply
	self.needWorkspace = true;
	self.needPasscode = false;

	// list of cues and info for by this QLab workspace
	self.cueList = {};
	self.cueColors = {};
	self.cueOrder = [];
	self.lastRunID = '-' + self.lastRunID;
	self.showMode = false;
	self.audition = false;
};

instance.prototype.updateNextCue = function () {
	var self = this;

	self.setVariable('n_id', self.nextCue.ID);
	self.setVariable('n_name', self.nextCue.Name);
	self.setVariable('n_num', self.nextCue.Num);
	self.setVariable('n_stat', self.nextCue.Broken ? "\u2715" :
							self.nextCue.Running ? "\u23F5" :
							self.nextCue.Paused ? "\u23F8" :
							self.nextCue.Loaded ? "\u23FD" :
							"\u00b7");
	self.checkFeedbacks('playhead_bg');
};

instance.prototype.updateQVars = function (q) {
	var self = this;
	var qID = q.uniqueID;
	var qNum = (q.qNumber).replace(/[^\w\.]/gi,'_');
	var qColor = q.qColor;
	var oqNum = '';
	var oqName = '';
	var oqColor = 0;

	// unset old variable?
	if (qID in self.cueList) {
		oqNum = self.cueList[qID].qNumber.replace(/[^\w\.]/gi,'_');
		oqName = self.cueList[qID].qName;
		if (oqNum != '' && oqNum != q.qNumber) {
			self.setVariable('q_' + oqNum + '_name');
			self.cueColors[oqNum] = 0;
			oqName = '';
		}
	}
	// set new value
	if (qNum != '' && q.qName != '' && (q.qName != oqName || qColor != oqColor)) {
		self.setVariable('q_' + qNum + '_name', q.qName);
		self.cueColors[qNum] = q.qColor;
		self.checkFeedbacks('q_bg');
	}

};

instance.prototype.updateRunning = function () {
	var self = this;
	var tenths = (self.config.useTenths ? 0 : 1);

	var tLeft = self.runningCue.Duration * (1 - self.runningCue.PctElapsed);
	if (tLeft > 0) {
		tLeft += tenths;
	}
	var h = Math.floor(tLeft / 3600);
	var hh = ('00' + h).slice(-2);
	var m = Math.floor(tLeft / 60) % 60;
	var mm = ('00' + m).slice(-2);
	var s = Math.floor(tLeft % 60);
	var ss = ('00' + s).slice(-2);
	var ft = '';

	if (hh > 0) {
		ft = hh + ":";
	}
	if (mm > 0) {
		ft = ft + mm + ":";
	}
	ft = ft + ss;

	if (tenths == 0) {
		var f = Math.floor((tLeft - Math.trunc(tLeft)) * 10);
		var ms = ('0' + f).slice(-1);
		if (tLeft < 5 && tLeft != 0) {
			ft = ft.slice(-1) + "." + ms;
		}
	}

	self.setVariable('r_id', self.runningCue.ID);
	self.setVariable('r_name', self.runningCue.Name);
	self.setVariable('r_num', self.runningCue.Num);
	self.setVariable('r_stat', self.runningCue.Broken ? "\u2715" :
							self.runningCue.Running ? "\u23F5" :
							self.runningCue.Paused ? "\u23F8" :
							self.runningCue.Loaded ? "\u23FD" :
							"\u00b7");
	self.setVariable('r_hhmmss',hh + ":" + mm + ":" + ss);
	self.setVariable('r_hh', hh);
	self.setVariable('r_mm', mm);
	self.setVariable('r_ss', ss);
	self.setVariable('r_left',ft);
	self.checkFeedbacks('run_bg');
};

instance.prototype.JSONtoCue = function (j, i) {
	var self = this;

	self.uniqueID = j.uniqueID;
	self.qName = j.listName;
	self.qNumber = j.number;
	self.qColorName = j.colorName;
	self.qType = j.type.toLowerCase();
	self.isRunning = j.isRunning;
	self.isLoaded = j.isLoaded;
	self.isBroken = j.isBroken;
	self.isPaused = j.isPaused;
	self.duration = j.currentDuration;
	self.pctElapsed = j.percentActionElapsed;
	self.qOrder = j.qOrder;

	if (self.isRunning || self.isPaused) {
		if (self.uniqueID in i.cueList) {
			if (0 == (self.startedAt = i.cueList[self.uniqueID].startedAt)) {
				self.startedAt = Date.now();
			}
		} else {
			self.startedAt = Date.now();
			debug("Cue " + self.qNumber + "@" + self.startedAt);
		}
	} else {
		self.startedAt = 0;
	}
	self.qColor = i.colorRGB[self.qColorName];
};

instance.prototype.updateConfig = function (config) {
	var self = this;
	var ws = "";

	self.config = config;
	ws = self.config.workspace;

	if (ws !== undefined && ws !== "" && ws !== "default") {
		self.ws = "/workspace/" + ws;
	} else {
		self.ws = "";
	}

	if (config.useTCP == undefined ) {
		config.useTCP = true;
	}

	self.useTCP = config.useTCP;

	self.resetVars();
	self.init_osc();
	self.init_presets();
	if (self.useTCP) {
		self.init_variables();
		self.init_feedbacks();
	} else {
		self.setFeedbackDefinitions({});
		self.setVariableDefinitions([]);
	}
};

instance.prototype.init = function () {
	var self = this;

	self.status(self.STATUS_UNKNOWN, 'Connecting');

	debug = self.debug;
	log = self.log;
	self.init_osc();
	self.init_presets();
	if (self.useTCP){
		self.init_variables();
		self.init_feedbacks();
	} else {
		self.setFeedbackDefinitions({});
		self.setVariableDefinitions([]);
	}
};

instance.prototype.init_feedbacks = function () {
	var self = this;

	var feedbacks = {
		playhead_bg: {
			label: 'Playhead Color for Background',
			description: 'Use the QLab color for the Playhead (next) cue as background'
		},
		run_bg: {
			label: 'Running Que color for Background',
			description: 'Use the QLab color of the running cue as background'
		},
		q_bg: {
			label: 'Cue Number color for background',
			description: 'Use the QLab color of the specified cue number as background',
			options: [{
				type: 'textinput',
				label: 'Cue Number',
				id: 'cue',
				default: ""
			}]

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
		},

	};
	self.setFeedbackDefinitions(feedbacks);
};

// eslint-disable-next-line no-unused-vars
instance.prototype.feedback = function (feedback, bank) {
	var self = this;
	var options = feedback.options;
	var ret = {};

	switch (feedback.type) {
	case 'playhead_bg':
		ret = { bgcolor: self.nextCue.Color };
		break;
	case 'run_bg':
		ret = { bgcolor: self.runningCue.Color };
		break;
	case 'q_bg':
		ret = { bgcolor: self.cueColors[ (options.cue).replace(/[^\w\.]/gi,'_') ] };
		break;
	case 'ws_mode':
		if (self.auditMode && (options.showMode == '2')) {
			ret = { color: options.fg, bgcolor: options.bg };
		} else if (self.showMode && (options.showMode == '1')) {
			ret = { color: options.fg, bgcolor: options.bg };
		} else if (!self.showMode && (options.showMode == '0')) {
			ret = { color: options.fg, bgcolor: options.bg };
		}
		break;
	}
	return ret;
};

instance.prototype.sendOSC = function (node, arg) {
	var self = this;

	if (!self.useTCP) {
		var host = "";
		if (self.config.host !== undefined && self.config.host !== ""){
			host = self.config.host;
		}
		if (self.config.passcode !== undefined && self.config.passcode !== "") {
			self.system.emit('osc_send', host, 53000, "/connect", [self.config.passcode]);
		}
		self.system.emit('osc_send',host, 53000, node, arg);
	} else 	if (self.ready) {
		self.qSocket.send({
			address: node,
			args: arg
		});
	}
};

instance.prototype.init_variables = function () {
	var self = this;

	var variables = [
		{
			label: 'Version of QLab attached to this instance',
			name:  'q_ver'
		},
		{
			label: 'Playhead Cue UniqueID',
			name:  'n_id'
		},
		{
			label: 'Playhead Cue Name',
			name:  'n_name'
		},
		{
			label: 'Playhead Cue Number',
			name:  'n_num'
		},
		{
			label: 'Playhead Cue Status',
			name:  'n_stat'
		},
		{
			label: 'Running Cue UniqueID',
			name:  'r_id'
		},
		{
			label: 'Running Cue Name',
			name:  'r_name'
		},
		{
			label: 'Running Cue Number',
			name:  'r_num'
		},
		{
			label: 'Running Cue Status',
			name:  'r_stat'
		},
		{
			label: 'Running Cue Time left, variable size',
			name:  'r_left'
		},
		{
			label: 'Running Cue Time left, HH:MM:SS',
			name:  'r_hhmmss'
		},
		{
			label: 'Running Cue Time left, Hour',
			name:  'r_hh'
		},
		{
			label: 'Running Cue Time left, Minute',
			name:  'r_mm'
		},
		{
			label: 'Running Cue Time left, Second',
			name:  'r_ss'
		}
	];

	self.setVariableDefinitions(variables);
	self.updateRunning();
	self.updateNextCue();
};

instance.prototype.connect = function () {
	var self = this;
	self.status(self.STATUS_UNKNOWN, "Connecting");
	self.init_osc();
};

// get current status of QLab cues and playhead
// and ask for updates
instance.prototype.prime_vars = function (ws) {
	var self = this;

	if (self.needPasscode && (self.config.passcode == undefined || self.config.passcode == "")) {
		self.status(self.STATUS_UNKNOWN, "Wrong Passcode");
		self.status(self.STATUS_WARNING, "Wrong Passcode");
		self.debug("waiting for passcode");
		self.sendOSC(ws + "/connect", []);
		if (self.timer !== undefined) {
			clearTimeout(self.timer);
			self.timer = undefined;
		}
		if (self.pulse !== undefined) {
			clearInterval(self.pulse);
			self.pulse = undefined;
		}
		self.timer = setTimeout(function () { self.prime_vars(ws); }, 5000);
	} else if (self.needWorkspace && self.ready) {
		if (self.config.passcode !== undefined && self.config.passcode !== "") {
			self.debug("sending passcode to", self.config.host);
			self.sendOSC(ws + "/connect", [
				{
					type: "s",
					value: self.config.passcode
				}]
			);
		} else {
			self.sendOSC(ws + "/connect", []);
		}
		self.sendOSC(ws + "/version");

		// request variable/feedback info
		// get list of running cues
		self.sendOSC(ws + "/cue/playhead/uniqueID", []);
		self.sendOSC(ws + "/updates", [
			{
				type: "i",
				value: 1
			}]
		);
		self.sendOSC(ws + "/updates", []);
		self.sendOSC(ws + "/cueLists", []);
		self.sendOSC(ws + "/auditionWindow",[]);
		self.sendOSC(ws + "/showMode",[]);
		self.timer = setTimeout(function () { self.prime_vars(ws); }, 5000);
	}
};

/**
 * heartbeat/poll function for 'updates' that aren't automatic
 */
instance.prototype.rePulse = function (ws) {
	var self = this;
	var rc = self.runningCue.ID;

	self.sendOSC(ws + "/auditionWindow", []);
	if (rc !== undefined && rc !== '') {
//		self.sendOSC(ws + "/cue/" + rc + "/valuesForKeys", qCueRequest);
		self.sendOSC(ws + "/cue/active/valuesForKeys", qCueRequest);
	}
};

instance.prototype.init_osc = function () {
	var self = this;
	var ws = self.ws;

	if (self.connecting) {
		return;
	}

	if (self.qSocket) {
		self.qSocket.close();
	}

	if (!self.useTCP) {
		self.status(self.STATUS_OK, "UDP Mode");
		return;
	}

	if (self.config.host) {
		self.qSocket = new OSC.TCPSocketPort({
			localAddress: "0.0.0.0",
			localPort: 53000 + self.port_offset,
			address: self.config.host,
			port: 53000,
			metadata: true
		});
		self.connecting = true;

		self.qSocket.open();

		self.qSocket.on("error", function (err) {
			debug("Error", err);
			self.log('error', "Error: " + err.message);
			self.connecting = false;
			self.status(self.STATUS_ERROR, "Can't connect to QLab");
			if (err.code == "ECONNREFUSED") {
				self.qSocket.removeAllListeners();
				if (self.timer !== undefined) {
					clearTimeout(self.timer);
				}
				if (self.pulse !== undefined) {
					clearInterval(self.pulse);
					self.pulse = undefined;
				}
				self.timer = setTimeout(function () { self.connect(); }, 5000);
			}
		});

		self.qSocket.on("close", function () {
			self.log('error', "TCP Connection to QLab Closed");
			self.connecting = false;
			if (self.ready) {
				self.needWorkspace = true;
				self.needPasscode = false;
				self.resetVars(true);
				self.qSocket.removeAllListeners();
				debug("Connection closed");
				self.ready = false;
				self.status(self.STATUS_WARNING, "CLOSED");
			}
			if (self.timer !== undefined) {
				clearTimeout(self.timer);
			}
			if (self.pulse !== undefined) {
				clearInterval(self.pulse);
				self.pulse = undefined;
			}
			self.timer = setTimeout(function () { self.connect(); }, 5000);
		});

		self.qSocket.on("ready", function () {
			self.ready = true;
			self.connecting = false;
			self.log('info',"Connected to QLab:" + self.config.host);
			self.status(self.STATUS_WARNING, "No Workspaces");
			self.needWorkspace = true;

			self.prime_vars(ws);

		});

		self.qSocket.on("message", function (message) {
			// debug("received ", message, "from", self.qSocket.options.address);
			if (message.address.match(/^\/update\//)) {
				// debug("readUpdate");
				self.readUpdate(message);
			} else if (message.address.match(/^\/reply\//)) {
				// debug("readReply");
				self.readReply(message);
			} else {
				debug(message.address, message.args);
			}
		});
	}
	// self.qSocket.on("data", function(data){
	// 	debug ("Got",data, "from",self.qSocket.options.address);
	// });
};

/**
 * update list cues
 */
instance.prototype.updateCues = function (cue, stat) {
	var self = this;
	// list of useful cue types don't really need status for a 'cue list'
	var qTypes = ['audio', 'mic', 'video', 'camera',
		'text', 'light', 'fade', 'network', 'midi', 'midi file',
		'timecode', 'group', 'start', 'stop', 'pause', 'load',
		'reset', 'devamp', 'goto', 'target', 'cart', 'cue list',
		'arm', 'disarm', 'wait', 'memo', 'script'
	];
	var q = {};

	if (Array.isArray(cue)) {
		var i = 0;
		while (i < cue.length) {
			q = new self.JSONtoCue(cue[i], self);
			q.qOrder = i;
			if (qTypes.includes(q.qType)) {
				self.updateQVars(q);
				self.cueList[q.uniqueID] = q;
			}
			if (stat == 'l') {
				self.cueOrder[i] = q.uniqueID;
			}
			i += 1;
		}
	} else {
		q = new self.JSONtoCue(cue, self);
		if (qTypes.includes(q.qType)) {
			self.updateQVars(q);
			self.cueList[q.uniqueID] = q;
			self.updatePlaying();
			if (q.uniqueID == self.nextCue.ID) {
				self.nextCue.Name = q.qName;
				self.nextCue.Num = q.qNumber;
				self.nextCue.Color = q.qColor;
				self.nextCue.Loaded = q.isLoaded;
				self.nextCue.Broken = q.isBroken;
				self.nextCue.Running = q.isRunning;
				self.nextCue.Paused = q.isPaused;
				self.updateNextCue();
			}
		}
	}
};

/**
 * update list of running cues
 */
instance.prototype.updatePlaying = function () {

	function qState (q) {
		var ret = q.ID + ':';
		ret +=
			q.Broken ? '0' :
			q.Running ? '1' :
			q.Paused ? '2' :
			q.Loaded ? '3' :
			'4';
		ret += ":" + q.Duration + ":" + q.PctElapsed;
		return ret;
	}

	var self = this;
	var hasGroup = false;
	var i = 0;
	var cues = self.cueList;
	var lastRun = qState(self.runningCue);
	var runningCues = [];

	Object.keys(cues).forEach(function (cue) {
		if (cues[cue].duration > 0  && (cues[cue].isRunning || cues[cue].isPaused)) {
			runningCues.push([cue, cues[cue].startedAt]);
			if (cues[cue].qType == "group") {
				hasGroup = true;
			}
		}
	});

	runningCues.sort(function (a, b) {
		return b[1] - a[1];
	});

	if (runningCues.length == 0) {
		self.runningCue = {
			ID: 		'-',
			Name: 		'[none]',
			Num: 		'',
			Loaded: 	false,
			Running: 	false,
			Paused: 	false,
			Duration:	0,
			PctElapsed: 0,
			Color: 		self.rgb(0, 0, 0)
		};
	} else {
		if (hasGroup) {
			while (cues[runningCues[i][0]].qType != "group" && i < runningCues.length) {
				i += 1;
			}
		}
		if (i < runningCues.length) {
			var q = cues[runningCues[i][0]];
			self.runningCue = {
				ID: 		q.uniqueID,
				Name: 		q.qName,
				Num: 		q.qNumber,
				Color: 		q.qColor,
				Loaded: 	q.isLoaded,
				Paused: 	q.isPaused,
				Running: 	q.isRunning,
				Duration: 	q.duration,
				PctElapsed: q.pctElapsed
			};
		}
	}
	// update if changed
	if (qState(self.runningCue) != lastRun) {
		self.updateRunning(true);
	}
};

/**
 * process QLab 'update'
 */
instance.prototype.readUpdate = function (message) {
	var self = this;
	var ws = self.ws;
	var ma = message.address;
	var mf = ma.split('/');

	/**
	 * A QLab 'update' message is just the uniqueID for a cue where something 'changed'.
	 * We have to request any other information we need (name, number, isRunning, etc.)
	 */

	if (ma.match(/playbackPosition$/)) {
		if (message.args.length > 0) {
			var oa = message.args[0].value;
			if (oa !== self.nextCue) {
				// playhead changed
				self.nextCue.ID = oa;
				self.sendOSC(ws + "/cue/playhead/valuesForKeys", qCueRequest);
			}
		} else {
			self.nextCue.ID = '';
			self.nextCue.Name = '[none]';
			self.nextCue.Num = '';
			self.nextCue.qColor = 0;
			self.nextCue.Loaded = false;
			self.updateNextCue();
		}
	} else if (ma.match(/\/cue_id\//) && !(ma.match(/cue lists\]$/))) {
		// get cue information for 'updated' cue
		var node = ma.substring(7) + "/valuesForKeys";
		self.sendOSC(node, qCueRequest);
	} else if (ma.match(/\/disconnect$/)) {
		self.status(self.STATUS_WARNING, "No Workspaces");
		self.needWorkspace = true;
		self.needPasscode = false;
		self.lastRunID = 'x';
		self.resetVars(true);
		self.prime_vars(ws);
	} else if ((mf.length == 4) && (mf[2] == 'workspace')) {
		self.sendOSC("/showMode",[]);
		self.sendOSC("/auditionWindow",[]);
	}
	// add generic 'workspace' update, probably show/edit toggle
};


/**
 * process QLab 'reply'
 */
instance.prototype.readReply = function (message) {
	var self = this;
	var ws = self.ws;
	var ma = message.address;
	var j = {};

	try {
		j = JSON.parse(message.args[0].value);
	} catch (error) { /* ingnore errors */ }

	if (ma.match(/\/connect$/)) {
		if (j.data == "badpass") {
			if (!self.needPasscode) {
				self.needPasscode = true;
				self.status(self.STATUS_WARNING, "Wrong Passcode");
				self.prime_vars(ws);
			}
		} else if (j.data == "error") {
			self.needPasscode = false;
			self.needWorkspace = true;
			self.status(self.STATUS_WARNING, "No Workspaces");
		} else if (j.data == "ok") {
			self.needPasscode = false;
			self.needWorkspace = true;
			self.status(self.STATUS_OK, "Connected");
		}
	}
	if (ma.match(/updates$/)) {
		self.needWorkspace = false;
		self.status(self.STATUS_OK, "Connected to QLab");
		self.pulse = setInterval(function() { self.rePulse(ws); }, 100);
	} else if (ma.match(/version$/)) {
		if (j.data != undefined) {
			self.setVariable('q_ver', j.data);
		}
		self.needWorkspace = true;
	} else if (ma.match(/uniqueID$/)) {
		if (j.data != undefined) {
			self.nextCue.ID = j.data;
			self.sendOSC(ws + "/cue/playhead/valuesForKeys", qCueRequest);
		}
	} else if (ma.match(/\/cueLists$/)) {
		if (j.data != undefined) {
			var i = 0;
			while (i < j.data.length) {
				var q = j.data[i];
				self.updateCues(q, 'l');
				self.updateCues(q.cues,'l');
				i++;
			}			// self.sendOSC(ws + "/runningCues")
			self.sendOSC(ws + "/cue/active/valuesForKeys",qCueRequest);
		}
	} else if (ma.match(/valuesForKeys$/)) {
		self.updateCues(j.data, 'v');
	} else if (ma.match(/showMode$/)) {
		self.showMode = j.data;
		self.checkFeedbacks('ws_mode');
	} else if (ma.match(/auditionWindow$/)) {
		self.auditMode = j.data;
		self.checkFeedbacks('ws_mode');
	}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'Controls Qlab by <a href="https://figure53.com/" target="_new">Figure 53</a>' +
				'<br>Feedback and variables require TCP<br>which will increase network traffic.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 6,
			tooltip: 'The IP of the computer running QLab',
			regex: self.REGEX_IP
		},
		{
			type: 'checkbox',
			label: 'Use TCP?',
			id: 'useTCP',
			width: 20,
			tooltip: 'Use TCP instead of UDP\nRequired for feedbacks',
			default: false
		},
		{
			type: 'checkbox',
			label: 'Use Tenths',
			id: 'useTenths',
			width: 20,
			tooltip: 'Show .1 second resolution for cue remaining timer?\nOtherwise offset countdown by +1 second\nRequires TCP',
			default: false
		},
		{
			type: 'textinput',
			id: 'passcode',
			label: 'OSC Pascode',
			width: 12,
			tooltip: 'The passcode to controll QLab.\nLeave blank if not needed.'
		},
		{
			type: 'textinput',
			id: 'workspace',
			label: 'Workspace',
			width: 12,
			tooltip: 'Enter the name or ID for the workspace.\n Leave blank or enter \'default\' for the front Workspace',
			default: 'default'
		}
	];
};

instance.prototype.init_presets = function () {
	var self = this;
	var presets = [

		{
			category: 'CueList',
			label: 'Pause / Resume',
			bank: {
				style: 'text',
				text: 'Pause',
				size: '18',
				color: self.rgb(0, 0, 0),
				bgcolor: self.rgb(255, 255, 0),

			},
			actions: [
				{
					action: 'pause',
				}
			]
		},
		{
			category: 'CueList',
			label: 'GO',
			bank: {
				style: 'text',
				text: 'GO',
				size: '30',
				color: self.rgb(0, 0, 0),
				bgcolor: self.rgb(0, 255, 0)
			},
			actions: [
				{
					action: 'go',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Resume',
			bank: {
				style: 'text',
				text: 'Resume',
				size: '18',
				color: self.rgb(0, 0, 0),
				bgcolor: self.rgb(0, 255, 0)
			},
			actions: [
				{
					action: 'resume',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Stop',
			bank: {
				style: 'text',
				text: 'Stop',
				size: '30',
				color: '16777215',
				bgcolor: self.rgb(255, 0, 0)
			},
			actions: [
				{
					action: 'stop',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Panic',
			bank: {
				style: 'text',
				text: 'Panic',
				size: '24',
				color: '16777215',
				bgcolor: self.rgb(255, 0, 0)
			},
			actions: [
				{
					action: 'panic',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Reset',
			bank: {
				style: 'text',
				text: 'Reset',
				size: '24',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'reset',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Preview',
			bank: {
				style: 'text',
				text: 'Preview',
				size: '18',
				color: '16777215',
				bgcolor: self.rgb(0, 128, 0)
			},
			actions: [
				{
					action: 'preview',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Previous Cue',
			bank: {
				style: 'text',
				text: 'Prev\\nCue',
				size: '24',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 128)
			},
			actions: [
				{
					action: 'previous',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Next Cue',
			bank: {
				style: 'text',
				text: 'Next\\nCue',
				size: '24',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'next',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Load Cue',
			bank: {
				style: 'text',
				text: 'Load\\nCue',
				size: '24',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'load',
				}
			]
		},
		{
			category: 'CueList',
			label: 'Show Mode',
			bank: {
				style: 'text',
				text: 'Show\\nMode',
				size: '24',
				color: '16777215',
				bgcolor: self.rgb(0, 128, 0)
			},
			actions: [
				{
					action: 'showMode',
					options: {
						onOff: '1'
					}
				}
			]
		},
		{
			category: 'CueList',
			label: 'Edit Mode',
			bank: {
				style: 'text',
				text: 'Edit\\nMode',
				size: '24',
				color: '16777215',
				bgcolor: self.rgb(72, 96, 96)
			},
			actions: [
				{
					action: 'showMode',
					options: {
						onOff: '0'
					}
				}
			]
		},
		{
			category: 'CueList',
			label: 'Audition ON',
			bank: {
				style: 'text',
				text: 'Audition\\nON',
				size: '18',
				color: '16777215',
				tooltip: 'Opens the Audition Window',
				bgcolor: self.rgb(0, 64, 128)
			},
			actions: [
				{
					action: 'auditMode',
					options: {
						onOff: '1'
					}
				}
			]
		},
		{
			category: 'CueList',
			label: 'Audition OFF',
			bank: {
				style: 'text',
				text: 'Audition\\nOFF',
				size: '18',
				color: '16777215',
				tooltip: 'Closes the Audition Window',
				bgcolor: self.rgb(64, 96, 96)
			},
			actions: [
				{
					action: 'auditMode',
					options: {
						onOff: '0'
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'PreWait Dec 1 sec',
			bank: {
				style: 'text',
				text: 'PreWait\\nDecrease\\n1 sec',
				size: '14',
				color: self.rgb(255, 255, 255),
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'prewait_dec',
					options: {
						time: '1',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'PreWait Dec 10 sec',
			bank: {
				style: 'text',
				text: 'PreWait\\nDecrease\\n10 sec',
				size: '14',
				color: self.rgb(255, 255, 255),
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'prewait_dec',
					options: {
						time: '10',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'PreWait inc 10 sec',
			bank: {
				style: 'text',
				text: 'PreWait\\nIncrease\\n10 sec',
				size: '14',
				color: self.rgb(255, 255, 255),
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'prewait_inc',
					options: {
						time: '10',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'PreWait inc 1sec',
			bank: {
				style: 'text',
				text: 'PreWait\\nIncrease\\n1 sec',
				size: '14',
				color: self.rgb(255, 255, 255),
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'prewait_inc',
					options: {
						time: '1',
					}
				}
			]
		},

		{
			category: 'Edit',
			label: 'PostWait Dec 1 sec ',
			bank: {
				style: 'text',
				text: 'PostWait\\nDecrease\\n1 sec',
				size: '14',
				color: self.rgb(255, 255, 255),
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'postwait_dec',
					options: {
						time: '1',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'PostWait Dec 10 Sec',
			bank: {
				style: 'text',
				text: 'PostWait\\nDecrease\\n10 sec',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'postwait_dec',
					options: {
						time: '10',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'PostWait Inc 10 Sec',
			bank: {
				style: 'text',
				text: 'PostWait\\nIncrease\\n10sec',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'postwait_inc',
					options: {
						time: '10',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'PostWait Inc 1 Sec',
			bank: {
				style: 'text',
				text: 'PostWait\\nIncrease\\n1 sec',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'postwait_inc',
					options: {
						time: '1',
					}
				}
			]
		},

		{
			category: 'Edit',
			label: 'Duration Dec 1 sec',
			bank: {
				style: 'text',
				text: 'Duration\\nDecrease\\n1 sec',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'duration_dec',
					options: {
						time: '1',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Duration Dec 10sec',
			bank: {
				style: 'text',
				text: 'Duration\\nDecrease\\n10sec',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'duration_dec',
					options: {
						time: '10',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Duration inc 10sec',
			bank: {
				style: 'text',
				text: 'Duration\\nIncrease\\n10 sec',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'duration_inc',
					options: {
						time: '10',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Duration Inc 1sec',
			bank: {
				style: 'text',
				text: 'Duration\\nIncrease\\n1 sec',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'duration_inc',
					options: {
						time: '1',
					}
				}
			]
		},

		{
			category: 'Edit',
			label: 'Continue Mode DNC',
			bank: {
				style: 'text',
				text: 'Do Not Continue',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'continue',
					options: {
						contId: '0',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Continue mode Auto continue',
			bank: {
				style: 'text',
				text: 'Auto Continue',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'continue',
					options: {
						contId: '1',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Continue mode Auto Follow',
			bank: {
				style: 'text',
				text: 'Auto Follow',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'continue',
					options: {
						contId: '2',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Disarm',
			bank: {
				style: 'text',
				text: 'Disarm',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'arm',
					options: {
						armId: '0',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Arm',
			bank: {
				style: 'text',
				text: 'Arm',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'arm',
					options: {
						armId: '1',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Autoload Enable',
			bank: {
				style: 'text',
				text: 'Autoload Enable',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'autoload',
					options: {
						autoId: '1',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Autoload Disable',
			bank: {
				style: 'text',
				text: 'Autoload Disable',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'autoload',
					options: {
						autoId: '0',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Flagged',
			bank: {
				style: 'text',
				text: 'Flagged',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'flagged',
					options: {
						flaggId: '1',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Unflagged',
			bank: {
				style: 'text',
				text: 'Unflagged',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 100)
			},
			actions: [
				{
					action: 'flagged',
					options: {
						flaggId: '0',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Cue Colour',
			bank: {
				style: 'text',
				text: 'Cue Colour',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [
				{
					action: 'cueColor',
					options: {
						colorId: 'none',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Cue Colour',
			bank: {
				style: 'text',
				text: 'Cue Colour',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(255, 0, 0)
			},
			actions: [
				{
					action: 'cueColor',
					options: {
						colorId: 'red',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Cue Colour',
			bank: {
				style: 'text',
				text: 'Cue Colour',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(200, 200, 0)
			},
			actions: [
				{
					action: 'cueColor',
					options: {
						colorId: 'yellow',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Cue Colour',
			bank: {
				style: 'text',
				text: 'Cue Colour',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 200, 0)
			},
			actions: [
				{
					action: 'cueColor',
					options: {
						colorId: 'green',
					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Cue Colour',
			bank: {
				style: 'text',
				text: 'Cue Colour',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 255)
			},
			actions: [
				{
					action: 'cueColor',
					options: {
						colorId: 'blue',

					}
				}
			]
		},
		{
			category: 'Edit',
			label: 'Cue Colour',
			bank: {
				style: 'text',
				text: 'Cue Colour',
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(255, 0, 255)
			},
			actions: [
				{
					action: 'cueColor',
					options: {
						colorId: 'purple',
					}
				}
			]
		},
	];

	self.setPresetDefinitions(presets);
};


// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;
	if (self.timer !== undefined) {
		clearTimeout(self.timer);
	}
	if (self.pulse !== undefined) {
		clearInterval(self.pulse);
	}
	self.resetVars(true);
	self.status(self.STATUS_UNKNOWN,"Disabled");
	debug("destroy", self.id);
};

instance.prototype.continueMode = [
	{ label: 'Do Not Continue', id: '0' },
	{ label: 'Auto Continue',   id: '1' },
	{ label: 'Auto Follow',     id: '2' }
];

instance.prototype.colorName = [
	{ label: 'None',   id: 'none' },
	{ label: 'Red',    id: 'red' },
	{ label: 'Orange', id: 'orange' },
	{ label: 'Green',  id: 'green' },
	{ label: 'Blue',   id: 'blue' },
	{ label: 'Purple', id: 'purple' }
];


// eslint-disable-next-line no-unused-vars
instance.prototype.actions = function (system) {
	var self = this;
	self.system.emit('instance_actions', self.id, {
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
				default: "1"
			}]
		},
		'prewait_inc': {
			label: 'Increase Prewait',
			options: [{
				type: 'textinput',
				label: 'Time in seconds',
				id: 'time',
				default: "1"
			}]
		},
		'postwait_dec': {
			label: 'Decrease Postwait',
			options: [{
				type: 'textinput',
				label: 'Time in seconds',
				id: 'time',
				default: "1"
			}]
		},
		'postwait_inc': {
			label: 'Increase Postwait',
			options: [{
				type: 'textinput',
				label: 'Time in seconds',
				id: 'time',
				default: "1"
			}]
		},
		'duration_dec': {
			label: 'Decrease Duration',
			options: [{
				type: 'textinput',
				label: 'Time in seconds',
				id: 'time',
				default: "1"
			}]
		},
		'duration_inc': {
			label: 'Increase Duration',
			options: [{
				type: 'textinput',
				label: 'Time in seconds',
				id: 'time',
				default: "1"
			}]
		},
		'continue': {
			label: 'Set Continue Mode',
			options: [{
				type: 'dropdown',
				label: 'Continue Mode',
				id: 'contId',
				choices: self.continueMode
			}]
		},
		'arm': {
			label: 'Arm/Disarm Cue',
			options: [{
				type: 'dropdown',
				label: 'Arm/Disarm',
				id: 'armId',
				choices: [{
					id: '0',
					label: 'Disarm'
				}, {
					id: '1',
					label: 'Arm'
				}]
			}]
		},
		'autoload': {
			label: 'Enable/Disable Cue Autoload ',
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
				}]
			}]
		},
		'flagged': {
			label: 'Flagged/Unflagged Cue',
			options: [{
				type: 'dropdown',
				label: 'Flagged',
				id: 'flaggId',
				choices: [{
					id: '0',
					label: 'Disable'
				}, {
					id: '1',
					label: 'Enable'
				}]
			}]
		},
		'cueColor': {
			label: 'Set Selected Cue Color',
			options: [{
				type: 'dropdown',
				label: 'Color',
				id: 'colorId',
				choices: self.colorName
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
					label: 'Off'
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
					label: 'Off'
				}]
			}]
		},
		'go': 	    { label: 'GO' },
		'pause':    { label: 'Pause' },
		'stop':     { label: 'Stop' },
		'panic':    { label: 'Panic' },
		'reset':    { label: 'Reset' },
		'previous': { label: 'Previous Cue' },
		'next':     { label: 'Next Cue' },
		'resume':   { label: 'Resume' },
		'load':     { label: 'Load Cue' },
		'preview':  { label: 'Preview'}
		});
};

instance.prototype.action = function (action) {
	var self = this;
	var opt = action.options;
	var cmd;
	var arg;
	var ws = self.ws;

	switch (action.action) {

		case 'start':
			arg = null;
			cmd = '/cue/' + opt.cue + '/start';
			break;

		case 'goto':
			arg = null;
			cmd = '/playhead/' + opt.cue;
			break;

		case 'go':
			arg = null;
			cmd = '/go';
			break;

		case 'preview':
			arg = null;
			cmd = '/cue/selected/preview';
			break;

		case 'pause':
			arg = null;
			cmd = '/pause';
			break;

		case 'stop':
			arg = null;
			cmd = '/stop';
			break;

		case 'panic':
			arg = null;
			cmd = '/panic';
			break;

		case 'reset':
			arg = null;
			cmd = '/reset';
			break;

		case 'previous':
			arg = null;
			cmd = '/playhead/previous';
			break;

		case 'next':
			arg = null;
			cmd = '/playhead/next';
			break;

		case 'resume':
			arg = null;
			cmd = '/resume';
			break;

		case 'load':
			arg = null;
			cmd = '/cue/selected/load';
			break;

		case 'prewait_dec':
			arg = {
				type: "i",
				value: parseInt(opt.time)
			};
			cmd = '/cue/selected/preWait/-';
			break;

		case 'prewait_inc':
			arg = {
				type: "i",
				value: parseInt(opt.time)
			};
			cmd = '/cue/selected/preWait/+';
			break;

		case 'postwait_dec':
			arg = {
				type: "i",
				value: parseInt(opt.time)
			};
			cmd = '/cue/selected/postWait/-';
			break;

		case 'postwait_inc':
			arg = {
				type: "i",
				value: parseInt(opt.time)
			};
			cmd = '/cue/selected/postWait/+';
			break;

		case 'duration_dec':
			arg = {
				type: "i",
				value: parseInt(opt.time)
			};
			cmd = '/cue/selected/duration/-';
			break;

		case 'duration_inc':
			arg = {
				type: "i",
				value: parseInt(opt.time)
			};
			cmd = '/cue/selected/duration/+';
			break;

		case 'continue':
			arg = {
				type: "i",
				value: parseInt(opt.contId)
			};
			cmd = '/cue/selected/continueMode';
			break;

		case 'arm':
			arg = {
				type: "i",
				value: parseInt(opt.armId)
			};
			cmd = '/cue/selected/armed';
			break;

		case 'autoload':
			arg = {
				type: "i",
				value: parseInt(opt.autoId)
			};
			cmd = '/cue/selected/autoLoad';
			break;

		case 'flagged':
			arg = {
				type: "i",
				value: parseInt(opt.flaggId)
			};
			cmd = '/cue/selected/flagged';
			break;

		case 'cueColor':
			arg = {
				type: "s",
				value: "" + opt.colorId
			};
			cmd = '/cue/selected/colorName';
			break;
		case 'showMode':
			arg = {
				type: "i",
				value: parseInt(opt.onOff)
			};
			cmd = '/showMode';
			break;
		case 'auditMode':
			arg = {
				type: "i",
				value: parseInt(opt.onOff)
			};
			cmd = '/auditionWindow';
			break;
		// switch
	}

	if (arg == null) {
		arg = [];
	}

	if (self.useTCP && !self.ready) {
		debug("Not connected to", self.config.host);
	} else if (cmd !== undefined) {
		debug('sending', ws + cmd, arg, "to", self.config.host);
		self.sendOSC(ws + cmd, arg);
	}
	if (self.useTCP && cmd == '/auditionWindow') {
		self.sendOSC(ws + cmd, []);
		self.sendOSC(ws + "/cue/playhead/valuesForKeys",qCueRequest);
	}

};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
