'use strict'
import 'source-map-support/register'



import util from 'util'

function pad(width, str, padWith = ' ') {
	let padded = (str || '').substring(0, width - 1)
	let padLen = width > padded.length ? width - padded.length : 0
	while(padLen--)
		padded += padWith
	return padded
}
export const _plog:string[] = []
let _stopPlg = false
export function stopPlg(stop = true) {_stopPlg = stop}

// @ts-ignore
export function log(...args) {
	if(_stopPlg) return
	_plog.push(util.format(pad(4,`${cur()}`) + ': ',...args))
}

let dbgLog = true
function dbg(...args) {
	if(!dbgLog) return
	log(...args)
}



const {
	assign,
	create: create,
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
const symTraps = Symbol('eldc-traps')


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
		const new_ = create(within || null)
		new_.id = nextId++
		//new_[symTraps] = objCreate(within && within[symTraps] || null)
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




let runInNewFrame:Frame|undefined = undefined

class Context {
	id!:number
	constructor(properties, initial, symContext) {
		this.id = runInNewFrame!.id
		if(!initial) return
		let propIdx = properties.length
		while(propIdx--) {
			const prop = properties[propIdx]
			this[prop] = initial[prop]
		}
	}

	switching(from) {}

	static get Frame() {return current}
	static get Current() {return null as any as Context}
	static Trap(address, trap) {
		let traps = current[symTraps]
		if(!traps) {
			const parentFrame = getPrototypeOf(current)
			traps = create(parentFrame && parentFrame[symTraps] || null)
		}
		traps[address] = trap
	}
}
// was declared primarily for typescript (vs defining interface and all that)
// but context builder looks for presence of 'switching' to activate it
// for particular Context... Sooo... delete it here, once, before prototype
// ever "used"
delete Context.prototype.switching

global_.Context = Context
export {Context}

interface ContextClass {
	new (properties, initial, symContext): Context
	Top?:Context
	Current?:Context
}

export default context

function context(UserContext:ContextClass)
function context(properties:object)
function context(arg1) {
	const hasUserContext = isFn(arg1)
	let properties = arg1
	let UserContext = hasUserContext ? arg1 : class extends Context {}

	if(!(UserContext.prototype instanceof Context)) throw new Error('Must derive from Context')

	const symContext = Symbol(`eldc-ctx-${UserContext.name}`)

	const defaults = create(null)
	const propNames:string[] = []

	function Factory(...args) {
		let fn = args[args.length - 1]
		fn = fn && isFn(fn) && fn
		let initial = args[0]
		initial = isObj(initial) ? initial : undefined

		let factories:any[]|null = null

		for(let i = 0, len = args.length; i < len; ++i) {
			const arg = args[i]
			const factory = arg && arg[symFactory]
			if(!factory) continue
			factories = factories || []
			factories.push(factory)
		}

		const initialDefaults = assign(create(null), defaults)
		let hadInitial = false
		const within = current
		function run(fn?, args?) {
			if(runInNewFrame) {
				if(initial) {
					assign(initialDefaults, defaults)
					assign(initialDefaults, initial)
					hadInitial = true
				}
				else if(hadInitial) {
					assign(initialDefaults, defaults)
					hadInitial = false
				}
				const withinContext = getPrototypeOf(runInNewFrame)[symContext]
				const newContext = new UserContext(propNames, initialDefaults, withinContext)
				newContext.id = runInNewFrame.id
				runInNewFrame[symContext] = newContext
				return
			}
			const newFrame = runInNewFrame = Frame.New(within)
			try {
				run()
				if(factories) for(let idx = factories.length; idx--;) factories[idx]()
			}
			finally {runInNewFrame = undefined}
			return runAsync(newFrame, fn, this, args)
		}
		run[symFactory] = run
		return fn ? run(fn) : run
	}
	defineProperty(Factory, 'name', {configurable: false, value: UserContext.name + 'Factory'})

	const hasSwitching = UserContext.prototype.switching !== undefined
	let previousContext:Context|undefined
	for(const name of getOwnPropertyNames(properties)) {
		if(hasUserContext && name === 'name' || name === 'length' || name === 'prototype') continue
		if(name === 'Top' || name === 'Current') continue

		const propDef = {configurable: false, enumerable: true}
		const defaultValue = properties[name]

		if(isFn(defaultValue)) {
			if(hasSwitching)
				properties[name] = function(...args) {
					const currentContext = current[symContext]
					if(currentContext !== previousContext) {
						currentContext.switching(previousContext)
						previousContext = currentContext
					}
					// TODO: unwind
					return defaultValue.call(this, ...args)
				}

			assign(propDef, {writable: false, value: properties[name]})
		}
		else {
			defaults[name] = defaultValue

			assign(propDef, {
				get() {return current[symContext][name]},
				set(value) {return current[symContext][name] = value}
			})
		}

		propNames.push(name)
		defineProperty(Factory, name, propDef)
	}

	try {
		runInNewFrame = current
		const loopContext = new UserContext(propNames, defaults, null)
		current[symContext] = loopContext
		defineProperty(UserContext, 'Current', {get() {return current[symContext]}})
		defineProperty(UserContext, 'Top', {value: loopContext})
		if(hasSwitching) loopContext.switching(undefined)
		previousContext = loopContext
	}
	finally {
		runInNewFrame = undefined
	}

	freeze(Factory)
	return Factory
}













function frameContinuationArgs(original) {
	if(original[symDisguised]) return original

	return disguise(original, function(a,b,c,d,e) {
		const len = arguments.length
		if(len === 0) return original.call(this)
		if(typeof a === 'function') a = frameContinuation(a)
		if(len === 1) return original.call(this,a)
		if(typeof b === 'function') b = frameContinuation(b)
		if(len === 2) return original.call(this,a,b)
		if(typeof c === 'function') c = frameContinuation(c)
		if(len === 3) return original.call(this,a,b,c)
		if(typeof d === 'function') d = frameContinuation(d)
		if(len === 4) return original.call(this,a,b,c,d)
		if(typeof e === 'function') e = frameContinuation(e)
		if(len === 5) return original.call(this,a,b,c,d,e)

		const args = arguments
		args[0] = a, args[1] = b, args[2] = c, args[3] = d, args[4] = e
		let idx = len
		while(idx-- > 5) {
			const arg = args[idx]
			if(typeof arg === 'function') args[idx] = frameContinuation(arg)
		}
		original.call(this, ...args)
	})
}





function findProtoImpl(proto, prop) {
	while(proto) {
		if(proto.hasOwnProperty(prop)) return proto
		proto = getPrototypeOf(proto)
	}
	return undefined
}


function patchMethod(type, name, wrapper, isProto = false) {
	const patchType = isProto ? findProtoImpl(type, name) : type
	if(!patchType) return
	const desc = getOwnPropertyDescriptor(patchType, name)
	if(!desc || !isFn(desc.value) || desc.value[symDisguised]) return
	desc.value = wrapper(desc.value)
	defineProperty(patchType, name, desc)
}

function patchResultOnEach(type, spec, shouldFrameCall, isProto) {
	for(const calledMethodName of getOwnPropertyNames(spec)) {
		for(const resultMethodName of spec[calledMethodName]) {
			const patchEachResult = function(original) {
				return disguise(original, function eachPatch(args) {
					if(shouldFrameCall)
						for(let i = 0; i < args.length; ++i) {
							const arg = args[i]
							if(typeof arg === 'function') args[i] = frameContinuation(arg)
						}
					const len = args.length
					let result
					if(len === 0) result = original.call(this)
					else if(len === 1) result = original.call(this,args[0])
					else if(len === 2) result = original.call(this,args[0],args[1])
					else if(len === 3) result = original.call(this,args[0],args[1],args[2])
					else if(len === 4) result = original.call(this,args[0],args[1],args[2],args[3])
					else if(len === 5) result = original.call(this,args[0],args[1],args[2],args[3],args[4])
					else result = original.call(this, ...args)

					if(result) patchMethod(result, resultMethodName, frameContinuationArgs)
					return result
				})
			}
			patchMethod(type, calledMethodName, patchEachResult, isProto)
		}
	}
}

function patchApply(type, spec, isProto = false) {
	if(typeof spec === 'string') {
		patchMethod(type, spec, frameContinuationArgs, isProto)
	}
	else {
		let {rv, callrv} = spec
		rv = callrv
		if(rv) patchResultOnEach(type, rv, !!callrv, isProto)
	}
}

function patch(using) {
	for(const path of keys(using)) {
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
		if(parentType && ctor) patchMethod(parentType, typeName, frameContinuationArgs, false)
		if(own) for(const spec of own) patchApply(type, spec)
		if(proto) for(const spec of proto) patchApply(type.prototype, spec, true)
	}
}

const patchTable = {
	node: {
		'6.0.0': {
			'global': {own: ['setImmediate', 'setInterval', 'setTimeout']},
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

const eldc = '_$^[@{#(*<!%&-eldc-&%!>*)#}@]^$_'

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
						const wrapped = `function ${sig}{const g=${decl}.call(this,...arguments);g['${eldc}']=Context.Frame;return g}`

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
			default: state = ST_REGEX; break
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

export const oFunction = global_.Function

try {
	const GeneratorFunctionPrototype = getPrototypeOf(Function('return function*(){}')())
	const GeneratorObjectPrototype = GeneratorFunctionPrototype.constructor.prototype.prototype
	const oNext = GeneratorObjectPrototype.next
	defineProperty(GeneratorObjectPrototype, 'next', {
		configurable: true,
		enumerable: true,
		value: function() {return runAsync(this[eldc], oNext, this, arguments)}
	})

	const AsyncGeneratorFunctionPrototype = getPrototypeOf(Function('return async function*(){}')())
	const AsyncGeneratorObjectPrototype = AsyncGeneratorFunctionPrototype.constructor.prototype.prototype
	const oAsyncNext = AsyncGeneratorObjectPrototype.next
	defineProperty(AsyncGeneratorObjectPrototype, 'next', {
		configurable: true,
		enumerable: true,
		value: function() {return runAsync(this[eldc], oAsyncNext, this, arguments)}
	})

	// TODO: what about eval?
	global_.Function = function Function(...args) {
		const source = args[args.length - 1]
		if(source && source.indexOf('function*') !== -1) args[args.length - 1] = wrapGeneratorFns(source)
		return oFunction.call(this, ...args)
	}
	setPrototypeOf(oFunction, global_.Function)

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

const oThen = Promise.prototype.then

// for node
patchMethod(Promise.prototype, 'then', original => {
	return function(onfulfilled, onrejected) {
		if(!this[symFrame]) {
			// only true when node host is calling 'then()' from microtask
			// implementing PromiseResolveThenableJob which calls performPromiseThen
			this[symFrame] = current
		}

		// by this point, the promise object is coupled to the frame it
		// was created in, stored in this[symFrame]
		// further, the promise callbacks run in context in which 'then()' called :)
		// and many thens can run in their own separate contexts
		return original.call(this, frameAwaitChain(onfulfilled), frameAwaitChain(onrejected))
	}
})

const oCatch = Promise.prototype.catch
Promise.prototype.catch = {
	['catch'](onrejected) {return oCatch.call(this, frameAwaitChain(onrejected))}
}['catch']

class UserlandPromise extends global_.Promise {
	[symFrame]: any

	// node host never calls this.. if host does then wont matter
	constructor(fn) {
		super(fn)
		this[symFrame] = current
	}
}

/*
if(oThen) UserlandPromise.prototype.then = oThen
if(oCatch) UserlandPromise.prototype.catch = {
	['catch'](onrejected) {return oCatch.call(this, framePromiseCb(onrejected))}
}['catch']
*/

global_.Promise = UserlandPromise

/*
const async_wrap = process.binding('async_wrap')
const oQueueDestroyAsyncId = async_wrap.queueDestroyAsyncId
async_wrap.queueDestroyAsyncId = function queueDestroyAsyncId(asyncId) {
	return oQueueDestroyAsyncId.call(this, asyncId)
}
*/