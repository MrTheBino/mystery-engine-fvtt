export default class MysteryActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  /** @override */
    prepareBaseData() {
        super.prepareBaseData();
    }

    /** @override */
    prepareData() {
        // Prepare data for the actor. Calling the super version of this executes
        // the following, in order: data reset (to clear active effects),
        // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
        // prepareDerivedData().
        super.prepareData();
    }

    toPlainObject() {
        const result = { ...this };

        // Simplify system data.
        /*result.system = this.system.toPlainObject();

        // Add items.
        result.items = this.items?.size > 0 ? this.items.contents : [];

        // Add effects.
        result.effects = this.effects?.size > 0 ? this.effects.contents : [];*/

        return result;
    }
}
