export default class MysteryActor extends Actor {

  prepareDerivedData() {
    super.prepareDerivedData();
  }

  static async create(data, options = {}) {
    //make default Friendly and Linked on Creation
    data.prototypeToken = data.prototypeToken || {};

    let defaults = {};
      defaults = {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        sight: { enabled: true,range: 0,visionMode: "basic" },
      };
    
    foundry.utils.mergeObject(data.prototypeToken, defaults, { overwrite: false });

    const actor = await super.create(data, options);
    return actor;
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
