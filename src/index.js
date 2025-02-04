import {
	append,
	copy,
	entries,
	fetchCached,
	prettier,
	read,
	remove,
	stringifySorted,
	unique,
	uniqueTypes,
	write,
} from './utils.js'

import {
	KeyURL,
	browserData,
	deprecatedAttributes,
	deprecatedTags,
	ElementURL,
	getEventNameMaps,
	InterfaceURL,
	isBlacklisted,
	jsxcore,
	libs,
	ts,
	tsTagNamesMap,
	vsCode,
} from './data.js'

import {
	parseFromFile,
	parseFromString,
	parseFromURL,
} from './parse.js'

// clean output

remove('./jsx/')

copy(`./.prettierrc.json`, `./jsx/.prettierrc.json`)

// state

const DATA = {
	events: {},
	elements: {},
}

// Write to disk lib interfaces, index interfaces and tagNames

for (const lib of libs) {
	lib.interfaces = await parseFromURL(lib.file, lib.name, lib.map)

	// write to disk all of the interfaces
	for (const [name, value] of entries(lib.interfaces)) {
		write(`./jsx/source/${lib.name}/${name}.d.ts`, value.source)
	}

	// get all of the tagNames used by reading mapped elements.d.ts
	const [_, inter] = parseFromFile(
		`./jsx/source/${lib.name}/elements.d.ts`,
	)

	// make a list of the tagNames
	lib.tagNames = []

	// save the interfaces of the tagNames
	lib.tagInterface = {}
	lib.tagValues = {}
	for (const [name, value] of Object.entries(inter)) {
		// forEach prop in interface
		value.properties.forEach(prop => {
			const tagName = prop.name

			lib.tagNames.push(tagName)

			// interfaces for tagName
			const interfaces = prop.source
				.replace(/</g, ' ')
				.replace(/>/g, ' ')
				.replace(/,/g, ' ')
				.trim()
				.toLowerCase()
				.split(' ')
				.map(i => i.trim())
				.filter(i => i)
				.filter(i => !isBlacklisted[i])

			// get the keys for the tagName
			lib.tagInterface[tagName] = lib.tagInterface[tagName] || ''

			for (const inter of interfaces) {
				if (lib.interfaces[inter]) {
					const extended = lib.interfaces[inter].source
						.split('\n')[0]
						.replace(/</g, ' ')
						.replace(/>/g, ' ')
						.replace(/,/g, ' ')
						.trim()
						.toLowerCase()
						.split(' ')
						.map(i => i.trim())
						.filter(i => i)
						.filter(i => !isBlacklisted[i])

					for (const ext of extended) {
						if (!interfaces.includes(ext)) {
							interfaces.push(ext)
						}
					}
				}
			}
			for (const inter of interfaces) {
				if (lib.interfaces[inter]) {
					lib.tagInterface[tagName] +=
						lib.interfaces[inter].source + '\n'
				}
			}

			// get the keys and values for the tagName
			lib.tagValues[tagName] = lib.tagValues[tagName] || {}

			const parsed = parseFromString(lib.tagInterface[tagName])
			for (const inter of parsed) {
				for (const [name, value] of entries(inter)) {
					if (value.properties) {
						for (const prop of value.properties) {
							if (lib.tagValues[tagName][prop.name]) {
								lib.tagValues[tagName][prop.name] +=
									' | ' + prop.source
								lib.tagValues[tagName][prop.name] = uniqueTypes(
									lib.tagValues[tagName][prop.name],
								)
							} else {
								lib.tagValues[tagName][prop.name] = uniqueTypes(
									prop.source,
								)
							}
						}
					}
				}
			}
		})
	}
	lib.tagNames = unique(lib.tagNames)

	/** Merge libs shared interfaces */

	const banner = `\n\n// ${lib.name} - ${lib.url}  \n`

	for (const [name, value] of entries(jsxcore)) {
		if (lib.interfaces[name]) {
			append(
				`./jsx/${value}.d.ts`,
				banner + lib.interfaces[name].source,
			)
		}
	}
}

/** Typescript tag names maps */

const seenTags = {}
const seenEventsMaps = []

