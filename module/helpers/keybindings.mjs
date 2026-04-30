import { NotebookApp } from "../apps/notebook-app.mjs";

export function setupKeybindings() {
   game.keybindings.register("mystery-engine-fvtt", "showNotebookApp", {
    name: "Show Notebook",
    hint: "opens the notebook",
    editable: [
      {
        key: "KeyJ",       
        modifiers: ["Control"]
      }
    ],
    onDown: () => {
        NotebookApp.getInstance().render(true, { focus: true })
      return true;
    },
    onUp: () => {},
    restricted: false, // true = nur SL darf Shortcut nutzen
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
}