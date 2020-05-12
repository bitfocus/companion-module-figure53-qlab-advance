/* eslint-disable no-useless-escape */
var instance_skel = require('../../instance_skel');
var rgb = require('../../image').rgb;
var presets = require('./presets');
var actions = require('./actions');
var variables = require('./variables');
var feedbacks = require('./feedbacks');
var Cue = require('./cues');
var OSC = require('osc');
//var util = require('util');
var debug;

var log;

function instance(system, id, config) {
	var self = this;
	var po = 0;

	self.connecting = false;
	self.needPasscode = false;
	self.useTCP = config.useTCP;
	self.qLab3 = false;
	self.hasError = false;
	self.disabled = true;
	self.ws = '';
	self.cl = '';
	self.pollCount = 0;

	self.resetVars();

	// each instance needs a separate local port
	id.split('').forEach(function (c) {
		po += c.charCodeAt(0);
	});
	self.port_offset = po;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	if (process.env.DEVELOPER) {
		self.config._configIdx = -1;
	}

	self.addUpgradeScript(function (config, actions, releaseActions, feedbacks) {
		var changed = false;

		function upgradePass(actions, changed) {
			for (var k in actions) {
				var action = actions[k];

				if (action.action == "autoLoad") {
					if (action.options.autoId == 1) {
						action.action = "autoload";
						action.label = action.id + ":" + action.action;
						changed = true;
					}
				}
				if ('flagged' == action.action && action.options.flaggId) {
					action.options.flagId = action.options.flaggId;
					delete action.options.flaggId;
				}
			}
			return changed;
		}

		changed = upgradePass(actions, changed);
		changed = upgradePass(releaseActions, changed);

		if (config.useTenths == undefined) {
			config.useTenths = false;
			changed = true;
		}
		return changed;
	});

	return self;
}

instance.prototype.qCueRequest = [
	{
		type: "s",
		value: '["number","uniqueID","listName","type","isPaused","duration","actionElapsed","parent","flagged",' +
			'"autoLoad","colorName","isRunning","isLoaded","armed","isBroken","percentActionElapsed","cartPosition"]'
	}
];

instance.prototype.QSTATUS_CHAR = {
	broken: "\u2715",
	running: "\u23F5",
	paused: "\u23F8",
	loaded: "\u23FD",
	idle: "\u00b7"
};

instance.prototype.resetVars = function (doUpdate) {
	var self = this;
	var qName = '';
	var qNum = '';
	var cues = self.wsCues;

	// play head info
	self.nextCue = new Cue();
	// most recent running cue
	self.runningCue = new Cue();

	// clear 'variables'
	if (doUpdate && self.useTCP) {
		self.updateNextCue();
		self.updatePlaying();

		Object.keys(cues).forEach(function (cue) {
			qNum = cues[cue].qNumber.replace(/[^\w\.]/gi,'_');
			qName = cues[cue].qName;
			if (qNum != '' && qName != '') {
				delete self.cueColors[qNum];
				self.setVariable('q_' + qNum + '_name');
			}
			self.checkFeedbacks('q_bg');
		});
	}

	// need a valid QLab reply
	self.needWorkspace = true;
	self.needPasscode = false;

	// list of cues and info for this QLab workspace
	self.wsCues = {};
	self.cueColors = {};
	self.cueOrder = [];
	self.cueList = {};
	self.requestedCues = {};
	self.lastRunID = '-' + self.lastRunID;
	self.showMode = false;
	self.audition = false;
};

