import { NotebookApp } from "../apps/notebook-app.mjs";

export function setupHooks() {
    // The notebook sits in the control bar as its own entry, directly below Journal Notes
    // (which is order 8, the last core control) instead of hiding inside its tool palette.
    Hooks.on("getSceneControlButtons", (controls) => {
      controls.notebook_app = {
        name: "notebook_app",
        order: 9,
        title: "Notebook",
        icon: "fas fa-scroll",
        visible: true,
        // No tools: this control is a plain button, see the renderSceneControls hook below.
        tools: {}
      };
    });

    // A top-level control would normally become the *active* layer on click, latch itself
    // pressed and ignore a second click. The notebook only opens a window, so the click is
    // intercepted before Foundry's delegated handler switches layers.
    Hooks.on("renderSceneControls", (_app, html) => {
      const button = html.querySelector('button[data-control="notebook_app"]');
      if (!button || button.dataset.notebookBound) return;
      button.dataset.notebookBound = "true";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        NotebookApp.getInstance().render(true, { focus: true });
      });
    });

    // remove the notebook-scene-item from the item directory and creation dialog, since it's only used as a container for scene-specific data and shouldn't be created manually by users
    Hooks.on("renderItemDirectory", (_app, html) => {
    // ToDo: is this the correct way? maybe move them to a compendium?
    const sceneDataIds = game.items
      .filter((item) => item.type === "notebook-scene-item")
      .map((i) => i.id);
    for (const id of sceneDataIds) {
      let t = html.querySelector(`li.directory-item[data-entry-id="${id}"]`);
      if (t) t.remove();
    }
  });

  Hooks.on("renderDialogV2", (_dialog, html) => {
    html.querySelector('select[name="type"] option[value="notebook-scene-item"]')?.remove();
  });
}