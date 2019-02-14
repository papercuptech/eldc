//import defineContext, {plg, stopPlg, _plog, cur} from './index'
//const x = cur()


const eldc = require('./index')

defineContext = eldc.default
const {log: plg, stopPlg, _plog, cur, default: context} = eldc
/*
const _plog = []
function plg(...args) {console.log(...args)}
function stopPlg() {}
function cur() {}
*/

//import 'source-map-support/register'

/*
box(
	// dependency injection
	MyNodeThing, SomeOtherImpl,

	// hot fix
	MyNodeThing, class extends MyNodeThing[Patch] {

	},

	// test mocks
	MyNodeThing, class {

	}
)(function runsInBox() {
	const x = new MyNodeThing()

})
*/

//_plog.length = 0

//debugger;



//const MyContext = Context()

const log = plg

//const C = defineContext({prop: "Zero"})
/*
const Cx = context((() => {
	class C extends Context{
		static GetTop() {return C.Top}
	}
	C.Top = undefined
	C.prop = 'ZeroOne'
	return C
})())
*/
//const Ctx = Context.Current

//const x = Cx.GetTop()
const C = context({prop: 'Zero', Top: undefined, GetTop() {return this.Top}})

//const Tt = C.GetTop()
//const tt = Tt
/*
const C = context({
	prop: 'Zero'
	},
	class extends Context {
	}
})

class C_ extends Context {}
C_.prop = 'Zero'

const C = context(C_)
*/

function assert(strCodeCheck, Context) {
	if(!Function('C', `return ${strCodeCheck}`)(Context))
		log('ASSERT FAILED: ' + strCodeCheck)
}

function nap(ms, id) {
	//plg(`${cur()} prm`)
	return new Promise(function startTimer(resolve) {
		//plg(`${cur()} ff`)
		setTimeout(function timer() {
			assert(`C.prop === '${id}' // timer ${C.prop} !== ${id}`, C)
			//plg(`                   timer ${id}`)
			//plg(`${cur()} rslv - bfr`)
			resolve()
			//plg(`${cur()} rslv - aft`)
		},ms)
	})
}


async function* tick(id, ms, count, bomb = -1) {
	//plg(`    tick`)

	while(count--) {
		assert(`C.prop === '${id}' // ${C.prop} bfr`, C)
		//plg(`    bfr ${id} === ${C.prop}`)


		let bid = cur()
		await nap(ms, id)
		assert(`C.prop === '${id}' // ${C.prop} aft`, C)
		//plg(`    aft ${bid} ${id} === ${C.prop} ${bid !== cur() ? '<---------------' : ''}`)
		if(count === bomb) throw new Error('BOOM')


		yield count
		assert(`C.prop === '${id}' // ${C.prop} yld`, C)
		//plg(`    yld ${bid} ${id} === ${C.prop} ${bid !== cur() ? '<---------------' : ''}`)
	}
}


;(() => {

	plg('               bfr ctx')
	//MyContext(async function ctx1() {
	C(async () => {
		C.prop = 'One'
		plg('             bfr nap')
		const p = nap(20)
		plg('             aft nap')

		/*
		p.then(function napThen() {
			plg('             nap resolved - bfr await')
		})
		*/

		plg('             bfr await')
		await p
		plg('             aft await One === ', C.prop)

		/*
		plg('             bfr await1')
		await p
		plg('             aft await1')

		plg('             bfr await2')
		await nap(30)
		plg('             aft await2')
		*/
	})//()
	plg('               aft ctx')
	/*
	;(async () => {
		await nap(10)
	})()
	*/
})
//()

;(() => {

	plg('               2bfr ctx')
	//MyContext(async function ctx1() {
	C(async () => {
		C.prop = 'Two'
		plg('             2bfr nap')
		const p = nap(10)
		plg('             2aft nap')

		/*
		p.then(function _2napThen() {
			plg('             2nap resolved - bfr await')
		})
		*/

		plg('             2bfr await')
		await p
		plg('             2aft await Two === ', C.prop)

		/*
		plg('             2bfr await1')
		await p
		plg('             2aft await1')

		plg('             2bfr await2')
		await nap(30)
		plg('             2aft await2')
		*/
	})//()
	plg('               2aft ctx')
	/*
	;(async () => {
		await nap(10)
	})()
	*/
})
//()



;(() => {
	const x = tick(10, 10, 0)
	const y = x
	
	C(() => {
		C.prop = 'One'
	
		const x = tick(10, 10, 0)
		const y = x.next()
	})
	
	
	exit()	
})
//()


