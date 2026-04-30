const { HandlebarsApplicationMixin } = foundry.applications.api
const { ItemSheetV2 } = foundry.applications.sheets

export default class ChecklistSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mystery-engine", "item", "checklist"],
    position: { width: 500, height: 500 },
    actions: {
      addEntry: ChecklistSheet.#addEntry,
      removeEntry: ChecklistSheet.#removeEntry
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
      template: "systems/mystery-engine-fvtt/templates/item/checklist-body.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.item.system;
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.item.system.description,
      { relativeTo: this.item, rollData: this.item.getRollData() }
    );
    return context;
  }

  static async #addEntry(event, target) {
    const entries = foundry.utils.deepClone(this.item.system.entries);
    entries.push({ selected: false, text: "" });
    await this.item.update({ "system.entries": entries });
  }

  static async #removeEntry(event, target) {
    const index = parseInt(target.closest("[data-index]").dataset.index);
    const entries = foundry.utils.deepClone(this.item.system.entries);
    entries.splice(index, 1);
    await this.item.update({ "system.entries": entries });
  }
}
