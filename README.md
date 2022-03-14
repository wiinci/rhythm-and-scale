# Rhythm and scale

This is a sample extension that generates a typographic scale for font-sizes based on Tim Brown's popular article on the subject of [typography and modular scale](https://alistapart.com/article/more-meaningful-typography/).

The extension also generates line-heights associated with each of the font-sizes that follow a [vertical rhythm](https://medium.com/built-to-adapt/8-point-grid-vertical-rhythm-90d05ad95032). This creates a consistent vertical spacing between elements on page with text that's aligned on a repeating baseline grid.

The output is a collection of CSS custom properties for all headings (`h1`–`h6`), and the default and `small` body copy.

## Demo

![rhythm-and-scale](https://user-images.githubusercontent.com/505739/158106909-8a5bb5bd-0e99-4169-b962-264cc72e5439.gif)


## VS Code API

- [`commands.registerCommand`](https://code.visualstudio.com/api/references/vscode-api#commands.registerCommand)
- [`window.showInputBox`](https://code.visualstudio.com/api/references/vscode-api#window.showInputBox)
- [`window.showQuickPick`](https://code.visualstudio.com/api/references/vscode-api#window.showQuickPick)
- [`window.showTextDocument`](https://code.visualstudio.com/api/references/vscode-api#window.showTextDocument)
- [`workspace.openTextDocument`](https://code.visualstudio.com/api/references/vscode-api#workspace.openTextDocument)

## Running the sample

- `git clone` this directory
- `cd rhythm-and-scale`
- `npm install` to install dependencies
- Open `entension.js` and hit `F5` ro run and debug extension
- In the debug window that opens, hit `Cmd + Shift + P` and type `Rhythm and Scale` to select the extension
- Follow prompts and enter the necessary values (integer vs decimals)
- Get a file with the font-size and line-height properties!
