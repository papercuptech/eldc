//import {createHook, executionAsyncId} from 'async_hooks'
import util from 'util'
import { listenerCount } from 'cluster';
import { exec } from 'child_process';
export const _plog = []
// @ts-ignore
export function plg(...args) {_plog.push(util.format(...args))}
//export function plg(...args) {_plog.push(util.format(`${executionAsyncId()}:`,...args))}




//import {createHook, executionAsyncId} from 'async_hooks'

//const execIdToBox = new Map()
// node > 9 something i.e. async_hooks
// update: lots of o.h. with a.h.

//const baStack:Box[] = []



function isFn(thing) {return typeof thing === 'function'}
function isObj(thing) {return thing !== null && typeof thing === 'object'}

const symWrapped = Symbol('eldc-wrapped')
const symLoopGlobal = Symbol('eldc-loop-global')
const symEnter = Symbol('eldc-enter')

let nextId = 0
class Level extends Map {
	id = nextId++
}

let current:Level
export function cur() {return current ? current.id : '*'}

function switchTo(next:Level) {
	if(current === next) return
	next && next.forEach((nextInstance, Context) => {
		const enter = Context[symEnter]
		if(!enter) return
		const currentInstance = current && current.get(Context) || Context[symLoopGlobal]
		if(currentInstance === nextInstance) return
		enter.call(nextInstance, currentInstance)
	})
	current = next
}



interface ILifeCycle {
	create?:((init?:any, parent?:any) => any),
	top?:((parent?:any) => void),
	enter?:(() => void)
}
interface IContext<T> {
	(using:T):<R>(fn:(...args) => R) => R
	<R>(fn:() => R): R
}
export default function defineContext<T>(props:T = <any>{}, lifeCycle:ILifeCycle = {}):(T & IContext<T>) {
	const create = lifeCycle.create || function(props, parent) {
		const newContext =  Object.create(props)
		newContext.parent = parent
		return newContext
	}

	function Context(...args) {
		let fn = args.length && args[args.length - 1]
		fn = fn && isFn(fn) && fn
		let init = args[0]
		init = init && isObj(init) && init || props

		/*
		let using:any[]
		const len = args.length - 1
		for(let i = 0; i < len; ++i) {
			if(args[i][symLoopGlobal]) using.push(args[i])
		}
		*/

		plg(`${cur()}.new ${nextId}`)
		const newLevel = new Level()
		//newContext.id = id++
		current && current.forEach((context, Context) => newLevel.set(Context, context))

		const parent = newLevel.get(Context) || Context[symLoopGlobal]
		const newContext = create.call(Context, init, parent)
		newLevel.set(Context, newContext)

		function run(fn) {
			const from = current
			try{
				plg(`${cur()} -> ${newLevel ? newLevel.id : '*'}`)
				switchTo(newLevel);	
				const result = fn()
				plg(`${from ? from.id : '*'} <- ${newLevel ? newLevel.id : '*'}`)
				switchTo(from)
				return result
			}
			catch(ex) {
				plg(`${from ? from.id : '*'} <- ${newLevel ? newLevel.id : '*'}`)
				switchTo(from)
				throw ex
			}
		}

		return fn ? run(fn) : run
	}

	Context[symEnter] = lifeCycle.enter

	Context[symLoopGlobal] = create.call(Context, props)
	lifeCycle.top && lifeCycle.top.call(this, Context[symLoopGlobal])
	
	Object.getOwnPropertyNames(props).forEach(name => {
		Object.defineProperty(Context, name, {
			configurable: false,
			enumerable: true,
			get() {
				if(!current) return Context[symLoopGlobal][name]
				const context = current.get(Context)
				if(!context) return Context[symLoopGlobal][name]
				return context[name]
			},
			set(v) {
				if(!current) return Context[symLoopGlobal][name] = v
				const context = current.get(Context)
				if(!context) return Context[symLoopGlobal][name] = v
				context[name] = v
			}
		})
	})

	//Object.freeze(Context)

	return <any>Context
}

