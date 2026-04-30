import MysteryActor from "./documents/actor.mjs";
import MysteryItem from "./documents/item.mjs";
import * as models from "./data/_module.mjs";
import MysteryActorSheet from "./sheets/actor-sheet.mjs";
import MysteryThreatSheet from "./sheets/threat-sheet.mjs";
import ChecklistSheet from "./sheets/checklist-sheet.mjs";
import MoveSheet from "./sheets/move-sheet.mjs";
import NotebookSheet from "./sheets/notebook-sheet.mjs";
import TextSheet from "./sheets/text-sheet.mjs";
import QuestionSheet from "./sheets/question-sheet.mjs";
import NotebookSceneSheet from "./sheets/notebook-scene-sheet.mjs";
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { setupHooks } from "./helpers/hooks.mjs";
import { registerSettings, applyCurrentTheme } from "./helpers/settings.mjs";
import { registerHandlebarHelpers } from "./helpers/handlebars.mjs";

Hooks.once("init", () => {
  CONFIG.Actor.documentClass = MysteryActor;
  CONFIG.Item.documentClass = MysteryItem;

  CONFIG.Actor.dataModels = {
    "mystery-actor": models.MysteryActorData,
    "mystery-threat": models.MysteryThreatData
  };

  CONFIG.Item.dataModels = {
    checklist: models.ChecklistData,
    move: models.MoveData,
    notebook: models.NotebookData,
    text: models.TextItemData,
    question: models.QuestionData,
    "notebook-scene-item": models.NotebookSceneItemData
  };

  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("mystery-engine-fvtt", MysteryActorSheet, {
    types: ["mystery-actor"],
    makeDefault: true,
    label: "ME.Sheets.Actor"
  });
  foundry.documents.collections.Actors.registerSheet("mystery-engine-fvtt", MysteryThreatSheet, {
    types: ["mystery-threat"],
    makeDefault: true,
    label: "ME.Sheets.Threat"
  });

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("mystery-engine-fvtt", ChecklistSheet, {
    types: ["checklist"],
    makeDefault: true,
    label: "ME.Sheets.Checklist"
  });
  foundry.documents.collections.Items.registerSheet("mystery-engine-fvtt", MoveSheet, {
    types: ["move"],
    makeDefault: true,
    label: "ME.Sheets.Move"
  });
  foundry.documents.collections.Items.registerSheet("mystery-engine-fvtt", NotebookSheet, {
    types: ["notebook"],
    makeDefault: true,
    label: "ME.Sheets.Notebook"
  });
  foundry.documents.collections.Items.registerSheet("mystery-engine-fvtt", TextSheet, {
    types: ["text"],
    makeDefault: true,
    label: "ME.Sheets.Text"
  });
  foundry.documents.collections.Items.registerSheet("mystery-engine-fvtt", QuestionSheet, {
    types: ["question"],
    makeDefault: true,
    label: "ME.Sheets.Question"
  });
  foundry.documents.collections.Items.registerSheet("mystery-engine-fvtt", NotebookSceneSheet, {
    types: ["notebook-scene-item"],
    makeDefault: true,
    label: "ME.Sheets.NotebookScene"
  });

  preloadHandlebarsTemplates();
  setupHooks();
  registerSettings();
  registerHandlebarHelpers();
});

Hooks.once("ready", () => {
  applyCurrentTheme();
});