for (const [kind, value] of Object.entries(tsTagNamesMap)) {
	// get the events maps for the file
	const elements = value.properties.map(prop => {
		const eventsMap = getEventNameMaps(
			ts[prop.source.toLowerCase()].source,
		)[0]

		return {
			tagName: prop.name,
			eventsMap,
		}
	})

	// Write the tsTagNamesMap to disk

	write(`./jsx/ts/${kind}.d.ts`, value.source)

	// save in data.json

	DATA.elements[value.namespace] =
		DATA.elements[value.namespace] || {}

	// For each tag name, merge the interfaces from the frameworks

	for (let element of elements) {
		DATA.elements[value.namespace][element.tagName] =
			DATA.elements[value.namespace][element.tagName] || {}

		DATA.elements[value.namespace][element.tagName].deprecated =
			kind.toLowerCase().includes('deprecated') ||
			deprecatedTags[value.namespace].includes(element.tagName)

		seenTags[element.tagName] = true
		seenEventsMaps.push(element.eventsMap)

		const file = `./jsx/${kind}/${element.tagName}.d.ts`

		for (const lib of libs) {
			if (lib.tagInterface[element.tagName]) {
				const banner = `\n\n// ${lib.name} - ${lib.url}  \n`
				append(file, banner + lib.tagInterface[element.tagName])
			}
		}
	}
}

// Write to disk Frameworks tags not included in TS data, ex `webview`

const frameworkTags = unique([
	libs.map(lib => lib.tagNames).flat(Infinity),
	Object.keys(vsCode),
])

for (const tag of frameworkTags) {
	if (!seenTags[tag]) {
		DATA.elements['http://www.w3.org/1999/xhtml'][tag] =
			DATA.elements['http://www.w3.org/1999/xhtml'][tag] || {}

		const file = `./jsx/unknown/${tag}.d.ts`

		for (const lib of libs) {
			if (lib.tagInterface[tag]) {
				const banner = `\n\n// ${lib.name} - ${lib.url}  \n`
				append(file, banner + lib.tagInterface[tag])
			}
		}
	}
}

/** Events mapping */

/**
 * Get event names from frameworks for fancy capitalization. Give some
 * event capitalization not defined in any framework.
 */

const eventsNames = unique([
	[
		'onAfterPrint',
		'onAnimationCancel',
		'onBeforePrint',
		'onBeforeToggle',
		'onBeforeUnload',
		'onContextLost',
		'onContextRestored',
		'onCueChange',
		'onDblClick',
		'onEnterPictureInPicture',
		'onFullscreenChange',
		'onFullscreenError',
		'onGamepadConnected',
		'onGamepadDisconnected',
		'onGotPointerCapture',
		'onHashChange',
		'onLanguageChange',
		'onLeavePictureInPicture',
		'onLostPointerCapture',
		'onMessage',
		'onMessageError',
		'onOffline',
		'onOnline',
		'onPageHide',
		'onPageShow',
		'onPopState',
		'onRejectionHandled',
		'onScrollEnd',
		'onSecurityPolicyViolation',
		'onSelectionChange',
		'onSelectStart',
		'onSlotChange',
		'onUnhandledRejection',
		'onUnload',
		'onWaitingForKey',
		'onWebKitAnimationEnd',
		'onWebKitAnimationIteration',
		'onWebKitAnimationStart',
		'onWebKitTransitionEnd',
	],
	read('./jsx/events.d.ts')
		.replaceAll('?', '')
		.split('\n')
		.map(item => item.trim())
		.filter(item => /^on[a-z]+:/i.test(item))
		.filter(item => !/(capture|passive):/i.test(item))
		.map(item => item.split(':')[0].trim()),
])

/**
 * Deduplicate events, sorting makes these with the more capital
 * letters win
 */
const eventsNameSeen = {}
const eventsCapitalized = {}
for (const event of eventsNames) {
	const lower = event.toLowerCase()
	if (!eventsNameSeen[lower]) {
		eventsNameSeen[lower] = true
		eventsCapitalized[event.toLowerCase().slice(2)] = event
	}
}

DATA.events = JSON.parse(JSON.stringify(eventsCapitalized))

let eventsInterfaces = []
for (const eventMap of unique(seenEventsMaps)) {
	eventsInterfaces.push(eventMap)
	eventsInterfaces.push(
		getEventNameMaps(ts[eventMap.toLowerCase()].source),
	)
}
eventsInterfaces = unique(eventsInterfaces)

// Generate events file

for (const eventMap of eventsInterfaces) {
	const file = `./jsx/ts/events.d.ts`
	append(file, ts[eventMap.toLowerCase()].source)
}

// Get the interfaces names for events

const events = read(`./jsx/ts/events.d.ts`).split('\n')

