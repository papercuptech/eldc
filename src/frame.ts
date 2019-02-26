import {
	create,
	getPrototypeOf,
	isFn,
	disguise,
	symNext,
	symContext,
	symSymbolicId,
} from 'host'

const runSync = run

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

interface Switcher {
	():void
	to:Frame
	isForResolver:boolean
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
		const {to, isForResolver} = switcher
		if(current.frame !== to) {
			current.frame = to
			if(hardSwitches) hardSwitch(to)
		}
		if(isForResolver) {
			switcher.isForResolver = false
			queuePromiseJob(switcher)
		}
		else {
			switcher.to = top
			switcher.next = freeSwitchers
			freeSwitchers = switcher
		}
	}
	switcher.to = to
	switcher.isForResolver = isForResolver
	queuePromiseJob(switcher)
}

const EMPTY_ARRAY = []

function run(f, t, a) {
	const l = a && a.length || 0
	queueAsyncSwitch(this)
	if(current.frame === this)
		return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
			l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
	    l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
	const backTo = current.frame
	current.frame = this
	if(hardSwitches) hardSwitch(backTo)
	try {
	  return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
			l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
	}
	finally {
		current.frame = backTo
		if(hardSwitches) hardSwitch(this)
		queueAsyncSwitch(backTo)
	}
}

function runResolver(f, t, a) {
	const l = a && a.length || 0
	queueAsyncSwitch(this, true)
	const isSwitch = current.frame !== this
	if(!isSwitch)
		return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
			l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
	    l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
	const backTo = current.frame
	current.frame = this
	if(hardSwitches) hardSwitch(backTo)
	try {
	  return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
			l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
	}
	finally {
		current.frame = backTo
		if(hardSwitches) hardSwitch(this)
		queueAsyncSwitch(backTo, true)
	}
}






export {
	current,
	top,
	Frame,
	enableHardSwitching
}




