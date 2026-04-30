import { NotebookApp } from "../apps/notebook-app.mjs";

export function setupHooks() {
    Hooks.on("getSceneControlButtons", (controls) => {
    let sidebarControls = {
      notebook_app: {
        name: "notebook_app",
        title: "Notebook",
        icon: "fas fa-scroll",
        visible: true,
        onChange: () => NotebookApp.getInstance().render(true, { focus: true }),
        button: true,
      }
    };

    controls.notes.tools = foundry.utils.mergeObject(
      controls.notes.tools,
      sidebarControls
    );

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