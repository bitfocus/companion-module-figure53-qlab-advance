import { CreateConvertToBooleanFeedbackUpgradeScript } from '@companion-module/base'

export const UpgradeScripts = [
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (let action of props.actions) {
			if (action.actionId == 'autoLoad') {
				if (action.options.autoId == 1) {
					action.actionId = 'autoload'

					result.updatedActions.push(action)
				}
			}
			if ('flagged' == action.actionId && action.options.flaggId) {
				action.options.flagId = action.options.flaggId
				delete action.options.flaggId

				result.updatedActions.push(action)
			}
		}

		if (props.config) {
			if (props.config.useTenths == undefined) {
				props.config.useTenths = false

				result.updatedConfig = props.config
			}
		}

		return result
	},
	CreateConvertToBooleanFeedbackUpgradeScript({
		q_run: true,
		min_go: true,
		ws_mode: true,
		override: true,
	}),
	function (context, props) {
		// users from figure53-qlab (the other version)

		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (let action of props.actions) {
			if ('flagged' == action.actionId && action.options.flaggId) {
				action.options.flagId = action.options.flaggId
				delete action.options.flaggId

				result.updatedActions.push(action)
			}
		}

		return result
	},
]
