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
} from 'host'


import {
	descriptors,
	intercept,
	makeClassIntercept,
	makeMethodIntercept,
	makeCallbackIntercept,
	rootGlobal,
	rootRequire,
	rootEval
} from 'interceptor'

import {
	current,
	frameResolver,
} from 'frame'

const sid = Symbol()




function makeFrameN(callAddress, address, n) {
	const isPerCall = !!descriptors[callAddress].isPerCall
	return function(frame, args) {
		const cb = args[n]
		if(!cb || !isFn(cb)) return
		args[n] = makeCallbackIntercept(isPerCall, address, frame, cb)
	}
}
function makeFrameZero(callAddress, address) {return makeFrameN(callAddress, address, 0)}
function makeFrameOne(callAddress, address) {return makeFrameN(callAddress, address, 1)}
function makeFrameTwo(callAddress, address) {return makeFrameN(callAddress, address, 2)}

function makeFrameLast(callAddress, address) {
	const isPerCall = !!descriptors[callAddress].isPerCall
	return function(frame, args) {
		const l = args.length - 1
		if(l < 0) return
		const cb = args[l]
		if(!cb || !isFn(cb)) return
		args[l] = makeCallbackIntercept(isPerCall, address, frame, cb)
	}
}



function frameObject(isPerCall, props, frame, obj, isProxy) {
	if(!obj) return
	let idx = props.length
	const proxy = isProxy ? create(obj) : obj
	const desc:any = {configurable: true, enumerable: true}
	while(idx--) {
		const {name, address, isAsync} = props[idx]
		desc.get = function() {
			const cb = obj[name]
			if(!cb || !isFn(cb)) return
			return makeCallbackIntercept(isPerCall, address, frame, cb)
		}
		desc.set = function(v) {return obj[name] = v}
		defineProperty(proxy, name, desc)
	}
	return proxy
}



function makeFrameRegisterElement() {
	const $ = g.Document.prototype.registerElement.$
	const props = [
		{name: 'createdCallback', address: $.createdCallback.valueOf(), isAsync: false},
		{name: 'attachedCallback', address: $.attachedCallback.valueOf()}
	]
	return function(frame, args) {
		const arg1 = args[1]
		const prototype = arg1 && arg1.prototype
		if(!prototype) return
		frameObject(false, props, frame, prototype, true)
	}
}

function makeFrameFileReaderResult() {
	const $ = g.FileReader._.$
	const props = [
		{name: 'onload', address: $.onload, isAsync: false},
		{name: 'onabort', address: $.onabort}
	]
	return function(frame, args) {
		const arg1 = args[1]
		const prototype = arg1 && arg1.prototype
		if(!prototype) return
		frameObject(false, props, frame, prototype, false)
	}
}

let addressId = 0
class Address {
	//id:symbol
	constructor() {this[sid] = Symbol(addressId++)}
	//toString() {return this[Id]}
	//valueOf() {return this[Id]}
}
function n() {return new Address() as any}

const g:any = n()
g.setTimeout = n()
g.setTimeout.$ = n()

g.Promise = n()
g.Promise.prototype = n()
g.Promise.prototype.then = n()
g.Promise.prototype.then.$ = n()
g.Promise.prototype.then.$.onfulfilled = n()
g.Promise.prototype.then.$.onrejected = n()
g.Promise.prototype.catch = n()
g.Promise.prototype.catch.$ = n()
g.Promise.prototype.finally = n()
g.Promise.prototype.finally.$ = n()


g.Document = n()
g.Document.prototype = n()
g.Document.prototype.registerElement = n()
g.Document.prototype.registerElement.$ = n()
g.Document.prototype.registerElement.$.createdCallback = n()
g.Document.prototype.registerElement.$.attachedCallback = n()

g.FileReader = n()
g.FileReader._ = n()
g.FileReader._.$ = n()
g.FileReader._.$.onload = n()
g.FileReader._.$.onabort = n()

const r:any = n()
r.child_process = n()
r.child_process.exec = n()
r.child_process.exec.$ = n()
r.child_process.exec._ = n()
r.child_process.exec._.send = n()
r.child_process.exec._.send.$ = n()
//r.child_process.execFile._ = n()




