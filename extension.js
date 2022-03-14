const vscode = require("vscode");

const SCALES = [
  {
    description: "(default)",
    detail: "1.25",
    label: "Major third",
  },
  {
    detail: "1.0667",
    label: "Minor second",
  },
  {
    detail: "1.125",
    label: "Major second",
  },
  {
    detail: "1.2",
    label: "Minor third",
  },
  {
    detail: "1.3333",
    label: "Perfect fourth",
  },
  {
    detail: "1.4142",
    label: "Augmented fourth",
  },
  {
    detail: "1.5",
    label: "Perfect fifth",
  },
  {
    detail: "1.6",
    label: "Minor sixth",
  },
  {
    detail: "1.618",
    label: "Golden ratio",
  },
  {
    detail: "1.6667",
    label: "Major sixth",
  },
  {
    detail: "1.7778",
    label: "Minor seventh",
  },
  {
    detail: "1.875",
    label: "Major seventh",
  },
  {
    detail: "2",
    label: "Octave",
  },
  {
    detail: "2.5",
    label: "Major tenth",
  },
  {
    detail: "2.6667",
    label: "Major eleventh",
  },
  {
    detail: "3",
    label: "Major twelfth",
  },
];

const items = [
  {
    exponent: -1,
    label: "small",
  },
  {
    exponent: 0,
    label: "default",
  },
  {
    exponent: 1,
    label: "h6",
  },
  {
    exponent: 2,
    label: "h5",
  },
  {
    exponent: 3,
    label: "h4",
  },
  {
    exponent: 4,
    label: "h3",
  },
  {
    exponent: 5,
    label: "h2",
  },
  {
    exponent: 6,
    label: "h1",
  },
];

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "rhythm-and-scale.rhythmAndScale",
    async () => {
      // 1. User input for generating the typographic scale (default: 1.25)
      const scale = await vscode.window.showQuickPick(SCALES, {
        placeHolder: "Select a typographic scale",
      });

      // 2. User input for the base font size (default: 16)
      const fontSize = await vscode.window.showInputBox({
        prompt:
          "One value of the base font size to build the typographic scale, e.g. 16, 18, 24, …",
        placeHolder: "16",
      });

      // 3. User input for the default line height (default: 1.5)
      const lineHeight = await vscode.window.showInputBox({
        prompt: "Enter the decimal value for the default line height",
        placeHolder: "1.5",
      });

      // 4. User input for the vertical baseline rhythm (default: 4)
      const rhythm = await vscode.window.showInputBox({
        prompt: "The vertical baseline rhythm, e.g. 4, 5, 6, 8 …",
        placeHolder: "4",
      });

      const scaleValue = scale ? Number(scale.detail) : Number("1.25");
      const rhythmValue = !isNaN(Number(rhythm)) ? Number(rhythm) : 4;
      const fontSizeValue = !isNaN(Number(fontSize)) ? Number(fontSize) : 16;
      const lineHeightValue = !isNaN(Number(lineHeight))
        ? Number(lineHeight)
        : 1.5;

      // 5. Generate the typographic scale and vertical rhythm
      for (let item of items) {
        const itemFontSize = Math.round(
          Math.pow(scaleValue, item.exponent) * fontSizeValue
        );
        const itemLineHeight =
          Math.floor(Math.ceil(itemFontSize * lineHeightValue) / rhythmValue) *
          rhythmValue;

        item["fontSize"] = `${itemFontSize}px`;
        item["lineHeight"] = `${itemLineHeight}px`;
      }

      console.log({ items });

      // 6. Show the typographic scale and vertical rhythm
      let content = `/**\n`;
      content += `\tTypographic scale based on ${
        scale ? scale.label : "Major third"
      } (${scaleValue}) at ${fontSize}px\n`;
      content += `\tdefault line-height: ${lineHeightValue}\n`;
      content += `\tvertical rhythm: ${rhythmValue}\n`;
      content += `*/\n\n`;
      content += `:root {\n`;

      for (let item of items) {
        content += `\t--font-size-${item.label}: ${item.fontSize};\n`;
        content += `\t--line-height-${item.label}: ${item.lineHeight};\n`;
      }

      content += `}`;

      const cssDoc = await vscode.workspace.openTextDocument({
        language: "css",
        content,
      });
      await vscode.window.showTextDocument(cssDoc);
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
