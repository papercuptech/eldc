import {
	assign,
	defineProperty,
	defineProperties,
	getOwnPropertyNames,
	getOwnPropertySymbols,

	isFn
} from 'host'


import {
	interceptDescriptorTable,
	runAsync as async,
	runSync as sync,
	makeMethodInterceptor as method,
	makePropertyInterceptor as property,
	makeClassInterceptor as clazz,
	intercept,
	inHostFrame,
} from 'context'



const ASYNC = function(desc) {desc.run = async}

function get0(a) {return a && a[0]}
function set0(a,v) {return a[0] = v}
const ZERO = function(desc) {desc.get = get0; desc.set = set0}

function get1(a) {return a && a[1]}
function set1(a,v) {return a[1] = v}
const ONE = function(desc) {desc.get = get1; desc.set = set1}

function get2(a) {return a && a[2]}
function set2(a,v) {return a[2] = v}
const TWO = function(desc) {desc.get = get2; desc.set = set2}

function getLast(a) {
	const l = a && a.length - 1 || -1
	return l >= 0 ? a[l] : undefined
}
function setLast(a,v) {a[a.length - 1] = v}
const LAST = function(desc) {desc.get = getLast; desc.set = setLast}

const PROPERTY = function(desc) {
	desc.get = get0
	desc.set = set0
	desc.make = property
}

const METHOD = function(desc) {}

const CLASS = function(desc) {
	desc.make = clazz
}


let trapInterceptor
function setInterceptor(desc) {return desc.intercept = trapInterceptor}
function INTERCEPT(interceptor) {trapInterceptor = interceptor; return setInterceptor}


interface InterceptDescriptor {
	run:any
	make:any
	resultIntercepts:string[]
}

const defaultDesc = {
	run: sync,
	make: method,
}

function ensureDesc(address, path):InterceptDescriptor {
	return interceptDescriptorTable[address] ||
		(interceptDescriptorTable[address] = assign({path}, defaultDesc))
}

function generateInterceptDescriptor(generator, address, path:string[] = []) {
	for(let [node, ...commands] of generator) {
		address = address && (address + '.' + node) || node
		if(node === '()') {
			const resultIntercepts = ensureDesc(address, path).resultIntercepts = [] as string[]
			for(let resultGenerator of commands) {
				const [resultInterceptNode] = resultGenerator
				const resultInterceptAddress = address + '.().' + resultInterceptNode
				resultIntercepts.push(resultInterceptAddress)
				generateInterceptDescriptor(resultGenerator, resultInterceptAddress, [resultInterceptNode])
			}
		}
		else {
			path.push(node)
			for(let cmdOrChild of commands) {
				if(isFn(cmdOrChild)) cmdOrChild(ensureDesc(address, path), address)
				else generateInterceptDescriptor(cmdOrChild, address, path)
			}
		}
	}
}


export {
	interceptDescriptorTable,
	generateInterceptDescriptor,
	ASYNC,
	ZERO,
	ONE,
	TWO,
	LAST,
	PROPERTY,
	METHOD,
	CLASS,
	INTERCEPT,

	intercept,
	inHostFrame
}




















