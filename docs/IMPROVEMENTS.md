# Rhythm & Scale: Improvement Recommendations

Based on an analysis of the codebase, here are several ways to further improve the **Rhythm & Scale** extension.

## 1. Visual & Interactive Enhancements (Live Preview)
*   **Baseline Grid Overlay:** Add a "Show Grid" toggle in the Live Preview panel. This would render horizontal lines (using a repeating linear gradient) synced with the `rhythm` value, allowing users to visually confirm that the text baselines are snapping correctly.
*   **Font Family Selection:** Allow users to choose from common font stacks (Serif, Sans, Mono) or system fonts in the preview. Different typefaces have different x-heights, and seeing the scale with a specific "vibe" helps in design decisions.
*   **Heading "Tightness" Slider:** The extension currently uses a fixed minimum of 1.1 for `h1` line-height. Exposing this as a "Heading Tightness" slider would give designers control over how aggressively the leading collapses for large type.

## 2. Functional Improvements
*   **Settings Persistence:** Use `vscode.workspace.getConfiguration` to save the last-used scale parameters. Currently, the extension resets to defaults every time the panel is closed; persisting these values would significantly improve the workflow.
*   **Custom Scale Ratios:** While 16 presets are provided, adding a "Custom..." option to the scale picker would allow designers to input specific ratios (e.g., 1.125 or 1.15) not covered by musical intervals.
*   **Dynamic Step Management:** Instead of hardcoded steps (`small` to `h1`), allow users to define their own steps. This would enable adding `h7` or renaming steps to match specific design system conventions (like Tailwind's `text-xs`, `text-lg`, etc.).
*   **Fluid Scaling Customization:** In the "Fluid" output, the mobile scaling ratio (0.8) and viewport range (320px–1280px) are currently hardcoded. Adding inputs for these parameters would make the fluid type generation much more flexible.

## 3. Workflow Integration
*   **"Insert at Cursor" Command:** Add a command to insert the generated scale directly into the active text editor. This removes the "Copy-Paste" friction from the current workflow.
*   **Project-level Configuration:** Support a `rhythm-scale.json` configuration file in the workspace root. This would allow a team to share the same typographic scale settings across a project.
*   **Expanded Export Formats:** Add support for CSS-in-JS (Styled Components/Emotion), SASS/LESS variables, and Figma Tokens JSON format to cover more tech stacks.

## 4. Technical Refinement
*   **Unit Tests for Edge Cases:** Add tests for extreme rhythm values (e.g., 1px or 100px) and invalid numeric inputs to further harden the `computeScale` logic.
*   **Webview State Management:** Using `vscode.getState()` and `setState()` within the Webview would ensure the sliders don't reset if the tab is moved or hidden.
