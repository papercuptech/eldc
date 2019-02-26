
function test(loop, times, fn, t?, a?) {
	while(loop--) {
		const l = a && a.length || 0
		let iter = times
		console.time('run')
		while(iter--)
			l<1?fn.call(t):l<2?fn.call(t,a[0]):l<3?fn.call(t,a[0],a[1]):l<4?fn.call(t,a[0],a[1],a[2]):
			l<5?fn.call(t,a[0],a[1],a[2],a[3]):l<6?fn.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?fn.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):fn.apply(t,a)
		console.timeEnd('run')
	}
}

let ox = {}
let wm = new WeakMap()
wm.set(ox, function() {c++})
let idx = 10000
while(idx--)
	wm.set({}, function() {})

let c = 0
let y = Symbol()
test(20, 10000, function() {
	wm.get(ox)()
	//c++
	//ox[y] = 10//
	//const x = function() {}
}, {}, [])

console.log(c)





'use strict'

import { Context } from ".";

let t = [1,2,3,4]

function nest(n, r) {
	while(n--) r = Object.create(r)
	return r
}

function nfn(fn) {
	//arguments[0] = 2
	//return function() {return oc(fn, this, arguments)}
	//return function() {return fn$(this, arguments)}
	//return function() {return fn()}
	//return function() {return fn.call(this)}
	//return function() {return fn.call(this, ...arguments)}
	//return function() {return fn.apply(this, arguments)}
	//return function(...args) {return fn.apply(this, args)}
	//return function() {Reflect.apply(fn, this, [])}
	//return function() {const a = arguments; return fn.call(this, a[0], a[1], a[2], a[3])}
	//return function() {return oc(fn, this, arguments)}
	return function() {
		const a = arguments
		switch(a.length) {
		case 0: return fn.call(this)
		case 1: return fn.call(this, a[0])
		case 2: return fn.call(this, a[0], a[1])
		case 3: return fn.call(this, a[0], a[1], a[2])
		case 4: return fn.call(this, a[0], a[1], a[2], a[3])
			//default: return fn.apply(this, a)
		}
	}
}

function nestfn(n, fn) {
	while(n--) fn = nfn(fn)
	return fn
}

function nfn1(fn) {
	function x() {
		arguments[0] = 46
		return x.fn.apply(this, arguments)
		//return oc(fn, this, t)
		//return oc(fn, this, arguments)
	}
	x.fn = fn
	return x
}

function nestfn1(n, fn) {
	while(n--) fn = nfn1(fn)
	return fn
}

function aa(a) {
	//a[0]=1
	return a
}

function oc(f, t, a) {
	const l = a.length
	return (l<1?f.call(t):
			l<2?f.call(t,a[0]):
				l<3?f.call(t,a[0],a[1]):
					l<4?f.call(t,a[0],a[1],a[2]):
						l<5?f.call(t,a[0],a[1],a[2],a[3]):
							l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):
								l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
									l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):
										l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):
											f.apply(t,a)
	)
}

function loopfn(n, f) {
	//const fn$ = fn.apply.bind(fn)
	const fn = f
	//let fn = f
	return function() {
		let ln = n
		//arguments[0] = 2
		//t = t || arguments
		//const a = arguments
		//const y = aa(t)
		//const a = aa(arguments)
		//const a = aa(t)
		//a[0] = 1
		//const a = t
		//while(l--) fn.apply(this, a)
		//while(ln--) fn.apply(this, arguments); return
		//while(ln--) oc(fn, this, arguments); return
		//while(l--) fn$(this, arguments)
		//while(l--) fn.call(this, a[0], a[1], a[2], a[3])
		//while(l--) return oc(fn, this, a)

		const a = arguments, l = a.length, t = this
		while(ln--) {
			l<1?fn.call(t):
				l<2?fn.call(t,a[0]):
					l<3?fn.call(t,a[0],a[1]):
						l<4?fn.call(t,a[0],a[1],a[2]):
							l<5?fn.call(t,a[0],a[1],a[2],a[3]):
								fn.apply(t,a)
		}
		return
		//const a = arguments
		while(ln--) {
			switch(a.length) {
			case 0: fn.call(this); break
			case 1: fn.call(this, a[0]); break
			case 2: fn.call(this, a[0], a[1]); break
			case 3: fn.call(this, a[0], a[1], a[2]); break
			case 4: fn.call(this, a[0], a[1], a[2], a[3]); break
			default: fn.apply(this, a); break
			}
		}
	}
}

