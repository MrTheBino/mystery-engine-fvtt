const { HandlebarsApplicationMixin } = foundry.applications.api
const { ItemSheetV2 } = foundry.applications.sheets

export default class QuestionSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mystery-engine", "item", "question-item"],
    position: { width: 560, height: 520 },
    actions: {
      addQuestion: QuestionSheet.#addQuestion,
      removeQuestion: QuestionSheet.#removeQuestion
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
      template: "systems/mystery-engine-fvtt/templates/item/question-body.hbs"
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

  static async #addQuestion(event, target) {
    const questions = foundry.utils.deepClone(this.item.system.questions);
    questions.push({ text: "", opportunities: "", complexity: null, resolved: false });
    await this.item.update({ "system.questions": questions });
  }

  static async #removeQuestion(event, target) {
    const index = parseInt(target.closest("[data-index]").dataset.index);
    const questions = foundry.utils.deepClone(this.item.system.questions);
    questions.splice(index, 1);
    await this.item.update({ "system.questions": questions });
  }
}
