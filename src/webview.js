const {SCALES} = require('./scales')
const {computeScale} = require('./compute')

/**
 * Generate the HTML for the live preview webview.
 * @param {object} params
 * @param {number} params.scale - Scale ratio
 * @param {number} params.baseFontSize - Base font size in px
 * @param {number} params.lineHeight - Line height multiplier
 * @param {number} params.rhythm - Rhythm grid in px
 * @param {string} params.scaleName - Human-readable scale name
 * @returns {string} HTML content
 */
function generatePreviewHTML({
	scale,
	baseFontSize,
	lineHeight,
	rhythm,
	scaleName,
}) {
	const items = computeScale({scale, baseFontSize, lineHeight, rhythm})

	// Generate CSS custom properties
	let cssVars = ''
	for (const item of items) {
		cssVars += `    --font-size-${item.label}: ${item.fontSize}px;\n`
		cssVars += `    --line-height-${item.label}: ${item.lineHeight}px;\n`
	}

	// Generate scale options for dropdown
	const scaleOptions = SCALES.map(
		s =>
			`<option value="${s.detail}" ${s.detail === scale.toString() ? 'selected' : ''}>${s.label} (${s.detail})</option>`,
	).join('\n')

	// Generate preview samples
	let samples = ''
	for (const item of items) {
		const displayLabel =
			item.label === 'default'
				? 'Body Text'
				: item.label === 'small'
					? 'Small Text'
					: item.label.toUpperCase()
		samples += `
      <div class="sample">
        <div class="sample-label">${displayLabel}</div>
        <div class="sample-text" style="font-size: var(--font-size-${item.label}); line-height: var(--line-height-${item.label});">
          The quick brown fox jumps over the lazy dog
        </div>
        <div class="sample-meta">
          ${item.fontSize}px / ${item.lineHeight}px line-height
        </div>
      </div>
    `
	}

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>Rhythm & Scale Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
    }

    :root {
${cssVars}
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .header h1 {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .header p {
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
    }

    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
      padding: 20px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 6px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .control-group label {
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .control-group input,
    .control-group select {
      padding: 6px 10px;
      font-size: 13px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
      font-family: var(--vscode-font-family);
    }

    .control-group input:focus,
    .control-group select:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .control-group .range-value {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .actions {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
    }

    button {
      padding: 8px 16px;
      font-size: 13px;
      font-family: var(--vscode-font-family);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .preview {
      padding: 20px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
    }

    .sample {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .sample:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .sample-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 10px;
      font-weight: 600;
    }

    .sample-text {
      margin-bottom: 8px;
      font-weight: 400;
    }

    .sample-meta {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      font-family: var(--vscode-editor-font-family);
    }

    .scale-info {
      margin-bottom: 20px;
      padding: 12px;
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rhythm & Scale Preview</h1>
      <p>Adjust parameters to see your typographic scale update in real-time</p>
    </div>

    <div class="controls">
      <div class="control-group">
        <label for="scale">Typographic Scale</label>
        <select id="scale">
          ${scaleOptions}
        </select>
      </div>

      <div class="control-group">
        <label for="baseFontSize">Base Font Size (px)</label>
        <input type="number" id="baseFontSize" value="${baseFontSize}" min="8" max="32" step="1">
      </div>

      <div class="control-group">
        <label for="lineHeight">Line Height</label>
        <input type="number" id="lineHeight" value="${lineHeight}" min="1" max="3" step="0.1">
      </div>

      <div class="control-group">
        <label for="rhythm">Vertical Rhythm (px)</label>
        <input type="number" id="rhythm" value="${rhythm}" min="1" max="16" step="1">
      </div>
    </div>

    <div class="scale-info">
      Current scale: <strong>${scaleName}</strong> (${scale}) at ${baseFontSize}px base
    </div>

    <div class="actions">
      <button id="copyCSS">Copy CSS</button>
      <button id="copyFluid" class="secondary">Copy Fluid CSS</button>
      <button id="copyTailwind" class="secondary">Copy Tailwind</button>
    </div>

    <div class="preview">
      ${samples}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Get all controls
    const scaleSelect = document.getElementById('scale');
    const baseFontSizeInput = document.getElementById('baseFontSize');
    const lineHeightInput = document.getElementById('lineHeight');
    const rhythmInput = document.getElementById('rhythm');

    // Send update to extension when any control changes
    function sendUpdate() {
      const selectedScale = scaleSelect.options[scaleSelect.selectedIndex];
      vscode.postMessage({
        command: 'update',
        scale: parseFloat(scaleSelect.value),
        scaleName: selectedScale.text.split('(')[0].trim(),
        baseFontSize: parseInt(baseFontSizeInput.value),
        lineHeight: parseFloat(lineHeightInput.value),
        rhythm: parseInt(rhythmInput.value)
      });
    }

    scaleSelect.addEventListener('change', sendUpdate);
    baseFontSizeInput.addEventListener('input', sendUpdate);
    lineHeightInput.addEventListener('input', sendUpdate);
    rhythmInput.addEventListener('input', sendUpdate);

    // Copy buttons
    document.getElementById('copyCSS').addEventListener('click', () => {
      vscode.postMessage({ command: 'copy', format: 'css' });
    });

    document.getElementById('copyFluid').addEventListener('click', () => {
      vscode.postMessage({ command: 'copy', format: 'css-fluid' });
    });

    document.getElementById('copyTailwind').addEventListener('click', () => {
      vscode.postMessage({ command: 'copy', format: 'tailwind' });
    });
  </script>
</body>
</html>`
}

module.exports = {generatePreviewHTML}
