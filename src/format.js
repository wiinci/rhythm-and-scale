const { pxToRem, fluidClamp } = require("./compute");

/**
 * @typedef {'css' | 'css-fluid' | 'tailwind' | 'tokens'} OutputFormat
 */

/**
 * @typedef {object} FormatOptions
 * @property {string} scaleName - Human-readable scale name (e.g. "Major third")
 * @property {number} scaleValue - The numeric ratio
 * @property {number} baseFontSize - Base font size in px
 * @property {number} lineHeight - Line height multiplier
 * @property {number} rhythm - Vertical rhythm grid unit
 * @property {OutputFormat} format - Output format
 */

/**
 * Format computed scale items into CSS custom properties (static px/rem).
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatCSS(items, options) {
  const { scaleName, scaleValue, baseFontSize, lineHeight, rhythm } = options;

  let content = `/**\n`;
  content += `  Typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px\n`;
  content += `  Line-height: ${lineHeight}\n`;
  content += `  Vertical rhythm: ${rhythm}px\n`;
  content += `*/\n\n`;
  content += `:root {\n`;

  for (const item of items) {
    content += `  --font-size-${item.label}: ${pxToRem(item.fontSize, baseFontSize)};\n`;
    content += `  --line-height-${item.label}: ${item.lineHeight}px;\n`;
  }

  content += `}\n`;
  return content;
}

/**
 * Format computed scale items into CSS custom properties with clamp() for fluid type.
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatCSSFluid(items, options) {
  const { scaleName, scaleValue, baseFontSize, lineHeight, rhythm } = options;

  // For fluid, we compute a smaller scale at mobile as 80% of desktop
  const mobileRatio = 0.8;

  let content = `/**\n`;
  content += `  Fluid typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px\n`;
  content += `  Line-height: ${lineHeight}\n`;
  content += `  Vertical rhythm: ${rhythm}px\n`;
  content += `  Fluid range: 320px – 1280px viewport\n`;
  content += `*/\n\n`;
  content += `:root {\n`;

  for (const item of items) {
    const minFontSize = Math.round(item.fontSize * mobileRatio);
    const maxFontSize = item.fontSize;
    content += `  --font-size-${item.label}: ${fluidClamp(minFontSize, maxFontSize)};\n`;
    content += `  --line-height-${item.label}: ${item.lineHeight}px;\n`;
  }

  content += `}\n`;
  return content;
}

/**
 * Format computed scale items as a Tailwind CSS theme extension.
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatTailwind(items, options) {
  const { scaleName, scaleValue, baseFontSize } = options;

  let content = `// Typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px\n`;
  content += `// Add to tailwind.config.js → theme.extend.fontSize\n\n`;
  content += `module.exports = {\n`;
  content += `  theme: {\n`;
  content += `    extend: {\n`;
  content += `      fontSize: {\n`;

  for (const item of items) {
    const rem = pxToRem(item.fontSize, baseFontSize);
    content += `        '${item.label}': ['${rem}', { lineHeight: '${item.lineHeight}px' }],\n`;
  }

  content += `      },\n`;
  content += `    },\n`;
  content += `  },\n`;
  content += `};\n`;
  return content;
}

/**
 * Format computed scale items as W3C Design Tokens JSON.
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatTokens(items, options) {
  const { scaleName, scaleValue, baseFontSize } = options;

  const tokens = {
    $description: `Typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px`,
    fontSize: {},
    lineHeight: {},
  };

  for (const item of items) {
    tokens.fontSize[item.label] = {
      $type: "dimension",
      $value: pxToRem(item.fontSize, baseFontSize),
    };
    tokens.lineHeight[item.label] = {
      $type: "dimension",
      $value: `${item.lineHeight}px`,
    };
  }

  return JSON.stringify(tokens, null, 2) + "\n";
}

/**
 * Route to the correct formatter based on format string.
 *
 * @param {Array} items
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatOutput(items, options) {
  switch (options.format) {
    case "css-fluid":
      return formatCSSFluid(items, options);
    case "tailwind":
      return formatTailwind(items, options);
    case "tokens":
      return formatTokens(items, options);
    case "css":
    default:
      return formatCSS(items, options);
  }
}

/** Map format identifiers to document language IDs */
const FORMAT_LANGUAGES = {
  css: "css",
  "css-fluid": "css",
  tailwind: "javascript",
  tokens: "json",
};

module.exports = {
  formatCSS,
  formatCSSFluid,
  formatTailwind,
  formatTokens,
  formatOutput,
  FORMAT_LANGUAGES,
};
