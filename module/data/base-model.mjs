export default class MysteryDataModel extends foundry.abstract.TypeDataModel {
  toPlainObject() {
    return { ...this };
  }
}
