import BaseItemData from "./base-item.mjs";

const fields = foundry.data.fields;

export default class MoveData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      active: new fields.BooleanField({ initial: true }),
      hidden: new fields.BooleanField({ initial: false }),
      moveDescription: new fields.HTMLField({ blank: true, initial: "" }),
      checkboxes: new fields.ArrayField(
        new fields.SchemaField({
          checked: new fields.BooleanField({ initial: false }),
          description: new fields.StringField({ blank: true, initial: "" })
        }),
        { initial: [] }
      )
    };
  }
}
