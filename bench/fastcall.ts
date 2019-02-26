const l = a && a.length || 0
queueAsyncSwitch(this)
if(current.frame === this)
	return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
		l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
const backTo = current.frame
current.frame = this
if(hardSwitches) hardSwitch(backTo)
try {
	return l<1?f.call(t):l<2?f.call(t,a[0]):l<3?f.call(t,a[0],a[1]):l<4?f.call(t,a[0],a[1],a[2]):
		l<5?f.call(t,a[0],a[1],a[2],a[3]):l<6?f.call(t,a[0],a[1],a[2],a[3],a[4]):l<7?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?f.call(t,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):f.apply(t,a)
}
finally {
	current.frame = backTo
	if(hardSwitches) hardSwitch(this)
	queueAsyncSwitch(backTo)
}


if(frame.id === 0) {
	l<1?super():l<2?super(a[0]):l<3?super(a[0],a[1]):l<4?super(a[0],a[1],a[2]):
		l<5?super(a[0],a[1],a[2],a[3]):l<6?super(a[0],a[1],a[2],a[3],a[4]):l<7?super(a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):super(...arguments)
	return
}
linkInstance = tempLinkInstance
link = undefined
frameArgs && frameArgs(arguments)
const trap = frame[sid]
if(!trap) {
	l<1?super():l<2?super(a[0]):l<3?super(a[0],a[1]):l<4?super(a[0],a[1],a[2]):
		l<5?super(a[0],a[1],a[2],a[3]):l<6?super(a[0],a[1],a[2],a[3],a[4]):l<7?super(a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):super(...arguments)
	resultIntercepts && this && interceptResult(resultIntercepts, this)
	return this
}
if(link && !isPerCall) moveCoupling(this, tempLinkInstance)
try {
	trap.construct && (nextConstruct = trap.construct) && callNextConstruct(arguments)
	l<1?super():l<2?super(a[0]):l<3?super(a[0],a[1]):l<4?super(a[0],a[1],a[2]):
		l<5?super(a[0],a[1],a[2],a[3]):l<6?super(a[0],a[1],a[2],a[3],a[4]):l<7?super(a[0],a[1],a[2],a[3],a[4],a[5]):
			l<8?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6]):l<9?super(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):super(...arguments)
