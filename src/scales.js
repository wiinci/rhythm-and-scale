/**
 * Modular typographic scale ratios based on musical intervals.
 */
const SCALES = [
	{description: '(default)', detail: '1.25', label: 'Major third'},
	{detail: '1.0667', label: 'Minor second'},
	{detail: '1.125', label: 'Major second'},
	{detail: '1.2', label: 'Minor third'},
	{detail: '1.3333', label: 'Perfect fourth'},
	{detail: '1.4142', label: 'Augmented fourth'},
	{detail: '1.5', label: 'Perfect fifth'},
	{detail: '1.6', label: 'Minor sixth'},
	{detail: '1.618', label: 'Golden ratio'},
	{detail: '1.6667', label: 'Major sixth'},
	{detail: '1.7778', label: 'Minor seventh'},
	{detail: '1.875', label: 'Major seventh'},
	{detail: '2', label: 'Octave'},
	{detail: '2.5', label: 'Major tenth'},
	{detail: '2.6667', label: 'Major eleventh'},
	{detail: '3', label: 'Major twelfth'},
]

/**
 * Type scale steps from small body text up through heading levels.
 */
const STEPS = [
	{exponent: -1, label: 'small'},
	{exponent: 0, label: 'default'},
	{exponent: 1, label: 'h6'},
	{exponent: 2, label: 'h5'},
	{exponent: 3, label: 'h4'},
	{exponent: 4, label: 'h3'},
	{exponent: 5, label: 'h2'},
	{exponent: 6, label: 'h1'},
]

module.exports = {SCALES, STEPS}
