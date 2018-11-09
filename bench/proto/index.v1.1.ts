//import {createHook, executionAsyncId} from 'async_hooks'
import util from 'util'
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
function wrapCallback(cb) {
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
		plg(`${within ? within.id : '*'}.${cb.name}(...)`)//ap:${andPreserve}`)
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

	wrappedCallbacks.set(cb, wrapped)
	return wrapped
}

function wrapCallbackArgs(original, isCtor) {
	if(!original) throw new Error(`no 'original' to wrap`)
	if(original[symWrapped]) return original

	const using = isCtor
		? function(args) {
			for(let i = 0; i < args.length; ++i)
				if(typeof args[i] === 'function') args[i] = wrapCallback(args[i])
			return new original(...args)
		}
		: function(args) {
			for(let i = 0; i < args.length; ++i)
				if(typeof args[i] === 'function') args[i] = wrapCallback(args[i])
			return original.call(this, ...args)
		}

	return disguise(original, using)
}

function findProtoImpl(proto, prop) {
	while(proto) {
		if(proto.hasOwnProperty(prop)) return proto
		proto = proto.__proto__
	}
	return undefined
}


function patchMethod(type, name, wrapper, isProto = false, isCtor = false) {
	if(isProto) type = findProtoImpl(type, name)
	const desc = Object.getOwnPropertyDescriptor(type, name)
	if(!desc) return plg('oh no - not found')
	if(!isFn(desc.value)) return plg('oh no - not a function')
	if(desc.value[symWrapped]) return
	//desc.value = wrapper(desc.value, andPreserve)
	desc.value = wrapper(desc.value, isCtor)
	desc.value[symWrapped] = true
	Object.defineProperty(type, name, desc)
}

