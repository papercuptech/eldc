//(require('tsconfig-paths')).register({baseUrl: './obj', paths:{}})
//import 'source-map-support/register'

import {
	global_,
	freeze,
	isFn,
	symEntry,
	symFrame,
} from 'common'

import {
	GENERATORS_ROOT,
	CLASS_AsyncGenerator,
	CLASS_Generator,
	METHOD_GeneratorMethod,
	newGenerator,
	newAsyncGenerator,
	METHOD_Function,
	METHOD_module_compile,
} from 'generators'

import {
	current,
	CLASS_UserlandPromise,
	METHOD_PromiseThen,
	FRAMER_PromiseThen,
	FRAMER_PromiseCatch,
	FRAMER_PromiseFinally,
} from 'frame'

import {
	install,
} from 'install'

import {
	intercept,
	frameCallback,
} from 'intercept'

import {
	Context as ContextImpl
} from 'context'


const {CLASS, METHOD, FRAMER} = install


intercept(install([
	['module', ['prototype', ['_compile', METHOD(METHOD_module_compile)]]],
	['global',

		['Promise', CLASS(CLASS_UserlandPromise),
			['prototype', ['_',
				['then', METHOD(METHOD_PromiseThen),
					['$', FRAMER(FRAMER_PromiseThen),
						['onfulfilled'],
						['onrejected'],
					]
				],
				['catch', ['$', FRAMER(FRAMER_PromiseCatch)]],
				['finally', ['$', FRAMER(FRAMER_PromiseFinally)]],
			]]
		],

		['Function', METHOD(METHOD_Function)],

		['AsyncGenerator', GENERATORS_ROOT(), CLASS(CLASS_AsyncGenerator),
			['_',
				['__proto__',
					['next', METHOD(METHOD_GeneratorMethod)],
					['return', METHOD(METHOD_GeneratorMethod)],
					['throw', METHOD(METHOD_GeneratorMethod)],
				],
			]
		],
		['Generator', GENERATORS_ROOT(), CLASS(CLASS_Generator),
			['_',
				['__proto__',
					['next', METHOD(METHOD_GeneratorMethod)],
					['return', METHOD(METHOD_GeneratorMethod)],
					['throw', METHOD(METHOD_GeneratorMethod)],
				],
			]
		],
	],
]))





const ExportContext:any = ContextImpl

ExportContext.install = install
ExportContext.intercept = intercept

global_.Context = ExportContext

export {
	ExportContext as default
}