;(() => {
	C(async function ctxOne () {
		C.prop = 'One'

		try {
			plg(`pre ${C.prop} === "One.1"`)
			await nap(10, 'One')

			plg(`${C.prop} === "One.2"`)

			C(async function ctxSub() {
				C.prop = 'Sub'

				await nap(5, 'Sub')
				plg(`${C.prop} === "Sub"`)

				/*
				await nap('Sub', 5)
				plg(`${MyContext.prop} === "Sub"`)

				await nap('Sub', 5)
				plg(`${MyContext.prop} === "Sub"`)

				await nap('Sub', 5)
				plg(`${MyContext.prop} === "Sub"`)
				*/
			})

			plg(`pre ${C.prop} === "One.3"`)
			await nap(10, 'One')

			plg(`pre ${C.prop} === "One.4"`)
		}
		catch(ex) {
			plg(`BOOM ${C.prop}`, ex)
			if(C.prop !== 'One')
				plg(`catch ${C.prop} !== "One"`)
		}
		finally{
			if(C.prop !== 'One')
				plg(`finally ${C.prop} !== "One"`)
		}
	})
})
()


let nextId = 0
;(() => {
	C(async function ctxOne () {
		C.prop = 'One'
		
		try {
			plg(`pre ${C.prop} === "One"`)
			for await (const countDown of tick('One', 10, 10, 5)) {
				assert(`C.prop === 'One' // ${C.prop} !== One.${countDown}`, C)

				C(async function ctxSub() {
					const id = `Sub-id-${nextId++}`
					C.prop = id

					for await (const xx of tick(id, 5, 4)) {

						assert(`C.prop === '${id}' // ${xx}`, C)

						C(async function ctxSubSub() {
							const sid = id + '---SubSUb'
							C.prop = sid

							const s = nap(20, sid)
							s.then(() => {
								assert(`C.prop === '${sid}' // ${xx}`, C)
								//plg(` = = = = =${MyContext.prop} === "${sid}": ${xx}`)
							})
							assert(`C.prop === '${sid}' // ${xx}`, C)
							//plg(`${MyContext.prop} === "${sid}": ${xx}`)
							await s
							assert(`C.prop === '${sid}' // ${xx}`, C)
							//plg(`${MyContext.prop} === "${sid}": ${xx}`)
							s.then(() => {
								assert(`C.prop === '${sid}' // ${xx}`, C)
								//plg(` = = = = =${C.prop} === "${sid}": ${xx}`)
							})
						})
					}
				})
			}
			assert(`C.prop === 'One'`, C)
			//plg(`pst ${MyContext.prop} === "One"`)
		}
		catch(ex) {
			plg(`BOOM ${C.prop}`, ex)
			if(C.prop !== 'One')
				assert(`C.prop === 'One'`, C)
				//plg(`catch ${MyContext.prop} !== "One"`)
		}
		finally{
			if(C.prop !== 'One')
				assert(`C.prop === 'One'`, C)
				//plg(`finally ${MyContext.prop} !== "One"`)
		}	
	})
})
()

;(() => {
	C(async function ctxTwo () {
		C.prop = 'Two'
		try {
			for await (const countDown of tick('Two', 20, 10, 6))
				//log(`${MyContext.prop} === "Two": ${countDown}`)
				assert(`C.prop === 'Two' //${countDown}`, C)
				//plg(`${MyContext.prop} === "Two": ${countDown}`)
		}
		catch(ex){
			plg(`BOOM ${C.prop}`, ex)
			if(C.prop !== 'Two')
				assert(`C.prop === 'Two'`, C)
				//plg(`catch ${MyContext.prop} !== "Two" // catch`)
		}
		finally{
			if(C.prop !== 'Two')
				assert(`C.prop === 'Two' //finally`, C)
				//plg(`finally ${MyContext.prop} !== "Two"`)
		}
	})
})
()



;(() => {
	//const log = plg

	C(async function ctxOne() {
		C.prop = 'One'

		//log(`0 bfr await ${MyContext.prop}`)
		//nap(10)
		//log(`0 aft await ${MyContext.prop}`)


		C(async function ctxTwo() {
			C.prop = 'Two'

			plg(`Two bfr await ${C.prop}`)
			log(`Two bfr await ${C.prop}`)
			plg(`Two aft log bfr await ${C.prop}`)

			await nap(10, 'Two')

			plg(`Two aft await ${C.prop}`)
			//log(`Two aft await ${MyContext.prop}`)
		})

		plg(`One bfr await ${C.prop}`)
		//log(`1 bfr await ${MyContext.prop}`)
		await nap(100, 'One')
		plg(`One aft await ${C.prop}`)
		//log(`1 aft await ${MyContext.prop}`)
	})
})
()

;(() => {
	//const log = plg

	C(function ctxTop() {
		C.prop = 'Top'

		log(`${C.prop} should be 'Top'`)

		C(async function ctxOne() {
			C.prop = 'One'
			await nap(100)
			log(`${C.prop} should be 'One'`)
		})

		log(`${C.prop} should be 'Top'`)

		C(async function ctxTwo() {
			C.prop = 'Two'
			await nap(100)
			log(`${C.prop} should be 'Two'`)
		})

		log(`${C.prop} should be 'Top'`)

		C(async function ctxThree() {
			C.prop = 'Three'
			await nap(100)
			log(`${C.prop} should be 'Three'`)
		})

		log(`${C.prop} should be 'Top'`)
	})
})
//()

