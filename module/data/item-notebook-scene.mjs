import BaseItemData from "./base-item.mjs";

const fields = foundry.data.fields;

export default class NotebookSceneItemData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      sceneUuid: new fields.StringField({ blank: true, initial: "" }),
      notebookUuid: new fields.StringField({ blank: true, initial: "" }), // we store only one notebook per scene, so we can just store a single UUID instead of an array
    };
  }
}
