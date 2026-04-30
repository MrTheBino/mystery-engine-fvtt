import BaseItemData from "./base-item.mjs";

const fields = foundry.data.fields;

export default class QuestionData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      questions: new fields.ArrayField(
        new fields.SchemaField({
          text: new fields.StringField({ blank: true, initial: "" }),
          opportunities: new fields.StringField({ blank: true, initial: "" }),
          complexity: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null }),
          resolved: new fields.BooleanField({ initial: false })
        }),
        { initial: [] }
      )
    };
  }
}