assign(descriptors, {
	[g.setTimeout[sid]]: {
		address: g.setTimeout[sid],
		path: ['global', 'setTimeout'],
		root: rootGlobal,
		isPerCall: true,
		make: makeMethodIntercept,
		//frameArgs: makeFrameZero(g.setTimeout, g.setTimeout.$)
	},
	[g.setTimeout.$[sid]]: {

	},
	[g.Promise[sid]]: {
		address: g.Promise[sid],
		path: ['global', 'Promise'],
		root: rootGlobal,
		make: makeClassIntercept,
		implement(instance, NativePromise) {
			return class UserlandPromise extends NativePromise {
				constructor() {
					super(...arguments)
					;(this as any)[symFrame] = current.frame
				}
			}
		}
	},
	[g.Promise.prototype.then[sid]]: {
		address: g.Promise.prototype.then[sid],
		path: ['global', 'Promise', 'prototype', 'then'],
		root: rootGlobal,
		make: makeMethodIntercept,
		implement(instance, method) {
			return function(onfulfilled, onrejected) {
				// only true when node host is calling 'then()' from microtask
				// implementing PromiseResolveThenableJob which calls performPromiseThen
				if(!this[symFrame]) this[symFrame] = current.frame
				return method.apply(this, arguments)
			}
		}
		//frameArgs:
	},
	[g.Promise.prototype.then.$[sid]]:{},
	[g.Promise.prototype.then.$.onfulfilled[sid]]:{},
	[g.Promise.prototype.then.$.onrejected[sid]]:{},
	[g.Promise.prototype.catch[sid]]:{
		address: g.Promise.prototype.catch[sid],
		path: ['global', 'Promise', 'prototype', 'catch'],
		root: rootGlobal,
		make: makeMethodIntercept,
	},
	[g.Promise.prototype.catch.$[sid]]:{},
	[g.Promise.prototype.finally[sid]]:{
		address: g.Promise.prototype.finally[sid],
		path: ['global', 'Promise', 'prototype', 'finally'],
		root: rootGlobal,
		make: makeMethodIntercept,
	},
	[g.Promise.prototype.finally.$[sid]]:{},
	/*
	[g.Document.prototype.registerElement]: {
		address: g.Document.prototype.registerElement.valueOf(),
		path: [],
		frameArgs: makeFrameRegisterElement()
	},
	[g.Document.prototype.registerElement.$]: {
	},
	[g.Document.prototype.registerElement.$.createdCallback]: {
	},
	[g.Document.prototype.registerElement.$.attachedCallback]: {
	}
	*/
})

descriptors[g.setTimeout[sid]].frameArgs = makeFrameZero(g.setTimeout[sid], g.setTimeout.$[sid])

descriptors[g.Promise.prototype.then[sid]].frameArgs = function makeFramePromiseThen() {
	const onfulfilledSid = g.Promise.prototype.then.$.onfulfilled[sid]
	const onrejectedSid = g.Promise.prototype.then.$.onrejected[sid]
	return function(frame, args) {
		const onfulfilled = args[0]
		const onrejected = args[1]
		if(onfulfilled && isFn(onfulfilled))
			args[0] = makeCallbackIntercept(false, onfulfilledSid, frame, onfulfilled, true)
		if(onrejected && isFn(onrejected))
			args[1] = makeCallbackIntercept(false, onrejectedSid, frame, onrejected, true)
	}
}

descriptors[g.Promise.prototype.catch[sid]].frameArgs = function makeFramePromiseCatch() {
	const onrejectedSid = g.Promise.prototype.catch.$[sid]
	return function(frame, args) {
		const onrejected = args[0]
		if(onrejected && isFn(onrejected))
			args[1] = makeCallbackIntercept(false, onrejectedSid, frame, onrejected, true)
	}
}

descriptors[g.Promise.prototype.finally[sid]].frameArgs = function makeFramePromiseFinally() {
	const onfinallySid = g.Promise.prototype.finally.$[sid]
	return function(frame, args) {
		const onfinally = args[0]
		if(onfinally && isFn(onfinally))
			args[1] = makeCallbackIntercept(false, onfinallySid, frame, onfinally, true)
	}
}







import 'context'

intercept(g.Promise.prototype.then[sid])
intercept(g.Promise.prototype.catch[sid])
intercept(g.Promise.prototype.finally[sid])
intercept(g.Promise[sid])


intercept(g.setTimeout[sid])

declare function Context<T>(name:string, objectOrClass:T):Function & typeof objectOrClass
//declare function Context<T>(objectOrClass:T):Function & typeof objectOrClass
declare function Context(any):any

interface IContext {

}
//const AnonCtx = Context({test:1})
//const MyCtx = Context('MyCtx', {test:1})

const MyCtx = Context(class MyCtx {
	static test = 8

	static Initialize(request) {
		const missing = request('test')
	}

	initialize(parent) {
		const {Trap} = MyCtx as any
		Trap(g.setTimeout[sid], function(n,t,a,l) {
			console.log('trapped ', MyCtx.test, l)
			return n(a)
		})
		Trap(g.setTimeout.$[sid], function(n,t,a,l) {
			console.log('trapped cont', MyCtx.test, l)
			return n(a)
		})
	}
})



