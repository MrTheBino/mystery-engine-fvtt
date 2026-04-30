import MysteryDataModel from "./base-model.mjs";

const fields = foundry.data.fields;

export default class BaseItemData extends MysteryDataModel {
  static defineSchema() {
    return {
      position: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
      description: new fields.HTMLField({ blank: true, initial: "" })
    };
  }
}
