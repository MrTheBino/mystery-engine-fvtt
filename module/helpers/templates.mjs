/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return foundry.applications.handlebars.loadTemplates([
    // Actor partials.
    "systems/mystery-engine-fvtt/templates/actor/parts/edit-mode.hbs",
    "systems/mystery-engine-fvtt/templates/actor/parts/non-edit-mode.hbs",
    "systems/mystery-engine-fvtt/templates/actor/parts/threat-edit-mode.hbs",
    // Notebook app tab partials.
    "systems/mystery-engine-fvtt/templates/apps/parts/notebook-actors-tab.hbs",
    "systems/mystery-engine-fvtt/templates/apps/parts/notebook-threats-tab.hbs",
    "systems/mystery-engine-fvtt/templates/apps/parts/notebook-pages-tab.hbs",
    "systems/mystery-engine-fvtt/templates/apps/parts/notebook-options-tab.hbs",
    // Dialog templates.
    "systems/mystery-engine-fvtt/templates/apps/roll-dialog-body.hbs"
  ]);
};
