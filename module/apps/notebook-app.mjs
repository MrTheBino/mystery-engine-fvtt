const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { TextEditor, DragDrop } = foundry.applications.ux
import { RollDialog } from './roll-dialog.mjs';

export class NotebookApp extends HandlebarsApplicationMixin(ApplicationV2) {
    #dragDrop

    constructor(options = {}) {
        super(options);

        // the currentSceneDataItem is the the current scene's notebook-scene-item, which is used to store scene-specific data for the notebook
        this.currentSceneDataItem = null;
        this.currentSceneId = game.scenes.active ? game.scenes.active.id : null;
        this.currentSceneName = game.scenes.active ? game.scenes.active.name : null;
        this.findOrCreateSceneDataItem();
        this.#dragDrop = this.#createDragDropHandlers();

        this._activeMainTab = 'actors';
        this._activeThreatIndex = 0;
        this._activePageIndex = 0;
        this._dropBound = false;

        // Re-render whenever the linked notebook item is updated externally or by the form listener
        Hooks.on("updateItem", (item, changes, options, userId) => {
            const uuid = this.currentSceneDataItem?.system?.notebookUuid;
            if (!uuid || item.uuid !== uuid) return;
            this.render();
        });

        // Re-render when an actor listed in the notebook is updated, but only if the app is visible
        // TODO: note for me: this is something I have to consider for legend in the mist, much better than sending hooks
        Hooks.on("updateActor", async (actor, changes, options, userId) => {
            if (!this.rendered) return;
            const uuid = this.currentSceneDataItem?.system?.notebookUuid;
            if (!uuid) return;
            const notebook = await fromUuid(uuid).catch(() => null);
            if (!notebook) return;
            if (notebook.system.actors.includes(actor.uuid)) this.render();
        });

        NotebookApp.instance = this;
    }

    static DEFAULT_OPTIONS = {
        id: 'notebook-app',
        classes: ['mystery-engine', 'dialog', 'notebook-app'],
        tag: 'div',
        window: {
            frame: true,
            title: 'ME.Notebook.Title',
            icon: 'fa-solid fa-book-atlas',
            positioned: true,
            resizable: true
        },
        position: {
            left: 100,
            width: 1300,
            height: 800
        },
        dragDrop: [{ dropSelector: null }]
    };

    static PARTS = {
        body: {
            template: "systems/mystery-engine-fvtt/templates/apps/notebook-app-body.hbs"
        }
    };

    static getInstance(options = {}) {
        if (!NotebookApp.instance) {
            NotebookApp.instance = new NotebookApp(options);
        }
        return NotebookApp.instance;
    }

