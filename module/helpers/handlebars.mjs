import { rollTier, rollBadgeLabel } from "./move-markup.mjs";

export function registerHandlebarHelpers() {

/**
 * we support basic bbCode for text fields
 * [b] bold[/b]
 * [i] italic[/i]
 * [u] underline[/u]
 * [s] strikethough[/s]
 * [br] line break[/br]
 * [list] list item 1 [br] list item 2 [br] list item 3 [/list]
 * [ON 10+] roll outcome badge — also [ON 7-9], [ON 6-], [ON hit], [ON miss]
 */
  Handlebars.registerHelper("bbcodeText", function (str) {
    if (!str) return "";
    let html = String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Same tag as in move text, rendered inline here since a checklist entry is one line.
      .replace(/\[\s*on\s+([^\]\n]{1,16}?)\s*\]/gi, (_, token) =>
        `<span class="roll-badge roll-badge--${rollTier(token)}">${rollBadgeLabel(token)}</span>`)
      .replace(/\[b\](.*?)\[\/b\]/gis, "<strong>$1</strong>")
      .replace(/\[i\](.*?)\[\/i\]/gis, "<em>$1</em>")
      .replace(/\[u\](.*?)\[\/u\]/gis, "<u>$1</u>")
      .replace(/\[s\](.*?)\[\/s\]/gis, "<s>$1</s>")
      .replace(/\[list\](.*?)\[\/list\]/gis, (_, inner) => {
        const items = inner.split(/\[\*\]|\[br\]/i)
          .filter(t => t.trim())
          .map(t => `<li>${t.trim()}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      })
      .replace(/\[br\]/gi, "<br>");
    return new Handlebars.SafeString(html);
  });
}