
let distinguish = function() {}

if(!process)


export default distinguish


/* global window */

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

const isNode =
	typeof process !== 'undefined' &&
	process.versions != null &&
	process.versions.node != null;











interface DetectedInfo<N extends string, O, V = null> {
	readonly name: N;
	readonly version: V;
	readonly os: O;
}

export class BrowserInfo implements DetectedInfo<Browser, OperatingSystem | null, string> {
	constructor(
		public readonly name: Browser,
		public readonly version: string,
		public readonly os: OperatingSystem | null) {
	}
}

export class NodeInfo implements DetectedInfo<'node', NodeJS.Platform, string> {
	public readonly name: 'node' = 'node';
	public readonly os: NodeJS.Platform = process.platform;

	constructor( public readonly version: string) {
	}
}

export class BotInfo implements DetectedInfo<'bot', null, null> {
	public readonly bot: true = true; // NOTE: deprecated test name instead
	public readonly name: 'bot' = 'bot';
	public readonly version: null = null;
	public readonly os: null = null;
}

type Browser =
	| 'aol'
	| 'edge'
	| 'yandexbrowser'
	| 'vivaldi'
	| 'kakaotalk'
	| 'samsung'
	| 'silk'
	| 'chrome'
	| 'phantomjs'
	| 'crios'
	| 'firefox'
	| 'fxios'
	| 'opera-mini'
	| 'opera'
	| 'ie'
	| 'bb10'
	| 'android'
	| 'ios'
	| 'safari'
	| 'facebook'
	| 'instagram'
	| 'ios-webview'
	| 'searchbot';
type OperatingSystem =
	| 'iOS'
	| 'Android OS'
	| 'BlackBerry OS'
	| 'Windows Mobile'
	| 'Amazon OS'
	| 'Windows 3.11'
	| 'Windows 95'
	| 'Windows 98'
	| 'Windows 2000'
	| 'Windows XP'
	| 'Windows Server 2003'
	| 'Windows Vista'
	| 'Windows 7'
	| 'Windows 8'
	| 'Windows 8.1'
	| 'Windows 10'
	| 'Windows ME'
	| 'Open BSD'
	| 'Sun OS'
	| 'Linux'
	| 'Mac OS'
	| 'QNX'
	| 'BeOS'
	| 'OS/2'
	| 'Chrome OS'
	| 'Search Bot';
type UserAgentRule = [Browser, RegExp];
type UserAgentMatch = [Browser, RegExpExecArray] | false;
type OperatingSystemRule = [OperatingSystem, RegExp];

// tslint:disable-next-line:max-line-length
const SEARCHBOX_UA_REGEX = /alexa|bot|crawl(er|ing)|facebookexternalhit|feedburner|google web preview|nagios|postrank|pingdom|slurp|spider|yahoo!|yandex/;
const SEARCHBOT_OS_REGEX = /(nuhk)|(Googlebot)|(Yammybot)|(Openbot)|(Slurp)|(MSNBot)|(Ask Jeeves\/Teoma)|(ia_archiver)/;
const REQUIRED_VERSION_PARTS = 3;

