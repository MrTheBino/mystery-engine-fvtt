/**
 * Structural markup for move text.
 *
 * A move is authored as free prose, so the two parts a player looks for during play — the
 * trigger sentence and the roll outcomes — arrive as an ordinary paragraph and an ordinary
 * bullet list. This tags them so the stylesheet can set them apart. Text that doesn't follow
 * the pattern is returned untouched.
 */

/** Matches the "On a 10+," / "On a 7-9:" / "On a 6-" opener of an outcome line. */
const ROLL_RANGE = /^\s*on\s+an?\s+(\d+(?:\s*[-–]\s*\d+)?\s*[+-]?)\s*[,:.]?\s*/i;

/** Matches the opener of a trigger sentence. */
const TRIGGER = /^\s*(when|whenever|wenn)\b/i;

function rollTier(range) {
  const value = parseInt(range, 10);
  if (range.includes("+")) return value >= 12 ? "crit" : "hit";
  if (range.endsWith("-") || value <= 6) return "miss";
  return "weak";
}

export function formatMoveHTML(html) {
  if (!html) return html;
  const root = document.createElement("div");
  root.innerHTML = html;

  const first = root.firstElementChild;
  if (first?.tagName === "P" && TRIGGER.test(first.textContent)) first.classList.add("move-trigger");

  for (const list of root.querySelectorAll("ul, ol")) {
    const outcomes = [...list.children].filter(li => li.tagName === "LI" && ROLL_RANGE.test(li.textContent));
    if (!outcomes.length) continue;
    list.classList.add("roll-results");
    for (const li of outcomes) {
      const range = li.textContent.match(ROLL_RANGE)[1].replace(/\s+/g, "");
      // The badge carries the range now, so strip it from the prose.
      const firstText = document.createTreeWalker(li, NodeFilter.SHOW_TEXT).nextNode();
      if (firstText) firstText.nodeValue = firstText.nodeValue.replace(ROLL_RANGE, "");
      const badge = document.createElement("span");
      badge.className = `roll-badge roll-badge--${rollTier(range)}`;
      badge.textContent = range;
      const body = document.createElement("span");
      while (li.firstChild) body.appendChild(li.firstChild);
      li.classList.add("roll-result");
      li.append(badge, body);
    }
  }

  return root.innerHTML;
}
