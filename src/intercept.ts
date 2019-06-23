import {
	global_,
	create,
	defineProperty,
	getOwnPropertyDescriptor,
	getPrototypeOf,
	setPrototypeOf,
	isArr,
	isFn,
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
} from 'common'

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

function intercept(entry, instance?) {
	if(!instance)
		if(entry.state === 'intercepted') return
		else entry.state = 'intercepted'
	const {path, make, root, implement} = entry
	if(!path || !make) return false
	let idx = instance ? 0 : 1
	instance = instance || root(path[0])
	let end = path.length - 1
	let name = path[idx]
	let prevName = ''
	while(instance && idx < end) {
		instance = name === '__proto__' ? getPrototypeOf(instance) : instance[name]
		prevName = name
		name = path[++idx]
		if(instance && name === '_' && (prevName === 'prototype' || prevName === '__proto__')) {
			name = path[++idx]
			const start = instance
			while(instance && !instance.hasOwnProperty(name)) instance = getPrototypeOf(instance)
			instance = instance || instance[name] || start
		}
	}
	if(!instance) return false
	const desc = getOwnPropertyDescriptor(instance, name)
	if(desc && !desc.configurable) return false
	let methodOrClass = instance[name]
	if(methodOrClass && methodOrClass[symIntercepted]) return true
	methodOrClass = implement && implement(methodOrClass, instance) || methodOrClass
	if(!isFn(methodOrClass)) return false
	const intercept = make(entry, methodOrClass, instance)
	intercept[symIntercepted] = true
	defineProperty(instance, name, {
		configurable: true,
		enumerable: desc && desc.enumerable || true,
		writable: desc && (desc.writable || !!desc.set) || true,
		value: intercept
	})
	return true
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

let executeMethod
let executeThis
let executeLink
let executeResultIntercepts
let nextExecute
function callNextExecute(args) {
	if(!nextExecute) {
		if(executeMethod) {
			const result = executeMethod.apply(executeThis, args)
			return executeResultIntercepts && executeResultIntercepts.length
				&& result && interceptResult(executeResultIntercepts, result) || result
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

let disDesc = {configurable: true, value: undefined}
let disguiseId = 0
function disguise(original, mask) {
	disDesc.value = original.name; defineProperty(mask, 'name', disDesc)
	disDesc.value = original.length; defineProperty(mask, 'length', disDesc)
	setPrototypeOf(mask, original)
	return mask
}


function interceptResult(resultIntercepts, result) {
	let idx = resultIntercepts.length
	while(idx--) {
		const entry = resultIntercepts[idx]
		intercept(entry, result)
		if(entry.isPrototype) resultIntercepts.pop()
	}
	return result
}


let link
let linkInstance
const tempLinkInstance = {}

function makeClassIntercept(entry, Class) {
	const {sid, frameArgs, frameResult, resultIntercepts, isPerCall} = entry
	return disguise(Class, class Interceptor extends Class {
		constructor() {
			const {frame} = current
			if(frame.id === 0) {
				super(...arguments)
				return
			}
			linkInstance = tempLinkInstance
			link = undefined
			frameArgs && frameArgs(arguments)
			const trap = frame[sid]
			if(!trap) {
				super(...arguments)
				resultIntercepts && resultIntercepts.length && this && interceptResult(resultIntercepts, this)
				return this
			}
			if(link && !isPerCall) moveCoupling(this, tempLinkInstance)
			try {
				trap.construct && (nextConstruct = trap.construct) && callNextConstruct(arguments)
				super(...arguments)
				resultIntercepts && resultIntercepts.length && this && interceptResult(resultIntercepts, this)
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

function makeMethodIntercept(entry, method, instance) {
	const {sid, frameArgs, frameResult, resultIntercepts, isPerCall} = entry
	let isTrapping = false
	return disguise(method, function intercept(this:any) {
		const {frame} = current
		if(frame.id === 0) return method.apply(this, arguments)
		if(isTrapping) throw new InterceptError(intercept, 'Traps cannot recurse')
		linkInstance = this
		link = undefined
		frameArgs && frameArgs(arguments)
		const trap = frame[sid]
		if(!trap) {
			const result = method.apply(this, arguments)
			return resultIntercepts && resultIntercepts.length && result && interceptResult(resultIntercepts, result) || result
		}
		isTrapping = true
		let result
		executeLink = link
		executeThis = this
		executeMethod = method
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

function frameCallback(entry, cb, isResolver = false) {
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
	else link = link || create(null)
	let continuationLink = link
	function trappableCb() {
		const trap = current.frame[sid]
		if(!trap)	return cb.apply(this, arguments)
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
		desc.get = function() {return passBack(frameCallback(entry, obj[name]))}
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



interface Intercept {
	(address:any/*Address*/, instance?:any):void
	decouple(continuation:(...args) => any, instance:Object),
	frameCallback(entry, cb:Function)
	frameObject()
	passBack()
}

const exportIntercept:Intercept = function(addresses) {
	addresses = isArr(addresses) ? addresses : [addresses]
	for(let address of addresses)
		if(!intercept(address[symEntry])) throw Error(`Can't intercept ${address.toString()}`)
}
exportIntercept.decouple = decouple
exportIntercept.frameCallback = frameCallback
exportIntercept.frameObject = <any>frameObject
exportIntercept.passBack = <any>passBack

export {
	exportIntercept as intercept,
	makeClassIntercept,
	makeMethodIntercept,
	frameCallback,
	frameObject,
	decouple,
	passBack,
	trap,
}




















