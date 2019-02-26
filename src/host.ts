const hasSymbol = typeof Symbol === 'function'


function sym(desc, prefix = '_$_eldc_$_') {
	if(hasSymbol) return Symbol(desc) as unknown as string
	return (prefix + desc)
}

let canExportSyms = true
export function off() {canExportSyms = false}

export default function getSymbols(prefix = '_$_eldc_$_') {
	if(!canExportSyms) return undefined

	return {
		symCbProps: sym('eldc-cbprops', prefix),
		symContextSymbol: sym('eldc-context-symbol', prefix),
		symDisguised: sym('eldc-disguised', prefix),
		symFactory: sym('eldc-initialize', prefix),
		symFrame: sym('eldc-frame', prefix),
		symIntercept: sym('eldc-intercept', prefix),
		symIntercepted: sym('eldc-intercepted', prefix),
		symIsResolver: sym('eldc-promise-job', prefix),
		symResultIntercept: sym('eldc-result-intercept', prefix),
		symTraps: sym('eldc-traps', prefix),
	}
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




let disDesc = {configurable: true, value: undefined}
let disguiseId = 0
function disguise(original, mask) {
	disDesc.value = original.name; defineProperty(mask, 'name', disDesc)
	disDesc.value = original.length; defineProperty(mask, 'length', disDesc)
	setPrototypeOf(mask, original)
	return mask
}

const symCbProps = sym('')
const symContextSymbol = sym('eldc-context-symbol')
const symDisguised = sym('eldc-disguised')
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

	disguise,

	sym,

	symAssembler,
	symCbProps,
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
}



function distinguish() {
	return {

	}
}