;(() => {
	MyCtx(() => {
		console.log(MyCtx.test)

		setTimeout(() => {
			console.log('testctx', MyCtx.test)
		}, 100)


	})

	MyCtx(() => {
		MyCtx.test = 123123
		console.log(MyCtx.test)

		const test = MyCtx.test

		setTimeout(() => {
			console.log('test2', MyCtx.test, test)
		}, 200)
	})

	console.log('yeah', Context.Current.id)

	setTimeout(() => {
		console.log('outa')
	})
})
()
/*

let top
let hostApis
const MyXhrCtx = Context(class MyXrxCtx {
	static test = 8

	static Initialize(request) {
		// this is the '0' and default context
		// which all later context instances inherit from
		// return list of addresses of required host apis
		top = this
		hostApis = request(['global',
			['Promise.*', 'setTimeout', 'clearTimeout'],
		])

		hostApis.XMLHttpRequestTarget.prototype._.addListener[sid]
	}

	initialize(parent) {
		// parent === top on first use
		if(parent !== top) return


		//const x = 1
		const {Trap} = MyXrxCtx as any
		if(!Trap(g.XMLHttpRequest.prototype.addEventListener))
		Trap(g.XMLHttpRequestEventTarget.prototype)

		Trap(g.setTimeout, function(n,t,a,l) {
			console.log('trapped ', MyCtx.test, l)
			setTimeout(n.deferred(a))
			return
		})
		Trap(g.setTimeout.$, function(n,t,a,l) {
			console.log('trapped cont', MyCtx.test, l)
			return n(a)
		})
	}
})


*/





/*
globalAddressTable or, if Mr. Musk has his way, the solarAddressTable


 */
