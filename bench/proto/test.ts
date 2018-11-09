const log = console.log

log('module')

const x = require('./index')

/*
const mod = require('module')

const jsExt = mod._extensions['.js']
mod._extensions['.js'] = function(module_, filename) {
	return jsExt.call(this, module_, filename)
}

const hasGenFnRe = /function\* /g

const has = hasGenFnRe.test('const x = 1\nfunction* fn() {yield 3}\n')

function wrapGenFn(source) {
	
}

*/






const rff = Function(`
;(() => {
	function* list() {
		yield 1
		yield 2
	}
	
	//return list()
	for(const c of list())
		console.log(c)
})()
`)()




const afn = Function(`
return async		/*sdfsdf*/ function* asyncFn(ms) {
	await new Promise(_ => setTimeout(_, ms))
	yield 1
	await new Promise(_ => setTimeout(_, ms))
	yield 2
	//return new Promise(_ => setTimeout(_, ms))
}
`)()


const acal = afn(10)
const acal2 = afn(20)

//const xxx = acal.next()

const rf = Function('acal', `
;(async() => {
	for await (const c of acal)
		console.log(c)
	//let x = afn
})()
`)(acal)


function* gen() {
	let i = 1000000
	while(i--)
		yield i
}

let c = 0

console.time('unwrapped.1')
for(const i of gen())
	c += i
console.timeEnd('unwrapped.1')
console.log(c)

c = 0


console.time('unwrapped')
for(const i of gen())
	c += i
console.timeEnd('unwrapped')
console.log(c)


let g = <any>gen()
g.x = 1

c = 0

console.time('deferred')
for(const i of g)
	c += i
console.timeEnd('deferred')
console.log(c)


function genw() {
	const r = <any>gen()
	r.x = 1
	return r
}


c = 0

console.time('wrapped')
for(const i of genw())
	c += i
console.timeEnd('wrapped')
console.log(c)