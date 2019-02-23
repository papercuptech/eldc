

const {
	assign,
	create,
	defineProperties,
	defineProperty,
	entries,
	freeze,
	//fromEntries,
	getOwnPropertyDescriptor,
	getOwnPropertyDescriptors,
	getOwnPropertyNames,
	getOwnPropertySymbols,
	getPrototypeOf,
	keys,
	setPrototypeOf,
} = Object


function isFn(thing) {return typeof thing === 'function'}
function isObj(thing) {return thing !== null && typeof thing === 'object'}

let disguiseId = 0
function disguise(original, mask) {
	defineProperty(mask, 'name', {configurable: true, value: original.name})
	defineProperty(mask, 'length', {configurable: true, value: original.length})
	setPrototypeOf(mask, original)
	original[symDisguised] = mask
	mask[symDisguised] = original.name ||`_${disguiseId++}_`
	return mask
}


const symId = Symbol('eldc-id')

const symDisguised = Symbol('eldc-disguised')
const symIsAwaitChain = Symbol('eldc-is-await-chain')
const symContextSymbol = Symbol('eldc-context-symbol')
const symFactory = Symbol('eldc-factorty')
const symFrame = Symbol('eldc-frame')
const symTraps = Symbol('elds-traps')

let global_:any = {}
try {global_ = global}
catch {
	try {global_ = window}
	catch {}
}


let nextId = 0
class Frame {
	id!:number

	static New(within?:Frame) {
		const new_ = create(within || null)
		new_.id = nextId++
		return new_ as Frame
	}
}

const host = Frame.New()
let current = host
export function cur(c?) {
	const frame = arguments.length === 1 ? c : current
	return frame.id
}


const queuePromiseMicroTask = Promise.prototype.then.bind(Promise.resolve())

interface Switcher {
	():void
	to:Frame
	isForAwaitChain:boolean
	next?:Switcher
}
let freeSwitchers:Switcher|undefined = undefined
function getSwitcher(to, isForAwaitChain = false) {
	let switcher:Switcher
	if(freeSwitchers) {
		switcher = freeSwitchers
		freeSwitchers = freeSwitchers.next
	}
	else switcher = <Switcher>function newSwitcher() {
		const switcher = <Switcher>newSwitcher
		const {to, isForAwaitChain} = switcher
		current = to
		if(isForAwaitChain) {
			switcher.isForAwaitChain = false
			queuePromiseMicroTask(switcher)
		}
		else {
			switcher.to = host
			switcher.next = freeSwitchers
			freeSwitchers = switcher
		}
	}
	switcher.to = to
	switcher.isForAwaitChain = isForAwaitChain
	return switcher as Switcher
}

const EMPTY_ARRAY = []

function runSync(within, fn, this_, args) {
	if(current === within) return fn.call(this, ...(args || EMPTY_ARRAY))
	const from = current
	current = within
	try {return fn.call(this, ...(args || EMPTY_ARRAY))}
	finally {current = from}
}

function runAsync(within, fn, this_, args) {
	const isFrameSwitch = current !== within
	const isAwaitChain = fn[symIsAwaitChain] === true
	const from = current

	if(isFrameSwitch || isAwaitChain) {
		queuePromiseMicroTask(getSwitcher(within, isAwaitChain))
		current = within
	}
	try {return fn.call(this_, ...(args || EMPTY_ARRAY))}
	finally {
		if(isFrameSwitch) {
			current = from
			queuePromiseMicroTask(getSwitcher(from))
		}
	}
}

function frame(fn, run = runSync) {
	const disguised = fn[symDisguised]
	if(disguised) return disguised[symDisguised] ? disguised : fn
	const within = current
	return disguise(fn, function() {return run(within, fn, this, arguments)})
}

function frameAwaitChain(resolver) {
	if(resolver) {
		resolver[symIsAwaitChain] = true
		resolver = frame(resolver, runAsync)
	}
	return resolver
}








function sync() {}
function async() {}


function method() {}
function property() {}



const ASYNC = function(desc) {desc.run = async}

function get0(a) {return a && a[0]}
function set0(a,v) {return a[0] = v}
const ZERO = function(desc) {desc.get = get0; desc.set = set0}

function get1(a) {return a && a[1]}
function set1(a,v) {return a[1] = v}
const ONE = function(desc) {desc.get = get1; desc.set = set1}

function get2(a) {return a && a[2]}
function set2(a,v) {return a[2] = v}
const TWO = function(desc) {desc.get = get2; desc.set = set2}

function getLast(a) {
	const l = a && a.length - 1 || -1
	return l >= 0 ? a[l] : undefined
}
function setLast(a,v) {a[a.length - 1] = v}
const LAST = function(desc) {desc.get = getLast; desc.set = setLast}

