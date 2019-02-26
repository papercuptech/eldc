import {
	global_,
	create,
	defineProperty,
	getOwnPropertyDescriptor,
	getPrototypeOf,
	isFn,
	disguise,
	symContext,
	symIntercepted,
	symNext,
	symSymbolicId,
	symLink,
	symFrame,
	symCb,
	symContinuation,
	symCoupling,
	symEntry,
	sym,
} from 'host'

import {
	current,
	top,
} from 'frame'

class InterceptError extends Error {
	constructor(from, message) {
		super(message)
		Error.captureStackTrace && Error.captureStackTrace(this, from)
	}
}

function intercept(address, instance?) {
	const entry = address[symEntry]
	if(!instance)
		if(entry.state === 'intercepted') return
		else entry.state = 'intercepted'
	const {path, make, root, implement} = entry
	if(!path || !make) return false
	instance = instance || root(path[0])
	let idx = 1
	let end = path.length - 1
	let name = path[idx]
	let prevName = ''
	while(instance && idx < end) {
		instance = instance[name]
		prevName = name
		name = path[++idx]
		if(name === '_' && prevName === 'prototype' && instance) {
			name = path[++idx]
			const start = instance
			while(instance && !instance.hasOwnProperty(name)) instance = getPrototypeOf(instance)
			instance = instance || instance[name] || start
		}
	}
	if(!instance) return false
	const desc = getOwnPropertyDescriptor(instance, name)
	if(!desc || !desc.configurable) return false
	let methodOrClass = instance[name]
	methodOrClass = implement && implement(methodOrClass, instance) || methodOrClass
	if(!isFn(methodOrClass)) return false
	if(methodOrClass[symIntercepted]) return methodOrClass
	const intercept = make(entry, methodOrClass, instance)
	intercept[symIntercepted] = true
	defineProperty(instance, name, {
		configurable: true,
		enumerable: desc.enumerable,
		writable: desc.writable || !!desc.set,
		value: intercept
	})
	return true
}

function rootGlobal() {return global_}
function rootRequire(name) {return require(name)}
function rootEval(expr) {return Function(expr)()}

function interceptResult(resultIntercepts, result) {
	let idx = resultIntercepts.length
	while(idx--) intercept(resultIntercepts[idx], result)
	return result
}

let nextConstruct
function callNextConstruct(args) {
	if(!nextConstruct) return args
	const construct = nextConstruct
	nextConstruct = construct[symNext]
	construct.call(construct[symContext], callNextConstruct, args)
}
namespace callNextConstruct {
	export function deferred(args:any[]) {
		const deferNextConstruct = nextConstruct
		let len = args.length
		const withArgs = new Array(len)
		while(len--) withArgs[len] = args[len]
		return function(args) {
			nextConstruct = deferNextConstruct
			return callNextConstruct(withArgs)
		}
	}
}

let link
let linkInstance

let executeMethod
let executeThis
let executeLink
let executeResultIntercepts
let nextExecute
function callNextExecute(args) {
	if(!nextExecute) {
		if(executeMethod) {
			const fn = executeMethod, t = executeThis, a = args, l = a && a.length || 0
			const result = l<1?fn.call(t):l<2?fn.call(t,a[0]):l<3?fn.call(t,a[0],a[1]):l<4?fn.call(t,a[0],a[1],a[2]):
				l<5?fn.call(t,a[0],a[1],a[2],a[3]):l<6?fn.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):fn.apply(t,a)
			return executeResultIntercepts && result && interceptResult(executeResultIntercepts, result) || result
		}
		return undefined
	}
	const execute = nextExecute
	nextExecute = execute[symNext]
	return execute.call(execute[symContext], callNextExecute, executeThis, args, executeLink)
}

namespace callNextExecute {
	export function deferred(args:any[]) {
		const deferMethod = executeMethod
		const deferThis = executeThis
		const deferLink = executeLink
		const deferResultIntercepts = executeResultIntercepts
		const deferNextExecute = nextExecute
		let len = args.length
		const withArgs = new Array(len)
		while(len--) withArgs[len] = args[len]
		return function(args) {
			executeMethod = deferMethod
			executeThis = deferThis
			executeLink = deferLink
			executeResultIntercepts = deferResultIntercepts
			nextExecute = deferNextExecute
			return callNextExecute(withArgs)
		}
	}
}

let pseudoResult
let throwEx
let nextException
function setResult(result) {
	throwEx = undefined
	pseudoResult = result
}
function callNextException(ex) {
	throwEx = ex
	if(!nextException) return ex
	const exception = nextException
	nextException = exception[symNext]
	exception.call(exception[symContext], callNextException, ex, setResult)
	return throwEx
}

