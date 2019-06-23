import {
	create,
	getPrototypeOf,
	isFn,
	symNext,
	symContext,
	symSymbolicId,
	symFrame,
	symEntry,
} from 'common'

import {
	install,
} from 'install'

import {
	frameCallback,
	intercept
} from 'intercept'

import {
	wrapGeneratorFns
} from 'generators'


let nextId = 0
class Frame {
	id!:number
	run!:(fn, this_, args) => any
	runResolver!:(fn, this_, args) => any
	frame!:() => any

	constructor(within?:Frame) {
		const new_ = create(within || {})
		new_.id = nextId++
		new_[symSymbolicId] = Symbol()
		new_.run = run.bind(new_)
		new_.runResolver = runResolver.bind(new_)
		return new_ as Frame
	}
}

function inContext() {return current.frame.id !== 0}
const top = new Frame()
const current = {frame: top}
let hardSwitches:symbol[]


function enableHardSwitching(symContext:symbol) {
	hardSwitches = hardSwitches || []
	hardSwitches.push(symContext)
}

function hardSwitch(frame) {
	let idx = hardSwitches.length
	while(idx--) {
		const symContext = hardSwitches[idx]
		const fromCtx = current.frame[symContext]
		const toCtx = frame[symContext]
		if(fromCtx !== toCtx) fromCtx.hardSwitch(toCtx)
	}
}


const queuePromiseJob:(fn:Function) => void
	= Promise.prototype.then.bind(Promise.resolve()) as any










/*


let resolverCallDepth = 0

interface Switcher {
	():void
	src?:string
	to:Frame
	isForResolver:boolean
	isResolver:boolean
	next?:Switcher
}
let freeSwitchers:Switcher|undefined = undefined
function queueAsyncSwitch(src, to, isForResolver = false) {
	console.log(current.frame.id, 'qing ', src, to.id)
	let switcher:Switcher
	if(freeSwitchers) {
		switcher = freeSwitchers
		freeSwitchers = freeSwitchers.next
	}
	else switcher = <Switcher>function newSwitcher() {
		const switcher = <Switcher>newSwitcher
		const {to, isForResolver, isResolver, src} = switcher
		console.log(current.frame.id, 'isForResolver', isForResolver)
		if(!isForResolver && current.frame !== to) {
			logSwitch(`a -${src}`, to)
			current.frame = to
			if(hardSwitches) try{hardSwitch(to)} catch{}
		}
		let queued = false
		if(isResolver && false) {
			switcher.isResolver = false
			if(--resolverCallDepth === 0) {
				switcher.to = top
				queuePromiseJob(switcher)
				queued = true
			}
		}
		else if(isForResolver) {
			if(!switcher.isResolver--)
				switcher.isForResolver = false
			//switcher.isResolver = false
			//switcher.isResolver = true
			//++resolverCallDepth
			queuePromiseJob(switcher)
			queued = true
		}
		if(!queued) {
			switcher.to = top
			switcher.next = freeSwitchers
			freeSwitchers = switcher
		}
	}
	switcher.src = src
	switcher.to = to
	switcher.isForResolver = isForResolver
	switcher.isResolver = 2
	queuePromiseJob(switcher)
}

let freeSwitchTrackers = {}
let currentSwitchTracker:any = {madePromise: true, isResolver: false, previous: undefined}
function pushSwitchTracker(isResolver)  {
	const previous = currentSwitchTracker
	if(freeSwitchTrackers === undefined)
		return currentSwitchTracker = {previous, madePromise: false, isResolver}
	currentSwitchTracker = freeSwitchTrackers
	freeSwitchTrackers = currentSwitchTracker.previous
	currentSwitchTracker.previous = previous
	currentSwitchTracker.madePromise = false
	currentSwitchTracker.isResolver = isResolver
}

function popSwitchTracker() {
	currentSwitchTracker.previous = freeSwitchTrackers
	freeSwitchTrackers = currentSwitchTracker
}

function run(fn, this_, args) {
	console.log(current.frame.id, 'run')
	if(current.frame === this) return fn.apply(this_,args)
	pushSwitchTracker(false)
	logSwitch('r -in ', this)
	const backTo = current.frame
	current.frame = this
	try {
		if(hardSwitches) hardSwitch(backTo)
		return fn.apply(this_,args)
	}
	finally {
		logSwitch('r -out', backTo)
		current.frame = backTo
		if(currentSwitchTracker.madePromise) queueAsyncSwitch('r o', backTo)
		popSwitchTracker()
		if(hardSwitches) hardSwitch(this)
	}
}

function logSwitch(src, to) {
	console.log(src, current.frame.id, ' to ', to.id)
}

function runResolver(fn, this_, args) {
	console.log(current.frame.id, 'runRes')
	//queueAsyncSwitch(this, true)
	const isSwitch = current.frame !== this
	if(!isSwitch) return fn.apply(this_,args)
	++resolverCallDepth
	queueAsyncSwitch('rri', this)
	pushSwitchTracker(true)
	logSwitch('rr-in ', this)
	const backTo = current.frame
	current.frame = this
	try {
		if(hardSwitches) hardSwitch(backTo)
		return fn.apply(this_,args)
	}
	finally {
		logSwitch('rr-out', backTo)
		current.frame = backTo
		if(--resolverCallDepth === 0)	queueAsyncSwitch('rro', backTo, true)

		popSwitchTracker()
		if(hardSwitches) hardSwitch(this)
	}
}

function CLASS_UserlandPromise(NativePromise) {
	return class UserlandPromise extends NativePromise {
		constructor(executor) {
			console.log(current.frame.id, 'new prom')
			if(!currentSwitchTracker.madePromise) {
				currentSwitchTracker.madePromise = true
				if(!currentSwitchTracker.isResolver) queueAsyncSwitch('new', current.frame)
			}
			super(executor)
			this[symFrame] = current.frame
		}
	}
}
*/



