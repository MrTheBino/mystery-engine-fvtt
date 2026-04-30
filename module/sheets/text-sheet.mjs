const { HandlebarsApplicationMixin } = foundry.applications.api
const { ItemSheetV2 } = foundry.applications.sheets

export default class TextSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mystery-engine", "item", "text-item"],
    position: { width: 500, height: 420 },
    actions: {
      addCheckbox: TextSheet.#addCheckbox,
      removeCheckbox: TextSheet.#removeCheckbox
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
      template: "systems/mystery-engine-fvtt/templates/item/text-body.hbs"
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

  static async #addCheckbox(event, target) {
    const checkboxes = foundry.utils.deepClone(this.item.system.checkboxes);
    checkboxes.push(false);
    await this.item.update({ "system.checkboxes": checkboxes });
  }

  static async #removeCheckbox(event, target) {
    const index = parseInt(target.closest("[data-index]").dataset.index);
    const checkboxes = foundry.utils.deepClone(this.item.system.checkboxes);
    checkboxes.splice(index, 1);
    await this.item.update({ "system.checkboxes": checkboxes });
  }
}
