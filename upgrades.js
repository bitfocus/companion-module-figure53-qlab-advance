module.exports = {

	/**
	 * INTERNAL: add various upgrade scripts
	 *
	 * @access protected
	 */
	addUpgradeScripts() {

		if (process.env.DEVELOPER) {
			this.config._configIdx = -1;
		}

		this.addUpgradeScript((config, actions, releaseActions, feedbacks) => {
			var changed = false;

			let upgradePass = function(action, changed) {
				switch (action.action) {
					case 'autoLoad':
						if (action.options.autoId == 1) {
							action.action = "autoload";
							action.label = action.id + ":" + action.action;
							changed = true;
						}
						break;
				}

				return changed;
			}

			for (let k in actions) {
				changed = upgradePass(actions[k], changed);
			}

			for (let k in releaseActions) {
				changed = upgradePass(releaseActions[k], changed);
			}

			return changed;
		});

		this.addUpgradeScript((config, actions, releaseActions, feedbacks) => {
			var changed = false;

			let upgradePass = function(action, changed) {
				if (action.action =='flagged' && action.options.flaggId !== undefined) {
					action.options.flagId = action.options.flaggId;
					delete action.options.flaggId;
					changed = true;
				}

				return changed;
			}

			for (let k in actions) {
				changed = upgradePass(actions[k], changed);
			}

			for (let k in releaseActions) {
				changed = upgradePass(releaseActions[k], changed);
			}

			return changed;
		});

		this.addUpgradeScript((config, actions, releaseActions, feedbacks) => {
			var changed = false;

			if (config.useTenths === undefined) {
				config.useTenths = false;
				changed = true;
			}

			if (config.useTCP === undefined) {
				config.useTCP = false;
				changed = true;
			}

			return changed;
		});
	}
}