function disguise(as, using) {
	const disguised = Function('using', `
		const namer = {['${as.name}'](...args) {return using.call(this, args)}}
		return namer['${as.name}']
	`)(using)
	Object.getOwnPropertyNames(as).forEach(name => {
		if(name === 'name' || name === 'prototype') return
		// @ts-ignore - we got the prop names, so we'll get descriptors
		Object.defineProperty(disguised, name, Object.getOwnPropertyDescriptor(as, name))
	})
	disguised[symWrapped] = true
	return disguised
}

const wrappedCallbacks = new WeakMap()
function wrapCallback(cb, andPreserve = false) {
	if(cb[symWrapped]) return cb

	// :( -- have to have map lookup on every callback call
	// now, but it should still be relatively miniscule 
	// overhead given most callbacks are io bound
	let wrapped = wrappedCallbacks.get(cb)
	if(wrapped) return wrapped // technically should copy func.props over again....

	//plg(`wrapping cb in ${current ? current.id : '*'}`)
	const within = current
	
	/*
	wrapped = disguise(cb, andPreserve
		? function(args) {
			plg(`calling cb in ${within ? within.id : '*'} - cur:${cur()} ap:${andPreserve}`)
			if(current === within) return cb.call(this, ...args)
			const from = current
			try{
				plg(`switchTo   cb ${within ? within.id : '*'}`)
				switchTo(within)
				const result = cb.call(this, ...args)
				plg(`switchBack cb ${within ? within.id : '*'}`)
				switchTo(from)
				return result
			}
			catch(ex) {
				plg(`switchBack cb EX ${within ? within.id : '*'} - calling fn`)
				switchTo(from)
				throw ex
			}
		}
		: function(args) {
			plg(`calling cb having ${within ? within.id : '*'}`)
			if(current === within) return cb.call(this, ...args)
			switchTo(within)
			return cb.call(this, ...args)	
		}
	)
	*/

	wrapped = disguise(cb, function(args) {
		plg(`${within ? within.id : '*'}.${cb.name}${cb.___pre ? '##' : ''}(...)`)//ap:${andPreserve}`)
		//plg(`calling [${cb.name}] in ${within ? within.id : '*'} - cur:${cur()} ap:${andPreserve}`)
		if(current === within) return cb.call(this, ...args)
		//if(true || andPreserve) {//} || current) {
		//if(andPreserve) {//} || current) {
			const from = current
			try{
				plg(`${cur()} -> ${within ? within.id : '*'}`)
				switchTo(within)
				const result = cb.call(this, ...args)
				plg(`${from ? from.id : '*'} <- ${within ? within.id : '*'}`)
				switchTo(from)
				return result
			}
			catch(ex) {
				plg(`${from ? from.id : '*'} <- ${within ? within.id : '*'}`)
				switchTo(from)
				throw ex
			}
		//}
		//else {
			//switchTo(within)
			//return cb.call(this, ...args)	
		//}
	})
	
	plg(`${within ? within.id : '*'}.[${wrapped.name}]`)

	cb.___pre = andPreserve
	wrappedCallbacks.set(cb, wrapped)
	return wrapped
}

function wrapCallbackArgs(original, andPreserve = false) {
	if(!original) throw new Error(`no 'original' to wrap`)
	if(original[symWrapped]) return original
		
	return disguise(original, function(args) {
		for(let i = 0; i < args.length; ++i)
			if(typeof args[i] === 'function') {
				args[i] = wrapCallback(args[i], andPreserve)
			}
		return original.call(this, ...args)
	})
}

function findProtoImpl(proto, prop) {
	while(proto) {
		if(proto.hasOwnProperty(prop)) return proto
		proto = proto.__proto__
	}
	return undefined
}


function patchMethod(type, name, wrapper, isProto = false, andPreserve = false) {
	if(isProto) type = findProtoImpl(type, name)
	const desc = Object.getOwnPropertyDescriptor(type, name)
	if(!desc) return plg('oh no - not found')
	if(!isFn(desc.value)) return plg('oh no - not a function')
	if(desc.value[symWrapped]) return
	desc.value = wrapper(desc.value, andPreserve)
	desc.value[symWrapped] = true
	Object.defineProperty(type, name, desc)
}

