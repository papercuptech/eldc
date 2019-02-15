

const {
	assign,
	create: objCreate,
	defineProperty,
	freeze,
	getOwnPropertyDescriptor,
	getOwnPropertyNames,
	getOwnPropertySymbols,
	getPrototypeOf,
	keys,
	setPrototypeOf,
} = Object


function isFn(thing) {return typeof thing === 'function'}
function isObj(thing) {return thing !== null && typeof thing === 'object'}

let nmId = 0
function disguise(original, mask) {
	defineProperty(mask, 'name', {configurable: true, value: original.name})
	defineProperty(mask, 'length', {configurable: true, value: original.length})
	setPrototypeOf(mask, original)
	original[symDisguised] = mask
	mask[symDisguised] = original.name ||`_${nmId++}_`
	return mask
}


const symId = Symbol('eldc-id')

const symDisguised = Symbol('eldc-disguised')
const symIsAwaitChain = Symbol('eldc-promise-job')
const symContextSymbol = Symbol('eldc-context-symbol')
const symFactory = Symbol('eldc-initialize')
const symFrame = Symbol('eldc-frame')

export const SymCurrent = Symbol('eldc-current-context')

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
		const new_ = objCreate(within || null)
		new_.id = nextId++
		return new_ as Frame
	}
}

const loopGlobal = Frame.New()
let current = loopGlobal
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
			switcher.to = loopGlobal
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

function frameContinuation(cb, run = runSync) {
	const disguised = cb[symDisguised]
	if(disguised) return disguised[symDisguised] ? disguised : cb
	const within = current
	return disguise(cb, function() {return run(within, cb, this, arguments)})
}

function frameAwaitChain(resolver) {
	if(resolver) {
		resolver[symIsAwaitChain] = true
		resolver = frameContinuation(resolver, runAsync)
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
	desc.trap = property
}



let trapInterceptor
function setInterceptor(desc) {return desc.intercept = trapInterceptor}
function INTERCEPT(interceptor) {trapInterceptor = interceptor; return setInterceptor}


interface TrapDescriptor {
	run:any
	trap:any
	resultTraps:string[]
}

const defaultDesc = {
	run: sync,
	trap: method,
}

function ensureDesc(address, path):TrapDescriptor {
	return trapDescriptorTable[address] ||
		(trapDescriptorTable[address] = assign({path}, defaultDesc))
}

function generateTrapDescriptor(generator, address, path:string[] = []) {
	for(let [node, ...commands] of generator) {
		address = address && (address + '.' + node) || node
		if(node === '()') {
			const resultTraps = ensureDesc(address, path).resultTraps = [] as string[]
			for(let resultGenerator of commands) {
				const [resultTrapNode] = resultGenerator
				const resultTrapAddress = address + '.().' + resultTrapNode
				resultTraps.push(resultTrapAddress)
				generateTrapDescriptor(resultGenerator, resultTrapAddress, [resultTrapNode])
			}
		}
		else {
			path.push(node)
			for(let cmdOrChild of commands) {
				if(isFn(cmdOrChild)) cmdOrChild(ensureDesc(address, path), address)
				else generateTrapDescriptor(cmdOrChild, address, path)
			}
		}
	}
}

function trap(address, instance?) {
	const {path, trap} = trapDescriptorTable[address]
	instance = instance || (instance = path[0] === 'global' ? global_ : require(path[0]))
	let idx = 1
	let end = path.length - 1
	let name = path[idx]
	while(instance && idx < end) {
		instance = instance[name]
		name = path[++idx]
	}
	if(!instance) return false
	return trap(address, instance, name)
}




/*
the js eventloop is fantastic at doing two things:
1) efficiently using threads by deferring to i/o completions
2) and shredding context into little strips of insanity
*/







const symTraps = ''



function setMethodTrap(instance, name, desc, trap) {
	defineProperty(instance, name, {
		configurable: true,
		enumerable: desc.enumerable,
		writable: desc.writable || desc.set !== undefined,
		value: trap
	})
}

function trapResult(address, resultTraps, instance, name, method) {
	const desc = getOwnPropertyDescriptor(instance, name)

	const trap = disguise(method, function(this:any) {
		const result = method.call(this, ...arguments)
		let idx = resultTraps.length
		while(idx--) {
			const resultAddress = address + '.().' + resultTraps[idx]
			const {trap} = trapDescriptorTable[resultAddress]
			trap(resultAddress, result, name)
		}
		return result
	})

	setMethodTrap(instance, name, desc, trap)

	return true
}

const symTrapped = Symbol()

let futureFrame
let futureRun
let setFuture
let trapArgs
function frameFuture(continuation) {
	const trapFrame = futureFrame
	const run = futureRun
	setFuture(trapArgs, function() {return run(trapFrame, continuation, this, arguments, false)})
}
function unframedFuture(continuation) {
	setFuture(trapArgs, continuation)	
}

function makeTrap(address, instance, name, method) {
	if(method[symTrapped]) return method

	const {get, set, run, intercept, resultTraps} = trapDescriptorTable[address]
	method = intercept && intercept(method) || method
	resultTraps && trapResult(address, resultTraps, instance, name, method)

	const trapped = disguise(method, function(this:any) {
		const traps = current[symTraps]
		const trap = traps && traps[address]
		const trapFrame = futureFrame = trap && trap[symFrame]
		if(trapFrame) {
			futureRun = run
			setFuture = set
			trapArgs = arguments
		}
		const continuation = get && frameContinuation(get(arguments))
		continuation && set(continuation)
		const result = trap
			? (trapFrame
					? run(trapFrame, trap, undefined, [method, this, arguments, continuation, frameFuture])
					: trap(method, this, arguments, continuation, unframedFuture)
			)
			: method.call(this, ...arguments)
		return result
	})

	trapped[symTrapped] = true
}


function trapMethod(address, instance, name) {
	const desc = getOwnPropertyDescriptor(instance, name)
	if(!desc || !desc.configurable) return false

	const method = instance[name]
	if(!isFn(method)) return false

	setMethodTrap(instance, name, desc, makeTrap(address, instance, name, method))

	return true
}

const symCbProps = Symbol()

function trapProperty(address, instance, name) {
	const desc = getOwnPropertyDescriptor(instance, name)
	if(!desc || !desc.configurable) return false

	const {get, set, value} = desc
	const method = set || function(value) {this[name] = value}

	const trap = makeTrap(address, instance, name, method)

	defineProperty(instance, name, {
		configurable: true,
		enumerable: desc.enumerable,
		get() {
			const value = get ? get.call(this) : this[name]
			return value && value[symDisguised] || value
		},
		set(value) {

			this[symCbProps][name] = true

			return trap.call(this, value)
		}
	})

	value && (instance[name] = get ? get.call(instance) : value)

	return true
}

defineProperty(Object, 'defineProperty', {
	configurable: true,
	enumerable: true,
	writable: true,
	value: function(target, name, desc) {
		const cbProps = target[symCbProps]
		if(!cbProps || !cbProps[name]) return defineProperty(target, name, desc)
	}
})




















function getRegisterElement(a) {}

function REGISTER_ELEMENT(...generators) {
	return function(desc, address) {
		address += '.$'
		const propAddresses = generators.map(generator => {
			generateTrapDescriptor(generator, address)
			return address + '.' + generator[0]
		})
		desc.get = function(a) {
			const {prototype} = a[1]
			if(!prototype) return undefined

			for(let propAddr of propAddresses)
				trap(propAddr, prototype)

			return undefined
		}
	}
}
























const CHILD_PROCESS_RESULT = ['().send', LAST]

const trapDescriptorGenerators = [
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
			)]
		]]
	],


	['child_process',
		['exec', LAST, CHILD_PROCESS_RESULT],
		['execFile', LAST, CHILD_PROCESS_RESULT],
		['fork', CHILD_PROCESS_RESULT],
		['spawn', CHILD_PROCESS_RESULT],
	],

	['events', ['prototype',
		['removeListener', ZERO],
		['rawListeners',
			INTERCEPT(method =>
				function() {
					const listeners = method.call(this)
					return listeners && listeners.map(listener => listener[symTrapped])
				}
			),
		],
	]],
]




