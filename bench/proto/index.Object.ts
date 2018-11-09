'use strict'
import 'source-map-support/register'

let global_:any = {}
try {global_ = global}
catch {
	try {global_ = window}
	catch {}
}

let eldcLocked = false
let eldc = ''
export function setEldcName(name) {
	if(eldcLocked) return
	if(eldc !== '') delete global_[eldc]
	eldc = name
	global_[eldc] = undefined
}
setEldcName('_$eldc$_')

function isFn(thing) {return typeof thing === 'function'}
function isObj(thing) {return thing !== null && typeof thing === 'object'}

const symDisguised = Symbol('eldc-disguised')
const symLoopGlobal = Symbol('eldc-loop-global')
const symEnter = Symbol('eldc-enter')
const symPromiseJob = Symbol['eldc-promise-job']

let nextId = 0

class Level extends Map {
	id = nextId++
}

/*
//downlevel
class Level {
	private _map = new Map()
	id = nextId++

	set(key, value) {return this._map.set(key, value)}
	get(key) {return this._map.get(key)	}
	forEach(fn) {return this._map.forEach(fn)}
}
*/

const {
	create: objCreate,
	defineProperty,
	freeze,
	getOwnPropertyNames,
} = Object

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
	global_[eldc] = current = next
}


Promise.prototype[symPromiseJob] = Promise.prototype.then
function runIn(within, this_, fn, args) {
	if(current === within) return fn.call(this_, ...args)

	Promise.resolve()[symPromiseJob](function() {
		if(current === within) return
		switchTo(within)
	})	

	const from = current
	try{
		switchTo(within)
		return fn.call(this_, ...args)
	}
	finally{switchTo(from)}
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

		const newLevel = new Level()
		current && current.forEach((context, Context) => newLevel.set(Context, context))

		const parent = newLevel.get(Context) || Context[symLoopGlobal]
		const newContext = create.call(Context, init, parent)
		newLevel.set(Context, newContext)

		function run(fn) {return runIn(newLevel, undefined, fn, [])}
		return fn ? run(fn) : run
	}

	Context[symEnter] = lifeCycle.enter

	Context[symLoopGlobal] = create.call(Context, props)
	lifeCycle.top && lifeCycle.top.call(this, Context[symLoopGlobal])
	
	for(const name of Object.getOwnPropertyNames(props)) {
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
	}

	Object.freeze(Context)

	return <any>Context
}

export const oFunction = global_.Function
function disguise(as, using, isCtor = false) {
	const name = as.name
	const disguised = oFunction('using', isCtor
		? `return function ${name}(...args) {return using.call(this, args)}`
		:	`
			const namer = {['${name}'](...args) {return using.call(this, args)}}
			return namer['${name}']
		`
	)(using)
	for(const property of Object.getOwnPropertyNames(as)) {
		if(property === 'name' || property === 'prototype') continue		
		// @ts-ignore - we got the prop, so we'll get descriptor
		Object.defineProperty(disguised, property, Object.getOwnPropertyDescriptor(as, property))
	}
	for(const property of Object.getOwnPropertySymbols(as))
		// @ts-ignore - we got the prop, so we'll get descriptor
		Object.defineProperty(disguised, property, Object.getOwnPropertyDescriptor(as, property))
	disguised[symDisguised] = true
	return disguised
}

const wrappedCallbacks = new WeakMap()
function wrapCallback(cb) {
	if(cb[symDisguised]) return cb
	let wrapped = wrappedCallbacks.get(cb)
	if(wrapped) return wrapped // technically should copy func.props over again....

	const within = current
	wrapped = disguise(cb, function wrappedCb(args) {
		return runIn(within, this, cb, args)
	})

	wrappedCallbacks.set(cb, wrapped)
	return wrapped
}

function wrapCallbackArgs(original, isCtor) {
	if(original[symDisguised]) return original

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

	return disguise(original, using, isCtor)
}

function findProtoImpl(proto, prop) {
	while(proto) {
		if(proto.hasOwnProperty(prop)) return proto
		proto = Object.getPrototypeOf(proto)
	}
	return undefined
}

function patchMethod(type, name, wrapper, isProto = false, isCtor = false) {
	const patchType = isProto ? findProtoImpl(type, name) : type
	if(!patchType) return
	const desc = Object.getOwnPropertyDescriptor(patchType, name)
	if(!desc || !isFn(desc.value) || desc.value[symDisguised]) return
	desc.value = wrapper(desc.value, isCtor)
	Object.defineProperty(patchType, name, desc)
}

