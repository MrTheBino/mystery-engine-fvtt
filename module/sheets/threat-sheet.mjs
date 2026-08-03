const { HandlebarsApplicationMixin } = foundry.applications.api
const { ActorSheetV2 } = foundry.applications.sheets

export default class MysteryThreatSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mystery-engine", "actor", "mystery-threat"],
    position: { width: 1100, height: 800 },
    actions: {
      createItem: MysteryThreatSheet.#createItem,
      editItem: MysteryThreatSheet.#editItem,
      deleteItem: MysteryThreatSheet.#deleteItem,
      toggleEntry: MysteryThreatSheet.#toggleEntry,
      toggleCheckbox: MysteryThreatSheet.#toggleCheckbox,
      moveItemUp: MysteryThreatSheet.#moveItemUp,
      moveItemDown: MysteryThreatSheet.#moveItemDown,
      toggleMoveActive: MysteryThreatSheet.#toggleMoveActive,
      toggleQuestionResolved: MysteryThreatSheet.#toggleQuestionResolved
    },
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true
    }
  };

  static TABS = {
    sheet: {
      tabs: [
        { id: "main",      label: "ME.Tabs.Main",      icon: "fa-solid fa-person" },
        { id: "biography", label: "ME.Tabs.Biography", icon: "fa-solid fa-book" },
        { id: "notes",     label: "ME.Tabs.Notes",     icon: "fa-solid fa-note-sticky" }
      ],
      initial: "main"
    }
  };

  static PARTS = {
    header: {
      template: "systems/mystery-engine-fvtt/templates/actor/parts/threat-header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    main: {
      template: "systems/mystery-engine-fvtt/templates/actor/threat-body.hbs",
      scrollable: [""]
    },
    biography: {
      template: "systems/mystery-engine-fvtt/templates/actor/biography.hbs",
      scrollable: [""]
    },
    notes: {
      template: "systems/mystery-engine-fvtt/templates/actor/notes.hbs",
      scrollable: [""]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isEditMode = this.actor.system.editMode;
    context.system = this.actor.system;
    const items = this.actor.items.contents;
    const byPosition = (a, b) => a.system.position - b.system.position;
    const enrich = (html, doc) => foundry.applications.ux.TextEditor.implementation.enrichHTML(
      html ?? "", { relativeTo: doc, rollData: doc.getRollData() }
    );
    const makeView = async (item) => ({
      id: item.id, name: item.name, img: item.img, type: item.type, system: item.system,
      descriptionHTML: await enrich(item.system.description, item)
    });
    context.items = await Promise.all([...items].sort(byPosition).map(makeView));
    context.checklistItems = await Promise.all(
      items.filter(i => i.type === "checklist").sort(byPosition).map(makeView)
    );
    context.moveItems = await Promise.all(
      items.filter(i => i.type === "move").sort(byPosition).map(async item => {
        const view = await makeView(item);
        view.moveDescriptionHTML = await enrich(item.system.moveDescription, item);
        return view;
      })
    );
    context.textItems = await Promise.all(
      items.filter(i => i.type === "text").sort(byPosition).map(makeView)
    );
    context.questionItems = await Promise.all(
      items.filter(i => i.type === "question").sort(byPosition).map(makeView)
    );
    return context;
  }

  async _preparePartContext(partId, context, options) {
    const ctx = await super._preparePartContext(partId, context, options);
    if ( partId in (ctx.tabs ?? {}) ) ctx.tab = ctx.tabs[partId];
    if ( partId === "biography" ) {
      ctx.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.biography,
        { relativeTo: this.actor, rollData: this.actor.getRollData() }
      );
    }
    if ( partId === "notes" ) {
      ctx.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.notes,
        { relativeTo: this.actor, rollData: this.actor.getRollData() }
      );
    }
    return ctx;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const header = this.element.querySelector(".window-header");
    let button = header.querySelector(".mode-toggle-button");
    if (!button) {
      button = document.createElement("button");
      button.classList.add("header-control", "fa-solid", "icon", "mode-toggle-button");
      const h1Element = header.querySelector("h1");
      header.insertBefore(button, h1Element);
    }

    // The icon shows the mode you are *in*, the tooltip the mode you switch to.
    if (this.actor.system.editMode) {
      button.classList.add("fa-lock-open");
      button.classList.remove("fa-lock");
      button.title = game.i18n.localize("ME.Actor.SwitchToGameMode");
    } else {
      button.classList.add("fa-lock");
      button.classList.remove("fa-lock-open");
      button.title = game.i18n.localize("ME.Actor.SwitchToEditMode");
    }
    button.onclick = ev => this._onToggleEditMode(ev);

    for ( const input of this.element.querySelectorAll(".entry-text-input") ) {
      input.addEventListener("change", this.#onEntryTextChange.bind(this));
    }
  }

  async #onEntryTextChange(event) {
    const input = event.currentTarget;
    const item = this.actor.items.get(input.dataset.itemId);
    const index = parseInt(input.dataset.index);
    const entries = foundry.utils.deepClone(item.system.entries);
    entries[index].text = input.value;
    await item.update({ "system.entries": entries });
  }

  async _onToggleEditMode(event, target) {
    await this.actor.update({ "system.editMode": !this.actor.system.editMode });
  }

  static async #createItem(event, target) {
    const type = target.dataset.type;
    const sameType = this.actor.items.filter(i => i.type === type);
    // position the item at the bottom
    const maxPosition = sameType.reduce((max, i) => Math.max(max, i.system.position ?? 0), -1);
    const name = game.i18n.format("ME.Item.NewItem", { type: game.i18n.localize(`TYPES.Item.${type}`) });
    await Item.create({ name, type, system: { position: maxPosition + 1 } }, { parent: this.actor });
  }

  static async #editItem(event, target) {
    const itemId = target.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    item?.sheet?.render(true);
  }

  static async #deleteItem(event, target) {
    const itemId = target.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("ME.Actor.DeleteItem") },
      content: `<p>${game.i18n.format("ME.Actor.DeleteItemConfirm", { name: item.name })}</p>`,
      rejectClose: false
    });
    if (confirmed) await item.delete();
  }

  static async #toggleEntry(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    const index = parseInt(target.dataset.index);
    const entries = foundry.utils.deepClone(item.system.entries);
    entries[index].selected = !entries[index].selected;
    await item.update({ "system.entries": entries });
  }

  static async #moveItemUp(event, target) {
    const sorted = [...this.actor.items.contents].sort((a, b) => (a.system.position ?? 0) - (b.system.position ?? 0));
    const index = sorted.findIndex(i => i.id === target.closest("[data-item-id]").dataset.itemId);
    if (index <= 0) return;
    [sorted[index - 1], sorted[index]] = [sorted[index], sorted[index - 1]];
    await Item.updateDocuments(
      sorted.map((item, i) => ({ _id: item.id, "system.position": i })),
      { parent: this.actor }
    );
  }

  static async #moveItemDown(event, target) {
    const sorted = [...this.actor.items.contents].sort((a, b) => (a.system.position ?? 0) - (b.system.position ?? 0));
    const index = sorted.findIndex(i => i.id === target.closest("[data-item-id]").dataset.itemId);
    if (index < 0 || index >= sorted.length - 1) return;
    [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
    await Item.updateDocuments(
      sorted.map((item, i) => ({ _id: item.id, "system.position": i })),
      { parent: this.actor }
    );
  }

  static async #toggleMoveActive(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]").dataset.itemId);
    await item.update({ "system.active": !item.system.active });
  }

  static async #toggleCheckbox(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    const index = parseInt(target.dataset.index);
    const checkboxes = foundry.utils.deepClone(item.system.checkboxes);
    if (item.type === "move") {
      checkboxes[index].checked = !checkboxes[index].checked;
    } else {
      checkboxes[index] = !checkboxes[index];
    }
    await item.update({ "system.checkboxes": checkboxes });
  }

  static async #toggleQuestionResolved(event, target) {
    const itemId = target.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    const index = parseInt(target.dataset.index);
    const questions = foundry.utils.deepClone(item.system.questions);
    questions[index].resolved = !questions[index].resolved;
    await item.update({ "system.questions": questions });
  }
}
