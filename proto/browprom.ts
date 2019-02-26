var queuePromiseJob:(fn:Function) => void
	= Promise.prototype.then.bind(Promise.resolve()) as any

queuePromiseJob(function() {console.log('promisejob')})