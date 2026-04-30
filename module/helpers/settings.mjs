const THEME_LINK_ID = "mystery-engine-theme-css";

function applyTheme(theme) {
    document.getElementById(THEME_LINK_ID)?.remove();
    if (theme === "standard") return;
    const link = document.createElement("link");
    link.id = THEME_LINK_ID;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = `systems/mystery-engine-fvtt/css/${theme}.css`;
    document.head.appendChild(link);
}

export function registerSettings() {
    game.settings.register("mystery-engine-fvtt", "theme", {
        name: "ME.Settings.Theme.Label",
        hint: "ME.Settings.Theme.Hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "standard": "ME.Settings.Theme.Standard",
            "victorian": "ME.Settings.Theme.Victorian",
            "90ies": "ME.Settings.Theme.90s"
        },
        default: "standard",
        onChange: value => applyTheme(value)
    });
}

export function applyCurrentTheme() {
    applyTheme(game.settings.get("mystery-engine-fvtt", "theme"));
}
