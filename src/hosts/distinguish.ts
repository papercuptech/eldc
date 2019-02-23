import node from './node'
import chrome from './chrome'

export default function() {
	if(node) return node()
	if(chrome) return chrome()
}