function patchResultOnEach(type, spec, wrapCall, isProto) {
	plg(`     ${wrapCall ? 'call' : ''}rv:`)
	Object.getOwnPropertyNames(spec).forEach(calledMethodName => {
		plg(`        ${calledMethodName}()`)
		spec[calledMethodName].forEach(resultMethodName => {
			plg(`          ${resultMethodName}()`)
			patchMethod(type, calledMethodName, function(original) {
				return disguise(original, function(args) {
					
					if(wrapCall)
						for(let i = 0; i < args.length; ++i)
							if(typeof args[i] === 'function') args[i] = wrapCallback(args[i])
							
					const result = original.call(this, ...args)
					if(!result) return result
					patchMethod(result, resultMethodName, wrapCallbackArgs)
					return result
				})
			}, isProto)
		})
	})
}


/*
function patchResultProto(type, spec, wrapArgs) {
	spec.forEach(({methods, props}) => {
		plg('     p:')
		_patchResultProto(type, methods, props)
	})
}

function _patchResultProto(type, methodNames, resultProtoPropNames) {
	const originalDescs:any[] = []
	methodNames.forEach(methodName => {
		const originalDesc:any = Object.getOwnPropertyDescriptor(type, methodName)
		originalDesc.name = methodName
		originalDescs.push(originalDesc)
		patchMethod(type, methodName, function(original) {
			if(!original) throw new Error(`${methodName} not found`)
			return disguise(original, function(args) {
				const result = original.call(this, ...args)
				if(!result) return result
				if(!result.prototype) return result
				resultProtoPropNames.forEach(protoProp =>
					patchMethod(result.prototype, protoProp, wrapCallbackArgs, true)
				)
				originalDescs.forEach(originalDesc =>
					Object.defineProperty(type, originalDesc.name, originalDesc)
				)
				originalDescs.length = 0
			})
		})
	})
}
*/

function patchApply(type, spec, isProto = false) {
	if(typeof spec === 'string') {
		plg(`    ${spec}()`)
		patchMethod(type, spec, wrapCallbackArgs, isProto)
	}
	else {
		//let {rv, callRv, retPro, callRetPro} = spec
		//retPro = callRetPro
		//if(retPro) patchResultProto(type, p, !!pw)

		let {rv, callrv} = spec
		rv = callrv
		if(rv) patchResultOnEach(type, rv, !!callrv, isProto)
	}
}


function patch(using) {
	Object.keys(using).forEach(path => {
		plg('------------------------------------------------')
		plg(`${path}`)
		const steps = path.split('.')
		const modName = steps.shift()
		// @ts-ignore path will never be undef|null|!string
		//let mod = modName === 'global' ? (window || global) : require(modName)
		let mod = modName === 'global' ? global : require(modName)
		let par = null
		let type = mod
		let typeName = ''
		while(steps.length) {
			par = type
			// @ts-ignore path will never be undef|null|!string
			typeName = steps.shift()
			type = type[typeName]
		}
		const patch = using[path]
		const {ctor, own, pro} = patch
		if(par && ctor) {
			plg(`  as ctor`)
			patchMethod(par, typeName, wrapCallbackArgs)
		}
		if(own) {
			plg(`  own:`)
			own.forEach(spec => patchApply(type, spec))
		} 
		if(pro) {
			plg(`  proto:`)
			pro.forEach(spec => patchApply(type.prototype, spec, true))
		}
	})
}


