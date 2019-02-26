'use strict'

import {
	assign,
	create,

	defineProperty,
	defineProperties,
	getOwnPropertyNames,
	getOwnPropertySymbols,

	isFn,

	symFrame,
	symEntry,
} from 'host'


import {
	intercept,
	makeClassIntercept,
	makeMethodIntercept,
	frameContinuation as frame,
	rootGlobal,
	rootRequire,
	rootEval,
	passBack,
} from 'intercept'

import {
	current,
} from 'frame'

import {
	install,
	addresses
} from 'descriptor'


import 'context'

console.time('install')

const {ARG_N, ARG_LAST, CLASS, METHOD, FRAMER} = install

const installed = install([
	['global',
		['setTimeout', ['$', ARG_N(0)]],
		['clearTimeout'],
		['setImmediate', ['$', ARG_N(0)]],
		['clearImmediate'],
		['setInterval', ['$', ARG_N(0)]],
		['clearInterval'],

		['Promise',
			CLASS(NativePromise =>
				class UserlandPromise extends NativePromise {
					constructor(executor) {
						super(executor)
						this[symFrame] = current.frame
					}
				}
			),
			['prototype', ['_',
				['then',
					METHOD(then =>
						function() {
							if(!this[symFrame]) this[symFrame] = current.frame
							then.apply(this, arguments)
						}
					),
					['$',
						['onfulfilled'],
						['onrejected'],
						FRAMER(({address}) => {
							const onfulfilledEntry = address.onfulfilled[symEntry]
							const onrejectedEntry = address.onrejected[symEntry]
							return function(args) {
								const onfulfilled = args[0]
								const onrejected = args[1]
								onfulfilled && isFn(onfulfilled) && (args[0] = frame(onfulfilledEntry, onfulfilled, true))
								onrejected && isFn(onrejected) && (args[1] = frame(onrejectedEntry, onrejected, true))
							}
						}),
					]
				],
				['catch',
					['$', FRAMER(({address}) => {
						const entry = address[symEntry]
						return function(args) {
							const arg = args[0]
							arg && isFn(arg) && (args[0] = frame(entry, arg, true))
						}
					})]
				],
				['finally',
					['$', FRAMER(({address}) => {
						const entry = address[symEntry]
						return function(args) {
							const arg = args[0]
							arg && isFn(arg) && (args[0] = frame(entry, arg, true))
						}
					})]
				],
			]]
		]

	],
])

console.timeEnd('install')


declare var Context:any

const $ = addresses
console.time('intercept')
intercept($.global.setTimeout)
intercept($.global.clearTimeout)
intercept($.global.setInterval)
intercept($.global.clearInterval)
intercept($.global.setImmediate)
intercept($.global.clearImmediate)
intercept($.global.Promise)
intercept($.global.Promise.prototype._.then)
intercept($.global.Promise.prototype._.catch)
intercept($.global.Promise.prototype._.finally)

console.timeEnd('intercept')


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
		Trap($.global.setTimeout, function(next, this_, args, link) {
			link[sv] = 'WHOLLY FUCKBALLS ' + id++
			console.log('trapped ', MyCtx.test, link[sv])
			return next(args)
		})
		Trap($.global.setTimeout.$, function(n,t,a,l) {
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