function patchResultOnEach(type, spec, wrapCall, isProto) {
	for(const calledMethodName of Object.getOwnPropertyNames(spec)) {
		for(const resultMethodName of spec[calledMethodName]) {
			const patch = function(original) {
				return disguise(original, function eachPatch(args) {
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
		}
	}
}

function patchApply(type, spec, isProto = false) {
	if(typeof spec === 'string') {
		patchMethod(type, spec, wrapCallbackArgs, isProto)
	}
	else {
		let {rv, callrv} = spec
		rv = callrv
		if(rv) patchResultOnEach(type, rv, !!callrv, isProto)
	}
}

function patch(using) {
	for(const path of Object.keys(using)) {
		const steps = path.split('.')
		const modName = steps.shift()
		let mod
		try {
			// @ts-ignore path will never be undef|null|!string
			mod = modName === 'global' ? global_ : require(modName)
		}
		catch {
			continue
		}

		let parentType = null
		let type = mod
		let typeName = ''
		while(steps.length) {
			parentType = type
			// @ts-ignore path will never be undef|null|!string
			typeName = steps.shift()
			type = type[typeName]
		}

		if(!type) continue

		const patch = using[path]
		const {ctor, own, proto} = patch
		if(parentType && ctor) patchMethod(parentType, typeName, wrapCallbackArgs, false, true)
		if(own) for(const spec of own) patchApply(type, spec)
		if(proto) for(const spec of proto) patchApply(type.prototype, spec, true)
	}
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
			as wrapping only happens once. However, these classes are not directly accessible
		
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
			//'process': {own: ['nextTick', 'send', 'setUncaughtExceptionCaptureCallback']},
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
const CC_ASYNC = 'async'.split('').map(ch => cc(ch))
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

function wrapGeneratorFns(source:string) {
	const len = source.length
	let partStart = 0

	let prevState = ST_CODE
	let state = ST_CODE
	let codeState = ST_CODE

	let genFnCcIdx = 0
	let genFnCc = CC_GEN_FN[0]
	let asyncCcIdx = 0
	let asyncCc = CC_ASYNC[0]
	let funcStart = -1

	let genFn = {func: '', name: '', sig: '', parts: <string[]>[], block: 0}
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

						const {func, name, sig, parts} = genFn
						parts.push(source.substr(partStart, pos - partStart + 1))
						partStart = pos + 1

						const body = parts.join('')
						const isAnon = name.length === 0
						const original = `${func}${sig}${body}`
						const decl = isAnon ? `(${original})` : `(${name}['${eldc}']||(${name}['${eldc}']=${original}))`
						const wrapped = `function ${sig}{const g=${decl}.call(this,...arguments);g['${eldc}']=${eldc};return g}`

						genFn = genFnStack.pop()
						genFn.parts.push(wrapped)

						break

					case asyncCc:
						if(asyncCcIdx === 0) funcStart = pos
						asyncCc = CC_ASYNC[++asyncCcIdx]
						break

					case genFnCc:
						if(genFnCcIdx === 0 && funcStart === -1) funcStart = pos

						if(ch !== CC_ASTERISK) genFnCc = CC_GEN_FN[++genFnCcIdx]						

						else {
							asyncCc = CC_ASYNC[asyncCcIdx = 0]
							genFnCc = CC_GEN_FN[genFnCcIdx = 0]

							genFn.parts.push(source.substr(partStart, funcStart - partStart))
							partStart = pos + 1
							genFnStack.push(genFn)

							genFn = {func: source.substr(funcStart, pos - funcStart + 1), name: '', sig: '', parts: [], block: 1}

							funcStart = -1
							nameStart = -1
							codeState = ST_SIGNATURE
						}

						break

					default:
						if(genFnCcIdx !== 0) {
							genFnCc = CC_GEN_FN[genFnCcIdx = 0]
							funcStart = -1
						}
						else if(asyncCcIdx !== 0 && !CC_WHT_SPC[ch]) {
							asyncCc = CC_ASYNC[asyncCcIdx = 0]
							funcStart = -1
						}
						break
					}
	
					break

				case ST_SIGNATURE:
					if(ch === CC_LCURLY) {
						genFn.sig = source.substr(partStart, pos - partStart)
						partStart = pos
						codeState = ST_CODE
					}
					else if(nameStart === -1 && !CC_WHT_SPC[ch]) {
						nameStart = pos
						if(ch !== CC_LPAREN) codeState = ST_NAME
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

try {
	const GeneratorObjectPrototype = 
	  Object.getPrototypeOf(Function('return function*(){}')()).constructor.prototype.prototype
	const oNext = GeneratorObjectPrototype.next
	Object.defineProperty(GeneratorObjectPrototype, 'next', {
		configurable: true,
		enumerable: true,
		value: function() {return runIn(this[eldc], this, oNext, arguments)}
	})

	const AsyncGeneratorObjectPrototype = 
		Object.getPrototypeOf(Function('return async function*(){}')()).constructor.prototype.prototype
	const oAsyncNext = AsyncGeneratorObjectPrototype.next
	Object.defineProperty(AsyncGeneratorObjectPrototype, 'next', {
		configurable: true,
		enumerable: true,
		value: function() {return runIn(this[eldc], this, oAsyncNext, arguments)}
	})

	const oFunction = global_.Function
	global_.Function = function Function(...args) {
		const source = args[args.length - 1]
		if(source && source.indexOf('function*')) args[args.length - 1] = wrapGeneratorFns(source)
		return oFunction.call(this, ...args)
	}
	
	const Module = require('module')
	const oCompile = Module.prototype._compile
	Module.prototype._compile = function(content, filename) {
		content = content.indexOf('function*') === -1 ? content : wrapGeneratorFns(content)
		return oCompile.call(this, content, filename)
	}

	/*
	if(!!(process as any).binding('config').experimentalModules) {
		const Path = require('path')
		const fs = require('fs')
		const {readFile: oReadFile} = fs

		fs.readFile = function(path, ...args) {
			if(ensureGeneratorFnsWrapped) {
				const cb = args.length > 1 && args[args.length - 1]

				if(typeof cb === 'function')
					args[args.length - 1] = function(err, data) {
						if(err) return cb.call(this, err, data)
						return cb.call(this, err, ensureGeneratorFnsWrapped(path, data))
					}
			}

			return oReadFile.call(this, path, ...args)
		}
	}
	*/
}
catch {}

patch(patchTable.node['6.0.0'])


