// Solid - https://www.solidjs.com/
interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
	reversed?: boolean
	start?: number | string
	type?: '1' | 'a' | 'A' | 'i' | 'I'
}

// Voby - https://github.com/vobyjs/voby
interface OlHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
	reversed?: boolean
	start?: number
	type?: '1' | 'a' | 'A' | 'i' | 'I'
}

// Vue - https://vuejs.org/
interface OlHTMLAttributes extends HTMLAttributes {
	reversed?: boolean | 'true' | 'false'
	start?: number | string
	type?: '1' | 'a' | 'A' | 'i' | 'I'
}

// React - https://react.dev/
interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
	reversed?: boolean
	start?: number
	type?: '1' | 'a' | 'A' | 'i' | 'I'
}
