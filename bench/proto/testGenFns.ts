
function* test() {
	const fn = function*() {yield 1}
	const x = fn()
	yield* x
}


async function* atest() {
	
}
module.exports = y