    #createDragDropHandlers() {
        return this.options.dragDrop.map((d) => {
            d.permissions = {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this)
            };
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this)
            };
            return new DragDrop(d);
        });
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        if (!this.currentSceneDataItem?.system?.notebookUuid) {
            return { ...context, notebook: null };
        }

        const notebook = await fromUuid(this.currentSceneDataItem.system.notebookUuid).catch(() => null);
        if (!notebook) {
            return { ...context, notebook: null };
        }

        const enrich = (html, relativeTo) =>
            TextEditor.implementation.enrichHTML(html ?? "", { relativeTo });

        // Actors
        const actors = [];
        for (const uuid of notebook.system.actors) {
            const actor = await fromUuid(uuid).catch(() => null);
            if (!actor) continue;

            const activeMoves = [];
            const sortedItems = [...actor.items].sort((a, b) => (a.system.position ?? 0) - (b.system.position ?? 0));
            const groupMap = new Map();

            for (const item of sortedItems) {
                const description = await enrich(item.system.description, item);
                if (item.type === "move" && item.system.active && !item.system.hidden) {
                    activeMoves.push({
                        name: item.name,
                        description,
                        moveDescription: await enrich(item.system.moveDescription, item),
                        checkboxes: [...item.system.checkboxes]
                    });
                } else if (item.type !== "move") {
                    const key = item.system.groupName || "";
                    if (!groupMap.has(key)) groupMap.set(key, { groupName: key, showHeader: false, maxGroupPosition: 0, items: [] });
                    const group = groupMap.get(key);
                    if (item.system.groupNameDisplayed) group.showHeader = true;
                    const gp = item.system.groupPosition ?? 0;
                    if (gp > group.maxGroupPosition) group.maxGroupPosition = gp;
                    if (item.type === "checklist") {
                        group.items.push({ name: item.name, isChecklist: true, description, entries: [...item.system.entries] });
                    } else if (item.type === "question") {
                        group.items.push({ name: item.name, isQuestion: true, description, questionEntries: [...item.system.questions] });
                    } else if (item.type === "text") {
                        group.items.push({ name: item.name, isText: true, description, checkboxes: [...item.system.checkboxes] });
                    }
                }
            }

            const groupedItems = [...groupMap.values()].sort((a, b) => a.maxGroupPosition - b.maxGroupPosition);

            actors.push({
                uuid: actor.uuid,
                name: actor.name,
                img: actor.img,
                isOwn: actor.isOwner,
                abilities: [...actor.system.abilities],
                conditions: actor.system.conditions.filter(c => c.trim()),
                labels: [...(actor.system.labels ?? [])],
                activeMoves,
                groupedItems,
                hasItems: groupedItems.some(g => g.items.length > 0)
            });
        }

        // Threats
        const threats = await Promise.all(notebook.system.threats.map(async (t, ti) => ({
            index: ti,
            isActive: ti === this._activeThreatIndex,
            title: t.title,
            introduction: t.introduction,
            introductionHTML: await enrich(t.introduction, notebook),
            countdown: [...t.countdown],
            questionsLocked: t.questionsLocked,
            cluesLocked: t.cluesLocked,
            otherLocked: t.otherLocked,
            questions: t.questions.map((q, qi) => ({ index: qi, checkbox: q.checkbox, hidden: q.hidden, title: q.title, opportunity: q.opportunity, complexity: q.complexity })),
            cluesCount: t.clues.length,
            cluesExplainedCount: t.clues.filter(c => c.explained).length,
            clues: t.clues.map((c, ci) => ({ index: ci, checkbox: c.checkbox, explained: c.explained, text: c.text })),
            other: t.other.map((o, oi) => ({ index: oi, title: o.title, shortDescription: o.shortDescription, checkbox: o.checkbox }))
        })));

        // Pages — each page is a sub-tab; each page contains a list of notes
        const pages = await Promise.all(
            notebook.system.pages.map(async (page, pi) => ({
                index: pi,
                title: page.title || game.i18n.format("ME.Notebook.Pages.PageFallback", { number: pi + 1 }),
                isActive: pi === this._activePageIndex,
                locked: page.locked,
                editable: game.user.isGM && !page.locked,
                notes: await Promise.all(
                    page.notes.map(async (note, ni) => ({
                        pageIndex: pi,
                        noteIndex: ni,
                        title: note.title || "",
                        description: note.description ?? "",
                        descriptionHTML: await enrich(note.description, notebook)
                    }))
                )
            }))
        );

        return {
            ...context,
            isGM: game.user.isGM,
            notebook: { name: notebook.name, img: notebook.img },
            activeActors: this._activeMainTab === 'actors',
            activeThreats: this._activeMainTab === 'threats',
            activePages: this._activeMainTab === 'pages',
            activeOptions: this._activeMainTab === 'options',
            actors,
            threats,
            pages
        };
    }

    async render(options = {}) {
        if (this.rendered) {
            this._savedScrollPositions = new Map();
            for (const el of this.element.querySelectorAll('.na-scroll-area')) {
                const panel = el.closest('[data-na-panel]');
                if (panel) this._savedScrollPositions.set(panel.dataset.naPanel, el.scrollTop);
            }
        }
        return super.render(options);
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        // Bind to the persistent outer element only once — survives PARTS re-renders
        if (!this._dropBound) {
            this._dropBound = true;
            for (const dd of this.#dragDrop) {
                dd.bind(this.element);
            }
            this.#bindFormListener();
        }

        // setr the title of the dialog
        let titleElement = this.element.querySelector(".window-title");
        if (titleElement) {
            titleElement.textContent = game.i18n.format("ME.Notebook.TitleFormat", { scene_name: context.scene?.name || game.i18n.localize("ME.Notebook.UnnamedNotebook"), notebook: context.notebook.name || game.i18n.localize("ME.Notebook.UntitledNotebook") });
        }
        this.#bindTabListeners();
        this.#bindActionButtons();

        if (this._savedScrollPositions?.size) {
            for (const el of this.element.querySelectorAll('.na-scroll-area')) {
                const panel = el.closest('[data-na-panel]');
                if (panel) {
                    const pos = this._savedScrollPositions.get(panel.dataset.naPanel);
                    if (pos !== undefined) el.scrollTop = pos;
                }
            }
            this._savedScrollPositions = null;
        }
    }

    #bindTabListeners() {
        this.element.querySelectorAll('[data-na-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.naTab;
                this.element.querySelectorAll('.na-tab-btn').forEach(b => b.classList.remove('active'));
                this.element.querySelectorAll('.na-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                this.element.querySelector(`[data-na-panel="${tab}"]`)?.classList.add('active');
                this._activeMainTab = tab;
            });
        });

        this.element.querySelectorAll('[data-na-subtab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const subTab = btn.dataset.naSubtab;
                const panel = btn.closest('.na-panel');
                if (!panel) return;
                panel.querySelectorAll('.na-sub-tab-btn').forEach(b => b.classList.remove('active'));
                panel.querySelectorAll('.na-sub-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                panel.querySelector(`[data-na-subpanel="${subTab}"]`)?.classList.add('active');

                const [type, indexStr] = subTab.split('-');
                const index = parseInt(indexStr);
                if (type === 'threat') this._activeThreatIndex = index;
                if (type === 'page') this._activePageIndex = index;
            });
        });
    }

    #bindActionButtons() {
        const actions = {
            addPage:                  NotebookApp.#addPage,
            deletePage:               NotebookApp.#deletePage,
            togglePageLocked:         NotebookApp.#togglePageLocked,
            addNote:                  NotebookApp.#addNote,
            deleteNote:               NotebookApp.#deleteNote,
            addThreat:                NotebookApp.#addThreat,
            deleteThreat:             NotebookApp.#deleteThreat,
            addThreatCountdown:       NotebookApp.#addThreatCountdown,
            removeThreatCountdown:    NotebookApp.#removeThreatCountdown,
            toggleThreatCountdown:    NotebookApp.#toggleThreatCountdown,
            addThreatQuestion:        NotebookApp.#addThreatQuestion,
            deleteThreatQuestion:     NotebookApp.#deleteThreatQuestion,
            toggleThreatQuestion:     NotebookApp.#toggleThreatQuestion,
            toggleThreatQuestionHidden: NotebookApp.#toggleThreatQuestionHidden,
            toggleThreatQuestionsLocked: NotebookApp.#toggleThreatQuestionsLocked,
            toggleThreatCluesLocked:     NotebookApp.#toggleThreatCluesLocked,
            toggleThreatOtherLocked:     NotebookApp.#toggleThreatOtherLocked,
            addThreatClue:            NotebookApp.#addThreatClue,
            deleteThreatClue:         NotebookApp.#deleteThreatClue,
            toggleThreatClue:         NotebookApp.#toggleThreatClue,
            toggleThreatClueExplained:NotebookApp.#toggleThreatClueExplained,
            addThreatOther:           NotebookApp.#addThreatOther,
            deleteThreatOther:        NotebookApp.#deleteThreatOther,
            toggleThreatOther:        NotebookApp.#toggleThreatOther,
            openActorSheet:           NotebookApp.#openActorSheet,
            removeActor:              NotebookApp.#removeActor,
            rollAbility:              NotebookApp.#rollAbility,
            removeNotebook:           NotebookApp.#removeNotebook,
        };
        for (const [action, handler] of Object.entries(actions)) {
            this.element.querySelectorAll(`[data-action="${action}"]`).forEach(btn => {
                btn.addEventListener('click', (event) => handler.call(this, event, btn));
            });
        }
    }

    findOrCreateSceneDataItem() {
        this.currentSceneDataItem = null;

        game.items.forEach(item => {
            if (item.type === "notebook-scene-item") {
                if (item.system.sceneUuid === this.currentSceneId) {
                    this.currentSceneDataItem = item;
                    return;
                }
            }
        });

        if (this.currentSceneId && !this.currentSceneDataItem) {
            if (!game.user.isGM) return;

            Item.create({
                name: game.i18n.format("ME.Notebook.SceneDataName", { name: this.currentSceneName }),
                type: "notebook-scene-item",
                flags: { mistmod: { hidden: true } },
                data: {}
            }).then(item => {
                item.update({ "system.sceneUuid": this.currentSceneId });
                this.currentSceneDataItem = item;
            });
        }
    }

    sceneChangedHook(newScene) {
        if (!newScene) return;
        if (this.currentSceneId === newScene.id) return;

        this.currentSceneId = newScene.id;
        this.currentSceneName = newScene.name;
        this.findOrCreateSceneDataItem();
    }

    _canDragStart(selector) { return false; }
    _canDragDrop(selector) { return true; }
    _onDragStart(event) {}
    _onDragOver(event) {}

    async #getNotebook() {
        const uuid = this.currentSceneDataItem?.system?.notebookUuid;
        if (!uuid) return null;
       return fromUuid(uuid).catch(() => null);
    }

    #bindFormListener() {
        this.element.addEventListener('change', async (event) => {
            const form = this.element.querySelector('form');
            if (!form || !form.contains(event.target)) return;
            const notebook = await this.#getNotebook();
            if (!notebook) return;
            const source = notebook.toObject().system;
            const val = name => form.querySelector(`[name="${name}"]`)?.value ?? null;

            const pages = source.pages;
            for (let pi = 0; pi < pages.length; pi++) {
                pages[pi].title = val(`system.pages.${pi}.title`) ?? pages[pi].title;
                for (let ni = 0; ni < pages[pi].notes.length; ni++) {
                    pages[pi].notes[ni].title = val(`system.pages.${pi}.notes.${ni}.title`) ?? pages[pi].notes[ni].title;
                    pages[pi].notes[ni].description = val(`system.pages.${pi}.notes.${ni}.description`) ?? pages[pi].notes[ni].description;
                }
            }

            const threats = source.threats;
            for (let ti = 0; ti < threats.length; ti++) {
                threats[ti].title = val(`system.threats.${ti}.title`) ?? threats[ti].title;
                threats[ti].introduction = val(`system.threats.${ti}.introduction`) ?? threats[ti].introduction;
                for (let qi = 0; qi < threats[ti].questions.length; qi++) {
                    threats[ti].questions[qi].title = val(`system.threats.${ti}.questions.${qi}.title`) ?? threats[ti].questions[qi].title;
                    threats[ti].questions[qi].opportunity = val(`system.threats.${ti}.questions.${qi}.opportunity`) ?? threats[ti].questions[qi].opportunity;
                    const rawC = val(`system.threats.${ti}.questions.${qi}.complexity`);
                    threats[ti].questions[qi].complexity = rawC !== null && rawC !== "" ? parseInt(rawC) : null;
                }
                for (let ci = 0; ci < threats[ti].clues.length; ci++) {
                    threats[ti].clues[ci].text = val(`system.threats.${ti}.clues.${ci}.text`) ?? threats[ti].clues[ci].text;
                }
                for (let oi = 0; oi < threats[ti].other.length; oi++) {
                    threats[ti].other[oi].title = val(`system.threats.${ti}.other.${oi}.title`) ?? threats[ti].other[oi].title;
                    threats[ti].other[oi].shortDescription = val(`system.threats.${ti}.other.${oi}.shortDescription`) ?? threats[ti].other[oi].shortDescription;
                }
            }

            await notebook.update({ "system.pages": pages, "system.threats": threats });
        });
    }

    async #mutateThreat(ti, mutate) {
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const threats = foundry.utils.deepClone(notebook.system.threats);
        if (!threats[ti]) return;
        mutate(threats[ti], threats);
        await notebook.update({ "system.threats": threats });
    }

    static async #addPage(event, target) {
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const pages = notebook.toObject().system.pages;
        pages.push({ title: "", notes: [] });
        await notebook.update({ "system.pages": pages });
        this._activePageIndex = pages.length - 1;
        this.render();
    }

    static async #deletePage(event, target) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            content: game.i18n.localize("ME.Notebook.Pages.DeletePageConfirm"),
            rejectClose: false,
            modal: true
        });
        if (!confirmed) return;
        const index = parseInt(target.dataset.index);
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const pages = notebook.toObject().system.pages;
        pages.splice(index, 1);
        await notebook.update({ "system.pages": pages });
        this._activePageIndex = Math.min(this._activePageIndex, Math.max(0, pages.length - 1));
        this.render();
    }

    static async #togglePageLocked(event, target) {
        const index = parseInt(target.dataset.pageIndex);
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const pages = foundry.utils.deepClone(notebook.system.pages);
        if (!pages[index]) return;
        pages[index].locked = !pages[index].locked;
        await notebook.update({ "system.pages": pages });
    }

    static async #addNote(event, target) {
        const pageIndex = parseInt(target.dataset.pageIndex);
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const pages = notebook.toObject().system.pages;
        if (!pages[pageIndex]) return;
        pages[pageIndex].notes.push({ title: "", description: "" });
        await notebook.update({ "system.pages": pages });
        this.render();
    }

    static async #deleteNote(event, target) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            content: game.i18n.localize("ME.Notebook.Pages.DeleteNoteConfirm"),
            rejectClose: false,
            modal: true
        });
        if (!confirmed) return;
        const pageIndex = parseInt(target.dataset.pageIndex);
        const noteIndex = parseInt(target.dataset.noteIndex);
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const pages = notebook.toObject().system.pages;
        if (!pages[pageIndex]) return;
        pages[pageIndex].notes.splice(noteIndex, 1);
        await notebook.update({ "system.pages": pages });
        this.render();
    }

    // ── Threat actions ────────────────────────────────────────────────────────

    static async #addThreat(event, btn) {
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const threats = foundry.utils.deepClone(notebook.system.threats);
        threats.push({ title: "", introduction: "", countdown: [], questions: [], clues: [], other: [] });
        await notebook.update({ "system.threats": threats });
        this._activeThreatIndex = threats.length - 1;
        this.render();
    }

    static async #deleteThreat(event, btn) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            content: game.i18n.localize("ME.Notebook.Threats.DeleteThreatConfirm"),
            rejectClose: false,
            modal: true
        });
        if (!confirmed) return;
        const ti = parseInt(btn.dataset.threatIndex);
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const threats = foundry.utils.deepClone(notebook.system.threats);
        threats.splice(ti, 1);
        await notebook.update({ "system.threats": threats });
        this._activeThreatIndex = Math.min(this._activeThreatIndex, Math.max(0, threats.length - 1));
        this.render();
    }

    static async #addThreatCountdown(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        await this.#mutateThreat(ti, t => t.countdown.push(false));
    }

    static async #removeThreatCountdown(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        await this.#mutateThreat(ti, t => { if (t.countdown.length) t.countdown.pop(); });
    }

    static async #toggleThreatCountdown(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const ci = parseInt(btn.dataset.countdownIndex);
        await this.#mutateThreat(ti, t => { t.countdown[ci] = !t.countdown[ci]; });
    }

    static async #addThreatQuestion(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        await this.#mutateThreat(ti, t => t.questions.push({ checkbox: false, title: "" }));
    }

    static async #deleteThreatQuestion(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const qi = parseInt(btn.dataset.questionIndex);
        await this.#mutateThreat(ti, t => t.questions.splice(qi, 1));
    }

    static async #toggleThreatQuestion(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const qi = parseInt(btn.dataset.questionIndex);
        await this.#mutateThreat(ti, t => { t.questions[qi].checkbox = !t.questions[qi].checkbox; });
    }

    static async #toggleThreatQuestionHidden(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const qi = parseInt(btn.dataset.questionIndex);
        await this.#mutateThreat(ti, t => { t.questions[qi].hidden = !t.questions[qi].hidden; });
    }

    static async #toggleThreatQuestionsLocked(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        await this.#mutateThreat(ti, t => { t.questionsLocked = !t.questionsLocked; });
    }

    static async #toggleThreatCluesLocked(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        await this.#mutateThreat(ti, t => { t.cluesLocked = !t.cluesLocked; });
    }

    static async #toggleThreatOtherLocked(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        await this.#mutateThreat(ti, t => { t.otherLocked = !t.otherLocked; });
    }

    static async #addThreatClue(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        await this.#mutateThreat(ti, t => t.clues.push({ checkbox: false, explained: false, text: "" }));
    }

    static async #deleteThreatClue(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const ci = parseInt(btn.dataset.clueIndex);
        await this.#mutateThreat(ti, t => t.clues.splice(ci, 1));
    }

    static async #toggleThreatClue(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const ci = parseInt(btn.dataset.clueIndex);
        await this.#mutateThreat(ti, t => { t.clues[ci].checkbox = !t.clues[ci].checkbox; });
    }

    static async #toggleThreatClueExplained(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const ci = parseInt(btn.dataset.clueIndex);
        await this.#mutateThreat(ti, t => { t.clues[ci].explained = !t.clues[ci].explained; });
    }

    static async #addThreatOther(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        await this.#mutateThreat(ti, t => t.other.push({ title: "", shortDescription: "", checkbox: false }));
    }

    static async #deleteThreatOther(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const oi = parseInt(btn.dataset.otherIndex);
        await this.#mutateThreat(ti, t => t.other.splice(oi, 1));
    }

    static async #toggleThreatOther(event, btn) {
        const ti = parseInt(btn.dataset.threatIndex);
        const oi = parseInt(btn.dataset.otherIndex);
        await this.#mutateThreat(ti, t => { t.other[oi].checkbox = !t.other[oi].checkbox; });
    }

    static async #openActorSheet(event, btn) {
        const actor = await fromUuid(btn.dataset.actorUuid).catch(() => null);
        if (actor) actor.sheet.render(true);
    }

    static async #rollAbility(event, btn) {
        const abilityName = btn.dataset.abilityName ?? "";
        const abilityValue = parseInt(btn.dataset.abilityValue ?? "0");
        const actor = await fromUuid(btn.dataset.actorUuid).catch(() => null);
        new RollDialog({ abilityName, abilityValue, actor }).render(true);
    }

    static async #removeActor(event, btn) {
        const uuid = btn.dataset.actorUuid;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            content: game.i18n.localize("ME.Notebook.Actors.RemoveConfirm"),
            rejectClose: false,
            modal: true
        });
        if (!confirmed) return;
        const notebook = await this.#getNotebook();
        if (!notebook) return;
        const actors = notebook.toObject().system.actors.filter(u => u !== uuid);
        await notebook.update({ "system.actors": actors });
    }

    static async #removeNotebook(event, btn) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            content: game.i18n.localize("ME.Notebook.Options.RemoveNotebookConfirm"),
            rejectClose: false,
            modal: true
        });
        if (!confirmed) return;
        await this.currentSceneDataItem.update({ "system.notebookUuid": "" });
        this.render();
    }

    async _onDrop(event) {
        let data;
        try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
        catch { return; }

        if (data.type === "Item") {
            const item = await fromUuid(data.uuid).catch(() => null);
            if (!item || item.type !== "notebook") return;
            if (!this.currentSceneDataItem) return;
            // we store only one notebook per scene, so we update the existing one instead of creating a new one
            await this.currentSceneDataItem.update({ "system.notebookUuid": data.uuid });
            this.render();
            return;
        }

        if (data.type === "Actor") {
            if (!game.user.isGM) return;
            const actor = await fromUuid(data.uuid).catch(() => null);
            if (!actor || actor.type !== "mystery-actor") return;
            const notebook = await this.#getNotebook();
            if (!notebook) return;
            const actors = notebook.toObject().system.actors;
            if (actors.includes(actor.uuid)) return;
            actors.push(actor.uuid);
            await notebook.update({ "system.actors": actors });
        }
    }
}
