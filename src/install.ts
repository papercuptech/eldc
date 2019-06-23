import {
	global_,
	assign,
	create,
	defineProperty,
	defineProperties,
	getOwnPropertyNames,
	getOwnPropertySymbols,
	setPrototypeOf,

	isFn,
	isArr,
	isStr,

	symEntry,

	sym,
} from 'common'

import {
	makeMethodIntercept,
	makeClassIntercept,
	frameCallback,
} from 'intercept'

function rootGlobal() {return global_}
function rootRequire(name) {return require(name)}

class AddressError extends Error {
	constructor(from, message) {
		super(message)
		Error.captureStackTrace && Error.captureStackTrace(this, from)
	}
}

const byNnemonic = create(null)

interface Entry {
	state:'node'|'result'|'continuation'|'installed'|'intercepted'|'failed'
	sid:symbol
	mnemonic:string
	address:Address|any
	host:string
	version:string

	path?:string[]
	root?:any
	make?:any
	isPrototype?:boolean
	isPerCall?:boolean
	implement?:any
	frameArgs?:any
	resultIntercepts?:any
	frameResult?:any
}

let nmemonicPath:string[] = []
let rootAddress:any
class Address {
	// @ts-ignore
	[symEntry]:Entry

	constructor(parentAddress, node) {
		const nmemonic = nmemonicPath.join('.')
		let entry = byNnemonic[nmemonic]
		if(entry) return entry.address
		entry = this[symEntry] = byNnemonic[nmemonic] = create(null)
		entry.sid = sym(`eldc: ${nmemonic}`)
		entry.state = 'node'
		entry.nmemonic = nmemonic
		entry.address = this
		entry.isPrototype = node === 'prototype' || node === '__proto__' || parentAddress[symEntry].isPrototype
		parentAddress[node] = this
	}

	toString() {return this[symEntry].nmemonic}
	valueOf() {return this[symEntry].nmemonic}
}
rootAddress = new Address({[symEntry]:create(null)}, '<root>')

const framersToBind:{
	binder:(entry:Entry, interceptEntry:Entry) => (argsOrResult) => () => void,
	entry:Entry,
	interceptEntry:Entry,
	isFrameResult
}[] = []

let isInstallingRoot = true
const rootInstalled:Entry[] = []
let host = 'unknown'
let version = 'unknown'
function ensureIntercept(parentInterceptAddress, entry, path) {
	if(entry.state !== 'node') return
	entry.state = 'installed'
	entry.host = host
	entry.version = version
	entry.path = path.slice(0)
	entry.root = path[0] === 'global' ? rootGlobal : rootRequire
	entry.make = makeMethodIntercept
	entry.isPerCall = true
	if(path.length >= nmemonicPath.length - 1) rootInstalled.push(entry.address)
	const resultIntercepts = parentInterceptAddress[symEntry].resultIntercepts
	if(resultIntercepts) resultIntercepts.push(entry)
	return
}

function stageInstaller(interceptAddress, parentAddress, installer, path) {
	const [node, ...children] = installer
	nmemonicPath.push(node)

	const parentEntry = parentAddress[symEntry]
	const address = new Address(parentAddress, node)
	const entry = address[symEntry]

	switch(node) {
	case install.HOST:
		host = children[0]
		break
	case install.VERSION:
		version = children[0]
		break
	case '_':
		if(parentEntry.isPrototype) {
			entry.isPrototype = true
			path.push(node)
			stageInstallers(interceptAddress, address, children, path)
			path.pop()
		}
		else {
			entry.state = 'result'
			ensureIntercept(interceptAddress, parentEntry, path)
			parentEntry.resultIntercepts = []
			stageInstallers(parentAddress, address, children)
			if(parentEntry.resultIntercepts.length === 0) parentEntry.resultIntercepts = undefined
		}
		break
	case '$':
		entry.state = 'continuation'
		const isFrameResult = parentEntry.state === 'result'
		if(!isFrameResult) {
			ensureIntercept(interceptAddress, parentEntry, path)
			interceptAddress = parentAddress
		}
		const childInstallers:any[] = []
		for(let child of children)
			if(isFn(child))
				framersToBind.push({
					binder: child,
					entry,
					interceptEntry: interceptAddress[symEntry],
					isFrameResult
				})
			else childInstallers.push(child)
		childInstallers && stageInstallers(interceptAddress, address, childInstallers)
		break
	default:
		if(parentEntry.state === 'continuation') entry.isPerCall = parentEntry.isPerCall
		else
			path.push(node)
		children && stageInstallers(interceptAddress, address, children, path)
		if(parentEntry.state !== 'continuation')
			path.pop()
		break
	}

	nmemonicPath.pop()
}

function stageInstallers(parentInterceptAddress, address, installers, path:string[] = []) {
	let hadConfigurator = false
	let hadChildren = false
	let interceptAddress = parentInterceptAddress
	for(let cfgOrInstallers of installers)
		if(isFn(cfgOrInstallers)) {
			const entry = address[symEntry]
			if(!hadConfigurator) {
				hadConfigurator = true
				ensureIntercept(parentInterceptAddress, entry, path)
				interceptAddress = address
			}
			cfgOrInstallers(entry, address)
		}
		else {
			hadChildren = true
			stageInstaller(interceptAddress, address, cfgOrInstallers, path)
		}

	if(!hadConfigurator && !hadChildren) {

		ensureIntercept(parentInterceptAddress, address[symEntry], path)

	}
}


function install(installers) {
	if(!isArr(installers) && !installers.length) throw new AddressError(install, '')
	if(!isArr(installers[0])) installers = [installers]
	isInstallingRoot = true
	rootInstalled.length = 0
	framersToBind.length = 0
	stageInstallers(rootAddress, rootAddress, installers)
	for(let {binder, entry, interceptEntry, isFrameResult} of framersToBind) {
		const framer = binder(entry, interceptEntry)
		isFrameResult
			? (interceptEntry.frameResult = framer)
			: (interceptEntry.frameArgs = framer)
	}
	return rootInstalled
}

namespace install {
	export const addresses:any = rootAddress
}



function ARG_LAST(entry) {
	return function(args) {
		const l = args.length - 1
		if(l < 0) return
		const cb = args[l]
		if(!cb || !isFn(cb)) return
		args[l] = frameCallback(entry, cb)
	}
}

function PER_INSTANCE(entry) {entry.isPerCall = false}

function EVAL_ROOT(entry) {

}

const ARG_N = []
namespace install {
	export function HOST(host) {return [HOST, host]}
	export function VERSION(version) {return [VERSION, version]}
	export function ARG_N(n) {
		return ARG_N[n] || (ARG_N[n] = function(entry) {
			return function(args) {
				const cb = args[n]
				if(!cb || !isFn(cb)) return
				args[n] = frameCallback(entry, cb)
			}
		})
	}
	export function ARG_LAST() {return ARG_LAST}
	export function CLASS(implement?:(Class:any, instance?:any) => any) {
		return function(entry) {
			entry.make = makeClassIntercept
			implement && (entry.implement = implement)
		}
	}
	export function METHOD(implement:(method:any, instance?:any) => any) {
		return function(entry) {
			entry.make = makeMethodIntercept
			entry.implement = implement
		}
	}
	export function FRAMER(binder:(entry:Entry, interceptEntry?:Entry) => (argsOrResult) => void) {
		return (entry, interceptEntry) => binder(entry, interceptEntry)
	}
	export function PER_INSTANCE() {return PER_INSTANCE}
	export function EVAL_ROOT(name, expr) {
		return function() {

		}
	}
}

export {
	install
}

