function Impl() {
	this.test = ['12']
}

function Class() {
	return new Impl()
}


const runs = 100
const load = 10000

function test(fn, runs, load) {
	let runCount = runs
	//console.time('run')
	while(runCount--) {
		setTimeout(() => {
			console.time('load')
			let loadCount = load
			while(loadCount--)
				fn()
			console.timeEnd('load')
			console.log(process.memoryUsage())
		}, 5)
	}
	//console.timeEnd('run')
	//console.log(process.memoryUsage())
}

function oldNew() {
	const x = new Impl()
	if(x.test.length !== 1) throw 'barf'
	//x.test = 1
}


function newNew() {
	const x = new Class()
	if(x.test.length !== 1) throw 'barf'
	//x.test = 1
}



class cImpl {
	constructor() {
		this.test = ['12']
	}
}

class cClass {
	constructor() {
		return new cImpl()
	}
}


function coldNew() {
	const x = new Impl()
	if(x.test.length !== 1) throw 'barf'
	//x.test = 1
}


function cnewNew() {
	const x = new Class()
	if(x.test.length !== 1) throw 'barf'
	//x.test = 1
}


//test(oldNew, 10, 100000)
test(newNew, 10, 100000)

//test(coldNew, 10, 100000)
//test(cnewNew, 10, 100000)