const userAgentRules: UserAgentRule[] = [
	['aol', /AOLShield\/([0-9\._]+)/],
	['edge', /Edge\/([0-9\._]+)/],
	['yandexbrowser', /YaBrowser\/([0-9\._]+)/],
	['vivaldi', /Vivaldi\/([0-9\.]+)/],
	['kakaotalk', /KAKAOTALK\s([0-9\.]+)/],
	['samsung', /SamsungBrowser\/([0-9\.]+)/],
	['silk', /\bSilk\/([0-9._-]+)\b/],
	['chrome', /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/],
	['phantomjs', /PhantomJS\/([0-9\.]+)(:?\s|$)/],
	['crios', /CriOS\/([0-9\.]+)(:?\s|$)/],
	['firefox', /Firefox\/([0-9\.]+)(?:\s|$)/],
	['fxios', /FxiOS\/([0-9\.]+)/],
	['opera-mini', /Opera Mini.*Version\/([0-9\.]+)/],
	['opera', /Opera\/([0-9\.]+)(?:\s|$)/],
	['opera', /OPR\/([0-9\.]+)(:?\s|$)$/],
	['ie', /Trident\/7\.0.*rv\:([0-9\.]+).*\).*Gecko$/],
	['ie', /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/],
	['ie', /MSIE\s(7\.0)/],
	['bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/],
	['android', /Android\s([0-9\.]+)/],
	['ios', /Version\/([0-9\._]+).*Mobile.*Safari.*/],
	['safari', /Version\/([0-9\._]+).*Safari/],
	['facebook', /FBAV\/([0-9\.]+)/],
	['instagram', /Instagram\s([0-9\.]+)/],
	['ios-webview', /AppleWebKit\/([0-9\.]+).*Mobile/],
	['searchbot', SEARCHBOX_UA_REGEX],
];
const operatingSystemRules: OperatingSystemRule[] = [
	['iOS', /iP(hone|od|ad)/],
	['Android OS', /Android/],
	['BlackBerry OS', /BlackBerry|BB10/],
	['Windows Mobile', /IEMobile/],
	['Amazon OS', /Kindle/],
	['Windows 3.11', /Win16/],
	['Windows 95', /(Windows 95)|(Win95)|(Windows_95)/],
	['Windows 98', /(Windows 98)|(Win98)/],
	['Windows 2000', /(Windows NT 5.0)|(Windows 2000)/],
	['Windows XP', /(Windows NT 5.1)|(Windows XP)/],
	['Windows Server 2003', /(Windows NT 5.2)/],
	['Windows Vista', /(Windows NT 6.0)/],
	['Windows 7', /(Windows NT 6.1)/],
	['Windows 8', /(Windows NT 6.2)/],
	['Windows 8.1', /(Windows NT 6.3)/],
	['Windows 10', /(Windows NT 10.0)/],
	['Windows ME', /Windows ME/],
	['Open BSD', /OpenBSD/],
	['Sun OS', /SunOS/],
	['Chrome OS', /CrOS/],
	['Linux', /(Linux)|(X11)/],
	['Mac OS', /(Mac_PowerPC)|(Macintosh)/],
	['QNX', /QNX/],
	['BeOS', /BeOS/],
	['OS/2', /OS\/2/],
	['Search Bot', SEARCHBOT_OS_REGEX],
];

export function detect(): BrowserInfo | BotInfo | NodeInfo | null {
	if (typeof navigator !== 'undefined') {
		return parseUserAgent(navigator.userAgent);
	}

	return getNodeVersion();
}

export function parseUserAgent(ua: string): BrowserInfo | BotInfo | null {
	// opted for using reduce here rather than Array#first with a regex.test call
	// this is primarily because using the reduce we only perform the regex
	// execution once rather than once for the test and for the exec again below
	// probably something that needs to be benchmarked though
	const matchedRule: UserAgentMatch =
		ua !== '' &&
		userAgentRules.reduce<UserAgentMatch>((matched: UserAgentMatch, [browser, regex]) => {
			if (matched) {
				return matched;
			}

			const uaMatch = regex.exec(ua);
			return !!uaMatch && [browser, uaMatch];
		}, false);

	if (!matchedRule) {
		return null;
	}

	const [name, match] = matchedRule;
	if (name === 'searchbot') {
		return new BotInfo();
	}

	let versionParts = match[1] && match[1].split(/[._]/).slice(0, 3);
	if (versionParts) {
		if (versionParts.length < REQUIRED_VERSION_PARTS) {
			versionParts = [
				...versionParts,
				...createVersionParts(REQUIRED_VERSION_PARTS - versionParts.length),
			];
		}
	} else {
		versionParts = [];
	}

	return new BrowserInfo(name, versionParts.join('.'), detectOS(ua));
}

export function detectOS(ua: string): OperatingSystem | null {
	for (let ii = 0, count = operatingSystemRules.length; ii < count; ii++) {
		const [os, regex] = operatingSystemRules[ii];
		const match = regex.test(ua);
		if (match) {
			return os;
		}
	}

	return null;
}

export function getNodeVersion(): NodeInfo | null {
	const isNode = typeof process !== 'undefined' && process.version;
	return isNode ? new NodeInfo(process.version.slice(1)) : null;
}

function createVersionParts(count: number): string[] {
	const output = [];
	for (let ii = 0; ii < count; ii++) {
		output.push('0');
	}

	return output;
}


















function isElectron() {
	// Renderer process
	if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
		return true;
	}

	// Main process
	if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
		return true;
	}

	// Detect the user agent when the `nodeIntegration` option is set to true
	if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
		return true;
	}

	return false;
}


// react-native
if (typeof document != 'undefined') {
	// I'm on the web!
}
else if (typeof navigator != 'undefined' && navigator.product == 'ReactNative') {
	// I'm in react-native
}
else {
	// I'm in node js
}


import {Platform, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
	height: Platform.OS === 'ios' ? 200 : 100,
});

if (Platform.Version === 25) {
	console.log('Running on Nougat!');
}

const majorVersionIOS = parseInt(Platform.Version, 10);
if (majorVersionIOS <= 9) {
	console.log('Work around a change in behavior');
}