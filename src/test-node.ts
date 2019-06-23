(require('tsconfig-paths')).register({baseUrl: './obj', paths:{}})
import 'source-map-support/register'

console.time('import')
import Context from 'index'
console.timeEnd('import')

const {install, intercept} = Context
const {ARG_N, ARG_LAST} = Context.install

console.time('install')
const installed = install([
	['global',
		['setTimeout', ['$', ARG_N(0)]],
		['clearTimeout'],
		//['setImmediate', ['$', ARG_N(0)]],
		//['clearImmediate'],
		//['setInterval', ['$', ARG_N(0)]],
		//['clearInterval'],
	],
])
console.timeEnd('install')

console.time('intercept')
intercept(installed)
console.timeEnd('intercept')



import './test-node-genfn'

/*

const SomeCtx = Context('SomeCtx', {contextualProp: 'default value'})

function stuff(id) {
	SomeCtx(() => {
		console.log(id, SomeCtx.contextualProp)

		SomeCtx({contextualProp: 'BigDeal'}, async() => {
			await new Promise(resolve => setTimeout(function() {
				console.log(id, SomeCtx.contextualProp)
				resolve()
			}, 200))
			setInterval(function() {
				console.log(id, 'int', SomeCtx.contextualProp)
			}, 500)
		})

		SomeCtx({contextualProp: 'Whaaaa!!!'}, async() => {
			await new Promise(resolve => setTimeout(function() {
				console.log(id, SomeCtx.contextualProp)
				resolve()
			}, 100))

			setInterval(function() {
				console.log(id, 'int', SomeCtx.contextualProp)
			}, 400)
		})
	})
}

var id = 0

const MyCtx = Context(class MyCtx {
	static test = 8

	static Initialize(request) {
		//const [[g, missing, failed]] = request('')
		//setTimeoutSid = g.setTimeout[Sid]
		//setTimeoutCbSid = g.setTimeout.$[Sid]

		//const [found, missing] = request(['global.Promise.prototype', '$percall', '$perinstance'])

	}

	initialize(parent) {
		const {Trap} = MyCtx as any
		const sv = Symbol()
		Trap(g.setTimeout, function(next, this_, args, link) {
			link[sv] = 'WHOLLY FUCKBALLS ' + id++
			console.log('trapped ', MyCtx.test, link[sv])
			return next(args)
		})
		Trap(g.setTimeout.$, function(n,t,a,l) {
			console.log('trapped cont', MyCtx.test, l[sv])
			return n(a)
		})
	}
});


;(() => {
	MyCtx(() => {
		MyCtx(() => {
			stuff(1)
		})
		stuff(4)
	})
	stuff(2)
})()

//SomeCtx.contextualProp

;(() => {
	let x = 1
	function fn() {
		console.log('fn ', MyCtx.test, x)
	}

	MyCtx(async () => {
		console.log(MyCtx.test)
		x = 2
		await new Promise(r => {setTimeout(() => {
			console.log('testctx', MyCtx.test)
			r()
		}, 100)})
		//setTimeout(fn, 200)
		//setTimeout(() => {console.log('testctx', MyCtx.test)}, 100)
	})

	MyCtx({test: 222}, () => {
		console.log(MyCtx.test)

		const test = MyCtx.test

		x = 3
		setTimeout(fn, 100)
	})

	console.log('yeah', Context.Current.id)

	//setTimeout(() => {console.log('outa')})
})
//()



*/