instance.prototype.updateNextCue = function () {
	var self = this;

	self.setVariable('n_id', self.nextCue.uniqueID);
	self.setVariable('n_name', self.nextCue.qName);
	self.setVariable('n_num', self.nextCue.qNumber);
	self.setVariable('n_stat', self.nextCue.isBroken ? self.QSTATUS_CHAR.broken :
							self.nextCue.isRunning ? self.QSTATUS_CHAR.running :
							self.nextCue.isPaused ? self.QSTATUS_CHAR.paused :
							self.nextCue.isLoaded ? self.QSTATUS_CHAR.loaded :
							self.QSTATUS_CHAR.idle);
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
	var oqOrder = -1;

	// unset old variable?
	if (qID in self.wsCues) {
		oqNum = self.wsCues[qID].qNumber.replace(/[^\w\.]/gi,'_');
		oqName = self.wsCues[qID].qName;
		oqColor = self.wsCues[qID].qColor;
		oqOrder = self.wsCues[qID].qOrder;
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

	var tLeft = self.runningCue.duration * (1 - self.runningCue.pctElapsed);
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

	self.setVariable('r_id', self.runningCue.uniqueID);
	self.setVariable('r_name', self.runningCue.qName);
	self.setVariable('r_num', self.runningCue.qNumber);
	self.setVariable('r_stat', self.runningCue.isBroken ? self.QSTATUS_CHAR.broken :
							self.runningCue.isRunning ? self.QSTATUS_CHAR.running :
							self.runningCue.isPaused ? self.QSTATUS_CHAR.paused :
							self.runningCue.isLoaded ? self.QSTATUS_CHAR.loaded :
							self.QSTATUS_CHAR.idle);
	self.setVariable('r_hhmmss',hh + ":" + mm + ":" + ss);
	self.setVariable('r_hh', hh);
	self.setVariable('r_mm', mm);
	self.setVariable('r_ss', ss);
	self.setVariable('r_left',ft);
	self.checkFeedbacks('run_bg');
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
	self.disabled = false;

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
	this.setFeedbackDefinitions(feedbacks.setFeedbacks(this));
};

instance.prototype.init_variables = function () {
	this.setVariableDefinitions(variables.setVariables());
	this.updateRunning();
	this.updateNextCue();
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
	} else if (self.ready) {
		self.qSocket.send({
			address: node,
			args: arg
		});
	}
};

instance.prototype.connect = function () {
	this.status(this.STATUS_UNKNOWN, "Connecting");
	this.init_osc();
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
		self.sendOSC(ws + "/version");
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

		// request variable/feedback info
		// get list of running cues
		self.sendOSC(ws + "/cue/playhead/uniqueID", []);
		self.sendOSC(ws + "/updates", []);
		self.sendOSC(ws + "/updates", [
			{
				type: "i",
				value: 1
			}]
		);

		self.sendOSC(ws + "/cueLists", []);
		self.sendOSC(ws + "/auditionWindow",[]);
		self.sendOSC(ws + "/showMode",[]);
		if (self.timer !== undefined) {
			clearTimeout(self.timer);
			self.timer = undefined;
		}
		self.timer = setTimeout(function () { self.prime_vars(ws); }, 5000);
	}
};

/**
 * heartbeat/poll function for 'updates' that aren't automatic
 */
