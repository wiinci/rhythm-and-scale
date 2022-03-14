const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "rhythm-and-scale.helloWorld",
    function () {
      vscode.window.showInformationMessage(
        "Hello World from rhythm-and-scale!"
      );
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