const PROP = function(desc) {
	desc.get = get0
	desc.set = set0
	desc.make = property
}



let trapInterceptor
function setInterceptor(desc) {return desc.intercept = trapInterceptor}
function INTERCEPT(interceptor) {trapInterceptor = interceptor; return setInterceptor}


interface InterceptDescriptor {
	run:any
	make:any
	resultIntercepts:string[]
}

const defaultDesc = {
	run: sync,
	make: method,
}

function ensureDesc(address, path):InterceptDescriptor {
	return interceptDescriptorTable[address] ||
		(interceptDescriptorTable[address] = assign({path}, defaultDesc))
}

function generateInterceptDescriptor(generator, address, path:string[] = []) {
	for(let [node, ...commands] of generator) {
		address = address && (address + '.' + node) || node
		if(node === '()') {
			const resultIntercepts = ensureDesc(address, path).resultIntercepts = [] as string[]
			for(let resultGenerator of commands) {
				const [resultInterceptNode] = resultGenerator
				const resultInterceptAddress = address + '.().' + resultInterceptNode
				resultIntercepts.push(resultInterceptAddress)
				generateInterceptDescriptor(resultGenerator, resultInterceptAddress, [resultInterceptNode])
			}
		}
		else {
			path.push(node)
			for(let cmdOrChild of commands) {
				if(isFn(cmdOrChild)) cmdOrChild(ensureDesc(address, path), address)
				else generateInterceptDescriptor(cmdOrChild, address, path)
			}
		}
	}
}

function intercept(address, instance?) {
	const {path, make} = interceptDescriptorTable[address]
	if(!path || !make) return false

	instance = instance || (instance = path[0] === 'global' ? global_ : require(path[0]))
	let idx = 1
	let end = path.length - 1
	let name = path[idx]
	while(instance && idx < end) {
		instance = instance[name]
		name = path[++idx]
	}
	if(!instance) return false
	return make(address, instance, name)
}




/*
the js eventloop is fantastic at doing two things:
1) efficiently using threads by deferring to i/o completions
2) and shredding context into little strips of insanity
*/


function setMethodInterceptor(instance, name, desc, trap) {
	defineProperty(instance, name, {
		configurable: true,
		enumerable: desc.enumerable,
		writable: desc.writable || desc.set !== undefined,
		value: trap
	})
}

function makeResultInterceptor(address, resultTraps, instance, name, method) {
	return disguise(method, function(this:any) {
		const result = method.call(this, ...arguments)
		let idx = resultTraps.length
		address += '.().'
		while(idx--) {
			const resultAddress = address + resultTraps[idx]
			const {type: maker} = interceptDescriptorTable[resultAddress]
			maker(resultAddress, result, name)
		}
		return result
	})
}

const symIntercepted = Symbol('eldc-intercepted')
const symIntercept = Symbol('eldc-intercept')
const symResultIntercept = Symbol('eldc-result-intercept')

let futureFrame
let futureRun
let setFuture
let trapArgs
function framedFuture(continuation) {
	const trapFrame = futureFrame
	const run = futureRun
	setFuture(trapArgs, function() {return run(trapFrame, continuation, this, arguments, false)})
}
function unframedFuture(continuation) {
	setFuture(trapArgs, continuation)	
}



function makeInterceptor(address, instance, name, method) {
	if(method[symIntercepted]) return method

	const {get, set, run, intercept, resultTraps} = interceptDescriptorTable[address]
	if(intercept) method = method[symIntercept] || (method[symIntercept] = intercept(method))
	if(resultTraps) method = method[symResultIntercept] ||
		(method[symResultIntercept] = makeResultInterceptor(address, resultTraps, instance, name, method))

	const interceptor = disguise(method, function(this:any) {
		const traps = current[symTraps]
		const trap = traps && traps[address]
		const trapFrame = futureFrame = trap && trap[symFrame]
		if(trapFrame) {
			futureRun = run
			setFuture = set
			trapArgs = arguments
		}
		const continuation = get && frame(get(arguments))
		continuation && set(continuation)
		const result = trap
			? (trapFrame
					? run(trapFrame, trap, undefined, [method, this, arguments, continuation, framedFuture])
					: trap(method, this, arguments, continuation, unframedFuture)
			)
			: method.call(this, ...arguments)
		return result
	})

	interceptor[symIntercepted] = true

	return interceptor
}


function interceptMethod(address, instance, name) {
	const desc = getOwnPropertyDescriptor(instance, name)
	if(!desc || !desc.configurable) return false

	const method = instance[name]
	if(!isFn(method)) return false

	const interceptor = makeInterceptor(address, instance, name, method)
	setMethodInterceptor(instance, name, desc, interceptor)

	return true
}

const symCbProps = Symbol()

