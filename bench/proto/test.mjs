"use strict";
const log = console.log;
log('module');

import {impd} from './imp.mjs'

impd()

{var x = 1; var y = 2; log(x, y)}
log(x, y)
/*
const mod = require('module')

const jsExt = mod._extensions['.js']
mod._extensions['.js'] = function(module_, filename) {
    return jsExt.call(this, module_, filename)
}

const hasGenFnRe = /function\* /g

const has = hasGenFnRe.test('const x = 1\nfunction* fn() {yield 3}\n')

function wrapGenFn(source) {
    
}

*/ 
//# sourceMappingURL=test.js.map