for (let i = 0; i < events.length; i++) {
	const event = events[i]
	if (event.includes(':')) {
		let [eventName, inter] = event.split(':')
		eventName = eventName.trim()
		DATA.events[eventName] = {
			name: eventName,
			capitalized: DATA.events[eventName] || eventName,
			interface: inter.trim(),
		}
	}
}

// normalize events

for (let eventName in DATA.events) {
	if (typeof DATA.events[eventName] === 'string') {
		DATA.events[eventName] = {
			name: eventName,
			capitalized: DATA.events[eventName],
			interface: 'Event',
		}
	}
}

// get browser data

const browserElements = {
	'http://www.w3.org/1999/xhtml': Object.keys(
		DATA.elements['http://www.w3.org/1999/xhtml'],
	),
	'http://www.w3.org/2000/svg': Object.keys(
		DATA.elements['http://www.w3.org/2000/svg'],
	),
	'http://www.w3.org/1998/Math/MathML': Object.keys(
		DATA.elements['http://www.w3.org/1998/Math/MathML'],
	),
}

const chrome = await browserData(browserElements, 'chrome')
const firefox = await browserData(browserElements, 'firefox')

// copy library tags to data.elements

for (const ns in DATA.elements) {
	for (const tagName in DATA.elements[ns]) {
		const tag = DATA.elements[ns][tagName]
		tag.elementURL = ElementURL(ns, tagName)
		tag.description = ''
		tag.interface = chrome[ns].elements[tagName].interface
		tag.interfaceURL = InterfaceURL(
			ns,
			tag,
			chrome[ns].elements[tagName].interface,
		)
		tag.keys = {}

		// chrome
		for (const k in chrome[ns].elements[tagName].attributes) {
			tag.keys[k] = tag.keys[k] || { values: {} }
			tag.keys[k].values.Chrome = uniqueTypes(
				chrome[ns].elements[tagName].attributes[k],
			)
		}
		// firefox
		for (const k in firefox[ns].elements[tagName].attributes) {
			tag.keys[k] = tag.keys[k] || { values: {} }
			tag.keys[k].values.Firefox = uniqueTypes(
				firefox[ns].elements[tagName].attributes[k],
			)
		}

		// libs
		for (const lib of libs) {
			if (lib.tagValues[tagName]) {
				for (const [k, value] of entries(lib.tagValues[tagName])) {
					tag.keys[k] = tag.keys[k] || { values: {} }
					tag.keys[k].values[lib.name] = value
				}
			}
		}

		// vs code
		if (vsCode[tagName]) {
			tag.description = vsCode[tagName].description
			for (const k in vsCode[tagName].keys) {
				tag.keys[k] = tag.keys[k] || { values: {} }
				tag.keys[k].values.VSCode = uniqueTypes(
					vsCode[tagName].keys[k],
				)
			}
		}

		tag.setters = unique([
			chrome[ns].elements[tagName].setters || [],
			firefox[ns].elements[tagName].setters || [],
		])
		tag.setters.sort()

		for (const k in tag.keys) {
			// deprecation
			tag.keys[k].deprecated =
				deprecatedAttributes[
					tagName + '.' + tag.interface + '.' + k.toLowerCase()
				]

			// setters

			const setterChrome = chrome[ns].elements[tagName].setters.find(
				item => item.split('.')[1] === k,
			)

			const setterFirefox = firefox[ns].elements[
				tagName
			].setters.find(item => item.split('.')[1] === k)

			// url
			tag.keys[k].url = setterChrome
				? KeyURL(
						ns,
						tagName,
						setterChrome.split('.')[0],
						setterChrome.split('.')[1],
					)
				: KeyURL(ns, tagName, tag.interface, k)

			// prop/attr
			tag.keys[k].propChrome = !!setterChrome
			tag.keys[k].attrChrome =
				!!chrome[ns].elements[tagName].attributes[k]

			tag.keys[k].propFirefox = !!setterFirefox
			tag.keys[k].attrFirefox =
				!!firefox[ns].elements[tagName].attributes[k]

			tag.keys[k].prop =
				tag.keys[k].propChrome || tag.keys[k].propFirefox
			tag.keys[k].attr =
				tag.keys[k].attrChrome || tag.keys[k].attrFirefox
		}
	}
}

write(`./jsx/data.json`, stringifySorted(DATA))

// create table.md

