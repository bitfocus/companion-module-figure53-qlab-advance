import { Regex } from '@companion-module/base'

const REGEX_IP_OR_HOST =
	'/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$' +
	'|^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)+([A-Za-z]|[A-Za-z][A-Za-z0-9-]*[A-Za-z0-9])$/'

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
			label: 'Target Host/IP',
			width: 6,
			tooltip: 'The Hostname or IP of the computer running QLab',
			regex: REGEX_IP_OR_HOST,
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Target Port',
			width: 6,
			tooltip: 'Port number configured on QLab\nto access the workspace',
			default: 53000,
			regex: Regex.PORT,
		},
		{
			type: 'checkbox',
			label: 'Use TCP?',
			id: 'useTCP',
			width: 6,
			tooltip: 'Use TCP instead of UDP\nRequired for feedbacks and variables',
			default: true,
		},
		{
			type: 'checkbox',
			label: 'Use Tenths?',
			id: 'useTenths',
			width: 6,
			isVisible: (options, data) => {
				return !!options.useTCP
			},
			tooltip:
				'Show .1 second resolution for cue remaining timer?\nOtherwise offset countdown by +1 second\nRequires TCP',
			default: false,
		},
		{
			type: 'checkbox',
			label: 'Expose cue name variables?',
			id: 'exposeVariables',
			width: 6,
			isVisible: (options, data) => {
				return !!options.useTCP
			},
			tooltip:
				'Variables for the name of each cue number and cue ID are normally hidden\n' +
				'in the Variable List. Enabling this will allow them to be searched in the\n' +
				'list but may also cause excessive clutter',
			default: false,
		},
		{
			type: 'textinput',
			id: 'passcode',
			label: 'OSC Passcode',
			width: 6,
			tooltip:
				'The passcode to controll QLab.\nLeave blank if not needed\n' + 'This is almost always required for QLab5',
		},
		{
			type: 'dropdown',
			id: 'workspace',
			label: 'Workspace',
			width: 12,
			tooltip: "Select a target workspace\n(or Default/selected)",
			default: 'default',
			choices: [
				{ id: 'default', label: 'Default Workspace' },
				...Object.keys(self.wsList).reduce((res, i) => {
					res.push({ id: i, label: self.wsList[i].displayName + ` (${i})` })
					return res
				}, []),
			],
		},
		{
			type: 'dropdown',
			id: 'cuelist',
			label: 'Cue List',
			tooltip: 'Specific Cue List for Play Head control\n(or use Default/selected)',
			width: 12,
			default: 'default',
			choices: [
				{
					id: 'default',
					label: 'Default Cue List',
				},
				...Object.keys(self.cueList).reduce((res, i) => {
					res.push({ id: i, label: self.wsCues[i].qName + ` (${i})` })
					return res
				}, []),
			],
		},
	]

	return configs
}
