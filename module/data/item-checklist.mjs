import BaseItemData from "./base-item.mjs";

const fields = foundry.data.fields;

export default class ChecklistData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      isContainer: new fields.BooleanField({ initial: false }),
      entries: new fields.ArrayField(
        new fields.SchemaField({
          selected: new fields.BooleanField({ initial: false }),
          text: new fields.StringField({ blank: true, initial: "" })
        }),
        { initial: [] }
      )
    };
  }
}
