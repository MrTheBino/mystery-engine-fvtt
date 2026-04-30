import BaseItemData from "./base-item.mjs";

const fields = foundry.data.fields;

export default class NotebookData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      actors: new fields.ArrayField(
        new fields.StringField({ required: true, blank: false }),
        { initial: [] }
      ),
      threats: new fields.ArrayField(
        new fields.SchemaField({
          title: new fields.StringField({ blank: true, initial: "" }),
          introduction: new fields.HTMLField({ blank: true, initial: "" }),
          countdown: new fields.ArrayField(
            new fields.BooleanField({ initial: false }),
            { initial: [] }
          ),
          questions: new fields.ArrayField(
            new fields.SchemaField({
              checkbox: new fields.BooleanField({ initial: false }),
              title: new fields.StringField({ blank: true, initial: "" }),
              opportunity: new fields.StringField({ blank: true, initial: "" }),
              complexity: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null }),
            }),
            { initial: [] }
          ),
          clues: new fields.ArrayField(
            new fields.SchemaField({
              checkbox: new fields.BooleanField({ initial: false }),
              explained: new fields.BooleanField({ initial: false }),
              text: new fields.StringField({ blank: true, initial: "" })
            }),
            { initial: [] }
          ),
          other: new fields.ArrayField(
            new fields.SchemaField({
              title: new fields.StringField({ blank: true, initial: "" }),
              shortDescription: new fields.StringField({ blank: true, initial: "" }),
              checkbox: new fields.BooleanField({ initial: false })
            }),
            { initial: [] }
          )
        }),
        { initial: [] }
      ),
      pages: new fields.ArrayField(
        new fields.SchemaField({
          title: new fields.StringField({ blank: true, initial: "" }),
          notes: new fields.ArrayField(
            new fields.SchemaField({
              title: new fields.StringField({ blank: true, initial: "" }),
              description: new fields.HTMLField({ blank: true, initial: "" })
            }),
            { initial: [] }
          )
        }),
        { initial: [] }
      )
    };
  }
}