function interceptProperty(address, instance, name) {
	const desc = getOwnPropertyDescriptor(instance, name)
	if(!desc || !desc.configurable) return false

	const {get, set, value} = desc
	const method = set || function(value) {this[name] = value}
	const interceptor = makeInterceptor(address, instance, name, method)

	defineProperty(instance, name, {
		configurable: true,
		enumerable: desc.enumerable,
		get() {
			const value = get ? get.call(this) : this[name]
			if(current === host) return value
			return value && value[symDisguised] || value
		},
		set(value) {return interceptor.call(this, value)}
	})

	const cbProps = instance[symCbProps] || (instance[symCbProps] = create(null))
	cbProps[name] = true

	instance[name] = get ? get.call(instance) : value

	return true
}

defineProperty(Object, 'defineProperty', {
	configurable: true,
	enumerable: true,
	writable: true,
	value: function(target, name, desc) {
		const cbProps = target[symCbProps]
		if(!cbProps || !cbProps[name]) return defineProperty(target, name, desc)

		//if(desc.get || desc.set)

		target[name] = desc.value
	}
})

defineProperty(Object, 'defineProperties', {
	configurable: true,
	enumerable: true,
	writable: true,
	value: function(target, descs) {
		getOwnPropertyNames(descs).forEach(prop => Object.defineProperty(target, prop, descs[prop]))
		getOwnPropertySymbols(descs).forEach(prop => Object.defineProperty(target, prop, descs[prop]))
	}
})

defineProperty(Object, 'getOwnPropertyDescriptor', {
	configurable: true,
	enumerable: true,
	writable: true,
	value: function(target, name) {
		const cbProps = target[symCbProps]
		if(!cbProps || !cbProps[name]) return getOwnPropertyDescriptor(target, name)
		const value = target[name]
		return {
			configurable: true,
			enumerable: true,
			writable: true,
			value: current === host ? value : (value && value[symDisguised] || value)
		}
	}
})

defineProperty(Object, 'getOwnPropertyDescriptors', {
	configurable: true,
	enumerable: true,
	writable: true,
	value: function(target) {

	}
})

defineProperty(Object, 'entries', {
	configurable: true,
	enumerable: true,
	writable: true,
	value: function(target) {

	}
})


















function REGISTER_ELEMENT(...generators) {
	return function(desc, address) {
		address += '.$'
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

const interceptDescriptorGenerators = [
	['global',
		['FileReader', ['()',
			['onabort', PROP],
			['onerror', PROP],
			['onload', PROP],
		]],

		['Document', ['prototype',
			['registerElement', REGISTER_ELEMENT(
				['createdCallback', PROP],
				['attachedCallback', PROP],
				['detachedCallback', PROP],
				['attributeChangedCallback', PROP],
			)],
		]],

		['Object',
			['defineProperty',
				INTERCEPT(method =>
					function(target, name, desc) {
						const cbProps = target[symCbProps]
						if(!cbProps || !cbProps[name]) return method(target, name, desc)

						//if(desc.get || desc.set) ;

						target[name] = desc.value
					}
				),
			],
			['definedProperties',
				INTERCEPT(method =>
					function(target, descs) {
						if(current === host) return defineProperties(target, descs)
						getOwnPropertyNames(descs).forEach(prop => Object.defineProperty(target, prop, descs[prop]))
						getOwnPropertySymbols(descs).forEach(prop => Object.defineProperty(target, prop, descs[prop]))
					}
				),
			],
		],
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
					if(current === host) return listeners
					return listeners && listeners.map(listener => listener[symDisguised] || listener)
				}
			),
		],
		['rawListeners',
			INTERCEPT(method =>
				function(eventName) {
					const listeners = method.call(this, eventName)
					if(current === host) return listeners
					return listeners && listeners.map(listener => listener[symDisguised])
				}
			),
		],
		['once'],
		['on']
	]],
]



function getRegisterElement(a) {}

const interceptDescriptorTable = {
	'global.Document.prototype.registerElement': {
		path: ['global', 'Document', 'prototype', 'registerElement'],
		get: getRegisterElement,
		make: method,
		run: sync
	},
	'global.Document.prototype.registerElement.$.createdCallback': {
		path: ['createdCallback'],
		get: get0,
		set: set0,
		make: property,
		run: sync
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
			'child_process.exec.().send'
		]
	},
	'child_process.exec.().send': {
		path: ['send'],
		get() {},
		set() {},
		run: sync,
		make: method
	},
	'events.prototype.addListener': {

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
		resultTraps: [
			'window.FileReader.().onabort',
			'window.FileReader.().onerror',
			'window.FileReader.().onload',
			'window.FileReader.().onloadstart',
			'window.FileReader.().onloadend',
			'window.FileReader.().onprogress'
		],
	},

	'global.FileReader.().onabort': {
		path: ['onabort'],
		run: sync,
		make: property
	},
}







