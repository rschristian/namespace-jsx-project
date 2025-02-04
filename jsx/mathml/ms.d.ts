// Preact - https://preactjs.com/
interface MSMathMLAttributes<T extends EventTarget> extends MathMLAttributes<T> {
	/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/ms#browser_compatibility */
	lquote?: string
	/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/ms#browser_compatibility */
	rquote?: string
}

// Pota - https://github.com/potahtml/pota
interface MathMLMsElementAttributes {
	/** @deprecated */
	lquote?: string
	/** @deprecated */
	rquote?: string
}
