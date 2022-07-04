'use strict';
/* eslint-disable no-useless-escape */
var instance_skel = require('../../instance_skel');

var OSC = require('osc');

var debug;

var log;

function instance(system, id, config) {
	var self = this;
	var po = 0;

	self.connecting = false;
	self.needPasscode = false;
	self.useTCP = false;
	self.qLab3 = false;
	self.hasError = false;
	self.disabled = true;
	self.pollCount = 0;

	self.colors = require('./colors');
	self.choices = require('./choices');
	self.Cue = require('./cues');
	self.Presets = require('./presets');
	self.Actions = require('./actions');
	self.Variables = require('./variables');
	self.Feedbacks = require('./feedbacks');

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

	return self;
}

instance.GetUpgradeScripts = function() {
	return [
		function (context, config, actions, feedbacks) {
			var changed = false;

			function upgradePass(actions, changed) {
				for (var k in actions) {
					var action = actions[k];

					if (action.action == "autoLoad") {
						if (action.options.autoId == 1) {
							action.action = "autoload";
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

			if (config) {
				if (config.useTenths == undefined) {
					config.useTenths = false;
					changed = true;
				}
			}
			return changed;
		},
		instance_skel.CreateConvertToBooleanFeedbackUpgradeScript({
			'q_run': true,
			'min_go': true,
			'ws_mode': true,
			'override': true
		})
	]
}

instance.prototype.applyConfig = function (config) {
	var self = this;
	var ws = config.workspace;
	var cl = config.cuelist;

	if (ws !== undefined && ws !== "" && ws !== "default") {
		self.ws = "/workspace/" + ws;
	} else {
		self.ws = "";
	}

	if (cl && cl !=='' && cl !=='default') {
		self.cl = cl;
	} else {
		self.cl = "";
	}

	if (config.useTCP == undefined ) {
		config.useTCP = true;
	}

	self.useTCP = config.useTCP;
};

instance.prototype.qCueRequest = [
	{
		type: 's',
		value: '["number","uniqueID","listName","type","isPaused","duration","actionElapsed","parent","flagged","notes",' +
			'"autoLoad","colorName","isRunning","isLoaded","armed","isBroken","percentActionElapsed","cartPosition",' +
			'"infiniteLoop","holdLastFrame"]'
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
	self.nextCue = '';
	// most recent running cue
	self.runningCue = new self.Cue();

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
			self.checkFeedbacks('qid_bg');
		});
	}

	// need a valid QLab reply
	self.needWorkspace = true;
	self.needPasscode = false;

	// list of cues and info for this QLab workspace
	self.wsCues = {};
	self.cueColors = {};
	self.cueOrder = [];
	self.cueByNum = {};
	self.cueList = {};
	self.requestedCues = {};
	self.overrides = {};
	self.lastRunID = '-' + self.lastRunID;
	self.showMode = false;
	self.audition = false;
	self.goDisabled = false;
	self.goAfter = 0;
	self.minGo = 0;

};

instance.prototype.updateNextCue = function () {
	var self = this;
	var nc = self.wsCues[self.nextCue];
	if (!nc) {
		nc = new self.Cue();
	}

	self.setVariable('n_id', nc.uniqueID);
	self.setVariable('n_name', nc.qName);
	self.setVariable('n_num', nc.qNumber);
	self.setVariable('n_notes', nc.Notes);
	self.setVariable('n_stat', nc.isBroken ? self.QSTATUS_CHAR.broken :
							nc.isRunning ? self.QSTATUS_CHAR.running :
							nc.isPaused ? self.QSTATUS_CHAR.paused :
							nc.isLoaded ? self.QSTATUS_CHAR.loaded :
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
			delete self.cueByNum[oqNum];
			oqName = '';
		}
	}
	// set new value
	if (qNum != '' && q.qName != '' && (q.qName != oqName || qColor != oqColor)) {
		self.setVariable('q_' + qNum + '_name', q.qName);
		self.cueColors[qNum] = q.qColor;
		self.cueByNum[qNum] = qID;
		self.checkFeedbacks('q_bg');
		self.checkFeedbacks('qid_bg');
	}
};


instance.prototype.updateRunning = function () {
	var self = this;
	var tenths = (self.config.useTenths ? 0 : 1);
	var rc = self.runningCue;

	var tElapsed = rc.duration * rc.pctElapsed;

	var eh = Math.floor(tElapsed / 3600);
	var ehh = ('00' + eh).slice(-2);
	var em = Math.floor(tElapsed / 60) % 60;
	var emm = ('00' + em).slice(-2);
	var es = Math.floor(tElapsed % 60);
	var ess = ('00' + es).slice(-2);
	var eft = '';

	if (ehh > 0) {
		eft = ehh + ":";
	}
	if (emm > 0) {
		eft = eft + emm + ":";
	}
	eft = eft + ess;

	var tLeft = rc.duration * (1 - rc.pctElapsed);
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

	self.setVariable('r_id', rc.uniqueID);
	self.setVariable('r_name', rc.qName);
	self.setVariable('r_num', rc.qNumber);
	self.setVariable('r_stat', rc.isBroken ? self.QSTATUS_CHAR.broken :
							rc.isRunning ? self.QSTATUS_CHAR.running :
							rc.isPaused ? self.QSTATUS_CHAR.paused :
							rc.isLoaded ? self.QSTATUS_CHAR.loaded :
							self.QSTATUS_CHAR.idle);
	self.setVariable('r_hhmmss',hh + ":" + mm + ":" + ss);
	self.setVariable('r_hh', hh);
	self.setVariable('r_mm', mm);
	self.setVariable('r_ss', ss);
	self.setVariable('r_left',ft);
	self.setVariable('e_hhmmss', ehh + ":" + emm + ":" + ess);
	self.setVariable('e_hh', ehh);
	self.setVariable('e_mm', emm);
	self.setVariable('e_ss', ess);
	self.setVariable('e_time', eft);
	self.checkFeedbacks('run_bg');
};

instance.prototype.updateConfig = function (config) {
	var self = this;
	var ws = "";
	var cl = "";

	self.config = config;
	self.applyConfig(config);

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

	self.applyConfig(self.config);
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

instance.prototype.init_presets = function () {
	this.setPresetDefinitions(this.Presets.setPresets.call(this));
};

instance.prototype.init_feedbacks = function () {
	this.setFeedbackDefinitions(this.Feedbacks.setFeedbacks.call(this));
};

instance.prototype.init_variables = function () {
	this.setVariableDefinitions(this.Variables.setVariables.call(this));
	this.updateRunning();
	this.updateNextCue();
};

instance.prototype.sendOSC = function (node, arg, bare) {
	var self = this;
	var ws = (bare ? '' : self.ws);

	if (!self.useTCP) {
		var host = "";
		if (self.config.host !== undefined && self.config.host !== ""){
			host = self.config.host;
		}
		if (self.config.passcode !== undefined && self.config.passcode !== "") {
			self.oscSend(host, 53000, ws + "/connect", [self.config.passcode]);
		}
		self.oscSend(host, 53000, ws + node, arg);
	} else if (self.ready) {
		self.qSocket.send({
			address: ws + node,
			args: arg
		});
	}
};

instance.prototype.connect = function () {
	if (!this.hasError) {
		this.status(this.STATUS_UNKNOWN, "Connecting");
	}
	if (!this.disabled) {
		this.init_osc();
	}
};

// get current status of QLab cues and playhead
// and ask for updates
instance.prototype.prime_vars = function (ws) {
	var self = this;

	if (self.needPasscode && (self.config.passcode == undefined || self.config.passcode == "")) {
		self.status(self.STATUS_UNKNOWN, "Wrong Passcode");
		self.status(self.STATUS_WARNING, "Wrong Passcode");
		self.debug("waiting for passcode");
		self.sendOSC("/connect", []);
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
		self.sendOSC("/version", [], true);		// app global, not workspace
		if (self.config.passcode !== undefined && self.config.passcode !== "") {
			self.debug("sending passcode to", self.config.host);
			self.sendOSC("/connect", [
				{
					type: 's',
					value: self.config.passcode
				}]
			);
		} else {
			self.sendOSC("/connect", []);
		}

		// request variable/feedback info
		// get list of running cues
		self.sendOSC("/cue/playhead/uniqueID", []);
		self.sendOSC("/updates", []);
		self.sendOSC("/updates", [
			{
				type: 'i',
				value: 1
			}]
		);

		self.sendOSC("/cueLists", []);
		self.sendOSC("/auditionWindow",[], true);
		self.sendOSC("/overrideWindow",[], true);
		self.sendOSC("/showMode",[]);
		self.sendOSC("/settings/general/minGoTime");
		for (var o in self.choices.OVERRIDE) {
			self.sendOSC("/overrides/" + self.choices.OVERRIDE[o].id, [], true);
		}
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
	var rc = self.runningCue;
	var cl = self.cl;
	var now = Date.now();

	if (0==(self.pollCount % (self.config.useTenths ? 10 : 4))) {
		self.sendOSC("/auditionWindow", [], true);
		self.sendOSC("/overrideWindow", [], true);

		self.sendOSC("/cue_id" + (cl ? "/" + cl : "") + "/playheadId",[]);

		if (self.qLab3) {
			self.sendOSC("/showMode", []);
		}
	}
	self.pollCount++;
	if (Object.keys(self.requestedCues).length > 0) {
		var timeOut = now - 500;
		var cues = self.wsCues;
		var qNum;
		var qName;
		for (var k in self.requestedCues) {
			if (self.requestedCues[k] < timeOut) {
				// no response from QLab for at least 500ms
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
					self.checkFeedbacks('qid_bg');

				}
				delete self.requestedCues[k];
			}
		}
	}
	if (self.goDisabled && self.goAfter < now) {
		self.goDisabled = false;
		self.checkFeedbacks('min_go');
	}
	if (rc && rc.pctElapsed > 0) {
		if (self.qLab3) {
			self.sendOSC("/runningOrPausedCues",[]);
		} else {
			self.sendOSC("/cue/active/valuesForKeys", self.qCueRequest);
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
			if (!self.hasError && self.ready) {
				self.log('error', "TCP Connection to QLab Closed");
			}
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
			self.hasError = true;
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
instance.prototype.updateCues = function (jCue, stat, ql) {
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
			q = new self.Cue(jCue[i],self);
			q.qOrder = i;
			if (ql) {
				q.qList = ql;
			}
			if (stat == 'u') {
				if (!self.cueList[ql].includes(q.uniqueID)) {
					self.cueList[ql].push(q.uniqueID);
				}
			} else {
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
					if (ql) {
						self.cueList[ql].push(q.uniqueID);
					}
				}
			}
			delete self.requestedCues[q.uniqueID];
			i += 1;
		}
		self.checkFeedbacks('q_bg');
		self.checkFeedbacks('qid_bg');
		self.checkFeedbacks('q_run');
		self.checkFeedbacks('qid_run');
		if (dupIds) {
			self.status(self.STATUS_WARNING, "Multiple cues\nwith the same cue_id");
		}
	} else {
		q = new self.Cue(jCue,self);
		if (qTypes.includes(q.qType)) {
			self.updateQVars(q);
			self.wsCues[q.uniqueID] = q;
			if (self.qLab3) {
				// QLab3 seems to send cue lists as 'group' cues
				if ('group' == q.qType) {
					if (!self.cueList[q.uniqueID])
					self.cueList[q.uniqueID] = [];
				}
			} else {
				// a 'cart' is a special 'cue list'
				if (['cue list','cart'].includes(q.qType)) {
					if (!self.cueList[q.uniqueID]) {
						self.cueList[q.uniqueID] = [];
					} else {
						self.sendOSC("/cue_id/" + q.uniqueID + "/children",[]);
					}
				}
			}
			self.checkFeedbacks('q_run');
			self.checkFeedbacks('qid_run');
			self.updatePlaying();
			if ('' == self.cl || self.cueList[self.cl] && self.cueList[self.cl].includes(q.uniqueID)) {
				if (q.uniqueID == self.nextCue) {
					self.updateNextCue();
				}
			}
		}
		delete self.requestedCues[q.uniqueID];
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
	var hasDuration = false;
	var i;
	var cl = self.cl;
	var cues = self.wsCues;
	var lastRun = qState(self.runningCue);
	var runningCues = [];
	var q;

	Object.keys(cues).forEach(function (cue) {
		q = cues[cue];
		// some cuelists (for example all manual slides) may not have a pre-programmed duration
		if (q.isRunning || q.isPaused) {
			if ((''==cl && 'cue list' != q.qType) || (self.cueList[cl] && self.cueList[cl].includes(cue))) {
				runningCues.push([cue, q.startedAt]);
				// if group does not have a duration, ignore
				// it is probably a playlist, not simultaneous playback
				hasGroup = hasGroup || (q.qType == "group" && q.duration > 0);
				hasDuration = hasDuration || q.duration > 0;
			}
		}
	});

	// } else {
	// 	var cue;
	// 	var clist = self.cueList[self.cl];
	// 	for(i in clist) {
	// 		cue = cues[clist[i]];
	// 		if (cue.duration > 0  && (cue.isRunning || cue.isPaused)) {
	// 			if (clist[i] != cue.uniqueID) {
	// 				var x = 1;
	// 			}
	// 			runningCues.push([cue.uniqueID, cue.startedAt]);
	// 			if (cue.qType == "group") {
	// 				hasGroup = true;
	// 			}
	// 		}
	// 	}
	// }

	runningCues.sort(function (a, b) {
		return b[1] - a[1];
	});

	if (runningCues.length == 0) {
		self.runningCue = new self.Cue();
	} else {
		i = 0;
		if (hasGroup) {
			while (i < runningCues.length && cues[runningCues[i][0]].qType != "group") {
				i += 1;
			}
		} else if (hasDuration) {
			while (i < runningCues.length && cues[runningCues[i][0]].duration == 0) {
				i += 1;
			}
		}
		if (i < runningCues.length) {
			self.runningCue = cues[runningCues[i][0]];
			// to reduce network traffic, the query interval logic only asks for running 'updates'
			// if the playback elapsed is > 0%. Sometimes, the first status response of a new running cue
			// is exactly when the cue starts, with 0% elapsed and the countdown timer won't run.
			// Set a new cue with 0% value to 1 here to cause at least one more query to see if the cue is
			// actually playing.
			if (0 == self.runningCue.pctElapsed) {
				self.runningCue.pctElapsed = 1;
			}
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
		var cl = ma.substr(63,36);
		if (message.args.length > 0) {
			var oa = message.args[0].value;
			if (self.cl) {
				// if a cue is inserted, QLab sends playback changed cue
				// before sending the new cue's id update, insert this id into
				// the cuelist just in case so the playhead check will find it until then
				if (!self.cueList[cl].includes(oa)) {
					self.cueList[cl].push(oa);
				}
			}
			if ((self.cl == '' || cl == self.cl) && oa !== self.nextCue) {
				// playhead changed
				self.nextCue = oa;
				debug('playhead: ' + oa);
				self.sendOSC("/cue_id/" + oa + "/valuesForKeys", self.qCueRequest);
				self.requestedCues[oa] = Date.now();
			}
		} else if ((self.cl == '' || cl == self.cl)) {
			// no playhead
			self.nextCue = '';
			self.updateNextCue();
		}
	} else if (ma.match(/cue lists\]$/)) {
		self.sendOSC('/doubleGoWindowRemaining');
	} else if (ma.match(/\/cue_id\//)) {
		// get cue information for 'updated' cue
		var node = ma.substring(7) + "/valuesForKeys";
		var uniqueID = ma.slice(-36);
		self.sendOSC(node, self.qCueRequest);
		// save info request time to verify a response.
		// QLab sends an update when a cue is deleted
		// but fails to respond to a request for info.
		// If there is no response after a few pulses
		// we delete our copy of the cue

		self.requestedCues[uniqueID] = Date.now();

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
		self.sendOSC("/auditionWindow",[], true);
		self.sendOSC("/overrideWindow", [], true);
	} else if (ma.match(/\/settings\/general$/)) {
		// ug. 8 more bytes and they could have sent the 'new' value :(
		self.sendOSC("/settings/general/minGoTime");
	} else if (ma.match(/\/settings\/overrides$/)) {
		for (var o in self.choices.OVERRIDE) {
			self.sendOSC("/overrides/" + self.choices.OVERRIDE[o].id, [], true);
		}
	}
	// self.debug("=====> OSC message: ",ma, message.args);
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
	var uniqueID;
	var playheadId;
	var cl = self.cl;
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
		self.pulse = setInterval(function() { self.rePulse(ws); }, self.config.useTenths ? 100 : 250);
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
			self.pulse = setInterval(function() { self.rePulse(ws); }, self.config.useTenths ? 100 : 250);
		} else {
			self.needWorkspace = (!self.qLab3);
		}
	} else if (ma.match(/uniqueID$/)) {
		if (j.data) {
			self.nextCue = j.data;
			self.updateNextCue();
			self.sendOSC("/cue/playhead/valuesForKeys", qr);
		}
	} else if (ma.match(/playheadId$/)) {
		if (j.data) {
			playheadId = j.data;
			uniqueID = ma.substr(14,36);
			delete self.requestedCues[uniqueID];
			if ((cl=='' || uniqueID == cl) && self.nextCue != playheadId ) {
				// playhead changed due to cue list change in QLab
				if (playheadId == 'none') {
					self.nextCue = '';
				} else {
					self.nextCue = playheadId;
				}
				self.updateNextCue();
				//self.sendOSC("/cue/" + j.data + "/children");
			}
		}
	} else if (ma.match(/\/cueLists$/)) {
		if (j.data) {
			i = 0;
			while (i < j.data.length) {
				q = j.data[i];
				self.updateCues(q, 'l');
				self.updateCues(q.cues,'l',q.uniqueID);
				i++;
			}
			self.sendOSC("/cue/active/valuesForKeys", qr);
		}
	} else if (ma.match(/children$/)) {
		if (j.data) {
			uniqueID = ma.substr(14,36);
			self.updateCues(j.data,'u',uniqueID);
		}
	} else if (ma.match(/runningOrPausedCues$/)) {
		if (j.data != undefined) {
			i = 0;
			while (i < j.data.length) {
				q = j.data[i];
				self.sendOSC("/cue_id/" + q.uniqueID + "/valuesForKeys", qr);
				i++;
			}
		}
	} else if (ma.match(/valuesForKeys$/)) {
		self.updateCues(j.data, 'v');
		uniqueID = ma.substr(14,36);
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
	} else if (ma.match(/overrideWindow$/)) {
		if (self.overrideWindow != j.data){
			self.overrideWindow = j.data;
			self.checkFeedbacks('override_visible');
		}
	} else if (ma.match(/minGoTime$/)) {
		self.minGo = j.data;
		self.setVariable('min_go', (Math.round(j.data * 100) / 100).toFixed(2));
	} else if (ma.match(/\/doubleGoWindowRemaining$/)) {
		var goLeft = Math.round(j.data * 1000);
		self.goDisabled = (goLeft > 0);
		self.goAfter = Date.now() + goLeft;
		self.checkFeedbacks('min_go');
	} else if (ma.match(/^\/reply\/overrides\//)) {
		var o = ma.split('/')[3];
		self.overrides[o] = j.data;
		self.checkFeedbacks('override');
	}
	else {
		self.debug("=====> OSC message: ",ma, message.args);
	}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	var configs = [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'Controls <a href="https://qlab.app" target="_new">QLab</a> by Figure 53.' +
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
			label: 'OSC Passcode',
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
	if (Object.keys(self.cueList).length>0) {
		var clist = {
			type: 'dropdown',
			id: 'cuelist',
			label: 'Specific Cue List',
			tooltip: 'Select a specific Cue List for Play Head Variables',
			width: 12,
			default: 'default',
			choices: [ {
				id: 'default',
				label: 'Default Cue List'
			} ]
		};
		var c;
		for (c in self.cueList) {
			clist.choices.push({
				id: c,
				label: self.wsCues[c].qName
			});
		}
		configs.push( clist );
	}
	return configs;
};

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;
	self.resetVars(true);
	self.disabled = true;
	if (self.timer !== undefined) {
		clearTimeout(self.timer);
		delete self.timer;
	}
	if (self.pulse !== undefined) {
		clearInterval(self.pulse);
		delete self.pulse;
	}
	if (self.qSocket) {
		self.qSocket.close();
		delete self.qSocket;
	}
	self.status(self.STATUS_UNKNOWN,"Disabled");
	debug("destroy", self.id);
};

// eslint-disable-next-line no-unused-vars
instance.prototype.actions = function (system) {
	this.setActions(this.Actions.setActions.call(this));
};

instance.prototype.cueListActions = [
	'go','next','panic','previous','reset','stop','togglePause'
];

instance.prototype.action = function (action) {
	var self = this;
	var opt = action.options;
	var cmd;
	var arg = [];
	var ws = self.ws;
	var cl = self.cl;
	var nc = self.wsCues[self.nextCue];
	var optTime;
	var typeTime;

	// internal function for action (not anonymous)
	// self is properly scoped to next outer closure
	function setToggle(oldVal, opt) {
		return '2' == opt ? (1-(oldVal ? 1 : 0)) : parseInt(opt);
	}

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

		case 'start_id':
			cmd = '/cue_id/' + opt.cueId + '/start';
			break;

		case 'goto_id':
			cmd = '/playheadId/' + opt.cueId;
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

		case 'togglePause':
			cmd = '/cue/selected/togglePause';
			break;

		case 'stop':
			cmd = '/stop';
			break;

		case 'stopSelected':
			cmd = '/cue/selected/stop';
			break;

		case 'copyCueId':
			self.actions();
			self.init_feedbacks();
			break;

		case 'stop_cue':
			cmd = '/cue/' + opt.cue + '/stop';
			break;

		case 'stop_id':
			cmd = '/cue_id/' + opt.cueId + '/stop';
			break;

		case 'panic':
			cmd = '/panic';
			break;

		case 'panicSelected':
			cmd = '/cue/selected/panic';
			break;

		case 'panicInTime':
			cmd = '/cue/selected/panicInTime';
			arg = {
				type: typeTime,
				value: optTime
			};
			break;

		case 'panic_cue':
			cmd = '/cue/' + opt.cue + '/panic';
			break;

		case 'panicInTime_cue':
			cmd = '/cue/' + opt.cue + '/panicInTime';
			arg = {
				type: typeTime,
				value: optTime
			};
			break;

		case 'panic_id':
			cmd = '/cue_id/' + opt.cueId + '/panic';
			break;

		case 'panicInTime_id':
			cmd = '/cue_id/' + opt.cueId + '/panicInTime';
			arg = {
				type: typeTime,
				value: optTime
			};
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

		case 'startTime_inc':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/startTime/+';
			break;

		case 'startTime_dec':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/startTime/-';
			break;

		case 'endTime_inc':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/endTime/+';
			break;

		case 'endTime_dec':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/cue/selected/endTime/-';
			break;

		case 'continue':
			arg = {
				type: 'i',
				value: parseInt(opt.contId)
			};
			cmd = '/cue/selected/continueMode';
			break;

		case 'arm':
			arg = {
				type: 'i',
				value: setToggle(nc.isArmed, opt.armId)
			};
			cmd = '/cue/selected/armed';
			break;

		case 'autoload':
			arg = {
				type: 'i',
				value: setToggle(nc.autoLoad, opt.autoId)
			};
			cmd = '/cue/selected/autoLoad';
			break;

		case 'flagged':
			arg = {
				type: 'i',
				value: setToggle(nc.isFlagged, opt.flagId)
			};
			cmd = '/cue/selected/flagged';
			break;

		case 'cueColor':
			arg = {
				type: 's',
				value: '' + opt.colorId
			};
			cmd = '/cue/selected/colorName';
			break;
		case 'showMode':
			arg = {
				type: 'i',
				value: setToggle(self.showMode,opt.onOff)
			};
			cmd = '/showMode';
			break;
		case 'auditMode':
			arg = {
				type: 'i',
				value: setToggle(self.auditMode,opt.onOff)
			};
			cmd = '/auditionWindow';
			break;
		case 'overrideWindow':
			arg = {
				type: 'i',
				value: setToggle(self.overrideWindow,opt.onOff)
			};
			cmd = '/overrideWindow';
			break;
		case 'minGo':
			arg = {
				type: typeTime,
				value: optTime
			};
			cmd = '/settings/general/minGoTime';
			break;
		case 'infiniteLoop':
			arg = {
				type: 'i',
				value: setToggle(nc.infiniteLoop, opt.choice)
			};
			cmd = '/cue/selected/infiniteLoop';
			break;

		case 'holdLastFrame':
			arg = {
				type: 'i',
				value: setToggle(nc.holdLastFrame,opt.choice)
			};
			cmd = '/cue/selected/holdLastFrame';
			break;

		case 'overrides':
			arg = {
				type: 'i',
				value: setToggle(self.overrides[opt.which], opt.onOff)
			}
			cmd = '/overrides/' + opt.which;
			break;
		// switch
	}

	if (arg == null) {
		arg = [];
	}

	if (cl && self.cueListActions.includes(action.action)) {
		cmd = "/cue_id/" + cl + cmd;
	}

	if (self.useTCP && !self.ready) {
		debug("Not connected to", self.config.host);
	} else if (cmd !== undefined) {
		debug('sending', cmd, arg, "to", self.config.host);
		// everything except 'auditionWindow' and 'overrideWindow' works on a specific workspace
		self.sendOSC(cmd, arg, (['/auditionWindow','/overrideWindow'].includes(cmd)));
	}
	// QLab does not send window updates so ask for status
	if (self.useTCP && ['/auditionWindow','/overrideWindow'].includes(cmd)) {
		self.sendOSC(cmd, [], true);
		self.sendOSC("/cue/playhead/valuesForKeys",self.qCueRequest);
	}

};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
