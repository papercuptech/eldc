/*


const ah = require('async_hooks');

  console.log(`eid ${ah.executionAsyncId()} tid ${ah.triggerAsyncId()}`);

Promise.resolve(1729).then(() => {
  console.log(`eid ${ah.executionAsyncId()} tid ${ah.triggerAsyncId()}`);
});

*/


import 'source-map-support/register'

import defineContext, {_plog} from './index'

_plog.length = 0

const log = console.log

const MyContext = defineContext({prop: "Zero"})

function nap(ms) {
	return new Promise(resolve => {setTimeout(resolve,ms)})
}

async function* tick(tock, count, id, bomb = -1) {
	while(count--) {
		if(id !== MyContext.prop)
			log(`bfr ${MyContext.prop} !== ${id}`)
		await nap(tock)
		if(id !== MyContext.prop)
			log(`aft ${MyContext.prop} !== ${id}`)

		if(id !== MyContext.prop) {
			_plog.forEach(line => console.log(line))
			process.exit()
		}


		if(count === bomb) throw new Error('BOOM')
		yield count
		if(id !== MyContext.prop)
			log(`yld ${MyContext.prop} !== ${id}`)
	}
}


MyContext(async () => {
	MyContext.prop = 'One'
	
	try {
		for await (const countDown of tick(10, 20, 'One', 3))
			log(`${MyContext.prop} === "One": ${countDown}`)
	}
	catch(ex) {
		log(`BOOM ${MyContext.prop}`)
		if(MyContext.prop !== 'One')
			log(`catch ${MyContext.prop} !== "One"`)
	}
	finally{
		if(MyContext.prop !== 'One')
			log(`finally ${MyContext.prop} !== "One"`)
	}	
})


MyContext(async () => {
	MyContext.prop = 'Two'
	try {
		for await (const countDown of tick(20, 10, 'Two', 6))
			log(`${MyContext.prop} === "Two": ${countDown}`)
	}
	catch(ex){
		_plog.forEach(line => console.log(line))
		process.exit()
		if(MyContext.prop !== 'Two')
			log(`catch ${MyContext.prop} !== "Two"`)
	}
	finally{
		if(MyContext.prop !== 'Two')
			log(`finally ${MyContext.prop} !== "Two"`)
	}
})



//import defineContext from 'eldc'
//const log = console.log

// define a type of context that can be provided and consumed,
// specifying its contextual properties and their defaults.
//const MyContext = defineContext({givesMeaningTo: 'Zero'})


// the 'loop-global' space of a context
setTimeout(_ => log('Zero ', MyContext.prop === 'Zero'), 300)

// instantiate an instance of context, provide its value,
// consume in a later callback.
MyContext(() => {
  MyContext.prop = 'Hello'
	setTimeout(_ => log('Hello ', MyContext.prop === 'Hello'), 200)
})




// instantiate an instance of context and provide its value.
// reuse context across multiple lambdas
const runInCtx = MyContext({prop: 'World'})


runInCtx(_ => 
  setTimeout(_ => log('World ', MyContext.prop === 'World'), 100)
)

runInCtx(_ => 
  setTimeout(_ => log('World ', MyContext.prop === 'World'), 10)
)


//const runInCtxx = MyContext({prop: 'World'})
//runInCtxx(_ => setTimeout(_ => log('World ', MyContext.prop === 'World'), 100)

/*
//... asyncronously
;(async () => {
	const x = await runInCtx(async () => {
		await new Promise(_ => setTimeout(_, 10))
		return MyContext.prop
	})
	log('World' === x)
})()
*/
