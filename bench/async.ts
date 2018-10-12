import ah from 'async_hooks'
import fs from 'fs'
import util from 'util'

function log(...args) {
	// @ts-ignore
	fs.writeSync(process.stdout.fd, `${util.format(...args)}\n`);
}


let indent = 0
function ind() {return ' '.repeat(indent * 2)}

const hook = ah.createHook({
	init(asyncId, type, triggerAsyncId, resource) {
		const eid = ah.executionAsyncId()
		log(`${ind()}init:    eid: ${eid}, asyncId: ${asyncId}, type: ${type}, trig: ${triggerAsyncId}`)
	},
	before(asyncId){
		const eid = ah.executionAsyncId()
		log(`${ind()}before:  eid: ${eid}, asyncId: ${asyncId}`)
		++indent
	},
	after(asyncId) {
		--indent
		const eid = ah.executionAsyncId()
		log(`${ind()}after:   eid: ${eid}, asyncId: ${asyncId}`)
	},
	destroy(asyncId) {
		const eid = ah.executionAsyncId()
		log(`${ind()}destroy: eid: ${eid}, asyncId: ${asyncId}`)
	}
})

hook.enable()
setTimeout(() => {
	console.log(`${ind()}timeout 1`), 150
	setTimeout(() => {
		console.log(`${ind()}timeout 1.1`), 70
	})
})
setTimeout(() => {console.log(`${ind()}timeout 2`), 100})
setTimeout(() => {console.log(`${ind()}timeout 3`), 200})