const patchTable = {
	node: {
		'6.0.0': {
			'global': {own: ['setImmediate', 'setInterval', 'setTimeout']},
			'global.Promise': {pro: ['catch', 'finally', 'then']},
			//'global.Promise': {pro: ['catch', 'finally']},
			'child_process': {
				own: [{callrv: {exec: ['send'], execFile: ['send'], fork: ['send'], spawn: ['send']}}]
			},
			'cluster': {own: ['disconnect', {rv: {fork: ['send']}}]},
			'crypto': {own: ['pbkdf2', 'randomBytes', 'randomFill', 'scrypt']},
			'dns': {
				own: [
					'lookup', 'lookupService', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname',
					'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 
					'resolveTxt', 'reverse'
				]
			},
			'events': {
				pro: ['addListener', 'removeListener', 'off', 'on', 'once', 'prependListener', 'prependOnceListener']
			},
			'fs': {
				own: [
					'access', 'appendFile', 'chmod', 'chown', 'close', 'copyFile', 'exists', 'fchmod',
					'fchown', 'fdatasync', 'fstat', 'fsync', 'ftruncate', 'futimes', 'lchmod', 'lchown',
					'link', 'lstat', 'mkdir', 'mkdtemp', 'open', 'read', 'readdir', 'readFile', 'readlink',
					'realpath',  'rename', 'rmdir', 'stat', 'symlink', 'truncate', 'unlink',
					'unwatchFile', 'utimes','watch', 'watchFile', 'write', 'writeFile'
				],        
			},
			'fs.realpath': {own: ['native']},
			'http': {own: ['get', 'request']},
			'http.Agent': {pro: ['createConnection']},
			'http.ClientRequest': {pro: ['end', 'setTimeout', 'write']},
			'http.Server': {pro: ['close', 'setTimeout']},
			'http.ServerResponse': {pro: ['end', 'setTimeout', 'write']},
			'http.IncomingMessage': {pro: ['setTimeout']},
			'http2': {own: ['connect', 'createServer', 'createSecureServer']},
			'http2.Http2ServerRequest': {pro: ['setTimeout']},
			'http2.Http2ServerResponse': {pro: ['end', 'setTimeout', 'write', 'createPushResponse']},
				/*
				Http2Session: {p: ['close', 'ping', 'setTimeout']},
				Http2Stream: {p: ['close', 'setTimeout']},
				ServerHttp2Stream: {p: ['pushStream']},
				Http2Server: {p: ['close', 'setTimeout']},
				Http2SecureServer: {p: ['close', 'setTimeout']},
				*/
				
			'https': {own: ['get', 'request']},
			'https.Server': {pro: ['close', 'setTimeout']},
			'inspector.Session': {pro: ['post']},
			'net': {own: ['connect', 'createConnection', 'createServer']},
			'net.Server': {ctor: true, pro: ['close', 'getConnections', 'listen']},
			'net.Socket': {pro: ['connect', 'setTimeout', 'write']},
			'perf_hooks.PerformanceObserver': {ctor: true},
			'process': {own: ['nextTick', 'send', 'setUncaughtExceptionCaptureCallback']},
			'readline.Interface': {pro: ['question']},
			'stream': {own: ['finished', 'pipeline']},
			'stream.Writable': {pro: ['end', 'write']},
			'tls': {own: ['connect', 'createServer']},
			'tls.Server': {pro: ['close']},
			'tls.TLSSocket': {pro: ['renegotiate']},
			'dgram': {own: ['createSocket']},
			'dgram.Socket': {pro: ['bind', 'close', 'send']},
			'zlib': {own: ['deflate', 'deflateRaw', 'gunzip', 'gzip', 'inflate', 'inflateRaw', 'unzip']},
			'zlib.Gzip': {pro: ['close', 'flush', 'params']}
		},
		/*
		'6.0.1': {
			// remove
			'http.Server': undefined,
			// replace
			'http.Server': {},
			// adapt
			'http.Server': {adapt: {own: ['add'], own_: ['remove'], pro:, pro_:}}
		}
		*/
	}
}

//patchMethod(Promise.prototype, 'then', wrapCallbackArgs, false, true)

patch(patchTable.node['6.0.0'])
const symNext = Symbol('eldc-next')

const AGeneratorFunction = Object.getPrototypeOf(async function*(){})

const AGenFn = Object.getPrototypeOf(Function(`return async function*(){}`)())

/*
const oaNext = AGenFn.prototype.next
Object.defineProperty(AGenFn.prototype, 'next', {
	configurable: true,
	enumerable: true,
	get() {
		//return this[symNext] || (this[symNext] = wrapCallback(oNext))
		return this[symNext] || (this[symNext] = function(...args) {
			const rv = oaNext.call(this.args)
			return rv
		})
	}
})
*/


let oProto = AGenFn.constructor.prototype.prototype
Object.defineProperty(AGenFn.constructor.prototype, 'prototype' , {
	enumerable: true,
	configurable: true,
	get() {
		return oProto
	},
	set(v) {
		oProto = v
	}
}) 

