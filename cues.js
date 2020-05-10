var rgb = require('../../image').rgb;

var colorRGB = {
	none: 	rgb(32, 32, 32),
	red: 	rgb(160, 0, 0),
	orange: rgb(160, 100, 0),
	green: 	rgb(0, 160, 0),
	blue: 	rgb(0, 0, 160),
	purple: rgb(160, 0, 160)
};

function Cue (j, i) {

	this.uniqueID = '';
	this.qName = '[none]';
	this.qNumber = '';
	this.isLoaded = false;
	this.isBroken = false;
	this.isRunning = false;
	this.isPaused = false;
	this.isArmed = false;
	this.isFlagged = false;
	this.autoLoad = false;
	this.duration = 0;
	this.pctElapsed = 0;
	this.startedAt = 0;
	this.qColor = 0;
	this.qColorName = '';
	this.qOrder = -1;
	this.qParent = '';
	if (j != undefined) {
		JSONtoCue(this, j, i);
	}

}

function JSONtoCue(newCue, j, i) {
	var isExistingQ;

	newCue.uniqueID = j.uniqueID;
	newCue.qName = j.listName;
	newCue.qNumber = j.number;
	newCue.qColorName = j.colorName;
	newCue.qType = j.type.toLowerCase();
	newCue.isRunning = j.isRunning;
	newCue.isLoaded = j.isLoaded;
	newCue.isBroken = j.isBroken;
	newCue.isPaused = j.isPaused;
	newCue.isFlagged = j.flagged;
	newCue.isArmed = j.armed;
	newCue.autoLoad = j.autoLoad;
	newCue.duration = j.duration;
	newCue.qParent = j.parent;
	newCue.pctElapsed = j.percentActionElapsed;
	newCue.qColor = colorRGB[j.colorName];
	isExistingQ  = newCue.uniqueID in i.wsCues;

	if (isExistingQ) {
		newCue.qOrder = i.wsCues[newCue.uniqueID].qOrder;
	}

	if (newCue.Running || newCue.Paused) {
		if (isExistingQ) {
			if (0 == (newCue.startedAt = i.wsCues[newCue.uniqueID].startedAt)) {
				newCue.StartedAt = Date.now();
			}
		} else {
			newCue.StartedAt = Date.now();
			debug("Cue " + newCue.qNumber + "@" + newCue.startedAt);
		}
	} else {
		newCue.startedAt = 0;
	}
}

module.exports = Cue;
