
let eldc = '_$eldc$_'

function cc(char) {return char.charCodeAt(0)}

const CC_SQUOTE = cc("'")|0
const CC_DQUOTE = cc('"')|0
const CC_TICK = cc('`')|0
const CC_SLASH = cc('/')|0
const CC_ASTERISK = cc('*')|0
const CC_BACKSLASH = cc('\\')|0
const CC_NEWLINE = cc('\n')|0
const CC_LCURLY = cc('{')|0
const CC_RCURLY = cc('}')|0
const CC_LPAREN = cc('(')|0
const CC_ASYNC = 'async'.split('').map(ch => cc(ch)|0)
const CC_GEN_FN = 'function*'.split('').map(ch => cc(ch)|0)
const CC_WHT_SPC:boolean[] = []
// soo.. lets hope vms handle sparse arrays quickly yet mem efficiently
// all whitespace chars, from regex '\s'
' \t\n\r\f\v\u00a0\u1680\u2000\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'
	.split('')
	.forEach(ch => CC_WHT_SPC[cc(ch)|0] = true)

const CC_WHT_SPC_SCAN =
	' \t\n\r\f\v\u00a0\u1680\u2000\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'
		.split('')
		.map(cc)


const ST_CODE = 0|0
const ST_SQUOTE = 1|0
const ST_DQUOTE = 2|0
const ST_TICK = 3|0
const ST_SLASH = 4|0
const ST_REGEX = 5|0
const ST_ESCAPE = 6|0
const ST_LINE_COMMENT = 7|0
const ST_BLOCK_COMMENT = 8|0
const ST_BLOCK_COMMENT_ASTERISK = 9|0
const ST_SIGNATURE = 10|0
const ST_NAME = 11|0

export default function wrapGeneratorFns(source:string) {
	const len = source.length|0
	let partStart = 0|0

	let prevState = ST_CODE|0
	let state = ST_CODE|0
	let codeState = ST_CODE|0

	let genFnCcIdx = 0|0
	let genFnCc = CC_GEN_FN[0]|0
	let asyncCcIdx = 0|0
	let asyncCc = CC_ASYNC[0]|0
	let funcStart = -1|0

	let genFn = {func: '', name: '', sig: '', parts: <string[]>[], block: 0|0}
	let genFnStack:any[] = []
	let nameStart = -1|0

	for(let pos = 0|0; pos < len; ++pos) {
		const ch = source.charCodeAt(pos)|0

		switch(state) {
		case ST_CODE:

			switch(ch) {
			case CC_SQUOTE: state = ST_SQUOTE; break
			case CC_DQUOTE: state = ST_DQUOTE; break
			case CC_TICK: state = ST_TICK; break
			case CC_SLASH: state = ST_SLASH; break

			default:
				switch(codeState) {

				case ST_CODE:
					switch(ch) {

					case CC_LCURLY:
						++genFn.block
						break

					case CC_RCURLY:
						if(--genFn.block !== 0 || genFnStack.length === 0) break

						const {func, name, sig, parts} = genFn
						parts.push(source.substr(partStart, pos - partStart + 1))
						partStart = pos + 1

						const body = parts.join('')
						const isAnon = name.length === 0
						const original = `${func}${sig}${body}`
						const decl = isAnon ? `(${original})` : `(${name}['${eldc}']||(${name}['${eldc}']=${original}))`
						const wrapped = `function ${sig}{const g=${decl}.call(this,...arguments);g['${eldc}']=${eldc};return g}`

						genFn = genFnStack.pop()
						genFn.parts.push(wrapped)

						break

					case asyncCc:
						if(asyncCcIdx === 0) funcStart = pos
						asyncCc = CC_ASYNC[++asyncCcIdx]
						break

					case genFnCc:
						if(genFnCcIdx === 0 && funcStart === -1) funcStart = pos

						if(ch !== CC_ASTERISK) genFnCc = CC_GEN_FN[++genFnCcIdx]

						else {
							asyncCc = CC_ASYNC[asyncCcIdx = 0]
							genFnCc = CC_GEN_FN[genFnCcIdx = 0]

							genFn.parts.push(source.substr(partStart, funcStart - partStart))
							partStart = pos + 1
							genFnStack.push(genFn)

							genFn = {func: source.substr(funcStart, pos - funcStart + 1), name: '', sig: '', parts: [], block: 1}

							funcStart = -1
							nameStart = -1
							codeState = ST_SIGNATURE
						}

						break

					default:
						if(genFnCcIdx !== 0) {
							genFnCc = CC_GEN_FN[genFnCcIdx = 0]
							funcStart = -1
						}
						else if(asyncCcIdx !== 0 && CC_WHT_SPC_SCAN.indexOf(ch) === -1) {
						//else if(asyncCcIdx !== 0 && !CC_WHT_SPC[ch]) {
							asyncCc = CC_ASYNC[asyncCcIdx = 0]
							funcStart = -1
						}
						break
					}

					break

				case ST_SIGNATURE:
					if(ch === CC_LCURLY) {
						genFn.sig = source.substr(partStart, pos - partStart)
						partStart = pos
						codeState = ST_CODE
					}
					else if(nameStart === -1 && CC_WHT_SPC_SCAN.indexOf(ch) === -1) {
					//else if(nameStart === -1 && !CC_WHT_SPC[ch]) {
						nameStart = pos
						if(ch !== CC_LPAREN) codeState = ST_NAME
					}
					break

				case ST_NAME:
					if(ch !== CC_LPAREN && CC_WHT_SPC_SCAN.indexOf(ch) === -1) break
					//if(ch !== CC_LPAREN && !CC_WHT_SPC[ch]) break

					genFn.name = source.substr(nameStart, pos - nameStart)
					codeState = ST_SIGNATURE
					break
				}

				break
			}

			break

		case ST_SLASH:
			switch(ch) {
			case CC_SLASH: state = ST_LINE_COMMENT; break
			case CC_ASTERISK: state = ST_BLOCK_COMMENT; break
			default: state = ST_REGEX; break
			}

			break

		case ST_ESCAPE:
			state = prevState
			break

		case ST_SQUOTE:
		case ST_DQUOTE:
		case ST_TICK:
		case ST_REGEX:
			if(ch === CC_BACKSLASH) {
				prevState = state
				state = ST_ESCAPE
				break
			}

			switch(state) {
			case ST_SQUOTE:
				if(ch === CC_SQUOTE || ch === CC_NEWLINE) state = ST_CODE
				break
			case ST_DQUOTE:
				if(ch === CC_DQUOTE || ch === CC_NEWLINE) state = ST_CODE
				break
			case ST_TICK:
				if(ch === CC_TICK) state = ST_CODE
				break
			case ST_REGEX:
				if(ch === CC_SLASH || ch === CC_NEWLINE) state = ST_CODE
				break
			}

			break

		case ST_LINE_COMMENT:
			if(ch === CC_NEWLINE) state = ST_CODE
			break
		case ST_BLOCK_COMMENT:
			if(ch === CC_ASTERISK) state = ST_BLOCK_COMMENT_ASTERISK
			break
		case ST_BLOCK_COMMENT_ASTERISK:
			if(ch === CC_SLASH) state = ST_CODE
			else state = ST_BLOCK_COMMENT
			break
		}
	}

	genFn.parts.push(source.substr(partStart, len - partStart))
	return genFn.parts.join('')
}
