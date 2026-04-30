const { HandlebarsApplicationMixin } = foundry.applications.api
const { ItemSheetV2 } = foundry.applications.sheets

export default class NotebookSceneSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mystery-engine", "item", "notebook-scene-item"],
    position: { width: 480, height: 420 },
    actions: {
      removeScene: NotebookSceneSheet.#removeScene,
      removeNotebook: NotebookSceneSheet.#removeNotebook
    },
    form: {
      submitOnChange: true
    }
  };

  static PARTS = {
    header: {
      template: "systems/mystery-engine-fvtt/templates/item/parts/item-header.hbs"
    },
    body: {
      template: "systems/mystery-engine-fvtt/templates/item/notebook-scene-body.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.item.system;

    if (this.item.system.sceneUuid) {
      const scene = await fromUuid(this.item.system.sceneUuid).catch(() => null);
      context.resolvedScene = scene
        ? { uuid: this.item.system.sceneUuid, name: scene.name, thumb: scene.thumb ?? "icons/svg/direction.svg" }
        : { uuid: this.item.system.sceneUuid, name: "(Unknown Scene)", thumb: "icons/svg/direction.svg" };
    } else {
      context.resolvedScene = null;
    }

    if (this.item.system.notebookUuid) {
      const notebook = await fromUuid(this.item.system.notebookUuid).catch(() => null);
      context.resolvedNotebook = notebook
        ? { uuid: this.item.system.notebookUuid, name: notebook.name, img: notebook.img ?? "icons/svg/book.svg" }
        : { uuid: this.item.system.notebookUuid, name: "(Unknown Notebook)", img: "icons/svg/book.svg" };
    } else {
      context.resolvedNotebook = null;
    }

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const sceneZone = this.element.querySelector(".nsi-drop-zone[data-drop-type='scene']");
    if (sceneZone) {
      sceneZone.addEventListener("dragover", e => { e.preventDefault(); sceneZone.classList.add("drag-over"); });
      sceneZone.addEventListener("dragleave", () => sceneZone.classList.remove("drag-over"));
      sceneZone.addEventListener("drop", ev => this.#onDrop(ev, "scene"));
    }

    const notebookZone = this.element.querySelector(".nsi-drop-zone[data-drop-type='notebook']");
    if (notebookZone) {
      notebookZone.addEventListener("dragover", e => { e.preventDefault(); notebookZone.classList.add("drag-over"); });
      notebookZone.addEventListener("dragleave", () => notebookZone.classList.remove("drag-over"));
      notebookZone.addEventListener("drop", ev => this.#onDrop(ev, "notebook"));
    }
  }

  async #onDrop(event, dropType) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-over");
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return; }

    if (dropType === "scene") {
      if (data.type !== "Scene") return;
      await this.item.update({ "system.sceneUuid": data.uuid });
    } else {
      if (data.type !== "Item") return;
      const item = await fromUuid(data.uuid).catch(() => null);
      if (!item || item.type !== "notebook") return;
      await this.item.update({ "system.notebookUuid": data.uuid });
    }
  }

  static async #removeScene(event, target) {
    await this.item.update({ "system.sceneUuid": "" });
  }

  static async #removeNotebook(event, target) {
    await this.item.update({ "system.notebookUuid": "" });
  }
}
