const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class RollDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor(data = {}, options = {}) {
        super(options);
        // In manual mode no ability is involved: the modifier is typed into the dialog.
        this.manual = data.manual ?? false;
        this.abilityName = data.abilityName ?? (this.manual ? game.i18n.localize("ME.RollDialog.ManualRoll") : "");
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
            height: 'auto'
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
            manual: this.manual,
            abilityName: this.abilityName,
            abilityValue: this.abilityValue,
            abilityModifier: `${sign}${this.abilityValue}`
        };
    }

    /**
     * How each roll mode is rolled and announced. A plain roll keeps two dice; advantage and
     * disadvantage roll three and drop the worst or the best one.
     */
    static MODES = {
        normal:       { formula: '2d6',     icon: 'fa-dice-d6' },
        advantage:    { formula: '3d6kh2',  icon: 'fa-angles-up',   label: 'ME.RollDialog.Advantage' },
        disadvantage: { formula: '3d6kl2',  icon: 'fa-angles-down', label: 'ME.RollDialog.Disadvantage' }
    };

    async _onRender(context, options) {
        await super._onRender(context, options);
        for (const mode of Object.keys(RollDialog.MODES)) {
            this.element.querySelector(`[data-roll="${mode}"]`)
                ?.addEventListener('click', () => this.#roll(mode));
        }

        const input = this.element.querySelector('.roll-dialog-modifier-input');
        if (!input) return;
        input.addEventListener('change', () => { this.abilityValue = this.#readModifier(input); });
        input.focus();
        input.select();
    }

    /** Reads the typed modifier, tolerating an empty field or a leading plus. */
    #readModifier(input) {
        const value = parseInt(input.value, 10);
        return Number.isNaN(value) ? 0 : value;
    }

    /**
     * Outcome bands of the Carved-from-Brindlewood ladder, highest first.
     * The ranges match the badges the character sheet puts on a move's outcome lines.
     */
    static TIERS = [
        { min: 12, key: 'crit', range: '12+',  label: 'ME.Roll.StrongHit' },
        { min: 10, key: 'hit',  range: '10+',  label: 'ME.Roll.StrongHit' },
        { min: 7,  key: 'weak', range: '7-9',  label: 'ME.Roll.WeakHit' },
        { min: -Infinity, key: 'miss', range: '6-', label: 'ME.Roll.Miss' }
    ];

    async #roll(mode) {
        // Read the field directly rather than trusting the change event: clicking a button
        // blurs the input, and the ordering of blur and click is not worth depending on.
        const input = this.element.querySelector('.roll-dialog-modifier-input');
        if (input) this.abilityValue = this.#readModifier(input);

        const roll = await new Roll(`${RollDialog.MODES[mode].formula} + ${this.abilityValue}`).roll();

        // Custom content replaces Foundry's default dice block — ChatMessage leaves `content`
        // alone as soon as it contains markup of its own.
        const content = await foundry.applications.handlebars.renderTemplate(
            'systems/mystery-engine-fvtt/templates/chat/ability-roll.hbs',
            this.#chatContext(roll, mode)
        );

        await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content
        });

        this.close();
    }

    #chatContext(roll, mode) {
        const tier = RollDialog.TIERS.find(t => roll.total >= t.min);
        const { icon, label } = RollDialog.MODES[mode];
        return {
            abilityName: this.abilityName,
            modifier: this.abilityValue ? `${this.abilityValue >= 0 ? '+' : ''}${this.abilityValue}` : '',
            mode,
            modeIcon: icon,
            // A plain roll has nothing to announce — only advantage and disadvantage do.
            modeLabel: label ? game.i18n.localize(label) : '',
            total: roll.total,
            tier: tier.key,
            tierLabel: game.i18n.localize(tier.label),
            tierRange: tier.range,
            // `active` is false for the die that kh2/kl2 threw away.
            dice: roll.dice[0]?.results.map(r => ({ result: r.result, active: r.active })) ?? []
        };
    }
}
