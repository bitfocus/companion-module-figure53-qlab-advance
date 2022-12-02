function Cue(j, i) {
	this.uniqueID = ''
	this.qName = '[none]'
	this.qNumber = ''
	this.isLoaded = false
	this.isBroken = false
	this.isRunning = false
	this.isPaused = false
	this.isArmed = false
	this.isFlagged = false
	this.infiniteLoop = false
	this.holdLastFrame = false
	this.autoLoad = false
	this.duration = 0
	this.pctElapsed = 0
	this.startedAt = -1
	this.qColor = 0
	this.qColorName = ''
	this.qOrder = -1
	this.qParent = ''
	this.qList = ''
	this.Notes = ''
	if (j != undefined) {
		JSONtoCue(this, j, i)
	}
}

function JSONtoCue(newCue, j, i) {
	var isExistingQ

	newCue.uniqueID = j.uniqueID
	newCue.qName = j.listName == '' ? '[none]' : j.listName
	newCue.qNumber = j.number
	newCue.qColorName = j.colorName
	newCue.qType = j.type.toLowerCase()
	newCue.isRunning = j.isRunning
	newCue.isLoaded = j.isLoaded
	newCue.isBroken = j.isBroken
	newCue.isPaused = j.isPaused
	newCue.isFlagged = j.flagged
	newCue.isArmed = j.armed
	newCue.autoLoad = j.autoLoad
	newCue.infiniteLoop = j.infiniteLoop
	newCue.holdLastFrame = j.holdLastFrame
	newCue.duration = j.duration
	newCue.qParent = j.parent
	newCue.pctElapsed = j.percentActionElapsed
	if (j.notes) {
		newCue.Notes = j.notes.slice(0, 20)
	}
	newCue.qColor = i.colors.colorRGB[j.colorName]
	isExistingQ = newCue.uniqueID in i.wsCues

	if (isExistingQ) {
		newCue.qOrder = i.wsCues[newCue.uniqueID].qOrder
	}

	if (newCue.isRunning || newCue.isPaused) {
		if (isExistingQ) {
			if (0 == (newCue.startedAt = i.wsCues[newCue.uniqueID].startedAt)) {
				newCue.startedAt = Date.now()
			}
		} else {
			newCue.startedAt = Date.now()
			//i.debug("--------Cue " + newCue.qNumber + "@" + newCue.startedAt);
		}
	} else {
		newCue.startedAt = 0
	}
}

module.exports = Cue