let keysTable = `
# namespace JSX Elements Table

This file is generated using \`./data.json\`. The table is automated and generated on demand, with live data taken from the frameworks repos, but some of its information is actually hard-coded (for example obsolete attributes/properties/tags).

The possible \`tagNames\` come from a mashup between frameworks and TypeScript \`TagNamesMaps\` data.

The \`interface\` names comes from \`document.createElementNS(ns, tagName).constructor.name\` which is more accurate than typescript.

Chrome/Firefox attributes come from brute-forcing the element \`setters\` till an \`attribute\` is added. The name of the \`attribute\` is taken as \`key\`. When something is marked as \`prop\` it means Chrome/Firefox has a setter for it.

- 🗑️ indicates that the \`tag\` or \`attribute\` is deprecated.
- 🛑 indicates that the \`key\` resembles a \`prop\` but such a prop does not exist. Setting \`node.propName = value\` will not produce the expected outcome; instead, \`setAttribute\` should be used. It's strongly discouraged for frameworks to make up non-existent properties(keys with case [besides events such onClick]), as this leads to confusion. Example: \`autoFocus\` doesnt exists, it should be \`autofocus\`.
- 🔗 indicates the \`prop\` it's inherited

This is an attempt to unify the effort required to update this information.

## Data Links:

- https://solidjs.com/
- https://github.com/potahtml/pota
- https://github.com/vobyjs/voby
- https://vuejs.org/
- https://preactjs.com/
- https://react.dev/
- https://github.com/microsoft/vscode-html-languageservice


## Open Collective

Sponsor the project! https://opencollective.com/tito-bouzout . Thanks!

`

const columns = [
	'Chrome',
	'Firefox',
	'Pota',
	'Solid',
	'Voby',
	'Vue',
	'Preact',
	'React',
	'VSCode',
]

for (const ns in DATA.elements) {
	for (const [tag, value] of Object.entries(DATA.elements[ns])) {
		keysTable += `\n\n## ${value.deprecated ? '🗑️' : ''} [\`<${tag}>\`](${value.elementURL}) - [${value.interface}](${value.interfaceURL})`

		// headings
		keysTable += `\n\n| key | type `
		for (const lib of columns) {
			keysTable += ` | ${lib}`
		}
		keysTable += `|`
		// separator
		keysTable += `\n| --- | --- `
		for (const lib of columns) {
			keysTable += ` |  --- `
		}
		keysTable += `|`

		// attribute/properties
		const props = []
		for (const [k, val] of Object.entries(value.keys)) {
			const kind = [val.prop ? 'prop' : '', val.attr ? 'attr' : '']
				.filter(x => x)
				.join('/')

			const warn =
				/[A-Z]/.test(k) &&
				// svg is XML so it has attributes with uppercase letters
				ns !== 'http://www.w3.org/2000/svg' &&
				tag !== 'webview' &&
				!kind.includes('prop')
					? '🛑'
					: ''

			const deprecated = deprecatedAttributes[
				tag + '.' + value.interface + '.' + k.toLowerCase()
			]
				? '🗑️'
				: ''

			const inherited =
				kind.includes('prop') &&
				!value.setters.includes(value.interface + '.' + k)
					? '🔗'
					: ''
			/*
			const mdn = (await fetchCached(val.url)).includes(
				'Page not found',
			)
				? false
				: true
			*/

			let prop = `| ${deprecated} [${k}](${val.url}) ${inherited} ${warn}`

			prop += ` | ${kind}`
			for (const lib of columns) {
				prop += ` | ${(val.values[lib] !== undefined ? val.values[lib] : '❌').replace(/\|/g, '\\|').replace(/</g, '< ').replace(/>/g, '> ')}`
			}
			prop += `|`

			props.push(prop)
		}
		keysTable +=
			'\n' +
			props
				.sort((a, b) =>
					a.localeCompare(b, undefined, { sensitivity: 'case' }),
				)
				.join('\n')

		const keys = Object.keys(value.keys).map(x => x.toLowerCase())
		const notIncluded = value.setters.filter(
			x => !keys.includes(x.split('.')[1].toLowerCase()),
		)

		if (notIncluded.length) {
			keysTable +=
				'\n\nSetters Not Included: ' +
				notIncluded
					.map(
						x =>
							`[${x.split('.')[1]}](${KeyURL(ns, tag, x.split('.')[0], x.split('.')[1])})`,
					)
					.join(', ') +
				'\n\n'
		}
	}
}

write(`./jsx/readme.md`, keysTable)

prettier('./jsx/**')
