//import 'promise-polyfill/src/polyfill'


import defineContext, {plg, stopPlg, _plog, cur} from './index'
//const x = cur()


//const eldc = require('./index')

//defineContext = eldc.default
//const {plg, stopPlg, _plog, cur} = eldc



//import 'source-map-support/register'


//_plog.length = 0

//debugger;

const log = console.log

const MyContext = defineContext({prop: "Zero"})

function nap(ms) {
	plg(`${cur()} prm`)
	return new Promise(function startTimer(resolve) {
		plg(`${cur()} ff`)
		setTimeout(function timer() {
			plg(`${cur()} rslv - bfr`)
			resolve()
			plg(`${cur()} rslv - aft`)
		},ms)
	})
}

function exit() {
	stopPlg()
	_plog.forEach(line => log(line))
	process.exit()
}

async function* tick(id, ms, count, bomb = -1) {
	debugger
	plg(`${cur()} tck`)

	while(count--) {
		plg(`${cur()} bfr ${id} === ${MyContext.prop}`)


		let bid = cur()
		await nap(ms)
		plg(`${cur()} aft ${bid} ${id} === ${MyContext.prop} ${bid !== cur() ? '<---------------' : ''}`)
		if(count === bomb) throw new Error('BOOM')


		yield count
		plg(`${cur()} yld ${bid} ${id} === ${MyContext.prop} ${bid !== cur() ? '<---------------' : ''}`)
	}
}


plg('               enter')
;(() => {

	plg('               bfr ctx')
	MyContext(async function ctx1() {
		MyContext.prop = 'One'
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
		plg('             aft await One === ', MyContext.prop)

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

plg('               2enter')
;(() => {

	plg('               2bfr ctx')
	MyContext(async function ctx1() {
		MyContext.prop = 'Two'
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
		plg('             2aft await Two === ', MyContext.prop)

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



//plg('               exit')
//exit()

/*
	plg('             bfr nap')
	const p = nap(20)
	plg('             aft nap')
	plg('             bfr await')
	p.then((v) => {
		plg('             aft await')
	})
*/

;(() => {
	const x = tick(10, 10, 0)
	const y = x
	
	MyContext(() => {
		MyContext.prop = 'One'
	
		const x = tick(10, 10, 0)
		const y = x.next()
	})
	
	
	exit()	
})
//()

;(() => {
	MyContext(async function ctxOne () {
		MyContext.prop = 'One'
		
		try {
			plg(`pre ${MyContext.prop} === "One"`)
			for await (const countDown of tick('One', 10, 10, 5)) {
				//log(`${MyContext.prop} === "Onex": ${countDown}`)
				plg(`${MyContext.prop} === "One": ${countDown}`)
			}
			plg(`pst ${MyContext.prop} === "One"`)
		}
		catch(ex) {
			plg(`BOOM ${MyContext.prop}`, ex)
			if(MyContext.prop !== 'One')
				plg(`catch ${MyContext.prop} !== "One"`)
		}
		finally{
			if(MyContext.prop !== 'One')
				plg(`finally ${MyContext.prop} !== "One"`)
		}	
	})
})
()

;(() => {
	MyContext(async function ctxTwo () {
		MyContext.prop = 'Two'
		try {
			for await (const countDown of tick('Two', 20, 10, 6))
				//log(`${MyContext.prop} === "Two": ${countDown}`)
				plg(`${MyContext.prop} === "Two": ${countDown}`)
		}
		catch(ex){
			plg(`BOOM ${MyContext.prop}`, ex)
			if(MyContext.prop !== 'Two')
				plg(`catch ${MyContext.prop} !== "Two"`)
		}
		finally{
			if(MyContext.prop !== 'Two')
				plg(`finally ${MyContext.prop} !== "Two"`)
		}
	})
})
()


plg('              bfr ex')
setTimeout(exit, 2000)
plg('              aft ex')
