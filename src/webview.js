const {SCALES} = require('./scales')
const {LIMITS} = require('./preview-model')

/**
 * Serialize the model for a <script type="application/json"> data block.
 * `<` is escaped so no string in the model can close the block early.
 * @param {object} model
 * @returns {string}
 */
function embedModel(model) {
	return JSON.stringify(model).replace(/</g, '\\u003c')
}

/**
 * Build the `min`/`max`/`step` attributes for a numeric control from LIMITS,
 * so the webview's bounds are the host's bounds.
 * @param {keyof typeof LIMITS} key
 * @returns {string}
 */
function limitAttributes(key) {
	const {min, max, step} = LIMITS[key]
	return `min="${min}" max="${max}" step="${step}"`
}

/**
 * Generate the HTML for the live preview webview.
 *
 * The page is a renderer, not a calculator: the host's display model is
 * embedded as JSON, and the single `render(model)` in the inline script writes
 * every number, text and CSS custom property from it — on first paint and on
 * every later `render` message. Nothing in the webview derives a value.
 *
 * @param {ReturnType<import('./preview-model').buildPreviewModel>} model
 * @returns {string} HTML content
 */
function generatePreviewHTML(model) {
	const scaleOptions = SCALES.map((s) => `<option value="${s.detail}">${s.label} (${s.detail})</option>`).join(
		'\n          ',
	)

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

    .control-group input[type="range"] {
      padding: 0;
      margin: 0;
      width: 100%;
      height: 20px;
      cursor: grab;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      outline: none;
      display: block;
    }

    .control-group input[type="range"]:active {
      cursor: grabbing;
    }

    .control-group input[type="range"]::-webkit-slider-runnable-track {
      width: 100%;
      height: 6px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
    }

    .control-group input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: var(--vscode-button-background);
      border: 3px solid var(--vscode-editor-background);
      border-radius: 50%;
      cursor: grab;
      margin-top: -7px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    }

    .control-group input[type="range"]:active::-webkit-slider-thumb {
      cursor: grabbing;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    }

    .control-group input[type="range"]::-moz-range-track {
      width: 100%;
      height: 6px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
    }

    .control-group input[type="range"]::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: var(--vscode-button-background);
      border: 3px solid var(--vscode-editor-background);
      border-radius: 50%;
      cursor: grab;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    }

    .control-group input[type="range"]:active::-moz-range-thumb {
      cursor: grabbing;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    }

    .control-group input[type="range"]:focus {
      outline: none;
    }

    .control-group input[type="range"]:focus::-webkit-slider-thumb {
      box-shadow: 0 0 0 3px var(--vscode-focusBorder);
    }

    .control-group input[type="range"]:focus::-moz-range-thumb {
      box-shadow: 0 0 0 3px var(--vscode-focusBorder);
    }

    .slider-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 20px;
    }

    .slider-wrapper input[type="range"] {
      flex: 1;
      margin: 0;
    }

    .slider-value {
      min-width: 40px;
      text-align: right;
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-foreground);
      font-variant-numeric: tabular-nums;
      line-height: 20px;
    }

    .control-group input:focus,
    .control-group select:focus {
      outline: 1px solid var(--vscode-focusBorder);
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
      font-variant-numeric: tabular-nums;
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
        <div class="slider-wrapper">
          <input type="range" id="baseFontSize" ${limitAttributes('baseFontSize')}>
          <span class="slider-value" id="baseFontSizeValue"></span>
        </div>
      </div>

      <div class="control-group">
        <label for="lineHeight">Line Height</label>
        <input type="number" id="lineHeight" ${limitAttributes('lineHeight')}>
      </div>

      <div class="control-group">
        <label for="rhythm">Vertical Rhythm (px)</label>
        <div class="slider-wrapper">
          <input type="range" id="rhythm" ${limitAttributes('rhythm')}>
          <span class="slider-value" id="rhythmValue"></span>
        </div>
      </div>
    </div>

    <div class="actions">
      <button id="copy">Copy…</button>
      <button id="open" class="secondary">Open…</button>
    </div>

    <div class="preview" id="preview"></div>
  </div>

  <script type="application/json" id="model">${embedModel(model)}</script>
  <script>
    // Outside VS Code (tests, screenshots) there is no host to talk to.
    const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : {postMessage() {}};

    const root = document.documentElement;
    const scaleSelect = document.getElementById('scale');
    const baseFontSizeInput = document.getElementById('baseFontSize');
    const baseFontSizeValue = document.getElementById('baseFontSizeValue');
    const lineHeightInput = document.getElementById('lineHeight');
    const rhythmInput = document.getElementById('rhythm');
    const rhythmValue = document.getElementById('rhythmValue');
    const preview = document.getElementById('preview');

    const DISPLAY_LABELS = {default: 'Body Text', small: 'Small Text'};

    /** The last model the host sent; the only source of every value on screen. */
    let current = null;

    // A control being edited keeps its text: writing the host's value into a
    // focused field would clobber a half-typed number.
    function setControlValue(input, value) {
      if (document.activeElement !== input) input.value = String(value);
    }

    // Create the sample shell for a step once; render() fills it every time.
    function sampleFor(label) {
      let sample = preview.querySelector('.sample[data-label="' + label + '"]');
      if (!sample) {
        sample = document.createElement('div');
        sample.className = 'sample';
        sample.dataset.label = label;
        sample.innerHTML =
          '<div class="sample-label"></div>' +
          '<div class="sample-text" style="font-size: var(--font-size-' + label + '); line-height: var(--line-height-' + label + ');">' +
          'The quick brown fox jumps over the lazy dog</div>' +
          '<div class="sample-meta"></div>';
        preview.appendChild(sample);
      }
      return sample;
    }

    /** Write the host's model to the page. Nothing here derives a value. */
    function render(model) {
      current = model;

      root.style.setProperty('--rhythm', model.rhythm + 'px');
      root.style.setProperty('--lh-body', model.lineHeightBodyPx + 'px');

      for (const option of scaleSelect.options) {
        option.selected = Number(option.value) === model.scale;
      }
      setControlValue(baseFontSizeInput, model.baseFontSize);
      setControlValue(lineHeightInput, model.lineHeight);
      setControlValue(rhythmInput, model.rhythm);
      baseFontSizeValue.textContent = String(model.baseFontSize);
      rhythmValue.textContent = String(model.rhythm);

      for (const step of model.steps) {
        root.style.setProperty('--font-size-' + step.label, step.fontSizePx + 'px');
        root.style.setProperty('--line-height-' + step.label, step.lineHeightPx + 'px');

        const sample = sampleFor(step.label);
        sample.querySelector('.sample-label').textContent =
          DISPLAY_LABELS[step.label] || step.label.toUpperCase();
        sample.querySelector('.sample-meta').textContent =
          step.fontSizePx + ' / ' + step.lineHeightPx + ' px · ' +
          step.fontSizeRem + ' · ×' + step.ratio + ' · ' +
          step.rhythmUnits + ' × ' + model.rhythm;
      }
    }

    // Input patches are coalesced per animation frame so a slider drag sends
    // one message per painted frame rather than one per pointer event.
    let pendingPatch = null;
    function queuePatch(patch) {
      const first = pendingPatch === null;
      pendingPatch = Object.assign(pendingPatch || {}, patch);
      if (first) {
        requestAnimationFrame(() => {
          const patchToSend = pendingPatch;
          pendingPatch = null;
          vscode.postMessage({type: 'input', patch: patchToSend});
        });
      }
    }

    scaleSelect.addEventListener('change', () => {
      queuePatch({scale: Number(scaleSelect.value)});
    });
    baseFontSizeInput.addEventListener('input', () => {
      queuePatch({baseFontSize: baseFontSizeInput.valueAsNumber});
    });
    rhythmInput.addEventListener('input', () => {
      queuePatch({rhythm: rhythmInput.valueAsNumber});
    });
    lineHeightInput.addEventListener('input', () => {
      // Blank or unparseable text is not a value; the host keeps the last valid state.
      if (Number.isFinite(lineHeightInput.valueAsNumber)) {
        queuePatch({lineHeight: lineHeightInput.valueAsNumber});
      }
    });
    lineHeightInput.addEventListener('blur', () => {
      // Leaving the field with junk in it restores the last value the host accepted.
      if (current && !Number.isFinite(lineHeightInput.valueAsNumber)) {
        lineHeightInput.value = String(current.lineHeight);
      }
    });

    document.getElementById('copy').addEventListener('click', () => {
      vscode.postMessage({type: 'copy'});
    });
    document.getElementById('open').addEventListener('click', () => {
      vscode.postMessage({type: 'open'});
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message && message.type === 'render') render(message.model);
    });

    render(JSON.parse(document.getElementById('model').textContent));
  </script>
</body>
</html>`
}

module.exports = {generatePreviewHTML, embedModel}
