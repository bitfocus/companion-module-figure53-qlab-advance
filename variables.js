module.exports = {

	setVariables: function() {

		var variables = [
			{
				label: 'Version of QLab attached to this instance',
				name:  'q_ver'
			},
			{
				label: 'Double Go Minimum Time',
				name:  'min_go'
			},
			{
				label: 'Playhead Cue UniqueID',
				name:  'n_id'
			},
			{
				label: 'Playhead Cue Name',
				name:  'n_name'
			},
			{
				label: 'Playhead Cue Number',
				name:  'n_num'
			},
			{
				label: 'Playhead Cue Type',
				name:  'n_type'
			},
			{
				label: 'Playhead Notes',
				name:  'n_notes'
			},
			{
				label: 'Playhead Cue Status',
				name:  'n_stat'
			},
			{
				label: 'Running Cue UniqueID',
				name:  'r_id'
			},
			{
				label: 'Running Cue Name',
				name:  'r_name'
			},
			{
				label: 'Running Cue Number',
				name:  'r_num'
			},
			{
				label: 'Running Cue Status',
				name:  'r_stat'
			},
			{
				label: 'Running Cue Time left, variable size',
				name:  'r_left'
			},
			{
				label: 'Running Cue Time left, HH:MM:SS',
				name:  'r_hhmmss'
			},
			{
				label: 'Running Cue Time left, Hour',
				name:  'r_hh'
			},
			{
				label: 'Running Cue Time left, Minute',
				name:  'r_mm'
			},
			{
				label: 'Running Cue Time left, Second',
				name:  'r_ss'
			},
			{
				label: 'Running Cue Elapsed Time, variable size',
				name:  'e_time'
			},
			{
				label: 'Running Cue Elapsed Time, HH:MM:SS',
				name:  'e_hhmmss'
			},
			{
				label: 'Running Cue Elapsed Time, Hour',
				name:  'e_hh'
			},
			{
				label: 'Running Cue Elapsed Time, Minute',
				name:  'e_mm'
			},
			{
				label: 'Running Cue Elapsed Time, Second',
				name:  'e_ss'
			}
		];
		return(variables);
	}
};