;(() => {
	//const log = plg

	C(async function ctx1One() {
		C.prop = '1 - One'

		//log(`0 bfr await ${MyContext.prop}`)
		//nap(10)
		//log(`0 aft await ${MyContext.prop}`)


		C(async function ctx2Two() {
			C.prop = '2 - Two'

			log(`2 bfr await ${C.prop}`)

			await nap(10)

			log(`2 aft await ${C.prop}`)
		})

		log(`1 bfr await ${C.prop}`)
		await nap(100)
		log(`1 aft await ${C.prop}`)
	})

})
//()

;(() => {
	const log = plg


	C(async function ctxOne() {
		C.prop = 'One'
		await nap(100, 'One.100')
		log(`${C.prop} should be 'One'`)

		await nap(1, 'One.1')
		log(`${C.prop} should be 'One'`)
	})

	C(async function ctxTwo() {
		C.prop = 'Two'

		const s = nap(100, 'Two')
		/*s.finally(function userThen() {
			log('   USER THEN')
		})
		*/
		await s
		log(`${C.prop} should be 'Two'`)

		//await nap(1, 'Two.1')
		//log(`${MyContext.prop} should be 'Two'`)
		/*
		MyContext(async function ctxTwoOne() {
			MyContext.prop = 'TwoOne'

			await nap(100, 'TwoOne')
			log(`${MyContext.prop} should be 'TwoOne'`)

			//setTimeout(() => {
			//	log(`${MyContext.prop} should be 'TwoOne'`)
			//}, 30)

		})
		*/

		//await nap(10, 'Two.10')
		//log(`${MyContext.prop} should be 'Two'`)

		//await nap(92, 'Two')
		//log(`${MyContext.prop} should be 'Two'`)


		//setTimeout(() => {
		//	log(`${MyContext.prop} should be 'Two'`)
		//}, 10)

	})

	/*
	MyContext(function ctxThree() {
		MyContext.prop = 'Three'
		log(`${MyContext.prop} should be 'Three'`)
	})
	*/
})
//()

;(() => {
	const log = plg


	C(async function ctxOne() {
		C.prop = 'One'
		await nap(100, 'One.100')
		log(`                           ${C.prop} should be 'One'`)

		await nap(1, 'One.1')
		log(`                           ${C.prop} should be 'One'`)
	})

	C(async function ctxTwo() {
		C.prop = 'Two'

		;(async () => {
			await nap(100, 'Two.1')
			log(`                        ${C.prop}.1 should be 'Two.1'`)
		})()

		;(async () => {
			await nap(100, 'Two.2')
			log(`                        ${C.prop}.2 should be 'Two.2'`)
		})()

		const s = nap(100, 'Two')
		s.finally(function userThen() {
			log(`                        ${C.prop}.3 should be 'Two.3'`)
		})
		await s
		log(`                        ${C.prop}.4 should be 'Two.4'`)

		/*
		;(async () => {
			await nap(100, 'Two.3')
			log(`${MyContext.prop}.3 should be 'Two.3'`)
		})()
		*/

		//const s = nap(100, 'Two')
		//await s
		//log(`                              ${MyContext.prop} should be 'Two'`)

		//;(async () => {
		//	await nap(101, 'Two.4')
		//	log(`                              ${MyContext.prop}.4 should be 'Two.4'`)
		//})//()

		//await nap(1, 'Two.1')
		//log(`${MyContext.prop} should be 'Two'`)
		/*
		MyContext(async function ctxTwoOne() {
			MyContext.prop = 'TwoOne'

			await nap(100, 'TwoOne')
			log(`${MyContext.prop} should be 'TwoOne'`)

			//setTimeout(() => {
			//	log(`${MyContext.prop} should be 'TwoOne'`)
			//}, 30)

		})
		*/

		//await nap(10, 'Two.10')
		//log(`${MyContext.prop} should be 'Two'`)

		//await nap(92, 'Two')
		//log(`${MyContext.prop} should be 'Two'`)


		//setTimeout(() => {
		//	log(`${MyContext.prop} should be 'Two'`)
		//}, 10)

	})

	/*
	MyContext(function ctxThree() {
		MyContext.prop = 'Three'
		log(`${MyContext.prop} should be 'Three'`)
	})
	*/
})
//()


const NS_PER_SEC = 1e9;
const time = process.hrtime();


function exit() {
	stopPlg()
	const diff = process.hrtime(time);
	_plog.forEach(line => console.log(line))
	const diffNs = diff[0] * NS_PER_SEC + diff[1]
	const diffMs = diffNs / 1000000.0
	console.log(`Benchmark took ${diffMs}ms`)
	console.log(process.memoryUsage())
}

process.on('beforeExit', exit)

