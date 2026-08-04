/**
 * GM-only guided tour for the Mystery Engine system (Foundry Tour framework).
 *
 * Registered under `game.tours` so it shows up in Tour Management, and auto-started once for
 * a GM who has not seen it yet. `canStart` gates it to GMs; `_preStep` opens whatever the
 * highlighted selector needs — a demo character sheet in the right mode, or the notebook.
 *
 * Deliberately free of imports on other system modules so it loads regardless of which
 * optional pieces a build ships; the demo actor is fetched through core APIs only.
 */

const SEEN_SETTING = "gmTourSeen";
const SYSTEM = "mystery-engine-fvtt";
const t = (key) => `ME.Tour.${key}`;

// A playbook from the shipped compendium, used to demonstrate the character sheet.
const DEMO_PACK = `${SYSTEM}.playbooks`;
const DEMO_ACTOR_ID = "jOaeFHoA4oMK0ecF"; // The Vessel (The Between)

/**
 * Steps. `within` is a selector inside the demo character sheet and gets resolved against the
 * actual sheet element in `_preStep`; `charMode` opens that sheet in edit or game mode first.
 * A step without any selector is shown centred.
 */
const STEPS = [
  { id: "welcome", title: t("WelcomeTitle"), content: t("WelcomeContent") },

  // --- the sheet is built, not filled in ---
  { id: "concept", title: t("ConceptTitle"), content: t("ConceptContent") },

  // --- compendiums ---
  { id: "compendiums", selector: '#sidebar nav.tabs [data-tab="compendium"]', title: t("CompendiumsTitle"), content: t("CompendiumsContent") },
  { id: "playbooks", title: t("PlaybooksTitle"), content: t("PlaybooksContent") },

  // --- character sheet walkthrough on the demo playbook ---
  { id: "sheet", within: ".sheet-header", title: t("SheetTitle"), content: t("SheetContent"), charMode: "game" },
  { id: "abilities", within: ".abilities-display", title: t("AbilitiesTitle"), content: t("AbilitiesContent"), charMode: "game" },
  { id: "manualRoll", within: ".manual-roll-btn", title: t("ManualRollTitle"), content: t("ManualRollContent"), charMode: "game" },
  { id: "conditions", within: ".conditions-add-btn", title: t("ConditionsTitle"), content: t("ConditionsContent"), charMode: "game" },
  { id: "moves", within: ".item-card-move", title: t("MovesTitle"), content: t("MovesContent"), charMode: "game" },
  { id: "moveActive", within: ".item-card-move .move-header-controls", title: t("MoveActiveTitle"), content: t("MoveActiveContent"), charMode: "game" },
  { id: "checklists", within: ".item-card-checklist", title: t("ChecklistsTitle"), content: t("ChecklistsContent"), charMode: "game" },
  { id: "editToggle", within: ".mode-toggle-button", title: t("EditToggleTitle"), content: t("EditToggleContent"), charMode: "game" },
  { id: "editMode", within: ".items-section", title: t("EditModeTitle"), content: t("EditModeContent"), charMode: "edit" },
  { id: "markup", title: t("MarkupTitle"), content: t("MarkupContent"), charMode: "game" },

  // --- the notebook ---
  { id: "notebookIcon", selector: '#scene-controls-layers button[data-control="notebook_app"]', title: t("NotebookIconTitle"), content: t("NotebookIconContent") },
  { id: "notebook", selector: "#notebook-app", title: t("NotebookTitle"), content: t("NotebookContent"), openNotebook: true },
  { id: "notebookTabs", title: t("NotebookTabsTitle"), content: t("NotebookTabsContent"), openNotebook: true },

  { id: "threats", title: t("ThreatsTitle"), content: t("ThreatsContent") },
  { id: "documentation", title: t("DocumentationTitle"), content: t("DocumentationContent") }
];

