const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class RollDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor(data = {}, options = {}) {
        super(options);
        this.abilityName = data.abilityName ?? "";
        this.abilityValue = data.abilityValue ?? 0;
        this.actor = data.actor ?? null;
    }

    static DEFAULT_OPTIONS = {
        classes: ['mystery-engine', 'dialog', 'roll-dialog'],
        tag: 'div',
        window: {
            frame: true,
            title: 'ME.RollDialog.Title',
            positioned: true,
            resizable: false
        },
        position: {
            width: 300,
            height: 300
        }
    };

    static PARTS = {
        body: {
            template: 'systems/mystery-engine-fvtt/templates/apps/roll-dialog-body.hbs'
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const sign = this.abilityValue >= 0 ? '+' : '';
        return {
            ...context,
            abilityName: this.abilityName,
            abilityModifier: `${sign}${this.abilityValue}`
        };
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        this.element.querySelector('[data-roll="advantage"]')
            ?.addEventListener('click', () => this.#roll('advantage'));
        this.element.querySelector('[data-roll="disadvantage"]')
            ?.addEventListener('click', () => this.#roll('disadvantage'));
    }

    async #roll(mode) {
        const formula = mode === 'advantage'
            ? `3d6kh2 + ${this.abilityValue}`
            : `3d6kl2 + ${this.abilityValue}`;

        const roll = await new Roll(formula).roll();
        const label = game.i18n.localize(mode === 'advantage' ? 'ME.RollDialog.Advantage' : 'ME.RollDialog.Disadvantage');

        await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `<strong>${this.abilityName}</strong> — ${label}`
        });

        this.close();
    }
}
