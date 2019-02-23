import {
	create,
	getPrototypeOf,
	isFn,
	disguise,
	symNext,
	symContext
} from 'host'

const runSync = runAsync

let nextId = 0
class Frame {
	id!:number
	runSync!:(fn, this_, args) => any
	runAsync!:(fn, this_, args) => any
	runResolver!:(fn, this_, args) => any
	frame!:() => any
	trap!:(inContext:any, address:symbol, trap:(() => any)|{construct:()=>any, execute:()=>any, exception:()=>any})=>void
	hardSwitch!:() => any

	constructor(within?:Frame) {
		const new_ = create(within || {})
		new_.id = nextId++
		new_.runSync = runSync.bind(new_)
		new_.runAsync = runAsync.bind(new_)
		new_.runResolver = runResolver.bind(new_)
		new_.frame = frameAsync.bind(new_)
		new_.trap = trap.bind(new_)
		new_.hardSwitch = hardSwitch.bind(new_)
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

function hardSwitch() {
	let idx = hardSwitches.length
	while(idx--) {
		const symContext = hardSwitches[idx]
		const fromCtx = current.frame[symContext]
		const toCtx = this[symContext]
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
			if(hardSwitches) to.hardSwitch()
			current.frame = to
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

function runAsync(f, t, a) {
	const l = a && a.length || 0
	queueAsyncSwitch(this)
	if(hardSwitches) this.hardSwitch()
	if(current.frame === this)
		return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
			l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
	    l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
	const backTo = current.frame
	current.frame = this
	try {
	  return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
			l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
	}
	finally {queueAsyncSwitch(current.frame = backTo)}
}

function runResolver(f, t, a) {
	const l = a && a.length || 0
	queueAsyncSwitch(this, true)
	const isSwitch = current.frame !== this
	if(isSwitch && hardSwitches) this.hardSwitch()
	if(!isSwitch)
		return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
			l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
	    l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
	const backTo = current.frame
	current.frame = this
	try {
	  return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
			l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
	}
	finally {queueAsyncSwitch(current.frame = backTo, true)}
}


interface Trapable {
	(): any
	traps:any
}

function frame(fn, run) {

}
function frameSync(fn) {return frame(fn, current.frame.runSync)}
function frameAsync(fn) {return frame(fn, current.frame.runAsync)}
function frameResolver(fn) {return frame(fn, current.frame.runResolver)}



function trapPoint(context, point, traps, trapRec) {
	let trap = traps[point]
	if(!isFn(trap)) return
	trap = trap[symNext] ? function(n,t,a,l) {trap.call(this,n,t,a,l)} : trap
	trap[symNext] = trapRec[point]
	trap[symContext] = context
	trapRec[point] = trap
}

const asTraps:{construct:()=>any, execute:()=>any, exception:()=>any} = <any>{execute:undefined}
function trap(context:any, address:symbol, traps:(() => any)|{construct:()=>any, execute:()=>any, exception:()=>any}){
	const {frame} = current
	let trapRec = frame.hasOwnProperty(address) && frame[address]
	if(!trapRec) {
		trapRec = create(frame[address] || null)
		frame[address] = trapRec
	}
	if(isFn(traps)) {
		asTraps.execute = <any>traps
		traps = asTraps
	}
	trapPoint(context, 'construct', traps, trapRec)
	trapPoint(context, 'execute', traps, trapRec)
	trapPoint(context, 'exception', traps, trapRec)
}




export {
	current,
	top,
	Frame,
	frameAsync as frame,
	frameSync,
	frameResolver,
	enableHardSwitching
}




