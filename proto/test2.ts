


/*
const install = Context.install
const {ARG_N, ARG_LAST, CLASS, FRAME,} = install
install([
	['global',
		['setTimeout',
			['$', ARG_N(0)]
		]
	],
	['child_process',
		['exec',
			['$', ARG_LAST],
			['_',
				['send', ['$', ARG_LAST]]
			]
		]
	],
	['global',
		['FileReader',
			['_',
				['$',
					['onload'],
					['onerror'],
					FRAME((moniker) => {
						const onLoadSid = moniker.onload()
						const onErrorSid = moniker.onerror()
						return function(result) {

							return install.frameObject()
						}
					})
				]
			],
		]
	],
	['global',
		['Something',
			['prototype',
				['_', // find owner of child
					['upChain']
				]
			]
		]
	]
])

*/
/*
function Trap(...args:any[]) {

}


Initialize() {

}

Trap(Context.monikers.global.FileReader._.$.onload(), function(next, args) {//}, this_, link) {
	return next(args)
})

const monikers = Context.monikers


Context.intercept(monikers.global.setTimeout)


const MyCtx = Context({contexualProp: 'default'})



MyCtx(() => {
	MyCtx.contextualProp = 'Parent'
	console.log(MyCtx.id, 'before', MyCtx.contextualProp)

	MyCtx(() => {
		MyCtx.contextualProp = 'Child 1'
		setTimeout(() => console.log(MyCtx.id, MyCtx.contextualProp), 100)
	})

	MyCtx({contextualProp: 'Child 2'},
		async () =>	await new Promise(resolve =>
			setTimeout(() => {
				console.log(MyCtx.id, MyCtx.contextualProp)
				resolve()
			}, 200)
		)
	)


	const myCtxFactory = MyCtx({contexualProp: 'Factory Default'})
	myCtxFactory(() => {
		MyCtx.contextualProp == 'Step Child'
		setTimeout(() => console.log(MyCtx.id, MyCtx.contextualProp), 300)
	})

	myCtxFactory(() => {
		setTimeout(() => console.log(MyCtx.id, MyCtx.contextualProp), 400)
	})

	console.log(MyCtx.id, 'after', MyCtx.contextualProp)
})

const throws = MyCtx.contextualProp

@newjs
export class Service {
	perform(using) {console.log(`Default attempting ${using}...?`)}
}

class Provider {
	perform(using) {console.log(`Look at me! I'm performing ${using}!!!`)}
}

box(Service, Provider)(() => {
	const x = new Service()
	if(!(x instanceof Service)) throw new Error('will never throw')
	x.perform('a miracle')
})

const x = new Service()
if(!(x instanceof Service)) throw new Error('will never throw')
x.perform('a miracle')


box(
	Service, class {
		perform(using) {return `${using}?? Can't. I'm a mockery of the universe`}
	}
)(() => {
	const x = new Service()
	if(!(x instanceof Service)) throw new Error('will never throw')
	x.perform('a miracle')
})


box(Service, class Patch extends Service[newjs.Outer] {
	perform(using) {return `${using}?? Can't. I'm a mockery of the universe`}
})(() => {
	const x = new Service()
	if(!(x instanceof Service)) throw new Error('will never throw')
	x.perform('a miracle')
})

*/
/*
I wondered if javascript's `new` could be "highjacked" and then transformed into the ultimate object factory. This would mean dependency injection, mocking, and 'hot-patching' coudl all
 */