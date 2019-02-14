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




const {
	assign,
	create,
	defineProperty,
	freeze,
	getOwnPropertyDescriptor,
	getOwnPropertyNames,
	getOwnPropertySymbols,
	getPrototypeOf,
	keys,
	setPrototypeOf,
} = Object

const {
	isFunction: isFn,
	isObject: isObj
} = require('util')



const symId = Symbol('eldc-id')

const symDisguised = Symbol('eldc-disguised')
const symPromiseJob = Symbol('eldc-promise-job')
const symContextSymbol = Symbol('eldc-context-symbol')
const symFactory = Symbol('eldc-initialize')
const symFrame = Symbol('eldc-frame')


let disguiseId = 0
function disguise(original, mask) {
	defineProperty(mask, 'name', {configurable: true, value: original.name})
	defineProperty(mask, 'length', {configurable: true, value: original.length})
	setPrototypeOf(mask, original)
	original[symDisguised] = mask
	mask[symDisguised] = original.name || `_${disguiseId++}_`
	return mask
}

function frameContinuation(cb) {
	if(!cb) return undefined
	// always return 'mask' no matter if it passed, or what its disguising passed
	// lets things like trapped 'removeListener()' keep working
	const disguisedAs = cb[symDisguised]
	if(disguisedAs) return disguisedAs[symDisguised] ? disguisedAs : cb

	const within = current
	return disguise(cb, function(){return runIn(within, cb, this, arguments)})
}


const st = {
	trap(method, this_, methodArgs) {},
	then(continuation, methodArgs) {},
	trapResult: [{
		address: '',
		name: '',
		trapper: trapMethod
	}]
}


const trapDescriptorTable = {
	'fs.access': {
		getCb() {},
		setCb() {},
		resultTraps: [
			['send', 'require.child_process.exec.().send', trapMethod],
			['onload', 'require.child_process.exec.().onload.=', trapProperty],
			['prototype.method', '', ]
		]
	}
}



let global_:any = {}
try {global_ = global}
catch {
	try {global_ = window}
	catch {}
}

[
	'global.SomeClass',
	'global.SomeClass.prototype.someMethod',
	'global.SomeClass.prototype.someMethod.().someProp.=',
	'global.SomeClass.().rvMethod',
	'global.SomeClass.someProp.=',

	'require.events.prototype.addListener',
	'window.WebSocket.prototype'
]


const ts = {
	global: {
		SomeClass: {
			prototype: {
				someMethod: {
					$: trapMethod,
					'()': {
						someProp: {
							'=': {}
						}
					}
				},

			}
		}
	}
}



intercept('a.b.c'.split('.'))

function intercept(path) {
	//if(path[0] === 'globlal')
	let parentName = path[0]
	let instanceName = path[1]


	for(let idx = 2, len = path.length; idx < len; ++idx) {

		const node = path[idx]

	}



	let parent = ''
	let node = ''
	let instance = undefined
	let isGlobal = true
	for(parent of path) {
		switch(node) {
		case 'global':
			continue
		case 'require':
			isGlobal = false
			continue
		case '()':
			break
		case '=':
			break
		default:
			if(!instance) instance = isGlobal ? global_ : require(node)
			instance = instance && instance[node] || require(node)
			parent = node
			break
		}
	}

	trapMethod()
}

const current = {}
const symTraps = ''


const trapPassthruEx = {
	trap(method, this_, trapArgs) {
		return method.call(this_, ...trapArgs)
	},
	then(continuation, trapArgs) {
		//if(trapArgs) null
		return function() {
			return continuation.call(this, ...arguments)
		}
	}
}

function trapMethod(address, instance, name) {
	const desc = getOwnPropertyDescriptor(instance, name)
	if(!desc || !desc.configurable) return false

	const method = instance[name]
	if(!isFn(method)) return false
	if(method[symDisguised]) return true

	const {getCb, setCb, resultTraps} = trapDescriptorTable[address]

	const trapped = disguise(method, function(this:any) {
		const traps = current[symTraps]
		const addressTrap = traps && traps[address]
		const {trap, then} = addressTrap && addressTrap()
		const continuation = getCb && frameContinuation(getCb(arguments))
		continuation && setCb(arguments, then ? then(continuation, arguments) : continuation)
		const result = trap ? trap(method, this, arguments) : method.call(this, ...arguments)

		if(resultTraps) {
			let idx = resultTraps.length
			while(idx--) {
				const [name, address, trapper] = resultTraps[idx]
				trapper(address, result, name)
			}
		}

		return result
	})

	defineProperty(instance, name, {
		configurable: true,
		enumerable: desc.enumerable,
		writable: desc.writable || desc.set !== undefined,
		value: trapped
	})

	return true
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

const zero = {
	get(a) {return a[0]},
	set(a, c) {a[0] = c}
}

const one = {
	get(a) {return a[1]},
	set(a, c) {a[1] = c}
}

const two = {
	get(a) {return a[2]},
	set(a, c) {a[2] = c}
}

const last = {
	get(a) {
		const l = a.length - 1
		return l >= 0 ? a[l] : undefined
	},
	set(a, c) {a[a.length - 1] = c}
}

const prop = {

}


const cbAccess = {
	'global.setTimeout': zero,
	'require.fs.access': last,
	'require.events.prototype.addListener': zero,
	'global.document.registerElement.createdCallback': dreg('createdCallback'),
	'global.HTMLElement.prototype.onclick.=': prop,
	'global.FileReader.().onRead.=': prop,
	'require.child_process.exec': one,
	'require.child_process.exec.().send': last
}




function trapProperty(address, instance, name, patch) {
	const desc = getOwnPropertyDescriptor(instance, name)
	if(!desc.configurable) return false
	const {get, set, value} = desc


	const disguised = disguise(original, function() {
		return patch(address, original, this, arguments)
	})

	const {trap, then} = traps[address]

	defineProperty(instance, name, {
		configurable: true,
		enumerable: desc.enumerable,
		get() {return this[name]},
		set(cb) {
			trap(v => {this[name] = v}, this, [then(frameContinuation(cb), address, [])])
		}
	})
}
