module.exports = {

	CONTINUE_MODE: [
		{ label: 'Do Not Continue', id: '0' },
		{ label: 'Auto Continue',   id: '1' },
		{ label: 'Auto Follow',     id: '2' }
	],

	TOGGLE: [
		{ id: 1, label: 'On'},
		{ id: 0, label: 'Off'},
		{ id: 2, label: 'Toggle'}
	],

	ON_OFF: [
		{ id: 1, label: 'On'},
		{ id: 0, label: 'Off'}
	],

	OVERRIDE: [
		{ id: 'midiInputEnabled', 	label: 'Midi Input' },
		{ id: 'midiOutputEnabled',	label: 'Midi Output' },
		{ id: 'mscInputEnabled',	label: 'MSC Input' },
		{ id: 'mscOutputEnabled', 	label: 'MSC Output' },
		{ id: 'sysexInputEnabled',	label: 'SysEx Input' },
		{ id: 'sysexInputEnabled',	label: 'SysEx Output' },
		{ id: 'oscOutputEnabled',	label: 'OSC Output' },
		{ id: 'timecodeInputEnabled', label: 'Timecode Input' },
		{ id: 'timecodeOutputEnabled', label: 'Timecode Output' },
		{ id: 'artNetEnabled', 		label: 'Art-Net Enabled' }
	]
};