const trapDescriptorTable = {
	'global.Document.prototype.registerElement': {
		path: ['global', 'Document', 'prototype', 'registerElement'],
		get: getRegisterElement,
		trap: method,
		run: sync
	},
	'global.Document.prototype.registerElement.$.createdCallback': {
		path: ['createdCallback'],
		get: get0,
		set: set0,
		trap: property,
		run: sync
	},
	'global.Document.prototype.registerElement.$.attachedCallback': {
		path: ['attachedCallback'],
		get: get0,
		set: set0,
		trap: property,
		run: sync
	},
	'global.Document.prototype.registerElement.$.detachedCallback': {
		path: ['detachedCallback'],
		get: get0,
		set: set0,
		trap: property,
		run: sync
	},
	'global.Document.prototype.registerElement.$.attributeChangedCallback': {
		path: ['attributeChangedCallback'],
		get: get0,
		set: set0,
		trap: property,
		run: sync
	},
	'child_process.exec': {
		path: ['child_process', 'exec'],
		get: getLast,
		set: setLast,
		run: sync,
		trap: method,
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
		trap: method
	},
	'events.prototype.addListener': {

	},

	'events.prototype.removeListener': {

	},
	'events.prototype.listeners': {
		trap: method,
		intercept: method => function() {
			const listeners = method.call(this)
			return listeners && listeners.map(listener => listener[symTrapped])
		}
	},

	// we can wrap rl again, or assign to
	'events.prototype.on': {
		path: ['events', 'prototype', 'on'],
		trapper: (address, instance) => instance.on = instance.removeListener
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
		parth: ['onabort'],
		run: sync,
		trap: property
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



trap('address', (method, methodThis) => {

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







function dreg(name) {
	return {
		get(a) {
			const {prototype} = a[1]
			if(!prototype) return undefined
			return prototype[name]
		},
		set(a, c) {a[1].prototype[name] = c}
	}
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