let f1 = function f1() {}
function f2() {return f1.apply(this, arguments)}
function f3() {return f2.apply(this, arguments)}
function f4() {return f3.apply(this, arguments)}

let f1x = function f1() {}
function f2x() {return f1.apply(this, arguments)}
function f3x() {return f2.apply(this, arguments)}
function f4x() {return f3.apply(this, arguments)}

function test1(e, fn) {
	let x = e
	console.time('run')
	while(x--) {
		fn(1,2,3,4)//,5,6,7,8,9)
	}
	console.timeEnd('run')
}

//async function test(l, e, fn) {
function test(l, e, fn) {
	while(l--) {
		test1(e, fn)
		//await new Promise(resolve => setTimeout(resolve, 100))
	}
	//new Promise(resolve => setTimeout(resolve, 100))
	console.log(c)
}

const arr:number[] = []
let c = 0

;(() => {
	let r = {method() {arr.push(c++)}}
	r = nest(100, r)
	function fn() {
		r.method()
	}

	test(20, 10000, fn)
})
//()

const map = new WeakMap()

let key = {}
map.set(key, 1)
key = {}

;(() => {
	//function x() {arr.push(c++)}
	function x(x) {
		c += x;
		//map.get(key)
		//map.set(key, 1)
		//new WeakMap()
	}
	//f1 = x
	//const fn = f4
	//const fn = x
	//const fn = nestfn(4, x)
	//const fn = nestfn1(4, x)
	//const fn = loopfn(4, x)
	let fn = function() {
		const newFn = function() {
			try {
				x(1)
			}catch(e) {
				x(1)
			}
			//x(-1)
			//x(1)
		}
		newFn()
	}
	test(2000, 100000, fn)
})
()

/*
function C(...any) {

}

function P(x:any) {

}

P(() => {
  var x = 1
  function fn() {
    x === C.prop
  }

  C(() => {
    x = 1
    C.prop = 1
    fn()
  })

  C(() => {
    x === 2
    C.prop = 2
    fn()
  })

  C(() => {
    x = 3
    C.prop = 3
    setTimeout(fn, 200)
    setTimeout(function() {
      fn()
    }, 200)
  })

  C(() => {
    x = 4
    C.prop = 4
    setTimeout(fn, 100)
  })

  var fn$ = Context.Bind(fn)



  C({prop:1}, (fn$) => {
    // fn$ explicitly lives with frame
    setTimeout(fn$, 200)
  }, fn)

  C({prop:1}, () => {
    // implicit fn$ of fn lives with fn
    // something to consider/avoid when closing over things outside of context
    setTimeout(fn, 200)
  })

  C({prop:1}, () => {
    // 2nd and more implicit fn$ of fn moves to frame life
    // likely case if closing over, is doing mutliple times,
    // so couple life of cont to life of frame
    setTimeout(fn, 200)
  })

  C({prop:1}, () => {
    function fn() {}
    // fn$ lives with call back
    setTimeout(fn, 200)

    function mk() {
      // this is why default is live with cb
      return function() {
        C.prop
      }
    }

    let idx = 10
    while(idx--)
      setTimeout(mk(), 100)
  })

})






function resolveContinuation(frame, cb, address, instance) {
  if(!cb) return cb
  if(cb[symIsContinuation]) return cb
  let cbFrame
  let continuation
  const symCbSid = cb[symSymbolicId] || (cb[symSymbolicId] = Symbol())
  const trap = frame[address]
  const isLinked = trap && trap.isLinked || false
  if(!islinked) {
    cbFrame = cb[symFrame]
    if(cbFrame === frame) return cb[symContinuation]
    if((continuation = frame[symCbSid])) return continuation
  }
  else if(!isPerCall && instance !== undefined) {
    const {instanceLink, continuations} = getCoupling(instance)
    if((continuation = continuations[symCbSid])) return continuation
    link = link || instanceLink
  }
  else
    link = link || {}

  continuationLink = link
  continuation = make()

  if(!isLinked) {
    if(cbFrame === top) return frame[symCbSid] = continuation
    if(cbFrame === undefined) {
      cb[symFrame] = frame
      return cb[symContinuation] = continuation
    }
    cbFrame[symCbSid] = cb[symContinuation]
    cb[symContinuation] = undefined
    cb[symFrame] = top
    return frame[symCbSid] = continuation
  }
  else if(!isPerCall && instance !== undefined) {
    const {continuations} = getCoupling(instance)
    continuations[continuation[symSymbolicId] = symCbId] = continuation
  }

  return contination
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

*/