const symContinuation = Symbol()

function trapPassthruEx(method, methodThis, methodArgs, continuation, future) {
	future(continuation)
	// func alloc on every call
	future(function() {return continuation.call(this, ...arguments)})

	// one func alloc per unique continuation
	// but be careful! this means function closure
	// is over things from first time linked to continuation.
	// if you really need cont state per each trap call, then
	// just alloc a function on each call like above and close-over
	future(continuation[symContinuation] ||
		(continuation[symContinuation] = function() {
			return continuation.call(this, ...arguments)
		})
	)

	return method.call(methodThis, ...methodArgs)
}



intercept('address', (method, methodThis) => {

})


/*

trap a 'host' call.
a 'host' call is one that takes a callback that may be called from the event loop


a trap can be on a prototype, or an instance?
or is that just a detail that

intercepts

patch a method on global instance

	fs.access

patch a method on a global constructor prototype

	events.addListener      events().prototype.addListener

	net.Server.close        net.Server().prototype.close

patch method on static, and every instance returned

	child_process.exec().send      x = child_process.exec('cmd', cont); x.send('msg', cont)



patch method on static, and first return proto of return instance


patch property set on instance when value isFunction()

	FileReader.onload       x = new FileReader(); x.onload = fn()



	events.prototype.addListener

	net.Server.prototype.close

	child_process.exec
	child_process.exec().send


	FileReader().onload=


 */


/*
global.setTimeout
global.clearTimeout
	Interval, Immediate

global.requestAnimationFrame, cancelAnim...
	mozReq...
	webkitReq...

alert, prompt, confirm ? block el?


  patchClass('MutationObserver');
  patchClass('WebKitMutationObserver');
  patchClass('IntersectionObserver');
  patchClass('FileReader');

// hmmmmm
document.registerElement('', {prototype: {createdCallback: fn(), ... }})



window
window.__proto__

window.Document.prototype
window.SVGElement.prototype
window.Element.prototype
window.HTMLElement.prototype
window.HTMLMediaElement.prototype
HTMLFrameSetElement
HTMLBodyElement
HTMLFrameElement
HTMLIFrameElement
HTMLMarqueeElement
Worker
XMLHttpRequest
XMLHttpRequestEventTarget
IDBIndex
IDBRequest
IDBOpenDBRequest
IDBDatabase
IDBTransaction
IDBCursor
WebSocket

EventTarget
XMLHttpRequestEventTarget
MutationObserver
WebKitMutationObserver
IntersectionObserver
FileReader
HTMLCanvasElement

XMLHttpRequest

 */











function propSetCb(args, cb) {args[0] = cb}
function trapFutureProp() {
	/*
	const {runIn} = trapDescriptorTable[address]

	const trapped = disguise(method, function(this:any, value) {
		const traps = current[symTraps]
		const trap = traps && traps[address]
		const trapFrame = futureFrame = trap && trap[symFrame]
		const continuation = isFn(value) && frameContinuation(value)
		setFuture = propSetCb
		trapArgs = [continuation]
		const result = trap
			? (trapFrame
					? runIn(trapFrame, trap, undefined, [method, this, trapArgs, continuation, frameFuture])
					: trap(method, this, trapArgs, continuation, unframedFuture)
				)
			: method.call(this, continuation)
		return result
	})
	*/
}

/*
EventTarget
	XMLHttpRequestEventTarget
		XMLHttpRequest
	Node
		Document
		Element
			HTMLElement
				HTMLBodyElement
				HTMLFrameElement
			SVGElement
	WindowProperties
		Window
 */


















/*

# Copyright 2017 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from .extended_attribute import ExtendedAttributeList
from .utilities import assert_no_extra_args

Arguments
	kwargs KeyWordArgs

	_identifier kwargs.pop 'identifier'
	_type kwargs.pop 'type'


	identifier if setTo then _identifier.= setTo else _identifier
		setTo

	function impl
		arg1
		arg2

		impl arg1 + arg2




class Argument(object):

    def __init__(self, **kwargs):
        self._identifier = kwargs.pop('identifier')
        self._type = kwargs.pop('type')
        self._is_optional = kwargs.pop('is_optional', False)
        self._is_variadic = kwargs.pop('is_variadic', False)
        self._default_value = kwargs.pop('default_value', None)
        self._extended_attribute_list = kwargs.pop('extended_attribute_list', ExtendedAttributeList())
        assert_no_extra_args(kwargs)

    @property
    def identifier(self):
        return self._identifier

    @property
    def type(self):
        return self._type

    @property
    def is_optional(self):
        return self._is_optional

    @property
    def is_variadic(self):
        return self._is_variadic

    @property
    def default_value(self):
        return self._default_value

    @property
    def extended_attribute_list(self):
        return self._extended_attribute_list

 */