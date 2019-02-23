import {
	global_,
	defineProperty,
	getOwnPropertyDescriptor,
	getPrototypeOf,
	isFn,
	disguise,
	symContext,
	symIntercepted,
	symNext,
	symSymbolicId,
	symLink
} from 'host'

import {
	current,
	frame,
} from 'frame'

const descriptors = {}

class InterceptError extends Error {
	constructor(from, message) {
		super(message)
		Error.captureStackTrace && Error.captureStackTrace(this, from)
	}
}

function intercept(address, instance?) {
	const entry = descriptors[address]
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
	methodOrClass = implement && implement(instance, methodOrClass) || methodOrClass
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
		// TODO throw on non-deferrable methods
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

let callId = 0


let link = {}

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
		// TODO throw on non-deferrable methods
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


const linkMap = (typeof WeakMap !== 'undefined') && new WeakMap()
function ensureLink(isPerCall, instance) {
	if(isPerCall) link = {}
	const instLink = instance && instance[symLink] || linkMap && linkMap.get(instance)
	if(instLink) return link = instLink
	link = {}
	try {return instance[symLink] = link}
	catch(ex) {
		if(!linkMap) throw new InterceptError(ensureLink, 'Host does not support isPerInstance linking')
		linkMap.set(instance, link)
	}
}

function makeClassIntercept(entry, Class) {
	const {frameArgs, frameResult, resultIntercepts, address, isPerCall} = entry
	let trapping = false
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
			linkId = callId++
			frameArgs && frameArgs(frame, arguments)
			const trap = frame[address]
			if(!trap) {
				l<1?super():l<2?super(a[0]):l<3?super(a[0],a[1]):l<4?super(a[0],a[1],a[2]):
				l<5?super(a[0],a[1],a[2],a[3]):l<6?super(a[0],a[1],a[2],a[3],a[4]):l<7?super(a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):super(...arguments)
				resultIntercepts && this && interceptResult(resultIntercepts, this)
				!isPerCall && ensureLinkId(this, linkId)
				return this
			}
			if(trapping) throw new InterceptError(Interceptor, 'Traps cannot recurse')
			trapping = true
			!isPerCall && ensureLinkId(this, linkId)
			try {
				trap.construct && (nextConstruct = trap.construct) && callNextConstruct(arguments)
				l<1?super():l<2?super(a[0]):l<3?super(a[0],a[1]):l<4?super(a[0],a[1],a[2]):
				l<5?super(a[0],a[1],a[2],a[3]):l<6?super(a[0],a[1],a[2],a[3],a[4]):l<7?super(a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):super(...arguments)
				resultIntercepts && this && interceptResult(resultIntercepts, this)
				if(trap.execute) {
					executeMethod = undefined
					executeThis = this
					executeResultIntercepts = undefined
					executeLinkId = linkId
					nextExecute = trap.execute
					callNextExecute(arguments)
				}
			}
			catch(ex) {
				ex = trap.exception && (nextException = trap.exception) && callNextException(ex) || ex
				if(ex) throw ex
			}
			finally {trapping = false}
			frameResult && frameResult(frame, this)
			return this
		}
	})
}

function makeMethodIntercept(entry, fn, instance) {
	const {frameArgs, frameResult, resultIntercepts, address, isPerCall} = entry
	const isBarrier = !!frameArgs || !!frameResult
	let isTrapping = false
	return disguise(fn, function intercept(this:any) {
		const t = this, a = arguments, l = a && a.length || 0
		const {frame} = current
		if(frame.id === 0)
			return l<1?fn.call(t):l<2?fn.call(t,a[0]):l<3?fn.call(t,a[0],a[1]):l<4?fn.call(t,a[0],a[1],a[2]):
				l<5?fn.call(t,a[0],a[1],a[2],a[3]):l<6?fn.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):fn.apply(t,a)

		const trap = frame[address]

		if(isBarrier) ensureLink(isPerCall, instance)

		frameArgs && frameArgs(frame, arguments)

		if(!trap) {
			const result = l<1?fn.call(t):l<2?fn.call(t,a[0]):l<3?fn.call(t,a[0],a[1]):l<4?fn.call(t,a[0],a[1],a[2]):
				l<5?fn.call(t,a[0],a[1],a[2],a[3]):l<6?fn.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
				l<8?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):fn.apply(t,a)
			return resultIntercepts && result && interceptResult(resultIntercepts, result) || result
		}


		if(isTrapping) throw new InterceptError(intercept, 'Traps cannot recurse')
		isTrapping = true


		let result
		executeMethod = fn
		executeThis = this
		executeResultIntercepts = resultIntercepts
		executeLink = isBarrier && link || undefined
		nextExecute = trap.execute
		try {result = callNextExecute(arguments)}
		catch(ex) {
			ex = trap.exception && (nextException = trap.exception) && callNextException(ex) || ex
			if(ex) throw ex
			result = pseudoResult
		}
		finally {
			isTrapping = false
			isBarrier && (link = {})
		}
		return frameResult && frameResult(frame, result) || result
	})
}

function makeCallbackIntercept(isPerCall, address, frame, cb, isResolver = false) {
	if(!cb) return
	const symCbId = cb[symSymbolicId] || (cb[symSymbolicId] = Symbol())


	const trap = frame[address]
	let continuation = frame[symCbId]


	let keep = !trap || !isPerCall
	if(continuation && keep) return continuation
	const continuationLink = link

	const cbOrTrapped = !trap ? cb :
		function trapped() {
			const t = this, a = arguments, l = a && a.length || 0
			if(frame.id === 0)
				return l<1?cb.call(t):l<2?cb.call(t,a[0]):l<3?cb.call(t,a[0],a[1]):l<4?cb.call(t,a[0],a[1],a[2]):
					l<5?cb.call(t,a[0],a[1],a[2],a[3]):l<6?cb.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?cb.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
					l<8?cb.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?cb.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):cb.apply(t,a)
			let result
			executeMethod = cb
			executeThis = this
			executeResultIntercepts = undefined
			executeLink = continuationLink
			nextExecute = trap.execute
			try {return callNextExecute(arguments)}
			catch(ex) {
				ex = trap.exception && (nextException = trap.exception) && callNextException(ex) || ex
				if(ex) throw ex
				result = pseudoResult
			}
		}
	const run = isResolver ? frame.runResolver : frame.runAsync
	continuation = disguise(cb, function() {return run(cbOrTrapped, this, arguments)})
	keep && (frame[symCbId] = continuation)
	return continuation
}

export {
	descriptors,
	intercept,
	makeCallbackIntercept,
	makeMethodIntercept,
	makeClassIntercept,
	rootGlobal,
	rootRequire,
	rootEval,
}












