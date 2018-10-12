## Event-Loop Durable Context
### Simple, seamless user defined context that NEVER gets lost across event loop callbacks.

This is an alpha version, although quite capable. It's meant to demonstrate feasability and provide insight of performance impact if its approach.

Its first goal is to support the npm package `new-newjs`.

It can also be used as a robust 'continuation-local-storage' replacement.

It is being developed on node 10.11, but would likely work on previous versions, depending on the builtins called (for the moment). It  would be targeted to work on node 6+ at release.

Examples use 'modern' javascript

**This example demonstrates basic use and function.**
```js
import defineContext from 'eldc'
const log = console.log

// define a type of context that can be provided and consumed,
// specifying its contextual properties and their defaults.
// the type can simply be separately imported by providers
// and consumers as needed; literally 'no strings attached'
const MyContext = defineContext({givesMeaningTo: 'Zero'})

// the context at 'loop-global' level
setTimeout(_ => log(MyContext.givesMeaningTo === 'Zero'), 300)

// instantiate an instance of context, provide its value,
// consume in a later callback.
MyContext(() => {
  MyContext.givesMeaningTo = 'One'
  setTimeout(_ => log(MyContext.givesMeaningTo === 'One'), 200)
})

// instantiate an instance of context and provide its value.
// reuse context across multiple executions
const runInCtx = MyContext({givesMeaningTo: 'Two'})

runInCtx(_ => 
  setTimeout(_ => log(MyContext.givesMeaningTo === 'Two'), 100)
)

//... asyncronously
log('Two' === await runInCtx(async() => {
  await new Promise(_ => setTimeout(_, 10))
  return MyContext.givesMeaningTo
}))

```

**my-context.js**
```js
import defineContext from 'eldc'

const MyContext = defineContext({contextualProperty: 'hello'})
export default MyContext
```
**provider.js**
```js
import MyContext from './my-context'
import Consumer from './consumer'

MyContext(() => {
  true === (MyContext.contextualProperty === 'hello')
  con = new Consumer()
	

  MyContext.contextualProperty = 'world'
  true === (MyContext.contextualProperty === 'world')

  MyContext(() => {
    const con = new Consumer()
    true === (con.fromContext === 'hello')
  })
  true === (MyContext.contextualProperty === 'world')
  true === (con.fromContext === 'world')
})
```
