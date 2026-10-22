/**
 * Returns the passed integer left-padded with '0's
 * Will truncate result length is greater than 'len'
 * @param {Number} num - number to pad
 * @param {Number} [len=2] - optional length of result, defaults to 2
 * @param {Number} [pad] - pad character, defaults to '0'
 * @since 2.3.0
 */
export function pad0(num, len = 2, pad = '0') {
	const zeros = pad.repeat(len)
	return (zeros + Math.abs(num)).slice(-len)
}

/**
 *
 * Calculate crc16 hash over 'data'
 * @param {Any} data - data to hash
 * @returns unsigned int16
 * @since 2.4.0
 */
export var crc16b = function (data) {
	const POLY = 0x8408
	const XOROUT = 0
	let crc = 0 // INIT

	for (let i = 0; i < data.length; i++) {
		crc = crc ^ data[i]
		for (let j = 0; j < 8; j++) {
			crc = crc & 1 ? (crc >> 1) ^ POLY : crc >> 1
		}
	}
	return (crc ^ XOROUT) & 0xffff
}

/**
 * Remove non-OSC characters from Cue Number
 * @param {String} qNum - QLab Cue 'Number' to filter
 * @since 2.9.4
 */
export function cleanCueNumber(qNum) {
	return qNum.replace(/[^\w\.]/gi, '_')
}

/**
 * Parse a list of cue output channels such as '1,2,5-8'
 * @param {String} list - comma/space separated channel numbers and ranges
 * @returns {Number[]} sorted unique channel numbers from 1 to 128
 * @since 2.16.0
 */
export function parseChannelList(list) {
	const chans = new Set()

	for (const part of String(list).split(/[\s,;]+/)) {
		const m = part.match(/^(\d+)(?:-(\d+))?$/)
		if (!m) continue
		const from = parseInt(m[1])
		const to = m[2] === undefined ? from : parseInt(m[2])
		for (let c = Math.min(from, to); c <= Math.max(from, to) && c <= 128; c++) {
			if (c > 0) chans.add(c)
		}
	}
	return [...chans].sort((a, b) => a - b)
}

/**
 * Format a QLab audio level (decibels) for display
 * @param {Number} db - level in decibels
 * @param {Number} [minDb] - workspace minimum volume, at or below this is shown as '-inf'
 * @returns {String} level with one decimal or '-inf'
 * @since 2.16.0
 */
export function formatLevel(db, minDb = -60) {
	db = parseFloat(db)
	if (isNaN(db) || db <= minDb) return '-inf'
	const ret = (Math.round(db * 10) / 10).toFixed(1)
	return ret == '-0.0' ? '0.0' : ret
}

export function cueToStatusChar(cue) {
	if (cue.isBroken) return '\u2715'
	if (cue.isAuditioning) return '\u2772\u23F5\u2773'
	if (cue.isRunning) return '\u23F5'
	if (cue.isPaused) return '\u23F8'
	if (cue.isLoaded) return '\u23FD'
	return '\u00b7'
}
