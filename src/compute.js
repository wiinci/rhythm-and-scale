const { STEPS } = require("./scales");

/**
 * Compute the typographic scale values for each step.
 * Returns a new array — never mutates shared state.
 *
 * @param {object} params
 * @param {number} params.scale - The modular scale ratio (e.g. 1.25)
 * @param {number} params.baseFontSize - Base font size in px (e.g. 16)
 * @param {number} params.lineHeight - Default line height multiplier (e.g. 1.5)
 * @param {number} params.rhythm - Vertical rhythm grid unit in px (e.g. 4)
 * @returns {Array<{label: string, exponent: number, fontSize: number, lineHeight: number}>}
 */
function computeScale({ scale, baseFontSize, lineHeight, rhythm }) {
  return STEPS.map((step) => {
    const fontSize = Math.round(Math.pow(scale, step.exponent) * baseFontSize);
    const computedLineHeight =
      Math.floor(Math.ceil(fontSize * lineHeight) / rhythm) * rhythm;

    return {
      label: step.label,
      exponent: step.exponent,
      fontSize,
      lineHeight: computedLineHeight,
    };
  });
}

/**
 * Convert a px font size to rem, assuming a 16px root.
 * @param {number} px
 * @param {number} [rootSize=16]
 * @returns {string}
 */
function pxToRem(px, rootSize = 16) {
  const rem = px / rootSize;
  // Avoid trailing zeros: 1.0 → "1", 1.25 → "1.25"
  return `${parseFloat(rem.toFixed(4))}rem`;
}

/**
 * Generate a clamp() expression for fluid type scaling.
 *
 * @param {number} minPx - Minimum font size in px
 * @param {number} maxPx - Maximum font size in px
 * @param {number} [minViewport=320] - Min viewport width in px
 * @param {number} [maxViewport=1280] - Max viewport width in px
 * @returns {string}
 */
function fluidClamp(minPx, maxPx, minViewport = 320, maxViewport = 1280) {
  const minRem = minPx / 16;
  const slope = (maxPx - minPx) / (maxViewport - minViewport);
  const slopeVw = parseFloat((slope * 100).toFixed(4));
  const intercept = parseFloat((minRem - (slope * minViewport) / 16).toFixed(4));

  return `clamp(${pxToRem(minPx)}, ${intercept}rem + ${slopeVw}vw, ${pxToRem(maxPx)})`;
}

module.exports = { computeScale, pxToRem, fluidClamp };