/*
function EVAL(desc) {}

function REGISTER_ELEMENT(...generators) {
	return function(desc, address) {
		address += '.current'
		const propAddresses = generators.map(generator => {
			generateInterceptDescriptor(generator, address)
			return address + '.' + generator[0]
		})
		desc.get = function(a) {
			const {prototype} = a[1]
			if(!prototype) return undefined

			for(let propAddr of propAddresses)
				intercept(propAddr, prototype)

			return undefined
		}
	}
}

const CHILD_PROCESS_RESULT = ['().send', LAST]

const interceptorDescriptorGenerators = [
	['global',
		['setTimeout', ZERO],
		['clearTimeout'],
		['setImmediate', ZERO],
		['clearImmediate'],


		['FileReader', ['()', ['$',
			['onabort', PROPERTY],
			['onerror', PROPERTY],
			['onload', PROPERTY],
		]]],

		['Document', ['prototype', ['registerElement', ['$',
			REGISTER_ELEMENT(
				['createdCallback', PROPERTY],
				['attachedCallback', PROPERTY],
				['detachedCallback', PROPERTY],
				['attributeChangedCallback', PROPERTY],
			)],
		]],

		['Object',
			['defineProperty',
				INTERCEPT(fn =>
					function(target, name, desc) {
						const cbProps = target[symCbProps]
						if(!cbProps || !cbProps[name]) return fn(target, name, desc)

						//if(desc.get || desc.set) ;

						target[name] = desc.value
					}
				),
			],
			['defineProperties',
				INTERCEPT(fn =>
					function(target, descs) {
						if(inHostFrame()) return defineProperties(target, descs)
						getOwnPropertyNames(descs).forEach(prop => defineProperty(target, prop, descs[prop]))
						getOwnPropertySymbols(descs).forEach(prop => defineProperty(target, prop, descs[prop]))
					}
				),
			],
		],

		['Promise', CLASS,
			INTERCEPT(NativePromise =>
				class Promise extends NativePromise {
					constructor(exector) {
						super(exector)
						this[symFrame] = Context.Current
					}
				}
			),
			['prototype',
				['then',
					INTERCEPT(fn =>
						function(onfulfilled, onrejected) {
							if(!this[symFrame]) {
								// only true when node host is calling 'then()' from microtask
								// implementing PromiseResolveThenableJob which calls performPromiseThen
								// so its being called in same context as internal Promise made
								// by await implementation
								this[symFrame] = Context.Current
							}

							// by this point, the promise object is coupled to the frame it
							// was created in, stored in this[symFrame]
							// further, the promise callbacks run in context in which 'then()' called :)
							// and many thens can run in their own separate contexts
							return fn.call(this, frameAwaitChain(onfulfilled), frameAwaitChain(onrejected))
						}
					)
				],
				['catch', ONE],
				['finally', ONE],
			]
		],
	],

	[EVAL('(return function*(){})'),
		['__proto__', ['constructor', ['prototype', ['prototype', ['next',
			INTERCEPT(method =>
				//function() {return runAsync(this[eldc], method, this, arguments)}
				function() {return runSync(this[eldc], method, this, arguments)}
			),
		]]]]]
	],

	['child_process',
		['exec', LAST, CHILD_PROCESS_RESULT],
		['execFile', LAST, CHILD_PROCESS_RESULT],
		['fork', CHILD_PROCESS_RESULT],
		['spawn', CHILD_PROCESS_RESULT],
	],

	['events', ['prototype',
		['removeListener', ZERO],
		['listeners',
			INTERCEPT(method =>
				function(eventName) {
					const listeners = method.call(this, eventName)
					if(inHostFrame()) return listeners
					return listeners && listeners.map(listener => listener[symDisguised] || listener)
				}
			),
		],
		['rawListeners',
			INTERCEPT(method =>
				function(eventName) {
					const listeners = method.call(this, eventName)
					if(inHostFrame()) return listeners
					return listeners && listeners.map(listener => listener[symDisguised])
				}
			),
		],
		['once'],
		['on']
	]],
]




const addresses = {
	global_Promise: 0,
	global_Promise_prototype_then: 1,
	global_Promise_prototype_catch: 2,
	global_Document_prototype_registerElement: 3,
	global_Document_prototype_registerElement_$_createdCallback: 4,
}



const interceptDescriptorTable = {
	'global.setTimeout': {
		path: ['global', 'setTimeout'],
		isAsync: false,
		isPerCall: true,
		frameArgs: frameZero, // address is .$, default isAsync = false,
		//callbacks: ['global.setTimeout.$'], // implied by frameZero
		frameResult: frameResult,
		resultCallbacks: [],
		resultIntercepts: [],
	},
	/*
			// synthetic?

	'global.setTimeout.$': {
		isAsync: false
	},
	'global.Promise': {
		path: ['global', 'Promise']
	},

	'global.Promise.prototype.then': {
		path: ['global', 'Promise', 'prototype', 'then']
	},

	'global.Document.prototype.registerElement': {
		path: ['global', 'Document', 'prototype', 'registerElement'],
		isAsync: false,
		isPerCall: false,
		frameArgs: frameRegisterElement,
		frameResult: frameResult,
		resultIntercepts: []
	},
	'global.Document.prototype.registerElement.$.createdCallback': {
		path: ['createdCallback'],
		isAsync: false,
	},
	'global.Document.prototype.registerElement.$.attachedCallback': {
		path: ['attachedCallback'],
		get: get0,
		set: set0,
		make: property,
		run: sync
	},
	'global.Document.prototype.registerElement.$.detachedCallback': {
		path: ['detachedCallback'],
		get: get0,
		set: set0,
		make: property,
		run: sync
	},
	'global.Document.prototype.registerElement.$.attributeChangedCallback': {
		path: ['attributeChangedCallback'],
		get: get0,
		set: set0,
		make: property,
		run: sync
	},
	'child_process.exec': {
		path: ['child_process', 'exec'],
		get: getLast,
		set: setLast,
		run: sync,
		make: method,
		intercept: method => function() {return method.call(this, ...arguments)},
		resultTraps: [
			'child_process.exec._.send'
		]
	},
	'child_process.exec._.send': {
		path: ['send'],
		get() {},
		set() {},
		run: sync,
		make: method
	},
	'events.prototype.addListener': {

	},
	'events.prototype.addListener.$.default': {

	},

	'events.prototype.removeListener': {

	},
	'events.prototype.listeners': {
		type: method,
		intercept: method => function() {
			const listeners = method.call(this)
			return listeners && listeners.map(listener => listener[symIntercepted])
		}
	},

	// we can wrap rl again, or assign to
	'events.prototype.on': {
		path: ['events', 'prototype', 'on'],
		//trapper: (address, instance) => instance.on = instance.removeListener
	},


	'global.FileReader': {
		path: ['global', 'FileReader'],
		isAsync: false,
		isPerCall: true, // hmm - it is and it isnt?... it is
		//frameArgs: frameZero,
		//callbacks: ['global.setTimeout.$'],
		frameResult: frameFileReaderResult,
		resultCallbacks: ['global.FileReader.().$.onabort']
	},

	'global.FileReader.().$.onabort': {
		path: ['onabort'],
		isAsync: false
	},
}


	*/