export function registerGmTour() {
  const TourBase = foundry.nue?.Tour;
  if (!TourBase) return;

  class MysteryGmTour extends TourBase {
    #demoActor = null;     // the character sheet used for the walkthrough
    #imported = false;     // did we import it (→ delete on cleanup)?
    #origEditMode = null;  // restore the actor's edit mode afterwards
    #openedNotebook = false;

    /** GM-only tour. */
    get canStart() {
      return game.user.isGM;
    }

    /** Make sure a demo character sheet is open in the requested mode. */
    async #ensureDemoActor(mode) {
      if (!this.#demoActor) {
        // Prefer a character that already exists in the world, else import a playbook.
        let actor = game.actors.find(a => a.type === "mystery-actor" && a.isOwner && a.items.size);
        if (!actor) {
          const pack = game.packs.get(DEMO_PACK);
          const source = pack ? await pack.getDocument(DEMO_ACTOR_ID).catch(() => null) : null;
          if (source) {
            actor = await Actor.create(source.toObject());
            this.#imported = true;
          }
        }
        if (!actor) return null;
        this.#demoActor = actor;
        this.#origEditMode = actor.system.editMode;
      }

      const wantEdit = mode === "edit";
      if (this.#demoActor.system.editMode !== wantEdit) {
        await this.#demoActor.update({ "system.editMode": wantEdit });
      }
      const sheet = this.#demoActor.sheet;
      if (!sheet.rendered) sheet.render(true);
      // Poll until the sheet content really is in the DOM — a fixed wait is flaky on slow
      // machines and re-renders after the edit-mode switch.
      for (let i = 0; i < 20 && !sheet.element?.querySelector(".sheet-header"); i++) {
        await new Promise(r => setTimeout(r, 150));
      }
      await new Promise(r => setTimeout(r, 250));
      return this.#demoActor;
    }

    async #ensureNotebook() {
      const app = globalThis.NotebookApp?.getInstance?.();
      if (!app) return;

      // Resolve the scene data item *before* rendering. The app kicks that lookup off
      // asynchronously in its constructor and re-renders once it lands — a re-render
      // underneath the tour tooltip makes Foundry's TooltipManager drop it, and the step
      // would lose its bubble about a second after opening.
      try { await app.findOrCreateSceneDataItem(); } catch { /* no scene, or no permission */ }

      if (!app.rendered) {
        app.render(true, { focus: false });
        this.#openedNotebook = true;
      }
      // Wait for the content, not just the frame, and let the layout settle afterwards.
      for (let i = 0; i < 30 && !app.element?.querySelector(".na-container"); i++) {
        await new Promise(r => setTimeout(r, 100));
      }
      await new Promise(r => setTimeout(r, 400));
    }

    /** Open whatever the current step points at, so its selector resolves. */
    async _preStep() {
      await super._preStep();
      const step = this.currentStep;
      if (!step) return;

      if (step.openNotebook) await this.#ensureNotebook();

      if (step.charMode) {
        const actor = await this.#ensureDemoActor(step.charMode);
        const id = actor?.sheet?.element?.id;
        // A step may only need the sheet open (no highlight), e.g. the markup explanation.
        if (step.within) step.selector = id ? `#${CSS.escape(id)} ${step.within}` : step.within;
      }
    }

    /** Put everything back the way it was. */
    async #cleanup() {
      if (this.#openedNotebook) {
        this.#openedNotebook = false;
        try { globalThis.NotebookApp?.getInstance?.()?.close(); } catch { /* already gone */ }
      }
      if (!this.#demoActor) return;
      const actor = this.#demoActor;
      this.#demoActor = null;
      try {
        if (this.#imported) {
          await actor.delete();
        } else {
          if (this.#origEditMode !== null && actor.system.editMode !== this.#origEditMode) {
            await actor.update({ "system.editMode": this.#origEditMode });
          }
          actor.sheet?.close();
        }
      } catch { /* actor may already be gone */ }
    }

    async complete() {
      await this.#cleanup();
      return super.complete();
    }

    exit() {
      this.#cleanup();
      return super.exit();
    }
  }

  const config = {
    title: t("Title"),
    description: t("Description"),
    canBeResumed: true,
    display: true,
    steps: STEPS
  };

  try {
    game.tours.register(SYSTEM, "gm-tour", new MysteryGmTour(config));
  } catch {
    // already registered (e.g. a repeated ready hook) — ignore
  }
}

/** Seen-flag, client scoped so every GM tracks their own. Called from the init hook. */
export function registerGmTourSettings() {
  game.settings.register(SYSTEM, SEEN_SETTING, {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });
}

/** Auto-start once for a GM who has not seen the tour yet. Called from the ready hook. */
export async function maybeAutoStartGmTour() {
  if (!game.user.isGM) return;
  if (game.settings.get(SYSTEM, SEEN_SETTING)) return;
  const tour = game.tours.get(`${SYSTEM}.gm-tour`);
  if (!tour) return;
  await game.settings.set(SYSTEM, SEEN_SETTING, true);
  setTimeout(() => {
    try { tour.start(); } catch (err) { console.warn("mystery-engine | GM tour failed to start", err); }
  }, 2000);
}
