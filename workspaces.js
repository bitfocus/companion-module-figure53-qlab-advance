import { lastIndexOf } from 'lodash-es'
import * as Colors from './colors.js'

class Workspace {
	uniqueID = ''
	version = ''
	displayName = 'Untitled Workspace'
	// QLab 4 only
	hasPasscode = null
	// QLab 5 only
	udpReplyPort = 53001
	port = 53000
	connected = false


	constructor(j) {
		if (j) {
			Object.assign(this, j)
		}
		const n = this.displayName
		this.displayName = n.substring(0,n.lastIndexOf('.'))
	}
}


export default Workspace
