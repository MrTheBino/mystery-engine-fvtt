import MysteryDataModel from "./base-model.mjs";

const fields = foundry.data.fields;

export default class MysteryThreatData extends MysteryDataModel {
  static defineSchema() {
    const schema = {};
    schema.editMode = new fields.BooleanField({ initial: true });
    schema.biography = new fields.HTMLField({ blank: true, initial: "" });
    schema.notes = new fields.HTMLField({ blank: true, initial: "" });
    return schema;
  }

  prepareDerivedData() {}
}