instance.prototype.rePulse = function (ws) {
	var self = this;
	var rc = self.runningCue.uniqueID;

	if (0==(self.pollCount % 10)) {
		self.sendOSC(ws + "/auditionWindow", []);
		if (self.qLab3) {
			self.sendOSC(ws + "/showMode", []);
		}
	}
	self.pollCount++;
	if (Object.keys(self.requestedCues).length > 0) {
		var timeOut = Date.now() - 100;
		var cue;
		var cues = self.wsCues;
		var qNum;
		for (var k in self.requestedCues) {
			if (self.requestedCues[k] < timeOut) {
				// no response from QLab for at least 100ms
				// so delete the cue from our list
				if (cues[k]) {
					// QLab sometimes sends 'reload the whole cue list'
					// so a cue we were waiting for may have been moved/deleted between checks
					qNum = cues[k].qNumber.replace(/[^\w\.]/gi,'_');
					qName = cues[k].qName;
					if (qNum != '' && qName != '') {
						delete self.cueColors[qNum];
						self.setVariable('q_' + qNum + '_name');
					}
					self.checkFeedbacks('q_bg');
			}
				delete self.requestedCues[k];
			}
		}
	}
	if (rc !== undefined && rc !== '') {
		if (self.qLab3) {
			self.sendOSC(ws + "/runningOrPausedCues",[]);
		} else {
			self.sendOSC(ws + "/cue/active/valuesForKeys", self.qCueRequest);
		}
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
			self.connecting = false;
			if (!self.hasError) {
				self.log('error', "Error: " + err.message);
				self.status(self.STATUS_ERROR, "Can't connect to QLab " + err.message);
				self.hasError = true;
			}
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
				// the underlying socket issues a final close after
				// the OSC socket is closed, which gets deleted on 'destroy'
				if (self.qSocket != undefined) {
					self.qSocket.removeAllListeners();
				}
				debug("Connection closed");
				self.ready = false;
				self.hasError = true;
				if (self.disabled) {
					self.status(self.STATUS_UNKNOWN, "Disabled");
				} else {
					self.status(self.STATUS_WARNING, "CLOSED");
				}
			}
			if (self.timer !== undefined) {
				clearTimeout(self.timer);
				self.timer = undefined;
			}
			if (self.pulse !== undefined) {
				clearInterval(self.pulse);
				self.pulse = undefined;
			}
			if (!self.disabled) { // don't restart if instance was disabled
				self.timer = setTimeout(function () { self.connect(); }, 5000);
			}
		});

		self.qSocket.on("ready", function () {
			self.ready = true;
			self.connecting = false;
			self.hasError = false;
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
instance.prototype.updateCues = function (jCue, stat, qp) {
	var self = this;
	// list of useful cue types we're interested in
	var qTypes = ['audio', 'mic', 'video', 'camera',
		'text', 'light', 'fade', 'network', 'midi', 'midi file',
		'timecode', 'group', 'start', 'stop', 'pause', 'load',
		'reset', 'devamp', 'goto', 'target', 'cart', 'cue list',
		'arm', 'disarm', 'wait', 'memo', 'script'
	];
	var q = {};

	if (Array.isArray(jCue)) {
		var i = 0;
		var idCount = {};
		var dupIds = false;
		while (i < jCue.length) {
			q = new Cue(jCue[i], self);
			q.qOrder = i;
			if (qp) {
				q.qParent = qp;
			}
			if (q.uniqueID in idCount) {
				idCount[q.uniqueID] += 1;
				dupIds = true;
			} else {
				idCount[q.uniqueID] = 1;
			}

			if (qTypes.includes(q.qType)) {
				self.updateQVars(q);
				self.wsCues[q.uniqueID] = q;
			}
			if (stat == 'l') {
				self.cueOrder[i] = q.uniqueID;
				if (qp) {
					self.cueList[qp].push(q.uniqueID);
				}
			}
			i += 1;
		}
		self.checkFeedbacks('q_bg');
		if (dupIds) {
			self.status(self.STATUS_WARNING, "Multiple cues\nwith the same cue_id");
		}
	} else {
		q = new Cue(jCue, self);
		if (qTypes.includes(q.qType)) {
			self.updateQVars(q);
			self.wsCues[q.uniqueID] = q;
			if ('cue list' == q.qType) {
				self.cueList[q.uniqueID] = [];
			}
			self.updatePlaying();
			if (q.uniqueID == self.nextCue.uniqueID) {
				self.nextCue = q;
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
		var ret = q.uniqueID + ':';
		ret +=
			q.isBroken ? '0' :
			q.isRunning ? '1' :
			q.isPaused ? '2' :
			q.isLoaded ? '3' :
			'4';
		ret += ":" + q.duration + ":" + q.pctElapsed;
		return ret;
	}

	var self = this;
	var hasGroup = false;
	var i = 0;
	var cues = self.wsCues;
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

	if (runningCues.length == 0 && self.runningCue.uniqueID != '-') {
		self.runningCue = new Cue();
	} else {
		if (hasGroup) {
			while (cues[runningCues[i][0]].qType != "group" && i < runningCues.length) {
				i += 1;
			}
		}
		if (i < runningCues.length) {
			var q = cues[runningCues[i][0]];
			self.runningCue = q;
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
				self.nextCue.uniqueID = oa;
				self.sendOSC(ws + "/cue/playhead/valuesForKeys", self.qCueRequest);
			}
		} else {
			// no playhead
			self.nextCue = new Cue();
			self.updateNextCue();
		}
	} else if (ma.match(/\/cue_id\//) && !(ma.match(/cue lists\]$/))) {
		// get cue information for 'updated' cue
		var node = ma.substring(7) + "/valuesForKeys";
		self.sendOSC(node, self.qCueRequest);
		if (ma.match(/\/cue_id\//)) {
			// save info request time to verify a response.
			// QLab sends an update when a cue is deleted
			// but fails to respond to a request for info.
			// If there is no response within 2 pulses
			// we delete our copy of the cue
			var uniqueID = ma.slice(-36);
			self.requestedCues[uniqueID] = Date.now();
		}
	} else if (ma.match(/\/disconnect$/)) {
		self.status(self.STATUS_WARNING, "No Workspaces");
		self.needWorkspace = true;
		self.needPasscode = false;
		self.lastRunID = 'x';
		if (self.pulse != undefined) {
			clearInterval(self.pulse);
			self.pulse = undefined;
		}
		self.resetVars(true);
		self.prime_vars(ws);
	} else if ((mf.length == 4) && (mf[2] == 'workspace')) {
		self.sendOSC("/showMode",[]);
		self.sendOSC("/auditionWindow",[]);
	}
};


/**
 * process QLab 'reply'
 */
instance.prototype.readReply = function (message) {
	var self = this;
	var ws = self.ws;
	var ma = message.address;
	var j = {};
	var i = 0;
	var q;
	var qr = self.qCueRequest;

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
			self.needWorkspace = (!self.qLab3);
			self.status(self.STATUS_OK, "Connected to " + self.host);
		}
	}
	if (ma.match(/updates$/)) {		// only works on QLab4
		self.needWorkspace = false;
		self.status(self.STATUS_OK, "Connected to QLab");
		if (self.pulse !== undefined) {
			self.debug('cleared stray interval');
			clearInterval(self.pulse);
		}
		self.pulse = setInterval(function() { self.rePulse(ws); }, 100);
	} else if (ma.match(/version$/)) {
		if (j.data != undefined) {
			self.qLab3 = (j.data.match(/^4\./)==null);
			self.setVariable('q_ver', j.data);
		}
		if (self.qLab3) { // QLab3 always has a 'workspace' (it may be empty)
			if (self.pulse !== undefined) {
				self.debug('cleared stray interval');
				clearInterval(self.pulse);
			}
			self.pulse = setInterval(function() { self.rePulse(ws); }, 100);
		} else {
			self.needWorkspace = (!self.qLab3);
		}
	} else if (ma.match(/uniqueID$/)) {
		if (j.data != undefined) {
			self.nextCue.uniqueID = j.data;
			self.sendOSC(ws + "/cue/playhead/valuesForKeys", qr);
		}
	} else if (ma.match(/\/cueLists$/)) {
		if (j.data != undefined) {
			i = 0;
			while (i < j.data.length) {
				q = j.data[i];
				self.updateCues(q, 'l');
				self.updateCues(q.cues,'l',q.uniqueID);
				i++;
			}
			self.sendOSC(ws + "/cue/active/valuesForKeys", qr);
		}
	} else if (ma.match(/runningOrPausedCues$/)) {
		if (j.data != undefined) {
			i = 0;
			while (i < j.data.length) {
				q = j.data[i];
				self.sendOSC(ws + "/cue_id/" + q.uniqueID + "/valuesForKeys", qr);
				i++;
			}
		}
	} else if (ma.match(/valuesForKeys$/)) {
		self.updateCues(j.data, 'v');
		var uniqueID = ma.substr(14,36);
		delete self.requestedCues[uniqueID];
	} else if (ma.match(/showMode$/)) {
		if (self.showMode != j.data) {
			self.showMode = j.data;
			self.checkFeedbacks('ws_mode');
		}
	} else if (ma.match(/auditionWindow$/)) {
		if (self.auditMode != j.data){
			self.auditMode = j.data;
			self.checkFeedbacks('ws_mode');
		}
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
	this.setPresetDefinitions(presets.setPresets());
};


// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;
	self.resetVars(true);
	if (self.timer !== undefined) {
		clearTimeout(self.timer);
		delete self.timer;
	}
	if (self.pulse !== undefined) {
		clearInterval(self.pulse);
		delete self.pulse;
	}
	if (self.qSocket) {
		self.disabled = true;
		self.qSocket.close();
		delete self.qSocket;
	}
	self.status(self.STATUS_UNKNOWN,"Disabled");
	debug("destroy", self.id);
};

// eslint-disable-next-line no-unused-vars
instance.prototype.actions = function (system) {
	this.setActions(actions.setActions());
};

instance.prototype.action = function (action) {
	var self = this;
	var opt = action.options;
	var cmd;
	var arg = [];
	var ws = self.ws;
	var optTime;
	var typeTime;

	// if this is a +/- time action, preformat seconds arg
	if (opt != undefined && opt.time != undefined) {
		optTime = parseFloat(opt.time);
		if (optTime.isInteger) {
			typeTime = 'i';
		} else {
			typeTime = 'f';
		}
	}

	switch (action.action) {

		case 'start':
			cmd = '/cue/' + opt.cue + '/start';
			break;

		case 'goto':
			cmd = '/playhead/' + opt.cue;
			break;

		case 'go':
			cmd = '/go';
			break;

		case 'preview':
			cmd = '/cue/selected/preview';
			break;

		case 'pause':
			cmd = '/pause';
			break;

		case 'stop':
			cmd = '/stop';
			break;

		case 'stopSelected':
			cmd = '/cue/selected/stop';
			break;

		case 'panic':
			cmd = '/panic';
			break;

		case 'reset':
			cmd = '/reset';
			break;

		case 'previous':
			cmd = '/playhead/previous';
			break;

		case 'next':
			cmd = '/playhead/next';
			break;

		case 'resume':
			cmd = '/resume';
			break;

		case 'load':
			cmd = '/cue/selected/load';
			break;

		case 'prewait_dec':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/preWait/-';
			break;

		case 'prewait_inc':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/preWait/+';
			break;

		case 'postwait_dec':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/postWait/-';
			break;

		case 'postwait_inc':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/postWait/+';
			break;

		case 'duration_dec':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/duration/-';
			break;

		case 'duration_inc':
			arg = {
				type: typeTime,
				value: optTime
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
				value: 2==parseInt(opt.armId) ? 1-self.nextCue.isArmed : parseInt(opt.armId)
			};
			cmd = '/cue/selected/armed';
			break;

		case 'autoload':
			arg = {
				type: "i",
				value: 2==parseInt(opt.autoId) ? 1-self.nextCue.autoLoad : parseInt(opt.autoId)
			};
			cmd = '/cue/selected/autoLoad';
			break;

		case 'flagged':
			arg = {
				type: "i",
				value: 2==parseInt(opt.flagId) ? 1-self.nextCue.isFlagged : parseInt(opt.flagId)
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
				value: 2==parseInt(opt.onOff) ? 1-self.showMode : parseInt(opt.onOff)
			};
			cmd = '/showMode';
			break;
		case 'auditMode':
			arg = {
				type: "i",
				value: 2==parseInt(opt.onOff) ? 1-self.auditMode : parseInt(opt.onOff)
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
		self.sendOSC(ws + "/cue/playhead/valuesForKeys",self.qCueRequest);
	}

};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
