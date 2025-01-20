export function compileVariableDefinition() {
	return [
		{
			name: 'Version of QLab attached to this instance',
			variableId: 'q_ver',
		},
		{
			name: 'Default (first) workspace ID',
			variableId: 'ws_id',
		},
		{
			name: 'Double Go Minimum Time',
			variableId: 'min_go',
		},
		{
			name: 'Playhead Cue UniqueID',
			variableId: 'n_id',
		},
		{
			name: 'Playhead Cue Name',
			variableId: 'n_name',
		},
		{
			name: 'Playhead Cue Number',
			variableId: 'n_num',
		},
		{
			name: 'Playhead Cue Type',
			variableId: 'n_type',
		},
		{
			name: 'Playhead Pre Wait (seconds)',
			variableId: 'n_preWait',
		},
		{
			name: 'Playhead Post Wait (seconds)',
			variableId: 'n_postWait',
		},
		{
			name: 'Playhead Elapsed (seconds)',
			variableId: 'n_elapsed',
		},
		{
			name: 'Playhead Notes',
			variableId: 'n_notes',
		},
		{
			name: 'Playhead Cue Status',
			variableId: 'n_stat',
		},
		{
			name: 'Playhead Continue Mode',
			variableId: 'n_cont',
		},
		{
			name: 'Selected Cue UniqueID (first only)',
			variableId: 's_id',
		},
		{
			name: 'Selected Cues UniqueIDs (all)',
			variableId: 's_ids',
		},
		{
			name: 'Selected Cue Count',
			variableId: 's_count',
		},
		{
			name: 'Running Cue UniqueID',
			variableId: 'r_id',
		},
		{
			name: 'Running Cue Name',
			variableId: 'r_name',
		},
		{
			name: 'Running Cue Number',
			variableId: 'r_num',
		},
		{
			name: 'Running Cue Notes',
			variableId: 'r_notes',
		},
		{
			name: 'Running Cue Status',
			variableId: 'r_stat',
		},
		{
			name: 'Running Cue Time left, variable size',
			variableId: 'r_left',
		},
		{
			name: 'Running Cue Time left, HH:MM:SS',
			variableId: 'r_hhmmss',
		},
		{
			name: 'Running Cue Time left, Hour',
			variableId: 'r_hh',
		},
		{
			name: 'Running Cue Time left, Minute',
			variableId: 'r_mm',
		},
		{
			name: 'Running Cue Time left, Second',
			variableId: 'r_ss',
		},
		{
			name: 'Running Cue Loop Time Left, total seconds',
			variableId: 'r_secs',
		},
		{
			name: 'Running Cue Loop Elapsed Time, total seconds',
			variableId: 'e_secs',
		},
		{
			name: 'Running Cue Total Elapsed Time, total seconds',
			variableId: 'e_total',
		},
		{
			name: 'Running Cue Elapsed Time, variable size',
			variableId: 'e_time',
		},
		{
			name: 'Running Cue Elapsed Time, HH:MM:SS',
			variableId: 'e_hhmmss',
		},
		{
			name: 'Running Cue Elapsed Time, Hour',
			variableId: 'e_hh',
		},
		{
			name: 'Running Cue Elapsed Time, Minute',
			variableId: 'e_mm',
		},
		{
			name: 'Running Cue Elapsed Time, Second',
			variableId: 'e_ss',
		},
		{
			name: 'Number of miscellaneous QLab Errors',
			variableId: 'errs',
		},
	]
}
