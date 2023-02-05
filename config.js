import { Regex } from '@companion-module/base'

export function GetConfigFields(self) {
	const configs = [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'Controls <a href="https://qlab.app" target="_new">QLab</a> by Figure 53.' +
				'<br>Feedback and variables require TCP<br>which will increase network traffic.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 6,
			tooltip: 'The IP of the computer running QLab',
			regex: Regex.IP,
		},
		{
			type: 'checkbox',
			label: 'Use TCP?',
			id: 'useTCP',
			width: 20,
			tooltip: 'Use TCP instead of UDP\nRequired for feedbacks',
			default: false,
		},
		{
			type: 'checkbox',
			label: 'Use Tenths',
			id: 'useTenths',
			width: 20,
			tooltip:
				'Show .1 second resolution for cue remaining timer?\nOtherwise offset countdown by +1 second\nRequires TCP',
			default: false,
		},
		{
			type: 'textinput',
			id: 'passcode',
			label: 'OSC Passcode',
			width: 12,
			tooltip: 'The passcode to controll QLab.\nLeave blank if not needed.',
		},
		{
			type: 'textinput',
			id: 'workspace',
			label: 'Workspace',
			width: 12,
			tooltip: "Enter the name or ID for the workspace.\n Leave blank or enter 'default' for the front Workspace",
			default: 'default',
		},
	]

	if (Object.keys(self.cueList).length > 0) {
		const clist = {
			type: 'dropdown',
			id: 'cuelist',
			label: 'Specific Cue List',
			tooltip: 'Select a specific Cue List for Play Head Variables',
			width: 12,
			default: 'default',
			choices: [
				{
					id: 'default',
					label: 'Default Cue List',
				},
			],
		}

		for (let c in self.cueList) {
			clist.choices.push({
				id: c,
				label: self.wsCues[c].qName,
			})
		}

		configs.push(clist)
	}

	return configs
}
