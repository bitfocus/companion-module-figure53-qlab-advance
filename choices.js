export const CONTINUE_MODE = [
	{ label: 'Do Not Continue', id: '0' },
	{ label: 'Auto Continue', id: '1' },
	{ label: 'Auto Follow', id: '2' },
]

export const GROUP_MODE = [
	'List', // 0
	'Start first and enter', // 1
	'Start first', // 2
	'Timeline', // 3
	'Start random', // 4
	'Cart', // 5
	'Playlist', // 6
]

export const TIME_MODE = [
	{ id: 'S', label: 'Set Time' },
	{ id: 'I', label: 'Increase by' },
	{ id: 'D', label: 'Decrease by' },
]
export const CUE_SCOPE = [
	{ id: 'D', label: 'Playhead' },
	{ id: 'S', label: 'Selected' },
	{ id: 'N', label: 'Cue Number' },
	{ id: 'I', label: 'Cue ID' },
]

export const FB_SCOPE = [
	{ id: 'D', label: 'Playhead/Next' },
	{ id: 'R', label: 'Running Cue(s)' },
	{ id: 'N', label: 'Cue Number' },
	{ id: 'I', label: 'Cue ID' },
]

export const SSP_SCOPE = [
	{ id: 'D', label: 'Default (All)' },
	{ id: 'S', label: 'Selected' },
	{ id: 'N', label: 'Cue Number' },
	{ id: 'I', label: 'Cue ID' },
]

export const TOGGLE = [
	{ id: 1, label: 'On' },
	{ id: 0, label: 'Off' },
	{ id: 2, label: 'Toggle' },
]

export const ON_OFF = [
	{ id: 1, label: 'On' },
	{ id: 0, label: 'Off' },
]

export const OVERRIDE = [
	{ id: 'midiInputEnabled', label: 'Midi Input [4, 5]', preset: '' },
	{ id: 'midiOutputEnabled', label: 'Midi Output [4, 5]', preset: '45' },
	{ id: 'mscInputEnabled', label: 'MSC Input [4, 5]', preset: '' },
	{ id: 'mscOutputEnabled', label: 'MSC Output [4, 5]', preset: '45' },
	{ id: 'sysexInputEnabled', label: 'SysEx Input [4, 5]', preset: '' },
	{ id: 'sysexOutputEnabled', label: 'SysEx Output [4, 5]', preset: '45' },
	{ id: 'oscOutputEnabled', label: 'OSC Output [4]', preset: '4' },
	{ id: 'timecodeInputEnabled', label: 'Timecode Input [4, 5]', preset: '' },
	{ id: 'timecodeOutputEnabled', label: 'Timecode Output [4, 5]', preset: '45' },
	{ id: 'artNetEnabled', label: 'Art-Net Enabled [4]', preset: '' },
	{ id: 'dmxOutputEnabled', label: 'DMX Output [5]', preset: '5' },
	{ id: 'networkExternalInputEnabled', label: 'External Network Input [5]', preset: '' },
	{ id: 'networkExternalOutputEnabled', label: 'External Network Output [5]', preset: '5' },
	{ id: 'networkLocalInputEnabled', label: 'Local Network Input [5]', preset: '' },
	{ id: 'networkLocalOutputEnabled', label: 'Local Network Output [5]', preset: '5' },
]
