import {
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
} from 'host'

import {
	rootGlobal,
	rootRequire,
	makeMethodIntercept,
	makeClassIntercept,
	frameContinuation,
} from 'intercept'


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

	root?:any
	make?:any
	isPerCall?:boolean
	implement?:any
	frameArgs?:any
	resultIntercepts?:any
	frameResult?:any
}

class Address {
	// @ts-ignore
	[symEntry]:Entry

	constructor(host, version, mnemonicPath) {
		const mnemonic = mnemonicPath.join('.')
		let entry = byNnemonic[mnemonic]
		if(entry) return this
		entry = this[symEntry] = byNnemonic[mnemonic] = create(null)
		entry.sid = sym(`eldc: ${mnemonic}`)
		entry.state = 'node'
		entry.mnemonic = mnemonic
		entry.address = this
	}
}


const addresses:any = new Address('', '', ['<root>'])

let host = 'unknown'
let version = 'unknown'
let nmemonicPath:string[] = []
let curEntry

const framersToBind:{
	binder:(entry:Entry, interceptEntry:Entry) => (argsOrResult) => () => void,
	entry:Entry,
	interceptEntry:Entry,
	isFrameResult
}[] = []

function ensureIntercept(address, path) {
	const entry = address[symEntry]
	if(entry.state !== 'node') return address
	entry.state = 'installed'
	entry.host = host
	entry.version = version
	entry.path = path.slice(0)
	entry.root = path[0] === 'global' ? rootGlobal : rootRequire
	entry.make = makeMethodIntercept
	entry.isPerCall = true
	return address
}


function stageInstaller(interceptAddress, parentAddress, installer, path:string[] = []) {
	const [node, ...children] = installer
	nmemonicPath.push(node)

	const address = new Address(host, version, nmemonicPath)
	const entry = address[symEntry]
	parentAddress[node] = address

	switch(node) {
	case install.HOST:
		host = children[0]
		break;
	case install.VERSION:
		version = children[0]
		break
	case '_':
		if(nmemonicPath[nmemonicPath.length - 2] === 'prototype') {
			path.push(node)
			stageInstallers(interceptAddress, address, children, path)
		}
		else {
			entry.state = 'result'
			interceptAddress = ensureIntercept(parentAddress, path)
			const interceptEntry = interceptAddress[symEntry]
			interceptEntry.resultIntercepts = []
			stageInstallers(interceptAddress, address, children)
			if(interceptEntry.resultIntercepts.length === 0) interceptEntry.resultIntercepts = undefined
		}
		break
	case '$':
		entry.state = 'continuation'
		const isFrameResult = parentAddress[symEntry].state === 'result'
		if(!isFrameResult) interceptAddress = ensureIntercept(parentAddress, path)
		const childInstallers:any[] = []
		for(let child of children)
			if(isFn(child)) framersToBind.push({binder: child, entry, interceptEntry: interceptAddress[symEntry], isFrameResult})
			else childInstallers.push(child)
		childInstallers && stageInstallers(interceptAddress, address, childInstallers)
		break
	default:
		const parentEntry = parentAddress[symEntry]
		if(parentEntry.state === 'continuation') entry.isPerCall = parentEntry.isPerCall
		else {
			path.push(node)
			const resultIntercepts = interceptAddress[symEntry].resultIntercepts
			if(resultIntercepts) resultIntercepts.push(address)
		}
		children && stageInstallers(interceptAddress, address, children, path)
		if(parentEntry.state !== 'continuation') path.pop()
		break
	}

	nmemonicPath.pop()
}

function stageInstallers(interceptAddress, address, installers, path?) {
	let hadConfigurator = false
	let hadChildren = false
	for(let installer of installers) {
		if(isFn(installer)) {
			hadConfigurator = true
			interceptAddress = ensureIntercept(address, path)
			installer(address[symEntry], interceptAddress)
		}
		else {
			hadChildren = true
			stageInstaller(interceptAddress, address, installer, path)
		}
	}
	if(!hadConfigurator && !hadChildren) {
		ensureIntercept(address, path)
	}
}


function install(installers) {
	if(!isArr(installers) && !installers.length) throw new AddressError(install, '')
	if(!isArr(installers[0])) installers = [installers]
	const installed = new Address('','',[])
	const installAddresses = installed[symEntry].resultIntercepts = []
	framersToBind.length = 0
	stageInstallers(installed, addresses, installers)
	for(let {binder, entry, interceptEntry, isFrameResult} of framersToBind) {
		const framer = binder(entry, interceptEntry)
		isFrameResult
			? (interceptEntry.frameResult = framer)
			: (interceptEntry.frameArgs = framer)
	}
	return installAddresses
}



function ARG_LAST(entry) {
	return function(args) {
		const l = args.length - 1
		if(l < 0) return
		const cb = args[l]
		if(!cb || !isFn(cb)) return
		args[l] = frameContinuation(entry, cb)
	}
}
function PER_INSTANCE(entry) {entry.isPerCall = false}

const ARG_N = []
namespace install {
	export function HOST(host) {return [HOST, host]}
	export function VERSION(version) {return [VERSION, version]}
	export function ARG_N(n) {
		return ARG_N[n] || (ARG_N[n] = function(entry) {
			return function(args) {
				const cb = args[n]
				if(!cb || !isFn(cb)) return
				args[n] = frameContinuation(entry, cb)
			}
		})
	}
	export function ARG_LAST() {return ARG_LAST}
	export function CLASS(implement:(Class:any, instance?:any) => any) {
		return function(entry) {
			entry.make = makeClassIntercept
			entry.implement = implement
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
}

export {
	install,
	addresses,
}

