//#region node_modules/.pnpm/@fingerprintjs+fingerprintjs@5.2.0/node_modules/@fingerprintjs/fingerprintjs/dist/fp.esm.js
/**
* FingerprintJS v5.2.0 - Copyright (c) FingerprintJS, Inc, 2026 (https://fingerprint.com)
*
* Licensed under MIT License
*
* Copyright (c) 2025 FingerprintJS, Inc
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/
var version = "5.2.0";
function wait(durationMs, resolveWith) {
	return new Promise((resolve) => setTimeout(resolve, durationMs, resolveWith));
}
/**
* Allows asynchronous actions and microtasks to happen.
*/
function releaseEventLoop() {
	return new Promise((resolve) => {
		const channel = new MessageChannel();
		channel.port1.onmessage = () => resolve();
		channel.port2.postMessage(null);
	});
}
function requestIdleCallbackIfAvailable(fallbackTimeout, deadlineTimeout = Infinity) {
	const { requestIdleCallback } = window;
	if (requestIdleCallback) return new Promise((resolve) => requestIdleCallback.call(window, () => resolve(), { timeout: deadlineTimeout }));
	else return wait(Math.min(fallbackTimeout, deadlineTimeout));
}
function isPromise(value) {
	return !!value && typeof value.then === "function";
}
/**
* Calls a maybe asynchronous function without creating microtasks when the function is synchronous.
* Catches errors in both cases.
*
* If just you run a code like this:
* ```
* console.time('Action duration')
* await action()
* console.timeEnd('Action duration')
* ```
* The synchronous function time can be measured incorrectly because another microtask may run before the `await`
* returns the control back to the code.
*/
function awaitIfAsync(action, callback) {
	try {
		const returnedValue = action();
		if (isPromise(returnedValue)) returnedValue.then((result) => callback(true, result), (error) => callback(false, error));
		else callback(true, returnedValue);
	} catch (error) {
		callback(false, error);
	}
}
/**
* If you run many synchronous tasks without using this function, the JS main loop will be busy and asynchronous tasks
* (e.g. completing a network request, rendering the page) won't be able to happen.
* This function allows running many synchronous tasks such way that asynchronous tasks can run too in background.
*/
async function mapWithBreaks(items, callback, loopReleaseInterval = 16) {
	const results = Array(items.length);
	let lastLoopReleaseTime = Date.now();
	for (let i = 0; i < items.length; ++i) {
		results[i] = callback(items[i], i);
		const now = Date.now();
		if (now >= lastLoopReleaseTime + loopReleaseInterval) {
			lastLoopReleaseTime = now;
			await releaseEventLoop();
		}
	}
	return results;
}
/**
* Makes the given promise never emit an unhandled promise rejection console warning.
* The promise will still pass errors to the next promises.
* Returns the input promise for convenience.
*
* Otherwise, promise emits a console warning unless it has a `catch` listener.
*/
function suppressUnhandledRejectionWarning(promise) {
	promise.then(void 0, () => void 0);
	return promise;
}
/**
* Does the same as Array.prototype.includes but has better typing
*/
function includes(haystack, needle) {
	for (let i = 0, l = haystack.length; i < l; ++i) if (haystack[i] === needle) return true;
	return false;
}
/**
* Like `!includes()` but with proper typing
*/
function excludes(haystack, needle) {
	return !includes(haystack, needle);
}
/**
* Be careful, NaN can return
*/
function toInt(value) {
	return parseInt(value);
}
/**
* Be careful, NaN can return
*/
function toFloat(value) {
	return parseFloat(value);
}
function replaceNaN(value, replacement) {
	return typeof value === "number" && isNaN(value) ? replacement : value;
}
function countTruthy(values) {
	return values.reduce((sum, value) => sum + (value ? 1 : 0), 0);
}
function round(value, base = 1) {
	if (Math.abs(base) >= 1) return Math.round(value / base) * base;
	else {
		const counterBase = 1 / base;
		return Math.round(value * counterBase) / counterBase;
	}
}
/**
* Parses a CSS selector into tag name with HTML attributes.
* Only single element selector are supported (without operators like space, +, >, etc).
*
* Multiple values can be returned for each attribute. You decide how to handle them.
*/
function parseSimpleCssSelector(selector) {
	var _a, _b;
	const errorMessage = `Unexpected syntax '${selector}'`;
	const tagMatch = /^\s*([a-z-]*)(.*)$/i.exec(selector);
	const tag = tagMatch[1] || void 0;
	const attributes = {};
	const partsRegex = /([.:#][\w-]+|\[.+?\])/gi;
	const addAttribute = (name, value) => {
		attributes[name] = attributes[name] || [];
		attributes[name].push(value);
	};
	for (;;) {
		const match = partsRegex.exec(tagMatch[2]);
		if (!match) break;
		const part = match[0];
		switch (part[0]) {
			case ".":
				addAttribute("class", part.slice(1));
				break;
			case "#":
				addAttribute("id", part.slice(1));
				break;
			case "[": {
				const attributeMatch = /^\[([\w-]+)([~|^$*]?=("(.*?)"|([\w-]+)))?(\s+[is])?\]$/.exec(part);
				if (attributeMatch) addAttribute(attributeMatch[1], (_b = (_a = attributeMatch[4]) !== null && _a !== void 0 ? _a : attributeMatch[5]) !== null && _b !== void 0 ? _b : "");
				else throw new Error(errorMessage);
				break;
			}
			default: throw new Error(errorMessage);
		}
	}
	return [tag, attributes];
}
/**
* Converts a string to UTF8 bytes
*/
function getUTF8Bytes(input) {
	const result = new Uint8Array(input.length);
	for (let i = 0; i < input.length; i++) {
		const charCode = input.charCodeAt(i);
		if (charCode > 127) return new TextEncoder().encode(input);
		result[i] = charCode;
	}
	return result;
}
/**
* Adds two 64-bit values (provided as tuples of 32-bit values)
* and updates (mutates) first value to write the result
*/
function x64Add(m, n) {
	const m0 = m[0] >>> 16, m1 = m[0] & 65535, m2 = m[1] >>> 16, m3 = m[1] & 65535;
	const n0 = n[0] >>> 16, n1 = n[0] & 65535, n2 = n[1] >>> 16, n3 = n[1] & 65535;
	let o0 = 0, o1 = 0, o2 = 0, o3 = 0;
	o3 += m3 + n3;
	o2 += o3 >>> 16;
	o3 &= 65535;
	o2 += m2 + n2;
	o1 += o2 >>> 16;
	o2 &= 65535;
	o1 += m1 + n1;
	o0 += o1 >>> 16;
	o1 &= 65535;
	o0 += m0 + n0;
	o0 &= 65535;
	m[0] = o0 << 16 | o1;
	m[1] = o2 << 16 | o3;
}
/**
* Multiplies two 64-bit values (provided as tuples of 32-bit values)
* and updates (mutates) first value to write the result
*/
function x64Multiply(m, n) {
	const m0 = m[0] >>> 16, m1 = m[0] & 65535, m2 = m[1] >>> 16, m3 = m[1] & 65535;
	const n0 = n[0] >>> 16, n1 = n[0] & 65535, n2 = n[1] >>> 16, n3 = n[1] & 65535;
	let o0 = 0, o1 = 0, o2 = 0, o3 = 0;
	o3 += m3 * n3;
	o2 += o3 >>> 16;
	o3 &= 65535;
	o2 += m2 * n3;
	o1 += o2 >>> 16;
	o2 &= 65535;
	o2 += m3 * n2;
	o1 += o2 >>> 16;
	o2 &= 65535;
	o1 += m1 * n3;
	o0 += o1 >>> 16;
	o1 &= 65535;
	o1 += m2 * n2;
	o0 += o1 >>> 16;
	o1 &= 65535;
	o1 += m3 * n1;
	o0 += o1 >>> 16;
	o1 &= 65535;
	o0 += m0 * n3 + m1 * n2 + m2 * n1 + m3 * n0;
	o0 &= 65535;
	m[0] = o0 << 16 | o1;
	m[1] = o2 << 16 | o3;
}
/**
* Provides left rotation of the given int64 value (provided as tuple of two int32)
* by given number of bits. Result is written back to the value
*/
function x64Rotl(m, bits) {
	const m0 = m[0];
	bits %= 64;
	if (bits === 32) {
		m[0] = m[1];
		m[1] = m0;
	} else if (bits < 32) {
		m[0] = m0 << bits | m[1] >>> 32 - bits;
		m[1] = m[1] << bits | m0 >>> 32 - bits;
	} else {
		bits -= 32;
		m[0] = m[1] << bits | m0 >>> 32 - bits;
		m[1] = m0 << bits | m[1] >>> 32 - bits;
	}
}
/**
* Provides a left shift of the given int32 value (provided as tuple of [0, int32])
* by given number of bits. Result is written back to the value
*/
function x64LeftShift(m, bits) {
	bits %= 64;
	if (bits === 0) return;
	else if (bits < 32) {
		m[0] = m[1] >>> 32 - bits;
		m[1] = m[1] << bits;
	} else {
		m[0] = m[1] << bits - 32;
		m[1] = 0;
	}
}
/**
* Provides a XOR of the given int64 values(provided as tuple of two int32).
* Result is written back to the first value
*/
function x64Xor(m, n) {
	m[0] ^= n[0];
	m[1] ^= n[1];
}
var F1 = [4283543511, 3981806797];
var F2 = [3301882366, 444984403];
/**
* Calculates murmurHash3's final x64 mix of that block and writes result back to the input value.
* (`[0, h[0] >>> 1]` is a 33 bit unsigned right shift. This is the
* only place where we need to right shift 64bit ints.)
*/
function x64Fmix(h) {
	const shifted = [0, h[0] >>> 1];
	x64Xor(h, shifted);
	x64Multiply(h, F1);
	shifted[1] = h[0] >>> 1;
	x64Xor(h, shifted);
	x64Multiply(h, F2);
	shifted[1] = h[0] >>> 1;
	x64Xor(h, shifted);
}
var C1 = [2277735313, 289559509];
var C2 = [1291169091, 658871167];
var M$1 = [0, 5];
var N1 = [0, 1390208809];
var N2 = [0, 944331445];
/**
* Given a string and an optional seed as an int, returns a 128 bit
* hash using the x64 flavor of MurmurHash3, as an unsigned hex.
* All internal functions mutates passed value to achieve minimal memory allocations and GC load
*
* Benchmark https://jsbench.me/p4lkpaoabi/1
*/
function x64hash128(input, seed) {
	const key = getUTF8Bytes(input);
	seed = seed || 0;
	const length = [0, key.length];
	const remainder = length[1] % 16;
	const bytes = length[1] - remainder;
	const h1 = [0, seed];
	const h2 = [0, seed];
	const k1 = [0, 0];
	const k2 = [0, 0];
	let i;
	for (i = 0; i < bytes; i = i + 16) {
		k1[0] = key[i + 4] | key[i + 5] << 8 | key[i + 6] << 16 | key[i + 7] << 24;
		k1[1] = key[i] | key[i + 1] << 8 | key[i + 2] << 16 | key[i + 3] << 24;
		k2[0] = key[i + 12] | key[i + 13] << 8 | key[i + 14] << 16 | key[i + 15] << 24;
		k2[1] = key[i + 8] | key[i + 9] << 8 | key[i + 10] << 16 | key[i + 11] << 24;
		x64Multiply(k1, C1);
		x64Rotl(k1, 31);
		x64Multiply(k1, C2);
		x64Xor(h1, k1);
		x64Rotl(h1, 27);
		x64Add(h1, h2);
		x64Multiply(h1, M$1);
		x64Add(h1, N1);
		x64Multiply(k2, C2);
		x64Rotl(k2, 33);
		x64Multiply(k2, C1);
		x64Xor(h2, k2);
		x64Rotl(h2, 31);
		x64Add(h2, h1);
		x64Multiply(h2, M$1);
		x64Add(h2, N2);
	}
	k1[0] = 0;
	k1[1] = 0;
	k2[0] = 0;
	k2[1] = 0;
	const val = [0, 0];
	switch (remainder) {
		case 15:
			val[1] = key[i + 14];
			x64LeftShift(val, 48);
			x64Xor(k2, val);
		case 14:
			val[1] = key[i + 13];
			x64LeftShift(val, 40);
			x64Xor(k2, val);
		case 13:
			val[1] = key[i + 12];
			x64LeftShift(val, 32);
			x64Xor(k2, val);
		case 12:
			val[1] = key[i + 11];
			x64LeftShift(val, 24);
			x64Xor(k2, val);
		case 11:
			val[1] = key[i + 10];
			x64LeftShift(val, 16);
			x64Xor(k2, val);
		case 10:
			val[1] = key[i + 9];
			x64LeftShift(val, 8);
			x64Xor(k2, val);
		case 9:
			val[1] = key[i + 8];
			x64Xor(k2, val);
			x64Multiply(k2, C2);
			x64Rotl(k2, 33);
			x64Multiply(k2, C1);
			x64Xor(h2, k2);
		case 8:
			val[1] = key[i + 7];
			x64LeftShift(val, 56);
			x64Xor(k1, val);
		case 7:
			val[1] = key[i + 6];
			x64LeftShift(val, 48);
			x64Xor(k1, val);
		case 6:
			val[1] = key[i + 5];
			x64LeftShift(val, 40);
			x64Xor(k1, val);
		case 5:
			val[1] = key[i + 4];
			x64LeftShift(val, 32);
			x64Xor(k1, val);
		case 4:
			val[1] = key[i + 3];
			x64LeftShift(val, 24);
			x64Xor(k1, val);
		case 3:
			val[1] = key[i + 2];
			x64LeftShift(val, 16);
			x64Xor(k1, val);
		case 2:
			val[1] = key[i + 1];
			x64LeftShift(val, 8);
			x64Xor(k1, val);
		case 1:
			val[1] = key[i];
			x64Xor(k1, val);
			x64Multiply(k1, C1);
			x64Rotl(k1, 31);
			x64Multiply(k1, C2);
			x64Xor(h1, k1);
	}
	x64Xor(h1, length);
	x64Xor(h2, length);
	x64Add(h1, h2);
	x64Add(h2, h1);
	x64Fmix(h1);
	x64Fmix(h2);
	x64Add(h1, h2);
	x64Add(h2, h1);
	return ("00000000" + (h1[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (h1[1] >>> 0).toString(16)).slice(-8) + ("00000000" + (h2[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (h2[1] >>> 0).toString(16)).slice(-8);
}
/**
* Converts an error object to a plain object that can be used with `JSON.stringify`.
* If you just run `JSON.stringify(error)`, you'll get `'{}'`.
*/
function errorToObject(error) {
	var _a;
	return {
		name: error.name,
		message: error.message,
		stack: (_a = error.stack) === null || _a === void 0 ? void 0 : _a.split("\n"),
		...error
	};
}
function isFunctionNative(func) {
	return /^function\s.*?\{\s*\[native code]\s*}$/.test(String(func));
}
function isFinalResultLoaded(loadResult) {
	return typeof loadResult !== "function";
}
/**
* Loads the given entropy source. Returns a function that gets an entropy component from the source.
*
* The result is returned synchronously to prevent `loadSources` from
* waiting for one source to load before getting the components from the other sources.
*/
function loadSource(source, sourceOptions) {
	const sourceLoadPromise = suppressUnhandledRejectionWarning(new Promise((resolveLoad) => {
		const loadStartTime = Date.now();
		awaitIfAsync(source.bind(null, sourceOptions), (...loadArgs) => {
			const loadDuration = Date.now() - loadStartTime;
			if (!loadArgs[0]) return resolveLoad(() => ({
				error: loadArgs[1],
				duration: loadDuration
			}));
			const loadResult = loadArgs[1];
			if (isFinalResultLoaded(loadResult)) return resolveLoad(() => ({
				value: loadResult,
				duration: loadDuration
			}));
			resolveLoad(() => new Promise((resolveGet) => {
				const getStartTime = Date.now();
				awaitIfAsync(loadResult, (...getArgs) => {
					const duration = loadDuration + Date.now() - getStartTime;
					if (!getArgs[0]) return resolveGet({
						error: getArgs[1],
						duration
					});
					resolveGet({
						value: getArgs[1],
						duration
					});
				});
			}));
		});
	}));
	return function getComponent() {
		return sourceLoadPromise.then((finalizeSource) => finalizeSource());
	};
}
/**
* Loads the given entropy sources. Returns a function that collects the entropy components.
*
* The result is returned synchronously in order to allow start getting the components
* before the sources are loaded completely.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function loadSources(sources, sourceOptions, excludeSources, loopReleaseInterval) {
	const includedSources = Object.keys(sources).filter((sourceKey) => excludes(excludeSources, sourceKey));
	const sourceGettersPromise = suppressUnhandledRejectionWarning(mapWithBreaks(includedSources, (sourceKey) => loadSource(sources[sourceKey], sourceOptions), loopReleaseInterval));
	return async function getComponents() {
		const componentPromises = await mapWithBreaks(await sourceGettersPromise, (sourceGetter) => suppressUnhandledRejectionWarning(sourceGetter()), loopReleaseInterval);
		const componentArray = await Promise.all(componentPromises);
		const components = {};
		for (let index = 0; index < includedSources.length; ++index) components[includedSources[index]] = componentArray[index];
		return components;
	};
}
/**
* Checks whether the browser is based on Trident (the Internet Explorer engine) without using user-agent.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function isTrident() {
	const w = window;
	const n = navigator;
	return countTruthy([
		"MSCSSMatrix" in w,
		"msSetImmediate" in w,
		"msIndexedDB" in w,
		"msMaxTouchPoints" in n,
		"msPointerEnabled" in n
	]) >= 4;
}
/**
* Checks whether the browser is based on EdgeHTML (the pre-Chromium Edge engine) without using user-agent.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function isEdgeHTML() {
	const w = window;
	const n = navigator;
	return countTruthy([
		"msWriteProfilerMark" in w,
		"MSStream" in w,
		"msLaunchUri" in n,
		"msSaveBlob" in n
	]) >= 3 && !isTrident();
}
/**
* Checks whether the browser is based on Chromium without using user-agent.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function isChromium() {
	const w = window;
	const n = navigator;
	return countTruthy([
		"webkitPersistentStorage" in n,
		"webkitTemporaryStorage" in n,
		(n.vendor || "").indexOf("Google") === 0,
		"webkitResolveLocalFileSystemURL" in w,
		"BatteryManager" in w,
		"webkitMediaStream" in w,
		"webkitSpeechGrammar" in w
	]) >= 5;
}
/**
* Checks whether the browser is based on mobile or desktop Safari without using user-agent.
* All iOS browsers use WebKit (the Safari engine).
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function isWebKit() {
	const w = window;
	const n = navigator;
	return countTruthy([
		"ApplePayError" in w,
		"CSSPrimitiveValue" in w,
		"Counter" in w,
		n.vendor.indexOf("Apple") === 0,
		"RGBColor" in w,
		"WebKitMediaKeys" in w
	]) >= 4;
}
/**
* Checks whether this WebKit browser is a desktop browser.
* It doesn't check that the browser is based on WebKit, there is a separate function for this.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function isDesktopWebKit() {
	const w = window;
	const { HTMLElement, Document } = w;
	return countTruthy([
		"safari" in w,
		!("ongestureend" in w),
		!("TouchEvent" in w),
		!("orientation" in w),
		HTMLElement && !("autocapitalize" in HTMLElement.prototype),
		Document && "pointerLockElement" in Document.prototype
	]) >= 4;
}
/**
* Checks whether this WebKit browser is Safari.
* It doesn't check that the browser is based on WebKit, there is a separate function for this.
*
* Warning! The function works properly only for Safari version 15.4 and newer.
*/
function isSafariWebKit() {
	const w = window;
	return isFunctionNative(w.print) && String(w.browser) === "[object WebPageNamespace]";
}
/**
* Checks whether the browser is based on Gecko (Firefox engine) without using user-agent.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function isGecko() {
	var _a, _b;
	const w = window;
	return countTruthy([
		"buildID" in navigator,
		"MozAppearance" in ((_b = (_a = document.documentElement) === null || _a === void 0 ? void 0 : _a.style) !== null && _b !== void 0 ? _b : {}),
		"onmozfullscreenchange" in w,
		"mozInnerScreenX" in w,
		"CSSMozDocumentRule" in w,
		"CanvasCaptureMediaStream" in w
	]) >= 4;
}
/**
* Checks whether the browser is based on Gecko version ≥120 (Firefox ≥120) without using user-agent.
* It doesn't check that the browser is based on Gecko; there is a separate function for this.
*
* @see https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/120 Firefox 120 release notes
*/
function isGecko120OrNewer() {
	const w = window;
	const n = navigator;
	const { CSS } = w;
	return countTruthy([
		"userActivation" in n,
		CSS.supports("color", "light-dark(#000, #fff)"),
		CSS.supports("height", "1lh"),
		"globalPrivacyControl" in n
	]) >= 3;
}
/**
* Checks whether the browser is based on Gecko version ≥143 (Firefox ≥143) without using user-agent.
* It doesn't check that the browser is based on Gecko; there is a separate function for this.
*
* Firefox 143 shipped Phase 2 fingerprinting protections (screen resolution, processor count, touch points)
* in Private Browsing and ETP Strict mode.
*
* @see https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/143 Firefox 143 release notes
* @see https://bugzilla.mozilla.org/show_bug.cgi?id=1978414 Bug that shipped these protections
*/
function isGecko143OrNewer() {
	const { CSS } = window;
	return countTruthy([
		CSS.supports("selector(::details-content)"),
		CSS.supports("selector(::before::marker)"),
		CSS.supports("selector(::after::marker)"),
		!("locale" in CompositionEvent.prototype)
	]) >= 3;
}
/**
* Checks whether the browser is based on Chromium version ≥86 without using user-agent.
* It doesn't check that the browser is based on Chromium, there is a separate function for this.
*/
function isChromium86OrNewer() {
	const w = window;
	return countTruthy([
		!("MediaSettingsRange" in w),
		"RTCEncodedAudioFrame" in w,
		"" + w.Intl === "[object Intl]",
		"" + w.Reflect === "[object Reflect]"
	]) >= 3;
}
/**
* Checks whether the browser is based on Chromium version ≥122 without using user-agent.
* It doesn't check that the browser is based on Chromium, there is a separate function for this.
*/
function isChromium122OrNewer() {
	const w = window;
	const { URLPattern } = w;
	return countTruthy([
		"union" in Set.prototype,
		"Iterator" in w,
		URLPattern && "hasRegExpGroups" in URLPattern.prototype,
		"RGB8" in WebGLRenderingContext.prototype
	]) >= 3;
}
/**
* Checks whether the browser is based on Chromium version ≥128 without using user-agent.
* It doesn't check that the browser is based on Chromium, there is a separate function for this.
*/
function isChromium128OrNewer() {
	const w = window;
	const d = document;
	const { CSS, Promise, AudioContext } = w;
	return countTruthy([
		Promise && "try" in Promise,
		"caretPositionFromPoint" in d,
		AudioContext && "onerror" in AudioContext.prototype,
		CSS.supports("ruby-align", "space-around")
	]) >= 3;
}
/**
* Checks whether the browser is based on WebKit version ≥606 (Safari ≥12) without using user-agent.
* It doesn't check that the browser is based on WebKit, there is a separate function for this.
*
* @see https://en.wikipedia.org/wiki/Safari_version_history#Release_history Safari-WebKit versions map
*/
function isWebKit606OrNewer() {
	const w = window;
	return countTruthy([
		"DOMRectList" in w,
		"RTCPeerConnectionIceEvent" in w,
		"SVGGeometryElement" in w,
		"ontransitioncancel" in w
	]) >= 3;
}
/**
* Checks whether the browser is based on WebKit version ≥616 (Safari ≥17) without using user-agent.
* It doesn't check that the browser is based on WebKit, there is a separate function for this.
*
* @see https://developer.apple.com/documentation/safari-release-notes/safari-17-release-notes Safari 17 release notes
* @see https://tauri.app/v1/references/webview-versions/#webkit-versions-in-safari Safari-WebKit versions map
*/
function isWebKit616OrNewer() {
	const w = window;
	const n = navigator;
	const { CSS, HTMLButtonElement } = w;
	return countTruthy([
		!("getStorageUpdates" in n),
		HTMLButtonElement && "popover" in HTMLButtonElement.prototype,
		"CSSCounterStyleRule" in w,
		CSS.supports("font-size-adjust: ex-height 0.5"),
		CSS.supports("text-transform: full-width")
	]) >= 4;
}
/**
* Checks whether the device is an iPad.
* It doesn't check that the engine is WebKit and that the WebKit isn't desktop.
*/
function isIPad() {
	if (navigator.platform === "iPad") return true;
	const s = screen;
	const screenRatio = s.width / s.height;
	return countTruthy([
		"MediaSource" in window,
		!!Element.prototype.webkitRequestFullscreen,
		screenRatio > .65 && screenRatio < 1.53
	]) >= 2;
}
/**
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function getFullscreenElement() {
	const d = document;
	return d.fullscreenElement || d.msFullscreenElement || d.mozFullScreenElement || d.webkitFullscreenElement || null;
}
function exitFullscreen() {
	const d = document;
	return (d.exitFullscreen || d.msExitFullscreen || d.mozCancelFullScreen || d.webkitExitFullscreen).call(d);
}
/**
* Checks whether the device runs on Android without using user-agent.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function isAndroid() {
	const isItChromium = isChromium();
	const isItGecko = isGecko();
	const w = window;
	const n = navigator;
	const c = "connection";
	if (isItChromium) return countTruthy([
		!("SharedWorker" in w),
		n[c] && "ontypechange" in n[c],
		!("sinkId" in new Audio())
	]) >= 2;
	else if (isItGecko) return countTruthy([
		"onorientationchange" in w,
		"orientation" in w,
		/android/i.test(n.appVersion)
	]) >= 2;
	else return false;
}
/**
* Checks whether the browser is Samsung Internet without using user-agent.
* It doesn't check that the browser is based on Chromium, please use `isChromium` before using this function.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function isSamsungInternet() {
	const n = navigator;
	const w = window;
	const audioPrototype = Audio.prototype;
	const { visualViewport } = w;
	return countTruthy([
		"srLatency" in audioPrototype,
		"srChannelCount" in audioPrototype,
		"devicePosture" in n,
		visualViewport && "segments" in visualViewport,
		"getTextInformation" in Image.prototype
	]) >= 3;
}
/**
* A deep description: https://fingerprint.com/blog/audio-fingerprinting/
* Inspired by and based on https://github.com/cozylife/audio-fingerprint
*
* A version of the entropy source with stabilization to make it suitable for static fingerprinting.
* Audio signal is noised in private mode of Safari 17, so audio fingerprinting is skipped in Safari 17.
*/
function getAudioFingerprint() {
	if (doesBrowserPerformAntifingerprinting()) return -4;
	return getUnstableAudioFingerprint();
}
/**
* A version of the entropy source without stabilization.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function getUnstableAudioFingerprint() {
	const w = window;
	const AudioContext = w.OfflineAudioContext || w.webkitOfflineAudioContext;
	if (!AudioContext) return -2;
	if (doesBrowserSuspendAudioContext()) return -1;
	const hashFromIndex = 4500;
	const context = new AudioContext(1, 5e3, 44100);
	const oscillator = context.createOscillator();
	oscillator.type = "triangle";
	oscillator.frequency.value = 1e4;
	const compressor = context.createDynamicsCompressor();
	compressor.threshold.value = -50;
	compressor.knee.value = 40;
	compressor.ratio.value = 12;
	compressor.attack.value = 0;
	compressor.release.value = .25;
	oscillator.connect(compressor);
	compressor.connect(context.destination);
	oscillator.start(0);
	const [renderPromise, finishRendering] = startRenderingAudio(context);
	const fingerprintPromise = suppressUnhandledRejectionWarning(renderPromise.then((buffer) => getHash(buffer.getChannelData(0).subarray(hashFromIndex)), (error) => {
		if (error.name === "timeout" || error.name === "suspended") return -3;
		throw error;
	}));
	return () => {
		finishRendering();
		return fingerprintPromise;
	};
}
/**
* Checks if the current browser is known for always suspending audio context
*/
function doesBrowserSuspendAudioContext() {
	return isWebKit() && !isDesktopWebKit() && !isWebKit606OrNewer();
}
/**
* Checks if the current browser is known for applying anti-fingerprinting measures in all or some critical modes
*/
function doesBrowserPerformAntifingerprinting() {
	return isWebKit() && isWebKit616OrNewer() && isSafariWebKit() || isChromium() && isSamsungInternet() && isChromium122OrNewer();
}
/**
* Starts rendering the audio context.
* When the returned function is called, the render process starts finishing.
*/
function startRenderingAudio(context) {
	const renderTryMaxCount = 3;
	const renderRetryDelay = 500;
	const runningMaxAwaitTime = 500;
	const runningSufficientTime = 5e3;
	let finalize = () => void 0;
	return [new Promise((resolve, reject) => {
		let isFinalized = false;
		let renderTryCount = 0;
		let startedRunningAt = 0;
		context.oncomplete = (event) => resolve(event.renderedBuffer);
		const startRunningTimeout = () => {
			setTimeout(() => reject(makeInnerError("timeout")), Math.min(runningMaxAwaitTime, startedRunningAt + runningSufficientTime - Date.now()));
		};
		const tryRender = () => {
			try {
				const renderingPromise = context.startRendering();
				if (isPromise(renderingPromise)) suppressUnhandledRejectionWarning(renderingPromise);
				switch (context.state) {
					case "running":
						startedRunningAt = Date.now();
						if (isFinalized) startRunningTimeout();
						break;
					case "suspended":
						if (!document.hidden) renderTryCount++;
						if (isFinalized && renderTryCount >= renderTryMaxCount) reject(makeInnerError("suspended"));
						else setTimeout(tryRender, renderRetryDelay);
						break;
				}
			} catch (error) {
				reject(error);
			}
		};
		tryRender();
		finalize = () => {
			if (!isFinalized) {
				isFinalized = true;
				if (startedRunningAt > 0) startRunningTimeout();
			}
		};
	}), finalize];
}
function getHash(signal) {
	let hash = 0;
	for (let i = 0; i < signal.length; ++i) hash += Math.abs(signal[i]);
	return hash;
}
function makeInnerError(name) {
	const error = new Error(name);
	error.name = name;
	return error;
}
/**
* Creates and keeps an invisible iframe while the given function runs.
* The given function is called when the iframe is loaded and has a body.
* The iframe allows to measure DOM sizes inside itself.
*
* Notice: passing an initial HTML code doesn't work in IE.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
async function withIframe(action, initialHtml, domPollInterval = 50) {
	var _a, _b, _c;
	const d = document;
	while (!d.body) await wait(domPollInterval);
	const iframe = d.createElement("iframe");
	try {
		await new Promise((_resolve, _reject) => {
			let isComplete = false;
			const resolve = () => {
				isComplete = true;
				_resolve();
			};
			const reject = (error) => {
				isComplete = true;
				_reject(error);
			};
			iframe.onload = resolve;
			iframe.onerror = reject;
			const { style } = iframe;
			style.setProperty("display", "block", "important");
			style.position = "absolute";
			style.top = "0";
			style.left = "0";
			style.visibility = "hidden";
			if (initialHtml && "srcdoc" in iframe) iframe.srcdoc = initialHtml;
			else iframe.src = "about:blank";
			d.body.appendChild(iframe);
			const checkReadyState = () => {
				var _a, _b;
				if (isComplete) return;
				if (((_b = (_a = iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.document) === null || _b === void 0 ? void 0 : _b.readyState) === "complete") resolve();
				else setTimeout(checkReadyState, 10);
			};
			checkReadyState();
		});
		while (!((_b = (_a = iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.document) === null || _b === void 0 ? void 0 : _b.body)) await wait(domPollInterval);
		return await action(iframe, iframe.contentWindow);
	} finally {
		(_c = iframe.parentNode) === null || _c === void 0 || _c.removeChild(iframe);
	}
}
/**
* Creates a DOM element that matches the given selector.
* Only single element selector are supported (without operators like space, +, >, etc).
*/
function selectorToElement(selector) {
	const [tag, attributes] = parseSimpleCssSelector(selector);
	const element = document.createElement(tag !== null && tag !== void 0 ? tag : "div");
	for (const name of Object.keys(attributes)) {
		const value = attributes[name].join(" ");
		if (name === "style") addStyleString(element.style, value);
		else element.setAttribute(name, value);
	}
	return element;
}
/**
* Adds CSS styles from a string in such a way that doesn't trigger a CSP warning (unsafe-inline or unsafe-eval)
*/
function addStyleString(style, source) {
	for (const property of source.split(";")) {
		const match = /^\s*([\w-]+)\s*:\s*(.+?)(\s*!([\w-]+))?\s*$/.exec(property);
		if (match) {
			const [, name, value, , priority] = match;
			style.setProperty(name, value, priority || "");
		}
	}
}
/**
* Returns true if the code runs in an iframe, and any parent page's origin doesn't match the current origin
*/
function isAnyParentCrossOrigin() {
	let currentWindow = window;
	for (;;) {
		const parentWindow = currentWindow.parent;
		if (!parentWindow || parentWindow === currentWindow) return false;
		try {
			if (parentWindow.location.origin !== currentWindow.location.origin) return true;
		} catch (error) {
			if (error instanceof Error && error.name === "SecurityError") return true;
			throw error;
		}
		currentWindow = parentWindow;
	}
}
var testString = "mmMwWLliI0O&1";
var textSize = "48px";
var baseFonts = [
	"monospace",
	"sans-serif",
	"serif"
];
var fontList = [
	"sans-serif-thin",
	"ARNO PRO",
	"Agency FB",
	"Arabic Typesetting",
	"Arial Unicode MS",
	"AvantGarde Bk BT",
	"BankGothic Md BT",
	"Batang",
	"Bitstream Vera Sans Mono",
	"Calibri",
	"Century",
	"Century Gothic",
	"Clarendon",
	"EUROSTILE",
	"Franklin Gothic",
	"Futura Bk BT",
	"Futura Md BT",
	"GOTHAM",
	"Gill Sans",
	"HELV",
	"Haettenschweiler",
	"Helvetica Neue",
	"Humanst521 BT",
	"Leelawadee",
	"Letter Gothic",
	"Levenim MT",
	"Lucida Bright",
	"Lucida Sans",
	"Menlo",
	"MS Mincho",
	"MS Outlook",
	"MS Reference Specialty",
	"MS UI Gothic",
	"MT Extra",
	"MYRIAD PRO",
	"Marlett",
	"Meiryo UI",
	"Microsoft Uighur",
	"Minion Pro",
	"Monotype Corsiva",
	"PMingLiU",
	"Pristina",
	"SCRIPTINA",
	"Segoe UI Light",
	"Serifa",
	"SimHei",
	"Small Fonts",
	"Staccato222 BT",
	"TRAJAN PRO",
	"Univers CE 55 Medium",
	"Vrinda",
	"ZWAdobeF"
];
function getFonts() {
	return withIframe(async (_, { document }) => {
		const holder = document.body;
		holder.style.fontSize = textSize;
		const spansContainer = document.createElement("div");
		spansContainer.style.setProperty("visibility", "hidden", "important");
		const defaultWidth = {};
		const defaultHeight = {};
		const createSpan = (fontFamily) => {
			const span = document.createElement("span");
			const { style } = span;
			style.position = "absolute";
			style.top = "0";
			style.left = "0";
			style.fontFamily = fontFamily;
			span.textContent = testString;
			spansContainer.appendChild(span);
			return span;
		};
		const createSpanWithFonts = (fontToDetect, baseFont) => {
			return createSpan(`'${fontToDetect}',${baseFont}`);
		};
		const initializeBaseFontsSpans = () => {
			return baseFonts.map(createSpan);
		};
		const initializeFontsSpans = () => {
			const spans = {};
			for (const font of fontList) spans[font] = baseFonts.map((baseFont) => createSpanWithFonts(font, baseFont));
			return spans;
		};
		const isFontAvailable = (fontSpans) => {
			return baseFonts.some((baseFont, baseFontIndex) => fontSpans[baseFontIndex].offsetWidth !== defaultWidth[baseFont] || fontSpans[baseFontIndex].offsetHeight !== defaultHeight[baseFont]);
		};
		const baseFontsSpans = initializeBaseFontsSpans();
		const fontsSpans = initializeFontsSpans();
		holder.appendChild(spansContainer);
		for (let index = 0; index < baseFonts.length; index++) {
			defaultWidth[baseFonts[index]] = baseFontsSpans[index].offsetWidth;
			defaultHeight[baseFonts[index]] = baseFontsSpans[index].offsetHeight;
		}
		return fontList.filter((font) => isFontAvailable(fontsSpans[font]));
	});
}
function getPlugins() {
	const rawPlugins = navigator.plugins;
	if (!rawPlugins) return;
	const plugins = [];
	for (let i = 0; i < rawPlugins.length; ++i) {
		const plugin = rawPlugins[i];
		if (!plugin) continue;
		const mimeTypes = [];
		for (let j = 0; j < plugin.length; ++j) {
			const mimeType = plugin[j];
			mimeTypes.push({
				type: mimeType.type,
				suffixes: mimeType.suffixes
			});
		}
		plugins.push({
			name: plugin.name,
			description: plugin.description,
			mimeTypes
		});
	}
	return plugins;
}
/**
* A version of the entropy source with stabilization to make it suitable for static fingerprinting.
*
* Canvas image is noised in private mode of Safari 17, so image rendering is skipped in Safari 17.
* Firefox 120+ randomizes canvas data in private browsing and strict ETP mode,
* so image rendering is skipped in Firefox 120+.
*
* @see https://www.browserleaks.com/canvas#how-does-it-work
* @see https://bugzilla.mozilla.org/show_bug.cgi?id=1816189 Firefox canvas randomization
*/
function getCanvasFingerprint() {
	return getUnstableCanvasFingerprint(doesBrowserPerformAntiFingerprinting());
}
/**
* A version of the entropy source without stabilization.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function getUnstableCanvasFingerprint(skipImages) {
	let winding = false;
	let geometry;
	let text;
	const [canvas, context] = makeCanvasContext();
	if (!isSupported(canvas, context)) geometry = text = "unsupported";
	else {
		winding = doesSupportWinding(context);
		if (skipImages) geometry = text = "skipped";
		else [geometry, text] = renderImages(canvas, context);
	}
	return {
		winding,
		geometry,
		text
	};
}
function makeCanvasContext() {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	return [canvas, canvas.getContext("2d")];
}
function isSupported(canvas, context) {
	return !!(context && canvas.toDataURL);
}
function doesSupportWinding(context) {
	context.rect(0, 0, 10, 10);
	context.rect(2, 2, 6, 6);
	return !context.isPointInPath(5, 5, "evenodd");
}
function renderImages(canvas, context) {
	renderTextImage(canvas, context);
	const textImage1 = canvasToString(canvas);
	if (textImage1 !== canvasToString(canvas)) return ["unstable", "unstable"];
	renderGeometryImage(canvas, context);
	return [canvasToString(canvas), textImage1];
}
function renderTextImage(canvas, context) {
	canvas.width = 240;
	canvas.height = 60;
	context.textBaseline = "alphabetic";
	context.fillStyle = "#f60";
	context.fillRect(100, 1, 62, 20);
	context.fillStyle = "#069";
	context.font = "11pt \"Times New Roman\"";
	const printedText = `Cwm fjordbank gly ${String.fromCharCode(55357, 56835)}`;
	context.fillText(printedText, 2, 15);
	context.fillStyle = "rgba(102, 204, 0, 0.2)";
	context.font = "18pt Arial";
	context.fillText(printedText, 4, 45);
}
function renderGeometryImage(canvas, context) {
	canvas.width = 122;
	canvas.height = 110;
	context.globalCompositeOperation = "multiply";
	for (const [color, x, y] of [
		[
			"#f2f",
			40,
			40
		],
		[
			"#2ff",
			80,
			40
		],
		[
			"#ff2",
			60,
			80
		]
	]) {
		context.fillStyle = color;
		context.beginPath();
		context.arc(x, y, 40, 0, Math.PI * 2, true);
		context.closePath();
		context.fill();
	}
	context.fillStyle = "#f9c";
	context.arc(60, 60, 60, 0, Math.PI * 2, true);
	context.arc(60, 60, 20, 0, Math.PI * 2, true);
	context.fill("evenodd");
}
function canvasToString(canvas) {
	return canvas.toDataURL();
}
/**
* Checks if the current browser is known for applying anti-fingerprinting measures in all or some critical modes:
* - Safari 17+: noises canvas image in private mode
* - Firefox 120+: randomizes canvas data in private browsing and strict ETP mode (CanvasRandomization)
*
* @see https://bugzilla.mozilla.org/show_bug.cgi?id=1816189 Firefox canvas randomization
*/
function doesBrowserPerformAntiFingerprinting() {
	const isSafari17OrAbove = isWebKit() && isWebKit616OrNewer() && isSafariWebKit();
	const isFirefox120OrAbove = isGecko() && isGecko120OrNewer();
	return isSafari17OrAbove || isFirefox120OrAbove;
}
/**
* This is a crude and primitive touch screen detection. It's not possible to currently reliably detect the availability
* of a touch screen with a JS, without actually subscribing to a touch event.
*
* @see http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
* @see https://github.com/Modernizr/Modernizr/issues/548
*/
function getTouchSupport() {
	const n = navigator;
	let maxTouchPoints = 0;
	let touchEvent;
	if (n.maxTouchPoints !== void 0) maxTouchPoints = toInt(n.maxTouchPoints);
	else if (n.msMaxTouchPoints !== void 0) maxTouchPoints = n.msMaxTouchPoints;
	try {
		document.createEvent("TouchEvent");
		touchEvent = true;
	} catch (_a) {
		touchEvent = false;
	}
	const touchStart = "ontouchstart" in window;
	return {
		maxTouchPoints,
		touchEvent,
		touchStart
	};
}
function getOsCpu() {
	return navigator.oscpu;
}
function getLanguages() {
	const n = navigator;
	const result = [];
	const language = n.language || n.userLanguage || n.browserLanguage || n.systemLanguage;
	if (language !== void 0) result.push([language]);
	if (Array.isArray(n.languages)) {
		if (!(isChromium() && isChromium86OrNewer())) result.push(n.languages);
	} else if (typeof n.languages === "string") {
		const languages = n.languages;
		if (languages) result.push(languages.split(","));
	}
	return result;
}
function getColorDepth() {
	return window.screen.colorDepth;
}
function getDeviceMemory() {
	return replaceNaN(toFloat(navigator.deviceMemory), void 0);
}
/**
* A version of the entropy source with stabilization to make it suitable for static fingerprinting.
* The window resolution is always the document size in private mode of Safari 17,
* so the window resolution is not used in Safari 17.
*/
function getScreenResolution() {
	if (isWebKit() && isWebKit616OrNewer() && isSafariWebKit()) return;
	return getUnstableScreenResolution();
}
/**
* A version of the entropy source without stabilization.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function getUnstableScreenResolution() {
	const s = screen;
	const parseDimension = (value) => replaceNaN(toInt(value), null);
	const dimensions = [parseDimension(s.width), parseDimension(s.height)];
	dimensions.sort().reverse();
	return dimensions;
}
var screenFrameCheckInterval = 2500;
var roundingPrecision = 10;
var screenFrameBackup;
var screenFrameSizeTimeoutId;
/**
* Starts watching the screen frame size. When a non-zero size appears, the size is saved and the watch is stopped.
* Later, when `getScreenFrame` runs, it will return the saved non-zero size if the current size is null.
*
* This trick is required to mitigate the fact that the screen frame turns null in some cases.
* See more on this at https://github.com/fingerprintjs/fingerprintjs/issues/568
*/
function watchScreenFrame() {
	if (screenFrameSizeTimeoutId !== void 0) return;
	const checkScreenFrame = () => {
		const frameSize = getCurrentScreenFrame();
		if (isFrameSizeNull(frameSize)) screenFrameSizeTimeoutId = setTimeout(checkScreenFrame, screenFrameCheckInterval);
		else {
			screenFrameBackup = frameSize;
			screenFrameSizeTimeoutId = void 0;
		}
	};
	checkScreenFrame();
}
/**
* A version of the entropy source without stabilization.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function getUnstableScreenFrame() {
	watchScreenFrame();
	return async () => {
		let frameSize = getCurrentScreenFrame();
		if (isFrameSizeNull(frameSize)) {
			if (screenFrameBackup) return [...screenFrameBackup];
			if (getFullscreenElement()) {
				await exitFullscreen();
				frameSize = getCurrentScreenFrame();
			}
		}
		if (!isFrameSizeNull(frameSize)) screenFrameBackup = frameSize;
		return frameSize;
	};
}
/**
* A version of the entropy source with stabilization to make it suitable for static fingerprinting.
*
* Sometimes the available screen resolution changes a bit, e.g. 1900x1440 → 1900x1439. A possible reason: macOS Dock
* shrinks to fit more icons when there is too little space. The rounding is used to mitigate the difference.
*
* The frame width is always 0 in the private mode of Safari 17, so the frame is not used in Safari 17.
* Firefox 143+ spoofs screen frame (ScreenAvailRect) in private browsing and strict ETP mode,
* so the frame is not used in Firefox 143+.
*
* @see https://bugzilla.mozilla.org/show_bug.cgi?id=1978414 Firefox screen resolution spoofing
*/
function getScreenFrame() {
	const isSafari17OrAbove = isWebKit() && isWebKit616OrNewer() && isSafariWebKit();
	const isFirefox143OrAbove = isGecko() && isGecko143OrNewer();
	if (isSafari17OrAbove || isFirefox143OrAbove) return () => Promise.resolve(void 0);
	const screenFrameGetter = getUnstableScreenFrame();
	return async () => {
		const frameSize = await screenFrameGetter();
		const processSize = (sideSize) => sideSize === null ? null : round(sideSize, roundingPrecision);
		return [
			processSize(frameSize[0]),
			processSize(frameSize[1]),
			processSize(frameSize[2]),
			processSize(frameSize[3])
		];
	};
}
function getCurrentScreenFrame() {
	const s = screen;
	return [
		replaceNaN(toFloat(s.availTop), null),
		replaceNaN(toFloat(s.width) - toFloat(s.availWidth) - replaceNaN(toFloat(s.availLeft), 0), null),
		replaceNaN(toFloat(s.height) - toFloat(s.availHeight) - replaceNaN(toFloat(s.availTop), 0), null),
		replaceNaN(toFloat(s.availLeft), null)
	];
}
function isFrameSizeNull(frameSize) {
	for (let i = 0; i < 4; ++i) if (frameSize[i]) return false;
	return true;
}
/**
* A version of the entropy source with stabilization to make it suitable for static fingerprinting.
*
* Firefox 143+ spoofs hardwareConcurrency (NavigatorHWConcurrency) in private browsing and strict ETP mode
* using tiered values: ≤4 cores -> 4, >4 cores -> 8. We apply the same tiering to stabilize the fingerprint
* across all browsing modes, since the tiering function is idempotent.
*
* @see https://bugzilla.mozilla.org/show_bug.cgi?id=1978414 Firefox processor count spoofing
* @see https://searchfox.org/firefox-main/source/dom/workers/RuntimeService.cpp#2057:~:text=if%20(MOZ_UNLIKELY(aRFPTiered))%20%7B
*/
function getHardwareConcurrency() {
	const value = getUnstableHardwareConcurrency();
	if (value !== void 0 && isGecko() && isGecko143OrNewer()) return value >= 8 ? 8 : 4;
	return value;
}
/**
* A version of the entropy source without stabilization.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function getUnstableHardwareConcurrency() {
	return replaceNaN(toInt(navigator.hardwareConcurrency), void 0);
}
function getTimezone() {
	var _a;
	const DateTimeFormat = (_a = window.Intl) === null || _a === void 0 ? void 0 : _a.DateTimeFormat;
	if (DateTimeFormat) {
		const timezone = new DateTimeFormat().resolvedOptions().timeZone;
		if (timezone) return timezone;
	}
	const offset = -getTimezoneOffset();
	return `UTC${offset >= 0 ? "+" : ""}${offset}`;
}
function getTimezoneOffset() {
	const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
	return Math.max(toFloat(new Date(currentYear, 0, 1).getTimezoneOffset()), toFloat(new Date(currentYear, 6, 1).getTimezoneOffset()));
}
function getSessionStorage() {
	try {
		return !!window.sessionStorage;
	} catch (error) {
		return true;
	}
}
function getLocalStorage() {
	try {
		return !!window.localStorage;
	} catch (e) {
		return true;
	}
}
function getIndexedDB() {
	if (isTrident() || isEdgeHTML()) return;
	try {
		return !!window.indexedDB;
	} catch (e) {
		return true;
	}
}
function getOpenDatabase() {
	return !!window.openDatabase;
}
function getCpuClass() {
	return navigator.cpuClass;
}
function getPlatform() {
	const { platform } = navigator;
	if (platform === "MacIntel") {
		if (isWebKit() && !isDesktopWebKit()) return isIPad() ? "iPad" : "iPhone";
	}
	return platform;
}
function getVendor() {
	return navigator.vendor || "";
}
/**
* Checks for browser-specific (not engine specific) global variables to tell browsers with the same engine apart.
* Only somewhat popular browsers are considered.
*/
function getVendorFlavors() {
	const flavors = [];
	for (const key of [
		"chrome",
		"safari",
		"__crWeb",
		"__gCrWeb",
		"yandex",
		"__yb",
		"__ybro",
		"__firefox__",
		"__edgeTrackingPreventionStatistics",
		"webkit",
		"oprt",
		"samsungAr",
		"ucweb",
		"UCShellJava",
		"puffinDevice"
	]) {
		const value = window[key];
		if (value && typeof value === "object") flavors.push(key);
	}
	return flavors.sort();
}
/**
* navigator.cookieEnabled cannot detect custom or nuanced cookie blocking configurations. For example, when blocking
* cookies via the Advanced Privacy Settings in IE9, it always returns true. And there have been issues in the past with
* site-specific exceptions. Don't rely on it.
*
* @see https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cookies.js Taken from here
*/
function areCookiesEnabled() {
	const d = document;
	try {
		d.cookie = "cookietest=1; SameSite=Strict;";
		const result = d.cookie.indexOf("cookietest=") !== -1;
		d.cookie = "cookietest=1; SameSite=Strict; expires=Thu, 01-Jan-1970 00:00:01 GMT";
		return result;
	} catch (e) {
		return false;
	}
}
/**
* Only single element selector are supported (no operators like space, +, >, etc).
* `embed` and `position: fixed;` will be considered as blocked anyway because it always has no offsetParent.
* Avoid `iframe` and anything with `[src=]` because they produce excess HTTP requests.
*
* The "inappropriate" selectors are obfuscated. See https://github.com/fingerprintjs/fingerprintjs/issues/734.
* A function is used instead of a plain object to help tree-shaking.
*
* The function code is generated automatically. See docs/content_blockers.md to learn how to make the list.
*/
function getFilters() {
	const fromB64 = atob;
	return {
		abpIndo: [
			"#Iklan-Melayang",
			"#Kolom-Iklan-728",
			"#SidebarIklan-wrapper",
			"[title=\"ALIENBOLA\" i]",
			fromB64("I0JveC1CYW5uZXItYWRz")
		],
		abpvn: [
			".quangcao",
			"#mobileCatfish",
			fromB64("LmNsb3NlLWFkcw=="),
			"[id^=\"bn_bottom_fixed_\"]",
			"#pmadv"
		],
		adBlockFinland: [
			".mainostila",
			fromB64("LnNwb25zb3JpdA=="),
			".ylamainos",
			fromB64("YVtocmVmKj0iL2NsaWNrdGhyZ2guYXNwPyJd"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9hcHAucmVhZHBlYWsuY29tL2FkcyJd")
		],
		adBlockPersian: [
			"#navbar_notice_50",
			".kadr",
			"TABLE[width=\"140px\"]",
			"#divAgahi",
			fromB64("YVtocmVmXj0iaHR0cDovL2cxLnYuZndtcm0ubmV0L2FkLyJd")
		],
		adBlockWarningRemoval: [
			"#adblock-honeypot",
			".adblocker-root",
			".wp_adblock_detect",
			fromB64("LmhlYWRlci1ibG9ja2VkLWFk"),
			fromB64("I2FkX2Jsb2NrZXI=")
		],
		adGuardAnnoyances: [
			".hs-sosyal",
			"#cookieconsentdiv",
			"div[class^=\"app_gdpr\"]",
			".as-oil",
			"[data-cypress=\"soft-push-notification-modal\"]"
		],
		adGuardBase: [
			".BetterJsPopOverlay",
			fromB64("I2FkXzMwMFgyNTA="),
			fromB64("I2Jhbm5lcmZsb2F0MjI="),
			fromB64("I2NhbXBhaWduLWJhbm5lcg=="),
			fromB64("I0FkLUNvbnRlbnQ=")
		],
		adGuardChinese: [
			fromB64("LlppX2FkX2FfSA=="),
			fromB64("YVtocmVmKj0iLmh0aGJldDM0LmNvbSJd"),
			"#widget-quan",
			fromB64("YVtocmVmKj0iLzg0OTkyMDIwLnh5eiJd"),
			fromB64("YVtocmVmKj0iLjE5NTZobC5jb20vIl0=")
		],
		adGuardFrench: [
			"#pavePub",
			fromB64("LmFkLWRlc2t0b3AtcmVjdGFuZ2xl"),
			".mobile_adhesion",
			".widgetadv",
			fromB64("LmFkc19iYW4=")
		],
		adGuardGerman: ["aside[data-portal-id=\"leaderboard\"]"],
		adGuardJapanese: [
			"#kauli_yad_1",
			fromB64("YVtocmVmXj0iaHR0cDovL2FkMi50cmFmZmljZ2F0ZS5uZXQvIl0="),
			fromB64("Ll9wb3BJbl9pbmZpbml0ZV9hZA=="),
			fromB64("LmFkZ29vZ2xl"),
			fromB64("Ll9faXNib29zdFJldHVybkFk")
		],
		adGuardMobile: [
			fromB64("YW1wLWF1dG8tYWRz"),
			fromB64("LmFtcF9hZA=="),
			"amp-embed[type=\"24smi\"]",
			"#mgid_iframe1",
			fromB64("I2FkX2ludmlld19hcmVh")
		],
		adGuardRussian: [
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9hZC5sZXRtZWFkcy5jb20vIl0="),
			fromB64("LnJlY2xhbWE="),
			"div[id^=\"smi2adblock\"]",
			fromB64("ZGl2W2lkXj0iQWRGb3hfYmFubmVyXyJd"),
			"#psyduckpockeball"
		],
		adGuardSocial: [
			fromB64("YVtocmVmXj0iLy93d3cuc3R1bWJsZXVwb24uY29tL3N1Ym1pdD91cmw9Il0="),
			fromB64("YVtocmVmXj0iLy90ZWxlZ3JhbS5tZS9zaGFyZS91cmw/Il0="),
			".etsy-tweet",
			"#inlineShare",
			".popup-social"
		],
		adGuardSpanishPortuguese: [
			"#barraPublicidade",
			"#Publicidade",
			"#publiEspecial",
			"#queTooltip",
			".cnt-publi"
		],
		adGuardTrackingProtection: [
			"#qoo-counter",
			fromB64("YVtocmVmXj0iaHR0cDovL2NsaWNrLmhvdGxvZy5ydS8iXQ=="),
			fromB64("YVtocmVmXj0iaHR0cDovL2hpdGNvdW50ZXIucnUvdG9wL3N0YXQucGhwIl0="),
			fromB64("YVtocmVmXj0iaHR0cDovL3RvcC5tYWlsLnJ1L2p1bXAiXQ=="),
			"#top100counter"
		],
		adGuardTurkish: [
			"#backkapat",
			fromB64("I3Jla2xhbWk="),
			fromB64("YVtocmVmXj0iaHR0cDovL2Fkc2Vydi5vbnRlay5jb20udHIvIl0="),
			fromB64("YVtocmVmXj0iaHR0cDovL2l6bGVuemkuY29tL2NhbXBhaWduLyJd"),
			fromB64("YVtocmVmXj0iaHR0cDovL3d3dy5pbnN0YWxsYWRzLm5ldC8iXQ==")
		],
		bulgarian: [
			fromB64("dGQjZnJlZW5ldF90YWJsZV9hZHM="),
			"#ea_intext_div",
			".lapni-pop-over",
			"#xenium_hot_offers"
		],
		easyList: [
			".yb-floorad",
			fromB64("LndpZGdldF9wb19hZHNfd2lkZ2V0"),
			fromB64("LnRyYWZmaWNqdW5reS1hZA=="),
			".textad_headline",
			fromB64("LnNwb25zb3JlZC10ZXh0LWxpbmtz")
		],
		easyListChina: [
			fromB64("LmFwcGd1aWRlLXdyYXBbb25jbGljayo9ImJjZWJvcy5jb20iXQ=="),
			fromB64("LmZyb250cGFnZUFkdk0="),
			"#taotaole",
			"#aafoot.top_box",
			".cfa_popup"
		],
		easyListCookie: [
			".ezmob-footer",
			".cc-CookieWarning",
			"[data-cookie-number]",
			fromB64("LmF3LWNvb2tpZS1iYW5uZXI="),
			".sygnal24-gdpr-modal-wrap"
		],
		easyListCzechSlovak: [
			"#onlajny-stickers",
			fromB64("I3Jla2xhbW5pLWJveA=="),
			fromB64("LnJla2xhbWEtbWVnYWJvYXJk"),
			".sklik",
			fromB64("W2lkXj0ic2tsaWtSZWtsYW1hIl0=")
		],
		easyListDutch: [
			fromB64("I2FkdmVydGVudGll"),
			fromB64("I3ZpcEFkbWFya3RCYW5uZXJCbG9jaw=="),
			".adstekst",
			fromB64("YVtocmVmXj0iaHR0cHM6Ly94bHR1YmUubmwvY2xpY2svIl0="),
			"#semilo-lrectangle"
		],
		easyListGermany: [
			"#SSpotIMPopSlider",
			fromB64("LnNwb25zb3JsaW5rZ3J1ZW4="),
			fromB64("I3dlcmJ1bmdza3k="),
			fromB64("I3Jla2xhbWUtcmVjaHRzLW1pdHRl"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9iZDc0Mi5jb20vIl0=")
		],
		easyListItaly: [
			fromB64("LmJveF9hZHZfYW5udW5jaQ=="),
			".sb-box-pubbliredazionale",
			fromB64("YVtocmVmXj0iaHR0cDovL2FmZmlsaWF6aW9uaWFkcy5zbmFpLml0LyJd"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9hZHNlcnZlci5odG1sLml0LyJd"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9hZmZpbGlhemlvbmlhZHMuc25haS5pdC8iXQ==")
		],
		easyListLithuania: [
			fromB64("LnJla2xhbW9zX3RhcnBhcw=="),
			fromB64("LnJla2xhbW9zX251b3JvZG9z"),
			fromB64("aW1nW2FsdD0iUmVrbGFtaW5pcyBza3lkZWxpcyJd"),
			fromB64("aW1nW2FsdD0iRGVkaWt1b3RpLmx0IHNlcnZlcmlhaSJd"),
			fromB64("aW1nW2FsdD0iSG9zdGluZ2FzIFNlcnZlcmlhaS5sdCJd")
		],
		estonian: [fromB64("QVtocmVmKj0iaHR0cDovL3BheTRyZXN1bHRzMjQuZXUiXQ==")],
		fanboyAnnoyances: [
			"#ac-lre-player",
			".navigate-to-top",
			"#subscribe_popup",
			".newsletter_holder",
			"#back-top"
		],
		fanboyAntiFacebook: [".util-bar-module-firefly-visible"],
		fanboyEnhancedTrackers: [
			".open.pushModal",
			"#issuem-leaky-paywall-articles-zero-remaining-nag",
			"#sovrn_container",
			"div[class$=\"-hide\"][zoompage-fontsize][style=\"display: block;\"]",
			".BlockNag__Card"
		],
		fanboySocial: [
			"#FollowUs",
			"#meteored_share",
			"#social_follow",
			".article-sharer",
			".community__social-desc"
		],
		frellwitSwedish: [
			fromB64("YVtocmVmKj0iY2FzaW5vcHJvLnNlIl1bdGFyZ2V0PSJfYmxhbmsiXQ=="),
			fromB64("YVtocmVmKj0iZG9rdG9yLXNlLm9uZWxpbmsubWUiXQ=="),
			"article.category-samarbete",
			fromB64("ZGl2LmhvbGlkQWRz"),
			"ul.adsmodern"
		],
		greekAdBlock: [
			fromB64("QVtocmVmKj0iYWRtYW4ub3RlbmV0LmdyL2NsaWNrPyJd"),
			fromB64("QVtocmVmKj0iaHR0cDovL2F4aWFiYW5uZXJzLmV4b2R1cy5nci8iXQ=="),
			fromB64("QVtocmVmKj0iaHR0cDovL2ludGVyYWN0aXZlLmZvcnRobmV0LmdyL2NsaWNrPyJd"),
			"DIV.agores300",
			"TABLE.advright"
		],
		hungarian: [
			"#cemp_doboz",
			".optimonk-iframe-container",
			fromB64("LmFkX19tYWlu"),
			fromB64("W2NsYXNzKj0iR29vZ2xlQWRzIl0="),
			"#hirdetesek_box"
		],
		iDontCareAboutCookies: [
			".alert-info[data-block-track*=\"CookieNotice\"]",
			".ModuleTemplateCookieIndicator",
			".o--cookies--container",
			"#cookies-policy-sticky",
			"#stickyCookieBar"
		],
		icelandicAbp: [fromB64("QVtocmVmXj0iL2ZyYW1ld29yay9yZXNvdXJjZXMvZm9ybXMvYWRzLmFzcHgiXQ==")],
		latvian: [fromB64("YVtocmVmPSJodHRwOi8vd3d3LnNhbGlkemluaS5sdi8iXVtzdHlsZT0iZGlzcGxheTogYmxvY2s7IHdpZHRoOiAxMjBweDsgaGVpZ2h0OiA0MHB4OyBvdmVyZmxvdzogaGlkZGVuOyBwb3NpdGlvbjogcmVsYXRpdmU7Il0="), fromB64("YVtocmVmPSJodHRwOi8vd3d3LnNhbGlkemluaS5sdi8iXVtzdHlsZT0iZGlzcGxheTogYmxvY2s7IHdpZHRoOiA4OHB4OyBoZWlnaHQ6IDMxcHg7IG92ZXJmbG93OiBoaWRkZW47IHBvc2l0aW9uOiByZWxhdGl2ZTsiXQ==")],
		listKr: [
			fromB64("YVtocmVmKj0iLy9hZC5wbGFuYnBsdXMuY28ua3IvIl0="),
			fromB64("I2xpdmVyZUFkV3JhcHBlcg=="),
			fromB64("YVtocmVmKj0iLy9hZHYuaW1hZHJlcC5jby5rci8iXQ=="),
			fromB64("aW5zLmZhc3R2aWV3LWFk"),
			".revenue_unit_item.dable"
		],
		listeAr: [
			fromB64("LmdlbWluaUxCMUFk"),
			".right-and-left-sponsers",
			fromB64("YVtocmVmKj0iLmFmbGFtLmluZm8iXQ=="),
			fromB64("YVtocmVmKj0iYm9vcmFxLm9yZyJd"),
			fromB64("YVtocmVmKj0iZHViaXp6bGUuY29tL2FyLz91dG1fc291cmNlPSJd")
		],
		listeFr: [
			fromB64("YVtocmVmXj0iaHR0cDovL3Byb21vLnZhZG9yLmNvbS8iXQ=="),
			fromB64("I2FkY29udGFpbmVyX3JlY2hlcmNoZQ=="),
			fromB64("YVtocmVmKj0id2Vib3JhbWEuZnIvZmNnaS1iaW4vIl0="),
			".site-pub-interstitiel",
			"div[id^=\"crt-\"][data-criteo-id]"
		],
		officialPolish: [
			"#ceneo-placeholder-ceneo-12",
			fromB64("W2hyZWZePSJodHRwczovL2FmZi5zZW5kaHViLnBsLyJd"),
			fromB64("YVtocmVmXj0iaHR0cDovL2Fkdm1hbmFnZXIudGVjaGZ1bi5wbC9yZWRpcmVjdC8iXQ=="),
			fromB64("YVtocmVmXj0iaHR0cDovL3d3dy50cml6ZXIucGwvP3V0bV9zb3VyY2UiXQ=="),
			fromB64("ZGl2I3NrYXBpZWNfYWQ=")
		],
		ro: [
			fromB64("YVtocmVmXj0iLy9hZmZ0cmsuYWx0ZXgucm8vQ291bnRlci9DbGljayJd"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9ibGFja2ZyaWRheXNhbGVzLnJvL3Ryay9zaG9wLyJd"),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9ldmVudC4ycGVyZm9ybWFudC5jb20vZXZlbnRzL2NsaWNrIl0="),
			fromB64("YVtocmVmXj0iaHR0cHM6Ly9sLnByb2ZpdHNoYXJlLnJvLyJd"),
			"a[href^=\"/url/\"]"
		],
		ruAd: [
			fromB64("YVtocmVmKj0iLy9mZWJyYXJlLnJ1LyJd"),
			fromB64("YVtocmVmKj0iLy91dGltZy5ydS8iXQ=="),
			fromB64("YVtocmVmKj0iOi8vY2hpa2lkaWtpLnJ1Il0="),
			"#pgeldiz",
			".yandex-rtb-block"
		],
		thaiAds: [
			"a[href*=macau-uta-popup]",
			fromB64("I2Fkcy1nb29nbGUtbWlkZGxlX3JlY3RhbmdsZS1ncm91cA=="),
			fromB64("LmFkczMwMHM="),
			".bumq",
			".img-kosana"
		],
		webAnnoyancesUltralist: [
			"#mod-social-share-2",
			"#social-tools",
			fromB64("LmN0cGwtZnVsbGJhbm5lcg=="),
			".zergnet-recommend",
			".yt.btn-link.btn-md.btn"
		]
	};
}
/**
* The order of the returned array means nothing (it's always sorted alphabetically).
*
* Notice that the source is slightly unstable.
* Safari provides a 2-taps way to disable all content blockers on a page temporarily.
* Also content blockers can be disabled permanently for a domain, but it requires 4 taps.
* So empty array shouldn't be treated as "no blockers", it should be treated as "no signal".
* If you are a website owner, don't make your visitors want to disable content blockers.
*/
async function getDomBlockers({ debug } = {}) {
	if (!isApplicable()) return;
	const filters = getFilters();
	const filterNames = Object.keys(filters);
	const blockedSelectors = await getBlockedSelectors([].concat(...filterNames.map((filterName) => filters[filterName])));
	if (debug) printDebug(filters, blockedSelectors);
	const activeBlockers = filterNames.filter((filterName) => {
		const selectors = filters[filterName];
		return countTruthy(selectors.map((selector) => blockedSelectors[selector])) > selectors.length * .6;
	});
	activeBlockers.sort();
	return activeBlockers;
}
function isApplicable() {
	return isWebKit() || isAndroid();
}
async function getBlockedSelectors(selectors) {
	var _a;
	const d = document;
	const root = d.createElement("div");
	const elements = new Array(selectors.length);
	const blockedSelectors = {};
	forceShow(root);
	for (let i = 0; i < selectors.length; ++i) {
		const element = selectorToElement(selectors[i]);
		if (element.tagName === "DIALOG") element.show();
		const holder = d.createElement("div");
		forceShow(holder);
		holder.appendChild(element);
		root.appendChild(holder);
		elements[i] = element;
	}
	while (!d.body) await wait(50);
	d.body.appendChild(root);
	try {
		for (let i = 0; i < selectors.length; ++i) if (!elements[i].offsetParent) blockedSelectors[selectors[i]] = true;
	} finally {
		(_a = root.parentNode) === null || _a === void 0 || _a.removeChild(root);
	}
	return blockedSelectors;
}
function forceShow(element) {
	element.style.setProperty("visibility", "hidden", "important");
	element.style.setProperty("display", "block", "important");
}
function printDebug(filters, blockedSelectors) {
	let message = "DOM blockers debug:\n```";
	for (const filterName of Object.keys(filters)) {
		message += `\n${filterName}:`;
		for (const selector of filters[filterName]) message += `\n  ${blockedSelectors[selector] ? "🚫" : "➡️"} ${selector}`;
	}
	console.log(`${message}\n\`\`\``);
}
/**
* @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/color-gamut
*/
function getColorGamut() {
	for (const gamut of [
		"rec2020",
		"p3",
		"srgb"
	]) if (matchMedia(`(color-gamut: ${gamut})`).matches) return gamut;
}
/**
* @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/inverted-colors
*/
function areColorsInverted() {
	if (doesMatch$5("inverted")) return true;
	if (doesMatch$5("none")) return false;
}
function doesMatch$5(value) {
	return matchMedia(`(inverted-colors: ${value})`).matches;
}
/**
* @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
*/
function areColorsForced() {
	if (doesMatch$4("active")) return true;
	if (doesMatch$4("none")) return false;
}
function doesMatch$4(value) {
	return matchMedia(`(forced-colors: ${value})`).matches;
}
var maxValueToCheck = 100;
/**
* If the display is monochrome (e.g. black&white), the value will be ≥0 and will mean the number of bits per pixel.
* If the display is not monochrome, the returned value will be 0.
* If the browser doesn't support this feature, the returned value will be undefined.
*
* @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/monochrome
*/
function getMonochromeDepth() {
	if (!matchMedia("(min-monochrome: 0)").matches) return;
	for (let i = 0; i <= maxValueToCheck; ++i) if (matchMedia(`(max-monochrome: ${i})`).matches) return i;
	throw new Error("Too high value");
}
/**
* @see https://www.w3.org/TR/mediaqueries-5/#prefers-contrast
* @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast
*/
function getContrastPreference() {
	if (doesMatch$3("no-preference")) return 0;
	if (doesMatch$3("high") || doesMatch$3("more")) return 1;
	if (doesMatch$3("low") || doesMatch$3("less")) return -1;
	if (doesMatch$3("forced")) return 10;
}
function doesMatch$3(value) {
	return matchMedia(`(prefers-contrast: ${value})`).matches;
}
/**
* @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
*/
function isMotionReduced() {
	if (doesMatch$2("reduce")) return true;
	if (doesMatch$2("no-preference")) return false;
}
function doesMatch$2(value) {
	return matchMedia(`(prefers-reduced-motion: ${value})`).matches;
}
/**
* @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency
*/
function isTransparencyReduced() {
	if (doesMatch$1("reduce")) return true;
	if (doesMatch$1("no-preference")) return false;
}
function doesMatch$1(value) {
	return matchMedia(`(prefers-reduced-transparency: ${value})`).matches;
}
/**
* @see https://www.w3.org/TR/mediaqueries-5/#dynamic-range
*/
function isHDR() {
	if (doesMatch("high")) return true;
	if (doesMatch("standard")) return false;
}
function doesMatch(value) {
	return matchMedia(`(dynamic-range: ${value})`).matches;
}
var M = Math;
var fallbackFn = () => 0;
/**
* @see https://gitlab.torproject.org/legacy/trac/-/issues/13018
* @see https://bugzilla.mozilla.org/show_bug.cgi?id=531915
*/
function getMathFingerprint() {
	const acos = M.acos || fallbackFn;
	const acosh = M.acosh || fallbackFn;
	const asin = M.asin || fallbackFn;
	const asinh = M.asinh || fallbackFn;
	const atanh = M.atanh || fallbackFn;
	const atan = M.atan || fallbackFn;
	const sin = M.sin || fallbackFn;
	const sinh = M.sinh || fallbackFn;
	const cos = M.cos || fallbackFn;
	const cosh = M.cosh || fallbackFn;
	const tan = M.tan || fallbackFn;
	const tanh = M.tanh || fallbackFn;
	const exp = M.exp || fallbackFn;
	const expm1 = M.expm1 || fallbackFn;
	const log1p = M.log1p || fallbackFn;
	const powPI = (value) => M.pow(M.PI, value);
	const acoshPf = (value) => M.log(value + M.sqrt(value * value - 1));
	const asinhPf = (value) => M.log(value + M.sqrt(value * value + 1));
	const atanhPf = (value) => M.log((1 + value) / (1 - value)) / 2;
	const sinhPf = (value) => M.exp(value) - 1 / M.exp(value) / 2;
	const coshPf = (value) => (M.exp(value) + 1 / M.exp(value)) / 2;
	const expm1Pf = (value) => M.exp(value) - 1;
	const tanhPf = (value) => (M.exp(2 * value) - 1) / (M.exp(2 * value) + 1);
	const log1pPf = (value) => M.log(1 + value);
	return {
		acos: acos(.12312423423423424),
		acosh: acosh(1e308),
		acoshPf: acoshPf(1e154),
		asin: asin(.12312423423423424),
		asinh: asinh(1),
		asinhPf: asinhPf(1),
		atanh: atanh(.5),
		atanhPf: atanhPf(.5),
		atan: atan(.5),
		sin: sin(-1e300),
		sinh: sinh(1),
		sinhPf: sinhPf(1),
		cos: cos(10.000000000123),
		cosh: cosh(1),
		coshPf: coshPf(1),
		tan: tan(-1e300),
		tanh: tanh(1),
		tanhPf: tanhPf(1),
		exp: exp(1),
		expm1: expm1(1),
		expm1Pf: expm1Pf(1),
		log1p: log1p(10),
		log1pPf: log1pPf(10),
		powPI: powPI(-100)
	};
}
/**
* We use m or w because these two characters take up the maximum width.
* Also there are a couple of ligatures.
*/
var defaultText = "mmMwWLliI0fiflO&1";
/**
* Settings of text blocks to measure. The keys are random but persistent words.
*/
var presets = {
	/**
	* The default font. User can change it in desktop Chrome, desktop Firefox, IE 11,
	* Android Chrome (but only when the size is ≥ than the default) and Android Firefox.
	*/
	default: [],
	/** OS font on macOS. User can change its size and weight. Applies after Safari restart. */
	apple: [{ font: "-apple-system-body" }],
	/** User can change it in desktop Chrome and desktop Firefox. */
	serif: [{ fontFamily: "serif" }],
	/** User can change it in desktop Chrome and desktop Firefox. */
	sans: [{ fontFamily: "sans-serif" }],
	/** User can change it in desktop Chrome and desktop Firefox. */
	mono: [{ fontFamily: "monospace" }],
	/**
	* Check the smallest allowed font size. User can change it in desktop Chrome, desktop Firefox and desktop Safari.
	* The height can be 0 in Chrome on a retina display.
	*/
	min: [{ fontSize: "1px" }],
	/** Tells one OS from another in desktop Chrome. */
	system: [{ fontFamily: "system-ui" }]
};
/**
* The result is a dictionary of the width of the text samples.
* Heights aren't included because they give no extra entropy and are unstable.
*
* The result is very stable in IE 11, Edge 18 and Safari 14.
* The result changes when the OS pixel density changes in Chromium 87. The real pixel density is required to solve,
* but seems like it's impossible: https://stackoverflow.com/q/1713771/1118709.
* The "min" and the "mono" (only on Windows) value may change when the page is zoomed in Firefox 87.
*/
function getFontPreferences() {
	return withNaturalFonts((document, container, iframeWindow) => {
		const elements = {};
		const sizes = {};
		for (const key of Object.keys(presets)) {
			const [style = {}, text = defaultText] = presets[key];
			const element = document.createElement("span");
			element.textContent = text;
			element.style.whiteSpace = "nowrap";
			for (const name of Object.keys(style)) {
				const value = style[name];
				if (value !== void 0) element.style[name] = value;
			}
			elements[key] = element;
			container.append(document.createElement("br"), element);
		}
		const shouldNormalizeMeasurement = isChromium() && isChromium128OrNewer();
		for (const key of Object.keys(presets)) {
			const rawWidth = elements[key].getBoundingClientRect().width;
			sizes[key] = shouldNormalizeMeasurement ? normalizeFontMeasurement(rawWidth * iframeWindow.devicePixelRatio) : rawWidth;
		}
		return sizes;
	});
}
/**
* Floor font measurement values to reduce floating-point errors and maintain stability
* - On Android: rounds to whole numbers for maximum stability across devices
* - On other platforms: rounds down to 3 decimal places
*/
function normalizeFontMeasurement(value) {
	const decimals = isAndroid() ? 0 : 3;
	const pow = Math.pow(10, decimals);
	return Math.floor(value * pow) / pow;
}
/**
* Creates a DOM environment that provides the most natural font available, including Android OS font.
* Measurements of the elements are zoom-independent.
* Don't put a content to measure inside an absolutely positioned element.
*/
function withNaturalFonts(action, containerWidthPx = 4e3) {
	return withIframe((_, iframeWindow) => {
		const iframeDocument = iframeWindow.document;
		const iframeBody = iframeDocument.body;
		const bodyStyle = iframeBody.style;
		bodyStyle.width = `${containerWidthPx}px`;
		bodyStyle.webkitTextSizeAdjust = bodyStyle.textSizeAdjust = "none";
		if (isChromium()) iframeBody.style.zoom = `${1 / iframeWindow.devicePixelRatio}`;
		else if (isWebKit()) iframeBody.style.zoom = "reset";
		const linesOfText = iframeDocument.createElement("div");
		linesOfText.textContent = [...Array(containerWidthPx / 20 << 0)].map(() => "word").join(" ");
		iframeBody.appendChild(linesOfText);
		return action(iframeDocument, iframeBody, iframeWindow);
	}, "<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
}
function isPdfViewerEnabled() {
	return navigator.pdfViewerEnabled;
}
/**
* Unlike most other architectures, on x86/x86-64 when floating-point instructions
* have no NaN arguments, but produce NaN output, the output NaN has sign bit set.
* We use it to distinguish x86/x86-64 from other architectures, by doing subtraction
* of two infinities (must produce NaN per IEEE 754 standard).
*
* See https://codebrowser.bddppq.com/pytorch/pytorch/third_party/XNNPACK/src/init.c.html#79
*/
function getArchitecture() {
	const f = /* @__PURE__ */ new Float32Array(1);
	const u8 = new Uint8Array(f.buffer);
	f[0] = Infinity;
	f[0] = f[0] - f[0];
	return u8[3];
}
/**
* The return type is a union instead of the enum, because it's too challenging to embed the const enum into another
* project. Turning it into a union is a simple and an elegant solution.
*/
function getApplePayState() {
	const { ApplePaySession } = window;
	if (typeof (ApplePaySession === null || ApplePaySession === void 0 ? void 0 : ApplePaySession.canMakePayments) !== "function") return -1;
	if (willPrintConsoleError()) return -3;
	try {
		return ApplePaySession.canMakePayments() ? 1 : 0;
	} catch (error) {
		return getStateFromError(error);
	}
}
/**
* Starting from Safari 15 calling `ApplePaySession.canMakePayments()` produces this error message when FingerprintJS
* runs in an iframe with a cross-origin parent page, and the iframe on that page has no allow="payment *" attribute:
*   Feature policy 'Payment' check failed for element with origin 'https://example.com' and allow attribute ''.
* This function checks whether the error message is expected.
*
* We check for cross-origin parents, which is prone to false-positive results. Instead, we should check for allowed
* feature/permission, but we can't because none of these API works in Safari yet:
*   navigator.permissions.query({ name: ‘payment' })
*   navigator.permissions.query({ name: ‘payment-handler' })
*   document.featurePolicy
*/
var willPrintConsoleError = isAnyParentCrossOrigin;
function getStateFromError(error) {
	if (error instanceof Error && error.name === "InvalidAccessError" && /\bfrom\b.*\binsecure\b/i.test(error.message)) return -2;
	throw error;
}
/**
* Checks whether the Safari's Privacy Preserving Ad Measurement setting is on.
* The setting is on when the value is not undefined.
* A.k.a. private click measurement, privacy-preserving ad attribution.
*
* Unfortunately, it doesn't work in mobile Safari.
* Probably, it will start working in mobile Safari or stop working in desktop Safari later.
* We've found no way to detect the setting state in mobile Safari. Help wanted.
*
* @see https://webkit.org/blog/11529/introducing-private-click-measurement-pcm/
* @see https://developer.apple.com/videos/play/wwdc2021/10033
*/
function getPrivateClickMeasurement() {
	var _a;
	const link = document.createElement("a");
	const sourceId = (_a = link.attributionSourceId) !== null && _a !== void 0 ? _a : link.attributionsourceid;
	return sourceId === void 0 ? void 0 : String(sourceId);
}
/** WebGl context is not available */
var STATUS_NO_GL_CONTEXT = -1;
/** WebGL context `getParameter` method is not a function */
var STATUS_GET_PARAMETER_NOT_A_FUNCTION = -2;
var validContextParameters = /* @__PURE__ */ new Set([
	10752,
	2849,
	2884,
	2885,
	2886,
	2928,
	2929,
	2930,
	2931,
	2932,
	2960,
	2961,
	2962,
	2963,
	2964,
	2965,
	2966,
	2967,
	2968,
	2978,
	3024,
	3042,
	3088,
	3089,
	3106,
	3107,
	32773,
	32777,
	32777,
	32823,
	32824,
	32936,
	32937,
	32938,
	32939,
	32968,
	32969,
	32970,
	32971,
	3317,
	33170,
	3333,
	3379,
	3386,
	33901,
	33902,
	34016,
	34024,
	34076,
	3408,
	3410,
	3411,
	3412,
	3413,
	3414,
	3415,
	34467,
	34816,
	34817,
	34818,
	34819,
	34877,
	34921,
	34930,
	35660,
	35661,
	35724,
	35738,
	35739,
	36003,
	36004,
	36005,
	36347,
	36348,
	36349,
	37440,
	37441,
	37443,
	7936,
	7937,
	7938
]);
var validExtensionParams = /* @__PURE__ */ new Set([
	34047,
	35723,
	36063,
	34852,
	34853,
	34854,
	34229,
	36392,
	36795,
	38449
]);
var shaderTypes = ["FRAGMENT_SHADER", "VERTEX_SHADER"];
var precisionTypes = [
	"LOW_FLOAT",
	"MEDIUM_FLOAT",
	"HIGH_FLOAT",
	"LOW_INT",
	"MEDIUM_INT",
	"HIGH_INT"
];
var rendererInfoExtensionName = "WEBGL_debug_renderer_info";
var polygonModeExtensionName = "WEBGL_polygon_mode";
/**
* Gets the basic and simple WebGL parameters
*/
function getWebGlBasics({ cache }) {
	var _a, _b, _c, _d, _e, _f;
	const gl = getWebGLContext(cache);
	if (!gl) return STATUS_NO_GL_CONTEXT;
	if (!isValidParameterGetter(gl)) return STATUS_GET_PARAMETER_NOT_A_FUNCTION;
	const debugExtension = shouldAvoidDebugRendererInfo() ? null : gl.getExtension(rendererInfoExtensionName);
	return {
		version: ((_a = gl.getParameter(gl.VERSION)) === null || _a === void 0 ? void 0 : _a.toString()) || "",
		vendor: ((_b = gl.getParameter(gl.VENDOR)) === null || _b === void 0 ? void 0 : _b.toString()) || "",
		vendorUnmasked: debugExtension ? (_c = gl.getParameter(debugExtension.UNMASKED_VENDOR_WEBGL)) === null || _c === void 0 ? void 0 : _c.toString() : "",
		renderer: ((_d = gl.getParameter(gl.RENDERER)) === null || _d === void 0 ? void 0 : _d.toString()) || "",
		rendererUnmasked: debugExtension ? (_e = gl.getParameter(debugExtension.UNMASKED_RENDERER_WEBGL)) === null || _e === void 0 ? void 0 : _e.toString() : "",
		shadingLanguageVersion: ((_f = gl.getParameter(gl.SHADING_LANGUAGE_VERSION)) === null || _f === void 0 ? void 0 : _f.toString()) || ""
	};
}
/**
* Gets the advanced and massive WebGL parameters and extensions
*/
function getWebGlExtensions({ cache }) {
	const gl = getWebGLContext(cache);
	if (!gl) return STATUS_NO_GL_CONTEXT;
	if (!isValidParameterGetter(gl)) return STATUS_GET_PARAMETER_NOT_A_FUNCTION;
	const extensions = gl.getSupportedExtensions();
	const contextAttributes = gl.getContextAttributes();
	const unsupportedExtensions = [];
	const attributes = [];
	const parameters = [];
	const extensionParameters = [];
	const shaderPrecisions = [];
	if (contextAttributes) for (const attributeName of Object.keys(contextAttributes)) attributes.push(`${attributeName}=${contextAttributes[attributeName]}`);
	const constants = getConstantsFromPrototype(gl);
	for (const constant of constants) {
		const code = gl[constant];
		parameters.push(`${constant}=${code}${validContextParameters.has(code) ? `=${gl.getParameter(code)}` : ""}`);
	}
	if (extensions) for (const name of extensions) {
		if (name === rendererInfoExtensionName && shouldAvoidDebugRendererInfo() || name === polygonModeExtensionName && shouldAvoidPolygonModeExtensions()) continue;
		const extension = gl.getExtension(name);
		if (!extension) {
			unsupportedExtensions.push(name);
			continue;
		}
		for (const constant of getConstantsFromPrototype(extension)) {
			const code = extension[constant];
			extensionParameters.push(`${constant}=${code}${validExtensionParams.has(code) ? `=${gl.getParameter(code)}` : ""}`);
		}
	}
	for (const shaderType of shaderTypes) for (const precisionType of precisionTypes) {
		const shaderPrecision = getShaderPrecision(gl, shaderType, precisionType);
		shaderPrecisions.push(`${shaderType}.${precisionType}=${shaderPrecision.join(",")}`);
	}
	extensionParameters.sort();
	parameters.sort();
	return {
		contextAttributes: attributes,
		parameters,
		shaderPrecisions,
		extensions,
		extensionParameters,
		unsupportedExtensions
	};
}
/**
* This function usually takes the most time to execute in all the sources, therefore we cache its result.
*
* Warning for package users:
* This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
*/
function getWebGLContext(cache) {
	if (cache.webgl) return cache.webgl.context;
	const canvas = document.createElement("canvas");
	let context;
	canvas.addEventListener("webglCreateContextError", () => context = void 0);
	for (const type of ["webgl", "experimental-webgl"]) {
		try {
			context = canvas.getContext(type);
		} catch (_a) {}
		if (context) break;
	}
	cache.webgl = { context };
	return context;
}
/**
* https://developer.mozilla.org/en-US/docs/Web/API/WebGLShaderPrecisionFormat
* https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getShaderPrecisionFormat
* https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.12
*/
function getShaderPrecision(gl, shaderType, precisionType) {
	const shaderPrecision = gl.getShaderPrecisionFormat(gl[shaderType], gl[precisionType]);
	return shaderPrecision ? [
		shaderPrecision.rangeMin,
		shaderPrecision.rangeMax,
		shaderPrecision.precision
	] : [];
}
function getConstantsFromPrototype(obj) {
	return Object.keys(obj.__proto__).filter(isConstantLike);
}
function isConstantLike(key) {
	return typeof key === "string" && !key.match(/[^A-Z0-9_x]/);
}
/**
* Some browsers print a console warning when the WEBGL_debug_renderer_info extension is requested.
* JS Agent aims to avoid printing messages to console, so we avoid this extension in that browsers.
*/
function shouldAvoidDebugRendererInfo() {
	return isGecko();
}
/**
* Some browsers print a console warning when the WEBGL_polygon_mode extension is requested.
* JS Agent aims to avoid printing messages to console, so we avoid this extension in that browsers.
*/
function shouldAvoidPolygonModeExtensions() {
	return isChromium() || isWebKit();
}
/**
* Some unknown browsers have no `getParameter` method
*/
function isValidParameterGetter(gl) {
	return typeof gl.getParameter === "function";
}
function getAudioContextBaseLatency() {
	if (!(isAndroid() || isWebKit())) return -2;
	if (!window.AudioContext) return -1;
	const latency = new AudioContext().baseLatency;
	if (latency === null || latency === void 0) return -1;
	if (!isFinite(latency)) return -3;
	return latency;
}
/**
* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions
*
* The return type is a union instead of a const enum due to the difficulty of embedding const enums in other projects.
* This makes integration simpler and more elegant.
*/
function getDateTimeLocale() {
	if (!window.Intl) return -1;
	const DateTimeFormat = window.Intl.DateTimeFormat;
	if (!DateTimeFormat) return -2;
	const locale = DateTimeFormat().resolvedOptions().locale;
	if (!locale && locale !== "") return -3;
	return locale;
}
function isGreaseBrand(brand) {
	return /not/i.test(brand);
}
/**
* Collects browser and OS identity data from the User-Agent Client Hints API.
* Only available in Chromium-based browsers (Chrome, Edge, Opera, Brave).
*
* @see https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API
*/
async function getUserAgentData() {
	const uaData = navigator.userAgentData;
	if (!uaData) return;
	const filteredBrands = uaData.brands.filter(({ brand }) => !isGreaseBrand(brand)).map(({ brand }) => brand);
	const result = {
		brands: filteredBrands.length > 1 ? filteredBrands.filter((b) => b !== "Chromium") : filteredBrands,
		mobile: uaData.mobile,
		platform: uaData.platform
	};
	if (uaData.getHighEntropyValues) try {
		const highEntropy = await uaData.getHighEntropyValues([
			"architecture",
			"bitness",
			"model",
			"platformVersion"
		]);
		result.architecture = highEntropy.architecture;
		result.bitness = highEntropy.bitness;
		result.model = highEntropy.model;
		result.platformVersion = highEntropy.platformVersion;
	} catch (error) {
		if (error instanceof DOMException && error.name === "NotAllowedError") result.highEntropyStatus = "not_allowed";
		else throw error;
	}
	return result;
}
/**
* The list of entropy sources used to make visitor identifiers.
*
* This value isn't restricted by Semantic Versioning, i.e. it may be changed without bumping minor or major version of
* this package.
*
* Note: Rollup and Webpack are smart enough to remove unused properties of this object during tree-shaking, so there is
* no need to export the sources individually.
*/
var sources = {
	userAgentData: getUserAgentData,
	fonts: getFonts,
	domBlockers: getDomBlockers,
	fontPreferences: getFontPreferences,
	audio: getAudioFingerprint,
	screenFrame: getScreenFrame,
	canvas: getCanvasFingerprint,
	osCpu: getOsCpu,
	languages: getLanguages,
	colorDepth: getColorDepth,
	deviceMemory: getDeviceMemory,
	screenResolution: getScreenResolution,
	hardwareConcurrency: getHardwareConcurrency,
	timezone: getTimezone,
	sessionStorage: getSessionStorage,
	localStorage: getLocalStorage,
	indexedDB: getIndexedDB,
	openDatabase: getOpenDatabase,
	cpuClass: getCpuClass,
	platform: getPlatform,
	plugins: getPlugins,
	touchSupport: getTouchSupport,
	vendor: getVendor,
	vendorFlavors: getVendorFlavors,
	cookiesEnabled: areCookiesEnabled,
	colorGamut: getColorGamut,
	invertedColors: areColorsInverted,
	forcedColors: areColorsForced,
	monochrome: getMonochromeDepth,
	contrast: getContrastPreference,
	reducedMotion: isMotionReduced,
	reducedTransparency: isTransparencyReduced,
	hdr: isHDR,
	math: getMathFingerprint,
	pdfViewerEnabled: isPdfViewerEnabled,
	architecture: getArchitecture,
	applePay: getApplePayState,
	privateClickMeasurement: getPrivateClickMeasurement,
	audioBaseLatency: getAudioContextBaseLatency,
	dateTimeLocale: getDateTimeLocale,
	webGlBasics: getWebGlBasics,
	webGlExtensions: getWebGlExtensions
};
/**
* Loads the built-in entropy sources.
* Returns a function that collects the entropy components to make the visitor identifier.
*/
function loadBuiltinSources(options) {
	return loadSources(sources, options, []);
}
var commentTemplate = "$ if upgrade to Pro: https://fingerprint.com/github/?utm_source=oss&utm_medium=referral&utm_campaign=confidence_score";
function getConfidence(components) {
	const openConfidenceScore = getOpenConfidenceScore(components);
	const proConfidenceScore = deriveProConfidenceScore(openConfidenceScore);
	return {
		score: openConfidenceScore,
		comment: commentTemplate.replace(/\$/g, `${proConfidenceScore}`)
	};
}
function getOpenConfidenceScore(components) {
	if (isAndroid()) return .4;
	if (isWebKit()) return isDesktopWebKit() && !(isWebKit616OrNewer() && isSafariWebKit()) ? .5 : .3;
	const platform = "value" in components.platform ? components.platform.value : "";
	if (/^Win/.test(platform)) return .6;
	if (/^Mac/.test(platform)) return .5;
	return .7;
}
function deriveProConfidenceScore(openConfidenceScore) {
	return round(.99 + .01 * openConfidenceScore, 1e-4);
}
function componentsToCanonicalString(components) {
	let result = "";
	for (const componentKey of Object.keys(components).sort()) {
		const component = components[componentKey];
		const value = "error" in component ? "error" : JSON.stringify(component.value);
		result += `${result ? "|" : ""}${componentKey.replace(/([:|\\])/g, "\\$1")}:${value}`;
	}
	return result;
}
function componentsToDebugString(components) {
	return JSON.stringify(components, (_key, value) => {
		if (value instanceof Error) return errorToObject(value);
		return value;
	}, 2);
}
function hashComponents(components) {
	return x64hash128(componentsToCanonicalString(components));
}
/**
* Makes a GetResult implementation that calculates the visitor id hash on demand.
* Designed for optimisation.
*/
function makeLazyGetResult(components) {
	let visitorIdCache;
	return {
		get visitorId() {
			if (visitorIdCache === void 0) visitorIdCache = hashComponents(this.components);
			return visitorIdCache;
		},
		set visitorId(visitorId) {
			visitorIdCache = visitorId;
		},
		confidence: getConfidence(components),
		components,
		version
	};
}
/**
* A delay is required to ensure consistent entropy components.
* See https://github.com/fingerprintjs/fingerprintjs/issues/254
* and https://github.com/fingerprintjs/fingerprintjs/issues/307
* and https://github.com/fingerprintjs/fingerprintjs/commit/945633e7c5f67ae38eb0fea37349712f0e669b18
*/
function prepareForSources(delayFallback = 50) {
	return requestIdleCallbackIfAvailable(delayFallback, delayFallback * 2);
}
/**
* The function isn't exported from the index file to not allow to call it without `load()`.
* The hiding gives more freedom for future non-breaking updates.
*
* A factory function is used instead of a class to shorten the attribute names in the minified code.
* Native private class fields could've been used, but TypeScript doesn't allow them with `"target": "es5"`.
*/
function makeAgent(getComponents, debug) {
	const creationTime = Date.now();
	return { async get(options) {
		const startTime = Date.now();
		const components = await getComponents();
		const result = makeLazyGetResult(components);
		if (debug || (options === null || options === void 0 ? void 0 : options.debug)) console.log(`Copy the text below to get the debug data:

\`\`\`
version: ${result.version}
userAgent: ${navigator.userAgent}
timeBetweenLoadAndGet: ${startTime - creationTime}
visitorId: ${result.visitorId}
components: ${componentsToDebugString(components)}
\`\`\``);
		return result;
	} };
}
/**
* Sends an unpersonalized AJAX request to collect installation statistics
*/
function monitor() {
	if (window.__fpjs_d_m || Math.random() >= .001) return;
	try {
		const request = new XMLHttpRequest();
		request.open("get", `https://m1.openfpcdn.io/fingerprintjs/v${version}/npm-monitoring`, true);
		request.send();
	} catch (error) {
		console.error(error);
	}
}
/**
* Builds an instance of Agent and waits a delay required for a proper operation.
*/
async function load(options = {}) {
	const { delayFallback, debug, monitoring = true } = options;
	if (monitoring) monitor();
	await prepareForSources(delayFallback);
	return makeAgent(loadBuiltinSources({
		cache: {},
		debug
	}), debug);
}
var index = {
	load,
	hashComponents,
	componentsToDebugString
};
//#endregion
export { index as t };