let resolverCallDepth = 0

interface Switcher {
	():void
	to:Frame
	isForResolver:boolean
	isResolver:boolean
	next?:Switcher
}
let freeSwitchers:Switcher|undefined = undefined
function queueAsyncSwitch(to, isForResolver = false) {
	let switcher:Switcher
	if(freeSwitchers) {
		switcher = freeSwitchers
		freeSwitchers = freeSwitchers.next
	}
	else switcher = <Switcher>function newSwitcher() {
		const switcher = <Switcher>newSwitcher
		const {to, isForResolver, isResolver} = switcher
		console.log(current.frame.id, 'isForResolver', isForResolver, 'isResolver', isResolver)
		if(current.frame !== to) {
			current.frame = to
			if(hardSwitches) try{hardSwitch(to)} catch{}
		}
		let queued = false
		if(isResolver) {
			switcher.isResolver = false
			if(--resolverCallDepth === 0) {
				switcher.to = top
				queuePromiseJob(switcher)
				queued = true
			}
		}
		else if(isForResolver) {
			switcher.isForResolver = false
			switcher.isResolver = true
			++resolverCallDepth
			queuePromiseJob(switcher)
			queued = true
		}
		if(!queued) {
			switcher.to = top
			switcher.next = freeSwitchers
			freeSwitchers = switcher
		}
	}
	switcher.to = to
	switcher.isForResolver = isForResolver
	switcher.isResolver = false
	queuePromiseJob(switcher)
}

let freeSwitchTrackers = {}
let currentSwitchTracker:any = {madePromise: true, isResolver: false, previous: undefined}
function setSwitchTracker(isResolver)  {
	const previous = currentSwitchTracker
	if(freeSwitchTrackers === undefined)
		return currentSwitchTracker = {previous, madePromise: false, isResolver}
	currentSwitchTracker = freeSwitchTrackers
	freeSwitchTrackers = currentSwitchTracker.previous
	currentSwitchTracker.previous = previous
	currentSwitchTracker.madePromise = false
	currentSwitchTracker.isResolver = isResolver
}

function releaseSwitchTracker(tracker) {
	tracker.previous = freeSwitchTrackers
	freeSwitchTrackers = tracker
}

function run(fn, this_, args) {
	if(current.frame === this) return fn.apply(this_,args)
	setSwitchTracker(false)
	const backTo = current.frame
	current.frame = this
	try {
		if(hardSwitches) hardSwitch(backTo)
		return fn.apply(this_,args)
	}
	finally {
		current.frame = backTo
		if(currentSwitchTracker.madePromise) {
			queueAsyncSwitch(backTo)
			releaseSwitchTracker(currentSwitchTracker)
		}
		if(hardSwitches) hardSwitch(this)
	}
}


function runResolver(fn, this_, args) {
	queueAsyncSwitch(this, true)
	const isSwitch = current.frame !== this
	if(!isSwitch) return fn.apply(this_,args)
	setSwitchTracker(true)
	const backTo = current.frame
	current.frame = this
	try {
		if(hardSwitches) hardSwitch(backTo)
		return fn.apply(this_,args)
	}
	finally {
		current.frame = backTo
		if(currentSwitchTracker.madePromise) {
			queueAsyncSwitch(backTo)
			releaseSwitchTracker(currentSwitchTracker)
		}
		if(hardSwitches) hardSwitch(this)
	}
}

function CLASS_UserlandPromise(NativePromise) {
	return class UserlandPromise extends NativePromise {
		constructor(executor) {
			console.log(current.frame.id, 'new prom')
			if(!currentSwitchTracker.madePromise) {
				currentSwitchTracker.madePromise = true
				if(!currentSwitchTracker.isResolver) queueAsyncSwitch(current.frame)
			}
			super(executor)
			this[symFrame] = current.frame
		}
	}
}





function METHOD_PromiseThen(then) {
	return function() {
		console.log(current.frame.id, 'then; user', !!this[symFrame])
		if(!this[symFrame]) this[symFrame] = current.frame
		then.apply(this, arguments)
	}
}

function FRAMER_PromiseThen({address}) {
	const onfulfilledEntry = address.onfulfilled[symEntry]
	const onrejectedEntry = address.onrejected[symEntry]
	return function(args) {
		const onfulfilled = args[0]
		const onrejected = args[1]
		onfulfilled && isFn(onfulfilled) && (args[0] = frameCallback(onfulfilledEntry, onfulfilled, true))
		onrejected && isFn(onrejected) && (args[1] = frameCallback(onrejectedEntry, onrejected, true))
	}
}

function FRAMER_PromiseCatch(entry) {
	return function(args) {
		const arg = args[0]
		arg && isFn(arg) && (args[0] = frameCallback(entry, arg, true))
	}
}

function FRAMER_PromiseFinally(entry) {
	return function(args) {
		const arg = args[0]
		arg && isFn(arg) && (args[0] = frameCallback(entry, arg, true))
	}
}






export {
	current,
	top,
	Frame,
	enableHardSwitching,

	CLASS_UserlandPromise,
	METHOD_PromiseThen,
	FRAMER_PromiseThen,
	FRAMER_PromiseCatch,
	FRAMER_PromiseFinally,
}


