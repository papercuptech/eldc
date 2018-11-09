import defineContext, {plg, stopPlg, _plog, cur} from './index'
//const x = cur()





//import 'source-map-support/register'


//_plog.length = 0

debugger;

const log = console.log

const MyContext = defineContext({prop: "Zero"})

function nap(ms) {
	plg(`${cur()} prm`)
	return new Promise(function ff(resolve) {
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

async function* tick(tock, count, id, bomb = -1) {
	debugger
	plg(`${cur()} tck`)

	while(count--) {
		plg(`${cur()} bfr`)

		let bid = cur()
		await nap(tock)
		plg(`${cur()} aft ${bid} ${bid !== cur() ? '<---------------' : ''}`)

		//if(count === bomb) throw new Error('BOOM')

		yield count
		plg(`${cur()} yld ${bid} ${bid !== cur() ? '<---------------' : ''}`)
	}
}

async function* tick2(tock, count, id, bomb = -1) {
	plg(`${cur()} tck`)

	while(count--) {
		plg(`${cur()} bfr`)

		let bid = cur()
		await nap(tock)
		plg(`${cur()} aft ${bid} ${bid !== cur() ? '<---------------' : ''}`)

		if(count === bomb) throw new Error('BOOM')

		yield count
		plg(`${cur()} yld ${bid} ${bid !== cur() ? '<---------------' : ''}`)
	}
}

/*
const x = tick(10, 10, 0)
const y = x

MyContext(() => {
	MyContext.prop = 'One'

	const x = tick(10, 10, 0)
	//const y = x.next()
})


exit()
*/


MyContext(async function ctxOne () {
	MyContext.prop = 'One'
	
	try {
		plg(`pre ${MyContext.prop} === "One"`)
		for await (const countDown of tick(10, 20, 'One', 17)) {
			//log(`${MyContext.prop} === "Onex": ${countDown}`)
			plg(`${MyContext.prop} === "One": ${countDown}`)
		}
		plg(`pst ${MyContext.prop} === "One"`)
	}
	catch(ex) {
		log(`BOOM ${MyContext.prop}`, ex)
		exit()
		if(MyContext.prop !== 'One')
			log(`catch ${MyContext.prop} !== "One"`)
	}
	finally{
		exit()
		if(MyContext.prop !== 'One')
			log(`finally ${MyContext.prop} !== "One"`)
	}	
})

MyContext(async function ctxTwo () {
	MyContext.prop = 'Two'
	try {
		for await (const countDown of tick(20, 10, 'Two', 6))
			//log(`${MyContext.prop} === "Two": ${countDown}`)
			plg(`${MyContext.prop} === "Two": ${countDown}`)
	}
	catch(ex){
		if(MyContext.prop !== 'Two')
			log(`catch ${MyContext.prop} !== "Two"`)
	}
	finally{
		if(MyContext.prop !== 'Two')
			log(`finally ${MyContext.prop} !== "Two"`)
	}
})


/*


//import defineContext from 'eldc'
//const log = console.log



// the 'loop-global' space of a context
setTimeout(_ => log('Zero ', MyContext.prop === 'Zero'), 300)

// instantiate an instance of context, provide its value,
// consume in a later callback.
MyContext(() => {
  MyContext.prop = 'Hello'
	setTimeout(_ => log('Hello ', MyContext.prop === 'Hello'), 200)
})
*/



// reuse context across multiple lambdas
/*
const runInCtx = MyContext({prop: 'World'})

runInCtx(function a() { 
  setTimeout(function ap() {log('World ', MyContext.prop === 'World')}, 10)
})
*/
/*
runInCtx(function b() { 
  setTimeout(function bp() {log('World ', MyContext.prop === 'World')}, 10)
})
*/

/*
runInCtx(_ => 
  setTimeout(_ => log('World ', MyContext.prop === 'World'), 10)
)

runInCtx(_ => 
  setTimeout(_ => log('World ', MyContext.prop === 'World'), 10)
)
*/












/*



async function* tick(tock, count, id, bomb = -1) {
	while(count--) {
		plg(`bfr ${cur()}`)
		if(id !== MyContext.prop) exit()
		await nap(tock)
		plg(`aft ${cur()}`)
		if(id !== MyContext.prop) exit()
		if(count === bomb) throw new Error('BOOM')
		yield count
		plg(`yld ${cur()}`)
		if(id !== MyContext.prop) exit()
	}
}


MyContext(async () => {
	MyContext.prop = 'One'
	
	try {
		for await (const countDown of tick(10, 20, 'One', 3))
			plg(`lop ${cur()} ${MyContext.prop} === "One": ${countDown}`)
	}
	catch(ex) {
		plg(`cth ${cur()} BOOM ${MyContext.prop}`)
	}
	finally{
		//if(MyContext.prop !== 'One')
			//log(`finally ${MyContext.prop} !== "One"`)
	}	
})


MyContext(async () => {
	MyContext.prop = 'Two'
	try {
		for await (const countDown of tick(20, 10, 'Two', 6))
		plg(`lop ${cur()} ${MyContext.prop} === "Two": ${countDown}`)
	}
	catch(ex){
		plg(`cth ${cur()} BOOM ${MyContext.prop}`)
	}
	finally{
		//if(MyContext.prop !== 'Two')
			//log(`finally ${MyContext.prop} !== "Two"`)
	}
})


setTimeout(_ => log('Zero ', MyContext.prop === 'Zero'), 300)
MyContext(() => {
  MyContext.prop = 'Hello'
	setTimeout(_ => log('Hello ', MyContext.prop === 'Hello'), 200)
})

/*

const runInCtx = MyContext({prop: 'World'})


runInCtx(_ => 
  setTimeout(_ => log('World ', MyContext.prop === 'World'), 100)
)

runInCtx(_ => 
  setTimeout(_ => log('World ', MyContext.prop === 'World'), 10)
)

*/
