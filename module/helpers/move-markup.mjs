/**
 * Structural markup for move text.
 *
 * A move is authored as free prose, so the two parts a player looks for during play — the
 * trigger sentence and the roll outcomes — arrive as ordinary paragraphs and bullet lists.
 * This tags them so the stylesheet can set them apart. Text that doesn't follow any of the
 * patterns is returned untouched.
 *
 * Outcome lines are recognised two ways:
 * - `[ON 10+]`, `[ON 7-9]`, `[ON hit]` — the explicit BBCode tag. Works in any language and
 *   is the way to write outcomes in translated or newly authored content.
 * - "On a 10+, …" / "On a hit, …" — the English wording the published playbooks use, so
 *   existing items keep working without being rewritten.
 */

/** The explicit tag, at the start of a line: `[ON 10+]`, `[on hit]`, … */
const OUTCOME_TAG = /^\s*\[\s*on\s+([^\]\n]{1,16}?)\s*\]\s*[,:.]?\s*/i;

/** The English prose opener: "On a 10+," / "On a 7-9:" / "On a 6-" / "On a hit," */
const ROLL_PROSE = /^\s*on\s+an?\s+(\d+(?:\s*[-–]\s*\d+)?\s*[+-]?|hit|miss)\s*[,:.]?\s*/i;

/** Matches the opener of a trigger sentence. */
const TRIGGER = /^\s*(when|whenever|wenn)\b/i;

/** Which colour band an outcome belongs to. Unknown tokens stay neutral. */
export function rollTier(token) {
  const word = token.trim().toLowerCase();
  if (word === "hit" || word === "miss") return word;
  const value = parseInt(word, 10);
  if (Number.isNaN(value)) return "neutral";
  if (word.includes("+")) return value >= 12 ? "crit" : "hit";
  if (word.endsWith("-") || value <= 6) return "miss";
  return "weak";
}

/**
 * What the badge reads. Ranges show as written; the two word tokens are localised so a
 * translation can render them in its own language without touching the tag itself.
 */
export function rollBadgeLabel(token) {
  const word = token.trim().toLowerCase();
  if (word === "hit") return game.i18n?.localize("ME.Roll.HitShort") ?? "hit";
  if (word === "miss") return game.i18n?.localize("ME.Roll.MissShort") ?? "miss";
  return token.replace(/\s+/g, "");
}

/** Returns the outcome token of an element, or null if it does not open with one. */
function outcomeToken(el) {
  const text = el.textContent;
  return text.match(OUTCOME_TAG)?.[1] ?? text.match(ROLL_PROSE)?.[1] ?? null;
}

/**
 * Removes the leading `length` characters of an element's text, walking into inline
 * children — the opener is often wrapped in `<strong>` — and drops what it empties out.
 */
function stripPrefix(el, length) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let remaining = length;
  const emptied = [];
  let node;
  while (remaining > 0 && (node = walker.nextNode())) {
    const take = Math.min(remaining, node.nodeValue.length);
    node.nodeValue = node.nodeValue.slice(take);
    remaining -= take;
    if (!node.nodeValue) emptied.push(node);
  }
  for (const node of emptied) node.remove();
  for (const child of [...el.children]) {
    if (!child.textContent.trim() && !child.querySelector("img, br")) child.remove();
  }
  // A prefix inside <strong> leaves the punctuation behind: ", you do what you intended".
  const first = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
  if (first) first.nodeValue = first.nodeValue.replace(/^\s*[,:.;–—-]\s*/, "");
}

/** Turns one element into a badge row. */
function markOutcome(el, token) {
  const match = el.textContent.match(OUTCOME_TAG) ?? el.textContent.match(ROLL_PROSE);
  stripPrefix(el, match[0].length);
  const badge = document.createElement("span");
  badge.className = `roll-badge roll-badge--${rollTier(token)}`;
  badge.textContent = rollBadgeLabel(token);
  const body = document.createElement("span");
  while (el.firstChild) body.appendChild(el.firstChild);
  el.classList.add("roll-result");
  el.append(badge, body);
}

export function formatMoveHTML(html) {
  if (!html) return html;
  const root = document.createElement("div");
  root.innerHTML = html;

  const first = root.firstElementChild;
  if (first?.tagName === "P" && !outcomeToken(first) && TRIGGER.test(first.textContent)) {
    first.classList.add("move-trigger");
  }

  // Outcomes authored as a bullet list.
  for (const list of root.querySelectorAll("ul, ol")) {
    const outcomes = [...list.children]
      .filter(li => li.tagName === "LI")
      .map(li => [li, outcomeToken(li)])
      .filter(([, token]) => token);
    if (!outcomes.length) continue;
    list.classList.add("roll-results");
    for (const [li, token] of outcomes) markOutcome(li, token);
  }

  // Outcomes authored as consecutive paragraphs — the published Public Access and
  // Brindlewood Bay items are written this way. A run of them becomes one badge block.
  let run = null;
  for (const child of [...root.children]) {
    const token = child.tagName === "P" ? outcomeToken(child) : null;
    if (!token) { run = null; continue; }
    if (!run) {
      run = document.createElement("div");
      run.className = "roll-results";
      child.before(run);
    }
    run.append(child);
    markOutcome(child, token);
  }

  return root.innerHTML;
}