const tempLinkInstance = {}
function makeClassIntercept(entry, Class) {
	const {sid, frameArgs, frameResult, resultIntercepts, isPerCall} = entry
	return disguise(Class, class Interceptor extends Class {
		constructor() {
			const a = arguments, l = a && a.length || 0
			const {frame} = current
			if(frame.id === 0) {
				l<1?super():l<2?super(a[0]):l<3?super(a[0],a[1]):l<4?super(a[0],a[1],a[2]):
				l<5?super(a[0],a[1],a[2],a[3]):l<6?super(a[0],a[1],a[2],a[3],a[4]):l<7?super(a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):super(...arguments)
				return
			}
			linkInstance = tempLinkInstance
			link = undefined
			frameArgs && frameArgs(arguments)
			const trap = frame[sid]
			if(!trap) {
				l<1?super():l<2?super(a[0]):l<3?super(a[0],a[1]):l<4?super(a[0],a[1],a[2]):
				l<5?super(a[0],a[1],a[2],a[3]):l<6?super(a[0],a[1],a[2],a[3],a[4]):l<7?super(a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):super(...arguments)
				resultIntercepts && this && interceptResult(resultIntercepts, this)
				return this
			}
			if(link && !isPerCall) moveCoupling(this, tempLinkInstance)
			try {
				trap.construct && (nextConstruct = trap.construct) && callNextConstruct(arguments)
				l<1?super():l<2?super(a[0]):l<3?super(a[0],a[1]):l<4?super(a[0],a[1],a[2]):
				l<5?super(a[0],a[1],a[2],a[3]):l<6?super(a[0],a[1],a[2],a[3],a[4]):l<7?super(a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):super(...arguments)
				resultIntercepts && this && interceptResult(resultIntercepts, this)
				if(trap.execute) {
					executeLink = link
					executeThis = this
					executeMethod = undefined
					executeResultIntercepts = undefined
					nextExecute = trap.execute
					callNextExecute(arguments)
				}
			}
			catch(ex) {
				ex = trap.exception && (nextException = trap.exception) && callNextException(ex) || ex
				if(ex) throw ex
			}
			frameResult && frameResult(this)
			return this
		}
	})
}

function makeMethodIntercept(entry, fn, instance) {
	const {sid, frameArgs, frameResult, resultIntercepts, isPerCall} = entry
	let isTrapping = false
	return disguise(fn, function intercept(this:any) {
		const t = this, a = arguments, l = a && a.length || 0
		const {frame} = current
		if(frame.id === 0)
			return l<1?fn.call(t):l<2?fn.call(t,a[0]):l<3?fn.call(t,a[0],a[1]):l<4?fn.call(t,a[0],a[1],a[2]):
				l<5?fn.call(t,a[0],a[1],a[2],a[3]):l<6?fn.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):fn.apply(t,a)
		if(isTrapping) throw new InterceptError(intercept, 'Traps cannot recurse')
		linkInstance = this
		link = undefined
		frameArgs && frameArgs(arguments)
		const trap = frame[sid]
		if(!trap) {
			const result = l<1?fn.call(t):l<2?fn.call(t,a[0]):l<3?fn.call(t,a[0],a[1]):l<4?fn.call(t,a[0],a[1],a[2]):
				l<5?fn.call(t,a[0],a[1],a[2],a[3]):l<6?fn.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):fn.apply(t,a)
			return resultIntercepts && result && interceptResult(resultIntercepts, result) || result
		}
		isTrapping = true
		let result
		executeLink = link
		executeThis = this
		executeMethod = fn
		executeResultIntercepts = resultIntercepts
		nextExecute = trap.execute
		try {result = callNextExecute(arguments)}
		catch(ex) {
			ex = trap.exception && (nextException = trap.exception) && callNextException(ex) || ex
			if(ex) throw ex
			result = pseudoResult
		}
		finally {isTrapping = false}
		return frameResult && frameResult(result) || result
	})
}

