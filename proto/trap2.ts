
/*
tin
const symId = Symbol()

function frameArgs(instance, args, traps, reg) {
  const cb = args[0]

  const symId = instance[symInstanceId]
  cb[symId] = cb[symId] || function() {}

}

function x(instance) {
  const isPerInstance = linking = PerInstance
  // get existing
  if(isPerInstance) {
    const symInstanceId = instance[symId] || (instance[symId] = Symbol())
    const continuation = cb[symInstanceId]

    if(continuation) return continuation


  }
  else {
    if(!traps) {
      const symFrameId = current.frame[symId]
      let continuation = cb[symFrameId]
      if(continuation) return continuation
      const run = current.frame.runSync
      continuation = function() {return run(db, this, arguments)}
      cb[symFrameId] = continuation
      return continuation
    }
  }

  continuation = function() {

  }

  if(isPerInstance) {
    const continuation = disguise(cb, function() {})
    continuation[symId] = continuation[symDisguised]
    continuation[symDisguised] = undefined

    if(!traps)
  }
  else {

    continuation = function() {return run(cb, this, arguments)}
    continuation[symOriginal] = cb
    cb[symFrameId] = continuation

  }

  const symCbId = cb[symSymbolicId]
  const {frame} = current

  let continuation = frame[symCbId] || (frame[symCbId] = function() {return frame.runSync(cb, this, arguments)}

  const ctx = this
  const {execute} = trapInContext

  const runSync = frame.runSync
  const framedTrap = function() {return runSync(execute, ctx, arguments)}
  const frameTraps = frame[symTraps]
  const {execute: nextExecute, exeception: nextException} = frameTraps
  framedTrap[synNext] = nextExecute
  frameTraps.execute = framedTrap

  if(traps && isPerCall)
    oneshot = function() {return continuation.apply(this, arguments)}
}
let trapThis
let trapArgs = [
  callNextExecute
]

let nextExecute

function callNextExecute(args) {
  const executeCtx = nextExecute[symContext]
  trapArgs[2] = args
  nextExecute = executeCtx[symNext]
  return executeCtx[symFrame].runSync(execute, executeCtx, trapArgs)
}

function execute(n, t, a) {
  t[myCtxSym]
  return n(a)
}

function x() {
  trapArgs[0] = callNextExecute
  trapArgs[1] = this
  trapArgs[2] = arguments
}
*/
/*
function disguise(originial, mask) {
	mask[symOriginal] = original
}

const symSymbolicId = Symbol()

function frameCb(frame, cb, entry) {
	if(!cb) return
	const symCbId = cb[symSymbolicId] || (cb[symSymbolicId] = Symbol())
	let continuation = frame[symCbId]
	if(continuation) return continuation
	const traps = frame[symTraps]
	const interim = !traps ? cb :
		function () {
			// do traps
			traps.execute(next, this, arguments)
			return cb.apply(this, arguments)
		}
	const run = entry.isSync ? frame.runSync : frame.runAsync
	continuation = disguise(cb, function() {return run(interim, this, arguments)})
	if(!(traps && entry.isPerCall)) frame[symCbId] = continuation
	return continuation
}

function frameZero(frame, args, entry) {
	return args[0] = frameCb(frame, args[0], entry)
}

function frameObject(frame, obj, entry) {
	if(!obj) return
	const {props, asProxy} = entry
	let idx = props.length
	const proxy = asProxy ? create(obj) : obj
	const desc:any = {configurable: true, enumerable: true}
	while(idx--) {
		const prop = props[idx]
		desc.get = function() {return frameCb(frame, obj[prop], entry)}
		desc.set = function(v) {return obj[prop] = v}
		defineProperty(proxy, prop, desc)
	}
	return proxy
}

const regElemProps = ['createdCallback', 'attachedCallback']
function frameRegisterElement(frame, args, entry) {
	const options = args[1]
	if(!options) return
	const {prototype} = options
	if(!prototype) return
	options.prototype = frameObject(frame, prototype, entry)
	return undefined
}


*/


class S {
	id:symbol
	constructor(s) {
		this.id = Symbol(s)
	}
	valueOf() {return this.id}
	toString() {return this.id}
}

const s = new S('test')
const o = {}
o[s] = 'test'
console.log(o)