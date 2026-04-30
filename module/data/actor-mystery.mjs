import MysteryDataModel from "./base-model.mjs";

const fields = foundry.data.fields;

export default class MysteryActorData extends MysteryDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

      schema.editMode = new fields.BooleanField({ initial: true });

      schema.biography = new fields.HTMLField({ blank: true, initial: "" });
      schema.notes = new fields.HTMLField({ blank: true, initial: "" });

      schema.labels = new fields.ArrayField(
        new fields.SchemaField({
          name:  new fields.StringField({ required: true, blank: true, initial: "" }),
          value: new fields.StringField({ required: true, blank: true, initial: "" })
        }),
        { initial: [] }
      );

      schema.conditions = new fields.ArrayField(
        new fields.StringField({ required: true, blank: true, initial: "" }),
        { initial: [] }
      );

      schema.abilities = new fields.ArrayField(
        new fields.SchemaField({
          name:  new fields.StringField({ required: true, blank: true, initial: "" }),
          value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
        }),
        { initial: [] }
      );

      schema.xpTrack = new fields.ArrayField(
        new fields.BooleanField({ initial: false }),
        { initial: [false, false, false, false, false] }
      );

      return schema;
  }

  prepareDerivedData() {
  }
}