/*
let oProto = AGenFn.constructor.prototype.prototype
Object.defineProperty(AGenFn.constructor.prototype, 'prototype' , {
	enumerable: true,
	configurable: true,
	value: undefined
}) 

*/
/*
const ooaNext = AGenFn.constructor.prototype.prototype.next
Object.defineProperty(AGenFn.constructor.prototype.prototype, 'next', {
	configurable: true,
	enumerable: true,
	get() {
		//return this[symNext] || (this[symNext] = wrapCallback(oNext))
		return this[symNext] || (this[symNext] = function(...args) {
			const rv = ooaNext.call(this.args)
			return rv
		})
	}
})
*/




const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor
//GeneratorFunction.prototype.prototype.__tagged = true
//GeneratorFunction.prototype.__tagged = true
const oNext = GeneratorFunction.prototype.prototype.next

/*
oNext.__tagged = true
//Object.defineProperty(GeneratorFunction.prototype, 'next', {
Object.defineProperty(GeneratorFunction.prototype.prototype, 'next', {
	configurable: true,
	enumerable: true,
	get() {
		//return this[symNext] || (this[symNext] = wrapCallback(oNext))
		return this[symNext] || (this[symNext] = function(...args) {
			const rv = oNext.call(this.args)
			return rv
		})
	}
})
*/
Object.defineProperty(GeneratorFunction.prototype, 'prototype' , {
	enumerable: true,
	configurable: true,
	writable: true,
	value: {next() {}, return() {}, throw() {}}
}) 


//GeneratorFunction.prototype.prototype = {next() {}, return() {}, throw() {}}

Object.defineProperty(GeneratorFunction.prototype.prototype, 'next', {
	configurable: true,
	enumerable: true,
	get() {
		//return this[symNext] || (this[symNext] = wrapCallback(oNext))
		return this[symNext] || (this[symNext] = function(...args) {
			const rv = oNext.call(this.args)
			return rv
		})
	}
})

//GeneratorFunction.prototype.prototype = undefined




let oxProto = GeneratorFunction.prototype.prototype
Object.defineProperty(GeneratorFunction.prototype, 'prototype' , {
	enumerable: true,
	configurable: true,
	get() {
		return oxProto
	},
	set(v) {
		oxProto = v
	}
})


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
return async function* asyncFn(ms) {
	await new Promise(_ => setTimeout(_, ms))
	yield 1
	await new Promise(_ => setTimeout(_, ms))
	yield 2
	//return new Promise(_ => setTimeout(_, ms))
}
`)()


const acal = afn(10)
const acal2 = afn(20)

const rf = Function('acal', `
;(async() => {
	for await (const c of acal)
		console.log(c)
	//let x = afn
})()
`)(acal)

//_plog.forEach(line => console.log(line))



// node > 9 something i.e. async_hooks
//import {createHook, executionAsyncId} from 'async_hooks'

//const execIdToBox = new Map()
// node > 9 something i.e. async_hooks
// update: lots of o.h. with a.h.

//const baStack:Box[] = []

/*
createHook({
	init(id, type, fromId) {
		plg(`${cur()}      init id:${id} fromId:${fromId} type:${type}`)
	},
	before(id) {
		plg(`${cur()}      befr id:${id}`)
	},
	after(id) {
		plg(`${cur()}      aftr id:${id}`)
	},
	destroy(id) {
		plg(`${cur()}      dstr id:${id}`)
	}
}).enable()

createHook({
	init(id, type, fromId) {
		execIdToBox.set(id, [execIdToBox.get(fromId)[0]])
	},
	before(id) {
		baStack.push(Box.Current)
		const box = execIdToBox.get(id)[0]
		box && box.enter()
	},
	after() {
		const prev = baStack.pop()
		// @ts-ignore we know pop() will never return undefined
		if(prev !== Box.Current) prev.enter()
	},
	destroy(id) {
		execIdToBox.delete(id)
	}
}).enable()
*/

// node < 9
// have to hook all api methods that take callbacks
// fs.read(f, cb), etc

// browser's
// have to hook all api methods that take callbacks
// setTimeout, setImmediate, onClick, etc.
