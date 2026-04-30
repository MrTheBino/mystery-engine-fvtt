import BaseItemData from "./base-item.mjs";

const fields = foundry.data.fields;

export default class TextItemData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      checkboxes: new fields.ArrayField(
        new fields.BooleanField({ initial: false }),
        { initial: [] }
      )
    };
  }
}
