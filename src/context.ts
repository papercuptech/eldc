import {
	global_,

	assign,
	create,
	defineProperty,
	freeze,
	getOwnPropertyDescriptor,
	getOwnPropertyNames,
	getPrototypeOf,

	isFn,
	isObj,
	isStr,

	symAssembler,
	symFrame,
	symTraps,
	symNext,
	symContext,
} from 'common'

import {
	current,
	Frame,
} from 'frame'

import {
	trap,
} from 'intercept'

const pdh = 'was here again'

interface IContext {
	<T>(objectOrClass:T):typeof objectOrClass
	Current:Frame
	Bind()
	Trap()
}
/*
interface IContext<T> {
	intitialize?:(parent:IContext<T>) => string
	softSwitch?:(from:T) => void
	hardSwitch?:(from:T) => void
}
*/




class ContextError extends Error {
	constructor(from, message) {
		super(message)
		Error.captureStackTrace && Error.captureStackTrace(this, from)
	}
}


function request(addrs:any[]) {}

export default Context as IContext

function Context<T>(objectOrClass:T): Function & typeof objectOrClass
function Context<T>(name:string, objectOrClass:T): Function & typeof objectOrClass
function Context(arg1:any, arg2?:any) {
	const contextName = isStr(arg1) && arg1 || arg1.name || (arg2 && arg2.name) || 'AnonymousContext'
	const objectOrClass = arg2 || arg1
	const isClass = isFn(objectOrClass)
	const UserContext = isClass ? objectOrClass as any : function() {return this}
	!isClass && (UserContext.prototype = objectOrClass)

	const symContext = Symbol(`eldc-ctx-${contextName}`)

	const defaults = create(null)
	const properties:string[] = []

	const initialize = UserContext.prototype && UserContext.prototype.initialize

	const idDesc = {value:undefined, enumerable:true}
	function newContext(within, parent, initial) {
		const context = new UserContext()
		idDesc.value = within.id; defineProperty(context, 'id', idDesc)
		let idx = properties.length
		while(idx) {
			const property = properties[--idx]
			context[property] = initial[property]
		}
		const from = current.frame
		current.frame = within
		if(parent) try {initialize && initialize.call(context, parent)}
		finally {current.frame = from}
		else if(UserContext.Initialize) UserContext.Initialize.call(context, request)
		return context
	}

	let wipFrame:Frame|undefined = undefined

	function AssemblerRunnerAccessor(...args) {
		const parent = current.frame

		let coassemblers:any[]|null = null

		for(let i = 0, len = args.length; i < len; ++i) {
			const arg = args[i]
			const coassembler = arg && arg[symAssembler]
			if(!coassembler) continue
			coassemblers = coassemblers || []
			coassemblers.push(coassembler)
		}

		let fn = args[args.length - 1]

		const defaultsThenTemplate = assign(create(null), defaults)
		let template = args[0]
		template = isObj(template) ? template : undefined
		let hadTemplate = false

		const assembler = runner[symAssembler] = runner
		function runner(fn?, args?) {
			if(wipFrame) {
				if(template) {
					assign(defaultsThenTemplate, defaults)
					assign(defaultsThenTemplate, template)
					hadTemplate = true
				}
				else if(hadTemplate) {
					assign(defaultsThenTemplate, defaults)
					hadTemplate = false
				}

				const withinContext = getPrototypeOf(wipFrame)[symContext]
				wipFrame[symContext] = newContext(wipFrame, withinContext, defaultsThenTemplate)
			}
			else {
				const newFrame = new Frame(parent)
				try {
					wipFrame = newFrame
					assembler()
					if(coassemblers) for(let idx = coassemblers.length; idx--;) coassemblers[idx]()
				}
				finally {wipFrame = undefined}
				return newFrame.run(fn, this, args)
			}
		}

		return fn ? runner(fn) : assembler
	}

	defineProperty(AssemblerRunnerAccessor, 'name', {configurable: false, value: contextName + '$AssemblerRunnerAccesor'})

	const hasSoftSwitch = UserContext.prototype.softSwitch !== undefined
	let previousContext:object|undefined
	for(const name of getOwnPropertyNames(objectOrClass)) {
		if(isClass && name === 'name' || name === 'length' || name === 'prototype') continue
		if(name === 'Current' || name === 'Trap' || name === 'Initialize') continue

		const propDef = {enumerable: true}
		const defaultValue = objectOrClass[name]

		if(isFn(defaultValue)) {
			const value =
				hasSoftSwitch
					? function methodInContext() {
						const currentContext = current.frame[symContext]
						if(currentContext !== previousContext) {
							currentContext.softSwitch(previousContext)
							previousContext = currentContext
						}
						if(current.frame.id === 0) throw new ContextError(methodInContext, `${contextName}.${name}() called out of context.`)
						return defaultValue.apply(currentContext, arguments)
					}
					: function methodInContext() {
						if(current.frame.id === 0) throw new ContextError(methodInContext, `${contextName}.${name}() called out of context.`)
						return defaultValue.apply(current.frame[symContext], arguments)
					}

			assign(propDef, {value})
		}
		else {
			properties.push(name)
			defaults[name] = defaultValue

			const {get, set} = getOwnPropertyDescriptor(objectOrClass, name)!
			assign(propDef, {
				get: get
					? function getInContext() {
						const {frame} = current
						if(frame.id === 0) throw new ContextError(getInContext, `${contextName}.${name} accessed out of context.`)
						return get.call(frame[symContext])
					}
					: function getInContext() {
						const {frame} = current
						if(frame.id === 0) throw new ContextError(getInContext, `${contextName}.${name} accessed out of context.`)
						return frame[symContext][name]
					},
				set: set
					? function setInContext(value) {
						const {frame} = current
						if(frame.id === 0) throw new ContextError(setInContext, `${contextName}.${name} set out of context.`)
						return set.call(frame[symContext], value)
					}
					: !get
						? function setInContext(value) {
							const {frame} = current
							if(frame.id === 0) throw new ContextError(setInContext, `${contextName}.${name} set out of context.`)
							return frame[symContext][name] = value
						}
						: undefined
			})
		}

		isClass && defineProperty(objectOrClass, name, propDef)
		defineProperty(AssemblerRunnerAccessor, name, propDef)
	}

	defineProperty(UserContext, 'Current', {get: function Current() {
		const {frame} = current
		if(frame.id === 0) throw new ContextError(Current, `Internal ${contextName}.Current accessed out of context.`)
		return frame[symContext]
	}})
	defineProperty(UserContext, 'Trap', {value: function Trap(address, traps) {
		const {frame} = current
		if(frame.id === 0) throw new ContextError(Trap, `Internal ${contextName}.Trap() called out of context.`)
		return trap(frame, frame[symContext], address, traps)
	}})

	const topContext = newContext(current.frame, null, defaults)
	current.frame[symContext] = topContext
	previousContext = topContext

	freeze(AssemblerRunnerAccessor)
	return AssemblerRunnerAccessor as unknown as typeof objectOrClass
}

defineProperty(Context, 'Current', {get() {return current.frame}})
defineProperty(Context, 'Bind', {value: function Bind(fn) {
	const {frame} = current
	if(frame.id === 0) throw new ContextError(Bind, `Context.Bind() called out of context.`)
	//return frame.frame(address, fn)
}})

export {
	Context
}















