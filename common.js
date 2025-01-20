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

export function cueToStatusChar(cue) {
	if (cue.isBroken) return '\u2715'
	if (cue.isAuditioning) return '\u2772\u23F5\u2773'
	if (cue.isRunning) return '\u23F5'
	if (cue.isPaused) return '\u23F8'
	if (cue.isLoaded) return '\u23FD'
	return '\u00b7'
}