function patchResultOnEach(type, spec, wrapCall, isProto) {
	plg(`     ${wrapCall ? 'call' : ''}rv:`)
	Object.getOwnPropertyNames(spec).forEach(calledMethodName => {
		plg(`        ${calledMethodName}()`)
		spec[calledMethodName].forEach(resultMethodName => {
			plg(`          ${resultMethodName}()`)
			const patch = function(original) {
				return disguise(original, function(args) {
					if(wrapCall)
						for(let i = 0; i < args.length; ++i)
							if(typeof args[i] === 'function') args[i] = wrapCallback(args[i])
							
					const result = original.call(this, ...args)
					if(!result) return result
					patchMethod(result, resultMethodName, wrapCallbackArgs)
					return result
				})
			}
			patchMethod(type, calledMethodName, patch, isProto)
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
		const {ctor, own, proto} = patch
		if(par && ctor) {
			plg(`  as ctor`)
			patchMethod(par, typeName, wrapCallbackArgs, false, true)
		}
		if(own) {
			plg(`  own:`)
			own.forEach(spec => patchApply(type, spec))
		} 
		if(proto) {
			plg(`  proto:`)
			proto.forEach(spec => patchApply(type.prototype, spec, true))
		}
	})
}


const patchTable = {
	node: {
		'6.0.0': {
			'global': {own: ['setImmediate', 'setInterval', 'setTimeout']},
			'global.Promise': {proto: ['catch', 'finally', 'then']},
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
				proto: ['addListener', 'removeListener', 'off', 'on', 'once', 'prependListener', 'prependOnceListener']
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
			'http.Agent': {proto: ['createConnection']},
			'http.ClientRequest': {proto: ['end', 'setTimeout', 'write']},
			'http.Server': {proto: ['close', 'setTimeout']},
			'http.ServerResponse': {proto: ['end', 'setTimeout', 'write']},
			'http.IncomingMessage': {proto: ['setTimeout']},

			'http2': {own: ['connect', 'createServer', 'createSecureServer']},
			'http2.Http2ServerRequest': {proto: ['setTimeout']},
			'http2.Http2ServerResponse': {proto: ['end', 'setTimeout', 'write', 'createPushResponse']},
			/*

			these all end up calling EventEmitter.once, .on, etc. or process.nextTick()
			so don't need to patch.. probably others that dont need it, but doesn't hurt
			as wrapping only happens once
		
			Http2Session: {proto: ['close', 'ping', 'setTimeout']},
			Http2Stream: {proto: ['close', 'setTimeout']},
			ServerHttp2Stream: {proto: ['pushStream']},
			Http2Server: {proto: ['close', 'setTimeout']},
			Http2SecureServer: {proto: ['close', 'setTimeout']},
			*/
				
			'https': {own: ['get', 'request']},
			'https.Server': {proto: ['close', 'setTimeout']},
			'inspector.Session': {proto: ['post']},
			'net': {own: ['connect', 'createConnection', 'createServer']},
			'net.Server': {ctor: true, proto: ['close', 'getConnections', 'listen']},
			'net.Socket': {proto: ['connect', 'setTimeout', 'write']},
			'perf_hooks.PerformanceObserver': {ctor: true},
			'process': {own: ['nextTick', 'send', 'setUncaughtExceptionCaptureCallback']},
			'readline.Interface': {proto: ['question']},
			'stream': {own: ['finished', 'pipeline']},
			'stream.Writable': {proto: ['end', 'write']},
			'tls': {own: ['connect', 'createServer']},
			'tls.Server': {proto: ['close']},
			'tls.TLSSocket': {proto: ['renegotiate']},
			'dgram': {own: ['createSocket']},
			'dgram.Socket': {proto: ['bind', 'close', 'send']},
			'zlib': {own: ['deflate', 'deflateRaw', 'gunzip', 'gzip', 'inflate', 'inflateRaw', 'unzip']},
			'zlib.Gzip': {proto: ['close', 'flush', 'params']}
		},
		/*
		'6.0.1': {
			// remove
			'http.Server': undefined,
			// replace
			'http.Server': {},
			// adapt
			'http.Server': {adapt: {own: ['add'], own_: ['remove'], proto:, pro_:}}
		}
		*/
	}
}


//patch(patchTable.node['6.0.0'])


import Path from 'path'
const fs = require('fs')
const {readFile: oReadFile, readFileSync: oReadFileSync} = fs

/*
function ensureGeneratorFnsWrapped(path, source) {
	const ext = Path.extname(path)
	if(ext !== '.js' && ext !== '.mjs' || source.indexOf('function*') === -1) return source
	return wrapGeneratorFns(source)
}

fs.readFile = function(path, ...args) {
	const cb = args.length > 1 && args[args.length - 1]

	if(typeof cb === 'function')
		args[args.length - 1] = function(err, data) {
			if(err) return cb.call(this, err, data)
			return cb.call(this, err, ensureGeneratorFnsWrapped(path, data))
		}	

	return oReadFile.call(this, path, ...args)
}

fs.readFileSync = function(path:string, options?:any) {
	return ensureGeneratorFnsWrapped(path, oReadFileSync(this, path, options))
}
*/
function cc(char) {return char.charCodeAt(0)}
const CC_SQUOTE = cc("'")
const CC_DQUOTE = cc('"')
const CC_TICK = cc('`')
const CC_SLASH = cc('/')
const CC_ASTERISK = cc('*')
const CC_BACKSLASH = cc('\\')
const CC_NEWLINE = cc('\n')
const CC_LCURLY = cc('{')
const CC_RCURLY = cc('}')
const CC_LPAREN = cc('(')

const CC_GEN_FN = 'function*'.split('').map(ch => cc(ch))
const CC_WHT_SPC:boolean[] = []
' \f\n\r\t\v\u00a0\u1680\u2000\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'.split('').forEach(ch => CC_WHT_SPC[cc(ch)] = true)

const ST_CODE = 0
const ST_SQUOTE = 1
const ST_DQUOTE = 2
const ST_TICK = 3
const ST_SLASH = 4
const ST_REGEX = 5
const ST_ESCAPE = 6
const ST_LINE_COMMENT = 7
const ST_BLOCK_COMMENT = 8
const ST_BLOCK_COMMENT_ASTERISK = 9
const ST_SIGNATURE = 10
const ST_NAME = 11

let prefix = '_$eldc$_'
export function setPrefix(uniquePrefix) {prefix = uniquePrefix}

function wrapGeneratorFns(source:string) {
	const len = source.length
	let partStart = 0

	let prevState = ST_CODE
	let state = ST_CODE
	let codeState = ST_CODE

	let genFnCcIdx = 0
	let genFnCc = CC_GEN_FN[0]

	let genFn = {name: '', signature: '', parts: <string[]>[], block: 0}
	let genFnStack:any[] = []
	let nameStart = -1

	for(let pos = 0; pos < len; ++pos) {
		const ch = source.charCodeAt(pos)

		switch(state) {
		case ST_CODE:

			switch(ch) {
			case CC_SQUOTE: state = ST_SQUOTE; break
			case CC_DQUOTE: state = ST_DQUOTE; break
			case CC_TICK: state = ST_TICK; break
			case CC_SLASH: state = ST_SLASH; break

			default:
				switch(codeState) {

				case ST_CODE: 
					switch(ch) {

					case CC_LCURLY: ++genFn.block; break

					case CC_RCURLY:
						if(--genFn.block !== 0 || genFnStack.length === 0) break

						genFn.parts.push(source.substr(partStart, pos - partStart + 1))
						partStart = pos + 1

						const body = genFn.parts.join('')
						const isAnon = genFn.name.length === 0
						const original = `function*${genFn.signature}${body}`
						const originalRef = isAnon ? `(${original})` : `${genFn.name}['${prefix}original']`
						const originalDecl = isAnon ? '' : `;${originalRef}=${original}`
						const wrapped =
							`${genFn.signature}{const g=${originalRef}.call(this,...arguments);g['${prefix}context']=${prefix}current;yield* g}${originalDecl}` 

						genFn = genFnStack.pop()
						genFn.parts.push(wrapped)

						break

					case genFnCc:
						if(ch === CC_ASTERISK) {
							genFnCc = CC_GEN_FN[genFnCcIdx = 0]

							genFn.parts.push(source.substr(partStart, pos - partStart + 1))
							partStart = pos + 1

							genFnStack.push(genFn)
							genFn = {name: '', signature: '', parts: [], block: 1}
							nameStart = -1

							codeState = ST_SIGNATURE
						}
						else
							genFnCc = CC_GEN_FN[++genFnCcIdx]

						break

					default:
						if(genFnCcIdx !== 0) genFnCc = CC_GEN_FN[genFnCcIdx = 0]
						break
					}
	
					break

				case ST_SIGNATURE:				
					if(ch === CC_LCURLY) {
						genFn.signature = source.substr(partStart, pos - partStart)
						partStart = pos
						codeState = ST_CODE
					}
					else if(nameStart === -1 && !CC_WHT_SPC[ch]) {
						nameStart = pos
						codeState = ch !== CC_LPAREN ? ST_NAME : codeState
					}
					break

				case ST_NAME:
					if(ch !== CC_LPAREN && !CC_WHT_SPC[ch]) break

					genFn.name = source.substr(nameStart, pos - nameStart)
					codeState = ST_SIGNATURE
					break
				}
				
				break
			}

			break

		case ST_SLASH:
			switch(ch) {
			case CC_SLASH: state = ST_LINE_COMMENT; break
			case CC_ASTERISK: state = ST_BLOCK_COMMENT; break
			default: state = ST_REGEX;break
			}

			break

		case ST_ESCAPE: state = prevState; break

		case ST_SQUOTE:
		case ST_DQUOTE:
		case ST_TICK:
		case ST_REGEX:
			if(ch === CC_BACKSLASH) {
				prevState = state
				state = ST_ESCAPE
				break
			}

			switch(state) {
			case ST_SQUOTE:
				if(ch === CC_SQUOTE || ch === CC_NEWLINE) state = ST_CODE
				break
			case ST_DQUOTE:
				if(ch === CC_DQUOTE || ch === CC_NEWLINE) state = ST_CODE
				break
			case ST_TICK:
				if(ch === CC_TICK) state = ST_CODE
				break
			case ST_REGEX:
				if(ch === CC_SLASH || ch === CC_NEWLINE) state = ST_CODE
				break
			}

			break

		case ST_LINE_COMMENT:
			if(ch === CC_NEWLINE) state = ST_CODE
			break
		case ST_BLOCK_COMMENT:
			if(ch === CC_ASTERISK) state = ST_BLOCK_COMMENT_ASTERISK
			break
		case ST_BLOCK_COMMENT_ASTERISK:
			if(ch === CC_SLASH) state = ST_CODE
			else state = ST_BLOCK_COMMENT
			break
		}
	}

	genFn.parts.push(source.substr(partStart, len - partStart))
	return genFn.parts.join('')
}



const GeneratorObjectPrototype = 
  Object.getPrototypeOf(function*(){}).constructor.prototype.prototype
const oNext = GeneratorObjectPrototype.next
Object.defineProperty(GeneratorObjectPrototype, 'next', {
	configurable: true,
	enumerable: true,
	value: function(value?:any) {
		const within = this['']
		plg(`${within ? within.id : '*'}.${oNext.name}(...)`)
		if(current === within) return oNext.call(this, value)

		const from = current
		try{
			plg(`${cur()} -> ${within ? within.id : '*'}`)
			const result = oNext.call(this, value)
			plg(`${from ? from.id : '*'} <- ${within ? within.id : '*'}`)
			switchTo(from)
			return result
		}
		catch(ex) {
			plg(`${from ? from.id : '*'} <- ${within ? within.id : '*'}`)
			switchTo(from)
			throw ex
		}
	}
})

const source = oReadFileSync('./testGenFns.js').toString()
const wrapped = wrapGeneratorFns(source)

//function* fn() {} becomes

/*
function* fn(a, b) {
	const gen = fn['__original__'].apply(this, arguments)
	gen['__context__'] = current
	yield* gen
}
fn['__original__'] = function* fn(a, b) {}
*/

/*
function*<signature<name>><body>
function*<signature>{<hook><name>}<hook><signature><body>
*/
//function* fn(...args) {const g =     fn['$eldc$_original']   .call(this, ...args); g['$eldc$_context'] = $eldc$_current; yield* g}; fn['$eldc$_original'] = function* fn() {}

//const x = function* (...args) {const g =     (function* () {})     .call(this, ...args); g['$eldc$_context'] = $eldc$_current; yield* g}


//export function fn() {}






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
