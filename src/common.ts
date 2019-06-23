const hasSymbol = typeof Symbol === 'function'


function sym(desc, prefix = '_$_eldc_$_') {
	if(hasSymbol) return Symbol(desc) as unknown as string
	return (prefix + desc)
}

let global_:any = {}
try {global_ = global}
catch {
	try {global_ = self}
	catch {}
}

const {
	assign,
	create,
	defineProperty,
	defineProperties,
	freeze,
	getOwnPropertyDescriptor,
	getOwnPropertyNames,
	getOwnPropertySymbols = () => [],
	getPrototypeOf,
	keys,
	setPrototypeOf,
} = Object




function isFn(thing) {return typeof thing === 'function'}
function isObj(thing) {return thing !== null && typeof thing === 'object'}
function isStr(thing) {return typeof thing === 'string'}
function isArr(thing) {return Array.isArray(thing)}



const symContextSymbol = sym('eldc-context-symbol')
const symIsResolver = sym('eldc-promise-job')
const symAssembler = sym('eldc-initialize')
const symFrame = sym('eldc-frame')
const symTraps = sym('eldc-traps')

const symIntercepted = sym('eldc-intercepted')
const symIntercept = sym('eldc-intercept')
const symResultIntercept = sym('eldc-result-intercept')

const symNext = sym('eldc-next')

const symContext = sym('eldc-context')
const symSymbolicId = sym('eldc-symbolic-id')

const symLink = sym('eldc-link')

const symCb = sym('eldc-cb')
const symContinuation = sym('eldc-continuation')
const symCoupling = sym('eldc-coupling')

const symEntry = sym('eldc-intercept-descriptor')

const symFrameRun = sym('eldc-frame-run')

export {
	global_,

	assign,
	create,
	defineProperty,
	defineProperties,
	freeze,
	getOwnPropertyDescriptor,
	getOwnPropertyNames,
	getOwnPropertySymbols,
	getPrototypeOf,
	keys,
	setPrototypeOf,

	isArr,
	isFn,
	isObj,
	isStr,

	sym,

	symAssembler,
	symFrame,
	symTraps,

	symIntercepted,
	symIntercept,
	symResultIntercept,

	symNext,
	symContext,
	symSymbolicId,

	symLink,

	symCb,
	symContinuation,
	symCoupling,

	symEntry,
	symFrameRun,
}
