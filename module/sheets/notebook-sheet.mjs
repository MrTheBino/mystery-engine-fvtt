const { HandlebarsApplicationMixin } = foundry.applications.api
const { ItemSheetV2 } = foundry.applications.sheets

export default class NotebookSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mystery-engine", "item", "notebook"],
    position: { width: 560, height: 700 },
    actions: {
      removeActor: NotebookSheet.#removeActor,
      removeThreat: NotebookSheet.#removeThreat,
      addPage: NotebookSheet.#addPage,
      deletePage: NotebookSheet.#deletePage,
      addNote: NotebookSheet.#addNote,
      deleteNote: NotebookSheet.#deleteNote
    },
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true
    }
  };

  static PARTS = {
    header: {
      template: "systems/mystery-engine-fvtt/templates/item/parts/item-header.hbs"
    },
    body: {
      template: "systems/mystery-engine-fvtt/templates/item/notebook-body.hbs",
      scrollable: [""]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.item.system;

    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(
      html ?? "", { relativeTo: this.item, rollData: this.item.getRollData() }
    );

    context.descriptionHTML = await enrich(this.item.system.description);

    context.resolvedActors = [];
    for (let i = 0; i < this.item.system.actors.length; i++) {
      const uuid = this.item.system.actors[i];
      const actor = await fromUuid(uuid).catch(() => null);
      context.resolvedActors.push({
        uuid, index: i,
        name: actor?.name ?? "(Unknown Actor)",
        img: actor?.img ?? "icons/svg/mystery-man.svg"
      });
    }

    context.resolvedThreats = [];
    for (let i = 0; i < this.item.system.threats.length; i++) {
      const uuid = this.item.system.threats[i];
      const actor = await fromUuid(uuid).catch(() => null);
      context.resolvedThreats.push({
        uuid, index: i,
        name: actor?.name ?? "(Unknown Threat)",
        img: actor?.img ?? "icons/svg/mystery-man.svg"
      });
    }

    context.pages = await Promise.all(
      this.item.system.pages.map(async (page, pi) => ({
        index: pi,
        title: page.title,
        notes: await Promise.all(
          page.notes.map(async (note, ni) => ({
            pageIndex: pi,
            noteIndex: ni,
            title: note.title,
            description: note.description,
            descriptionHTML: await enrich(note.description)
          }))
        )
      }))
    );

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const actorZone = this.element.querySelector(".notebook-drop-zone[data-drop-type='actor']");
    if (actorZone) {
      actorZone.addEventListener("dragover", e => { e.preventDefault(); actorZone.classList.add("drag-over"); });
      actorZone.addEventListener("dragleave", () => actorZone.classList.remove("drag-over"));
      actorZone.addEventListener("drop", ev => this.#onDrop(ev, "actor"));
    }

    const threatZone = this.element.querySelector(".notebook-drop-zone[data-drop-type='threat']");
    if (threatZone) {
      threatZone.addEventListener("dragover", e => { e.preventDefault(); threatZone.classList.add("drag-over"); });
      threatZone.addEventListener("dragleave", () => threatZone.classList.remove("drag-over"));
      threatZone.addEventListener("drop", ev => this.#onDrop(ev, "threat"));
    }
  }

  async #onDrop(event, dropType) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-over");
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return; }
    if (data.type !== "Actor") return;
    const actor = await fromUuid(data.uuid).catch(() => null);
    if (!actor) return;

    if (dropType === "actor") {
      if (actor.type !== "mystery-actor") return;
      const actors = foundry.utils.deepClone(this.item.system.actors);
      if (actors.includes(data.uuid)) return;
      actors.push(data.uuid);
      await this.item.update({ "system.actors": actors });
    } else {
      if (actor.type !== "mystery-threat") return;
      const threats = foundry.utils.deepClone(this.item.system.threats);
      if (threats.includes(data.uuid)) return;
      threats.push(data.uuid);
      await this.item.update({ "system.threats": threats });
    }
  }

  static async #removeActor(event, target) {
    const index = parseInt(target.dataset.index);
    const actors = foundry.utils.deepClone(this.item.system.actors);
    actors.splice(index, 1);
    await this.item.update({ "system.actors": actors });
  }

  static async #removeThreat(event, target) {
    const index = parseInt(target.dataset.index);
    const threats = foundry.utils.deepClone(this.item.system.threats);
    threats.splice(index, 1);
    await this.item.update({ "system.threats": threats });
  }

  static async #addPage(event, target) {
    const pages = foundry.utils.deepClone(this.item.system.pages);
    pages.push({ title: "", notes: [] });
    await this.item.update({ "system.pages": pages });
  }

  static async #deletePage(event, target) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      content: game.i18n.localize("ME.Notebook.Pages.DeletePageConfirm"),
      rejectClose: false,
      modal: true
    });
    if (!confirmed) return;
    const index = parseInt(target.dataset.index);
    const pages = foundry.utils.deepClone(this.item.system.pages);
    pages.splice(index, 1);
    await this.item.update({ "system.pages": pages });
  }

  static async #addNote(event, target) {
    const pageIndex = parseInt(target.dataset.pageIndex);
    const pages = foundry.utils.deepClone(this.item.system.pages);
    if (!pages[pageIndex]) return;
    pages[pageIndex].notes.push({ title: "", description: "" });
    await this.item.update({ "system.pages": pages });
  }

  static async #deleteNote(event, target) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      content: game.i18n.localize("ME.Notebook.Pages.DeleteNoteConfirm"),
      rejectClose: false,
      modal: true
    });
    if (!confirmed) return;
    const pageIndex = parseInt(target.dataset.pageIndex);
    const noteIndex = parseInt(target.dataset.noteIndex);
    const pages = foundry.utils.deepClone(this.item.system.pages);
    if (!pages[pageIndex]) return;
    pages[pageIndex].notes.splice(noteIndex, 1);
    await this.item.update({ "system.pages": pages });
  }
}
