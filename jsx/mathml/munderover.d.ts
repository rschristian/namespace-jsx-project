// Preact - https://preactjs.com/
interface MUnderMathMLAttributes<T extends EventTarget> extends MathMLAttributes<T> {
	accentunder?: boolean
}

// Pota - https://github.com/potahtml/pota
interface MathMLMunderoverElementAttributes {
	accent?: 'true' | boolean
	accentunder?: 'true' | boolean
}