function frameContinuation(entry, cb, isResolver = false) {
	if(!cb) return cb
	if(cb[symCb]) return cb
	let cbFrame
	let continuation
	const symCbSid = cb[symSymbolicId] || (cb[symSymbolicId] = sym('eldc-cb-sid-' + cb.name))
	const {frame} = current
	const {sid, isPerCall} = entry
	const trap = frame[sid]
	const isLinked = trap && trap.isLinked || false
	if(!isLinked) {
		cbFrame = cb[symFrame]
		if(cbFrame === frame) return cb[symContinuation]
		if((continuation = frame[symCbSid])) return continuation
	}
	else if(!isPerCall && linkInstance) {
		const {instanceLink, continuations} = getCoupling(linkInstance)
		if((continuation = continuations[symCbSid])) return continuation
		link = link || instanceLink
	}
	else link = link || {}
	let continuationLink = link
	function trappableCb() {
		const trap = current.frame[sid]
		if(!trap) {
			const t = this, a = arguments, l = a && a.length || 0
			return l<1?cb.call(t):l<2?cb.call(t,a[0]):l<3?cb.call(t,a[0],a[1]):l<4?cb.call(t,a[0],a[1],a[2]):
				l<5?cb.call(t,a[0],a[1],a[2],a[3]):l<6?cb.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?cb.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?cb.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?cb.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):cb.apply(t,a)
		}
		executeLink = continuationLink
		executeThis = this
		executeMethod = cb
		executeResultIntercepts = undefined
		nextExecute = trap.execute
		try {return callNextExecute(arguments)}
		catch(ex) {
			ex = trap.exception && (nextException = trap.exception) && callNextException(ex) || ex
			if(ex) throw ex
			return pseudoResult
		}
	}
	const run = isResolver ? frame.runResolver : frame.run
	continuation = disguise(cb, function() {return run(trappableCb, this, arguments)})
	continuation[symFrame] = frame
	continuation[symCb] = cb
	if(!isLinked) {
		if(cbFrame === undefined) {
			cb[symFrame] = frame
			return cb[symContinuation] = continuation
		}
		if(cbFrame === top) return frame[symCbSid] = continuation
		cbFrame[symCbSid] = cb[symContinuation]
		cb[symContinuation] = undefined
		cb[symFrame] = top
		return frame[symCbSid] = continuation
	}
	else if(!isPerCall && linkInstance) {
		const {continuations} = getCoupling(linkInstance)
		continuations[continuation[symSymbolicId] = symCbSid] = continuation
	}
	return continuation
}

function decouple(continuation, instance) {
	if(!continuation || !instance) return
	const {continuations} = getCoupling(instance)
	if(!continuations) return
	delete continuations[continuation[symSymbolicId]]
}

const couplingMap = new WeakMap()
function getCoupling(instance) {
	let coupling = instance[symCoupling] || couplingMap.get(instance)
	if(coupling) return coupling
	coupling = {instanceLink: create(null), continuations: create(null)}
	try {return instance[symCoupling] = coupling}
	catch(ex) {
		couplingMap.set(instance, coupling)
		return coupling
	}
}
function moveCoupling(to, from) {
	let coupling = from[symCoupling]
	from[symCoupling] = undefined
	try {return to[symCoupling] = coupling}
	catch(ex) {
		couplingMap.set(to, coupling)
		return coupling
	}
}





function frameObject(props, obj, isProxy) {
	if(!obj) return
	let idx = props.length
	const proxy = isProxy ? create(obj) : obj
	const desc:any = {configurable: false, enumerable: true}
	while(idx--) {
		const {name, entry} = props[idx]
		desc.get = function() {return passBack(frameContinuation(entry, obj[name]))}
		desc.set = function(v) {return obj[name] = v}
		defineProperty(proxy, name, desc)
	}
	return proxy
}






function passBack(continuation) {
	const {frame} = current
	if(frame.id === 0) return continuation
	if(!continuation) return continuation
	const continuationFrame = continuation[symFrame]
	if(!continuationFrame) return continuation
	if(continuationFrame === frame) return continuation[symCb]
	return continuation
}

function trapPoint(context, point, traps, trapRec) {
	let trap = traps[point]
	if(!isFn(trap)) return
	trap[symNext] = trapRec[point]
	trap[symContext] = context
	trapRec[point] = trap
}

const asTraps:{construct:()=>any, execute:()=>any, exception:()=>any} = <any>{execute:undefined}
function trap(frame, context:any, address:any, traps:(() => any)|{construct:()=>any, execute:()=>any, exception:()=>any}){
	const {sid} = address[symEntry]
	let trapRec = frame.hasOwnProperty(sid) && frame[sid]
	if(!trapRec) {
		trapRec = create(frame[sid] || {isLinked: false})
		frame[sid] = trapRec
	}
	if(isFn(traps)) {
		asTraps.execute = <any>traps
		traps = asTraps
	}
	trapPoint(context, 'construct', traps, trapRec)
	trapPoint(context, 'execute', traps, trapRec)
	trapPoint(context, 'exception', traps, trapRec)
	if(!trapRec.isLinked && trapRec.execute && trapRec.execute.length >= 4)
		trapRec.isLinked = true
}

export {
	intercept,
	rootGlobal,
	rootRequire,
	rootEval,
	makeClassIntercept,
	makeMethodIntercept,
	frameContinuation,
	frameObject,
	decouple,
	passBack,
	trap,
}




















