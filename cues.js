import * as Colors from './colors.js'

class Cue {
	uniqueID = ''
	qName = '[none]'
	qNumber = ''
	isLoaded = false
	isBroken = false
	isRunning = false
	isPaused = false
	isArmed = false
	isFlagged = false
	isAuditioning = false
	infiniteLoop = false
	holdLastFrame = false
	autoLoad = false
	duration = 0
	pctElapsed = 0
	startedAt = -1
	qColor = 0
	qColorName = ''
	qOrder = -1
	qParent = ''
	qList = ''
	Notes = ''

	constructor(j, self) {
		if (j != undefined) {
			JSONtoCue(this, j, self)
		}
	}
}

function JSONtoCue(newCue, j, self) {
	newCue.uniqueID = j.uniqueID
	newCue.qName = j.listName == '' ? '[none]' : j.listName
	newCue.qNumber = j.number
	newCue.qColorName = j.colorName
	newCue.qType = j.type.toLowerCase()
	newCue.isRunning = j.isRunning
	newCue.isAuditioning = j.isAuditioning
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
	newCue.qColor = Colors.colorRGB[j.colorName]

	const isExistingQ = newCue.uniqueID in self.wsCues

	if (isExistingQ) {
		newCue.qOrder = self.wsCues[newCue.uniqueID].qOrder
	}

	if (newCue.isRunning || newCue.isPaused) {
		if (isExistingQ) {
			if (0 == (newCue.startedAt = self.wsCues[newCue.uniqueID].startedAt)) {
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

export default Cue
