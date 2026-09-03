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
	const scaleOptions = SCALES.map((s) => `<option value="${s.detail}">${s.label} · ${s.detail}</option>`).join(
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
      font-size: 13px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }

    /* ————— Toolbar ————— */

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--rhythm) 16px;
      padding: var(--rhythm) 16px;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .control {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .control > label {
      font-size: 13px;
      color: var(--vscode-foreground);
    }

    .control.actions {
      flex-direction: row;
      align-items: flex-end;
      gap: 8px;
    }

    select {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      padding: 2px 4px;
      max-width: 100%;
    }

    input[type="number"] {
      width: 4.5em;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      padding: 2px 4px;
    }

    /* The host rejected the last value; the field keeps its previous rendering. */
    input[type="number"][aria-invalid="true"] {
      border-color: var(--vscode-errorForeground);
      outline: 1px solid var(--vscode-errorForeground);
    }

    .pair {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      flex: 1 1 5rem;
      min-width: 4rem;
      height: 16px;
      background: transparent;
    }

    input[type="range"]::-webkit-slider-runnable-track {
      height: 2px;
      background: var(--vscode-scrollbarSlider-background);
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 5px;
      height: 12px;
      margin-top: -5px;
      background: var(--vscode-button-background);
      border-radius: 1px;
    }

    input[type="range"]::-moz-range-track {
      height: 2px;
      background: var(--vscode-scrollbarSlider-background);
    }

    input[type="range"]::-moz-range-thumb {
      width: 5px;
      height: 12px;
      background: var(--vscode-button-background);
      border: none;
      border-radius: 1px;
    }

    input[type="checkbox"] {
      accent-color: var(--vscode-button-background);
      width: 13px;
      height: 13px;
    }

    :is(button, input, select):focus {
      outline: none;
    }

    :is(button, input, select):focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
    }

    button {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      padding: 3px 12px;
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
    }

    button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    /* ————— Specimens ————— */

    .column {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--lh-body);
      margin-top: var(--lh-body);
      padding: var(--lh-body);
    }

    /* The rhythm grid: a faint reference layer with its origin at the
       column's top edge, one 1px line every --rhythm. It is the
       lowest-contrast mark on screen and the only reference layer. */
    .column::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: repeating-linear-gradient(to bottom, var(--vscode-panel-border) 0 1px, transparent 1px var(--rhythm));
      opacity: 0.35;
    }

    .column.no-grid::before {
      content: none;
    }

    .step {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(10rem, 14rem) 1fr;
      column-gap: var(--lh-body);
      row-gap: var(--lh-body);
      align-items: start;
    }

    .annotation {
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: var(--vscode-descriptionForeground);
      line-height: var(--lh-body);
    }

    .specimen {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      margin: 0;
      max-width: 60ch;
    }

    /* Narrow panels: the annotation sits above its specimen, single column. */
    @media (max-width: 639px) {
      .step {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="control">
      <label for="scale">Scale</label>
      <select id="scale">
          ${scaleOptions}
      </select>
    </div>

    <div class="control">
      <label for="baseFontSize">Base · px</label>
      <div class="pair">
        <input type="range" id="baseFontSize" ${limitAttributes('baseFontSize')}>
        <input type="number" id="baseFontSizeNumber" aria-label="Base size, exact pixels" ${limitAttributes('baseFontSize')}>
      </div>
    </div>

    <div class="control">
      <label for="lineHeight">Line-height</label>
      <input type="number" id="lineHeight" ${limitAttributes('lineHeight')}>
    </div>

    <div class="control">
      <label for="rhythm">Rhythm · px</label>
      <div class="pair">
        <input type="range" id="rhythm" ${limitAttributes('rhythm')}>
        <input type="number" id="rhythmNumber" aria-label="Rhythm, exact pixels" ${limitAttributes('rhythm')}>
      </div>
    </div>

    <div class="control">
      <label for="gridToggle">Grid</label>
      <input type="checkbox" id="gridToggle">
    </div>

    <div class="control actions">
      <button id="copy" class="secondary">Copy…</button>
      <button id="open" class="secondary">Open…</button>
    </div>
  </div>

  <main class="column" id="preview"></main>

  <script type="application/json" id="model">${embedModel(model)}</script>
  <script>
    // Outside VS Code (tests, screenshots) there is no host to talk to.
    const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : {postMessage() {}};

    const root = document.documentElement;
    const scaleSelect = document.getElementById('scale');
    const baseFontSizeInput = document.getElementById('baseFontSize');
    const baseFontSizeNumber = document.getElementById('baseFontSizeNumber');
    const lineHeightInput = document.getElementById('lineHeight');
    const rhythmInput = document.getElementById('rhythm');
    const rhythmNumber = document.getElementById('rhythmNumber');
    const gridToggle = document.getElementById('gridToggle');
    const preview = document.getElementById('preview');

    // One shared specimen for every step, so leading — not wording — is what
    // varies across the scale.
    const SPECIMEN_TEXT = 'Set to a scale, type reads as one voice; set to a grid, every line lands where the eye expects.';

    /** The last model the host sent; the only source of every value on screen. */
    let current = null;

    // A control being edited keeps its text: writing the host's value into a
    // focused field would clobber a half-typed number.
    function setControlValue(input, value) {
      if (document.activeElement !== input) input.value = String(value);
    }

    // The host clamps and rejects out-of-range patches; the webview mirrors
    // the input's own min/max only to flag the field and keep the last valid
    // rendering. No value on screen is ever computed here.
    function inLimits(input) {
      const value = input.valueAsNumber;
      return Number.isFinite(value) && value >= Number(input.min) && value <= Number(input.max);
    }

    function flagInvalid(input, invalid) {
      if (invalid) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    // A slider and its exact-value number are two ways into the same patch.
    function bindPair(range, number, key) {
      range.addEventListener('input', () => {
        number.value = range.value;
        flagInvalid(number, false);
        queuePatch({[key]: range.valueAsNumber});
      });
      number.addEventListener('input', () => {
        if (inLimits(number)) {
          flagInvalid(number, false);
          queuePatch({[key]: number.valueAsNumber});
        } else {
          flagInvalid(number, true);
        }
      });
      number.addEventListener('blur', () => {
        flagInvalid(number, false);
        const value = Math.min(Number(number.max), Math.max(Number(number.min), number.valueAsNumber));
        if (Number.isFinite(value)) {
          number.value = String(value);
          if (current && value !== current[key]) queuePatch({[key]: value});
        } else if (current) {
          number.value = String(current[key]);
        }
      });
    }

    // Create the shell for a step once; render() fills it every time.
    function stepFor(label) {
      let step = preview.querySelector('.step[data-label="' + label + '"]');
      if (!step) {
        step = document.createElement('div');
        step.className = 'step';
        step.dataset.label = label;
        step.innerHTML =
          '<div class="annotation"><div class="annotation-size"></div><div class="annotation-detail"></div></div>' +
          '<p class="specimen" style="font-size: var(--font-size-' + label + '); line-height: var(--line-height-' + label + ');">' + SPECIMEN_TEXT + '</p>';
        preview.appendChild(step);
      }
      return step;
    }

    /** Write the host's model to the page. Nothing here derives a value. */
    function render(model) {
      current = model;

      root.style.setProperty('--rhythm', model.rhythm + 'px');
      root.style.setProperty('--lh-body', model.lineHeightBodyPx + 'px');
      preview.classList.toggle('no-grid', !model.grid);

      for (const option of scaleSelect.options) {
        option.selected = Number(option.value) === model.scale;
      }
      setControlValue(baseFontSizeInput, model.baseFontSize);
      setControlValue(baseFontSizeNumber, model.baseFontSize);
      setControlValue(lineHeightInput, model.lineHeight);
      setControlValue(rhythmInput, model.rhythm);
      setControlValue(rhythmNumber, model.rhythm);
      gridToggle.checked = model.grid;

      for (const step of model.steps) {
        root.style.setProperty('--font-size-' + step.label, step.fontSizePx + 'px');
        root.style.setProperty('--line-height-' + step.label, step.lineHeightPx + 'px');

        const el = stepFor(step.label);
        el.querySelector('.annotation-size').textContent =
          step.label + ' · ' + step.fontSizePx + ' / ' + step.lineHeightPx + ' px';
        el.querySelector('.annotation-detail').textContent =
          step.fontSizeRem + ' · ×' + step.ratio + ' · ' + step.rhythmUnits + ' × ' + model.rhythm;
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

    bindPair(baseFontSizeInput, baseFontSizeNumber, 'baseFontSize');
    bindPair(rhythmInput, rhythmNumber, 'rhythm');

    scaleSelect.addEventListener('change', () => {
      queuePatch({scale: Number(scaleSelect.value)});
    });

    lineHeightInput.addEventListener('input', () => {
      // Blank or out-of-range text is not a value; the host keeps the last
      // valid state and the field shows the invalid state until it is fixed.
      if (inLimits(lineHeightInput)) {
        flagInvalid(lineHeightInput, false);
        queuePatch({lineHeight: lineHeightInput.valueAsNumber});
      } else {
        flagInvalid(lineHeightInput, true);
      }
    });
    lineHeightInput.addEventListener('blur', () => {
      // Leaving the field with junk in it restores the last value the host accepted.
      if (current && !inLimits(lineHeightInput)) {
        lineHeightInput.value = String(current.lineHeight);
        flagInvalid(lineHeightInput, false);
      }
    });

    gridToggle.addEventListener('change', () => {
      queuePatch({grid: gridToggle.checked});
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
