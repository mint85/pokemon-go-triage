/*
 * app.js — renders every section from data.js and wires up interaction.
 * Vanilla JS, classic script (data.js loads first). No framework, no build.
 */

/* ---------- small helpers ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const k of kids) node.append(k?.nodeType ? k : document.createTextNode(k));
  return node;
};

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 1600);
}

/*
 * Copy to clipboard. Returns true only if the copy actually happened.
 * navigator.clipboard exists only in secure contexts (https, localhost), so plain
 * http on the local network falls back to a hidden textarea + execCommand.
 * `quiet` skips the toast for callers that show their own confirmation.
 */
async function copyText(str, { quiet = false } = {}) {
  let ok = false;
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(str); ok = true; } catch { /* try fallback */ }
  }
  if (!ok) ok = legacyCopy(str);
  if (!quiet) toast(ok ? "Copied: " + (str.length > 42 ? str.slice(0, 42) + "…" : str) : "Copy failed");
  return ok;
}

function legacyCopy(str) {
  const prevFocus = document.activeElement;
  const ta = el("textarea", { value: str });
  ta.setAttribute("aria-hidden", "true");
  // 16px stops iOS zooming in on focus; off-screen rather than display:none so it can be selected.
  Object.assign(ta.style, { position: "fixed", top: "0", left: "-9999px", fontSize: "16px" });
  document.body.append(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, str.length); // iOS ignores select() alone
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { /* unsupported */ }
  ta.remove();
  if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
  return ok;
}

/* A reusable "code string + Copy" row. */
function copyRow(str, { small = false } = {}) {
  const code = el("code", { className: "query-string", textContent: str });
  const btn = el("button", {
    className: "btn copy-string-btn" + (small ? " btn-sm" : ""),
    type: "button",
    textContent: "Copy",
    onclick: () => copyText(str),
  });
  return el("div", { className: "string-row" }, code, btn);
}

function unverifiedBadge() {
  return el("span", { className: "badge badge-unverified", textContent: "unverified" });
}

/* ---------- tabs ---------- */

function initTabs() {
  const tabs = [...document.querySelectorAll(".tab")];
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      document.querySelectorAll(".panel").forEach((p) => (p.hidden = true));
      $("#panel-" + tab.dataset.panel).hidden = false;
    });
  });
}

/* ---------- guided sweeps ---------- */

const SWEEP_KEY = "pgt.sweeps.done";

function loadDone() {
  try { return JSON.parse(localStorage.getItem(SWEEP_KEY)) || {}; }
  catch { return {}; }
}
function saveDone(done) {
  try { localStorage.setItem(SWEEP_KEY, JSON.stringify(done)); }
  catch { /* private mode etc. — progress just won't persist */ }
}

/* ---------- initial vs ongoing mode ---------- */

const MODE_KEY = "pgt.mode";
const AGE_KEY = "pgt.age";

function getMode() {
  try { return localStorage.getItem(MODE_KEY) === "ongoing" ? "ongoing" : "initial"; }
  catch { return "initial"; }
}
function setMode(m) { try { localStorage.setItem(MODE_KEY, m); } catch { /* no-op */ } }
function getAge() {
  try { const v = parseInt(localStorage.getItem(AGE_KEY), 10); return Number.isFinite(v) && v >= 0 ? v : 7; }
  catch { return 7; }
}
function setAge(n) { try { localStorage.setItem(AGE_KEY, String(n)); } catch { /* no-op */ } }

/*
 * Distribute an age filter across every comma-separated (OR) term. In Pokémon GO
 * search `&` binds tighter than `,` (comma is the top-level OR separator), so a naive
 * `A,B&age` would scope only B. `A&age,B&age` reliably means "recent AND (A or B)".
 */
function ageScope(str, n) {
  const age = "age0-" + n;
  return str.split(",").map((part) => part + "&" + age).join(",");
}

/* The string shown on a sweep card: age-scoped in ongoing mode, plain otherwise. */
function sweepDisplayString(sweep) {
  const base = resolveSweepString(sweep);
  return getMode() === "ongoing" ? ageScope(base, getAge()) : base;
}

function renderReviewQueue() {
  const n = getAge();
  const codeEl = $("#review-queue-string");
  if (codeEl) codeEl.textContent = "!" + KEEP_TAG + "&age0-" + n;
  const hint = $("#ongoing-hint");
  if (hint) hint.textContent =
    `Sweep strings below are scoped to Pokémon caught in the last ${n} day${n === 1 ? "" : "s"}.`;
}

function applyModeUI() {
  const mode = getMode();
  document.querySelectorAll(".mode-btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.mode === mode)
  );
  const controls = $("#ongoing-controls");
  if (controls) controls.hidden = mode !== "ongoing";
}

function wireModeBar() {
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMode(btn.dataset.mode);
      applyModeUI();
      renderReviewQueue();
      renderSweeps();
    });
  });
  const ageInput = $("#age-window");
  if (ageInput) {
    ageInput.value = String(getAge());
    ageInput.addEventListener("input", () => {
      let n = parseInt(ageInput.value, 10);
      if (!Number.isFinite(n) || n < 0) n = 0;
      setAge(n);
      renderReviewQueue();
      renderSweeps();
    });
  }
  const copyBtn = $("#copy-review-queue");
  if (copyBtn) copyBtn.addEventListener("click", () => copyText($("#review-queue-string").textContent));
  applyModeUI();
  renderReviewQueue();
}

function renderSweeps() {
  const list = $("#sweeps-list");
  const done = loadDone();
  list.textContent = "";

  sweeps.forEach((sweep) => {
    const isDone = !!done[sweep.id];
    const card = el("li", { className: "sweep" + (isDone ? " done" : "") });

    const flags = el("div", { className: "sweep-flags" });
    if (sweep.pokeGenie) flags.append(el("span", { className: "badge badge-pg", textContent: "Poke Genie" }));
    else flags.append(el("span", { className: "badge badge-nojudge", textContent: "no judgment" }));

    const head = el(
      "div",
      { className: "sweep-head" },
      el("span", { className: "sweep-num", textContent: String(sweep.n) }),
      el("h3", { className: "sweep-title", textContent: sweep.title }),
      flags
    );

    const tags = el("p", { className: "sweep-tags" });
    tags.append("Apply: ");
    sweep.applyTags.forEach((t) => tags.append(el("code", { textContent: t })));

    const toggle = el("label", { className: "sweep-done-toggle" });
    const cb = el("input", { type: "checkbox", checked: isDone });
    cb.addEventListener("change", () => {
      const d = loadDone();
      if (cb.checked) d[sweep.id] = true; else delete d[sweep.id];
      saveDone(d);
      renderSweeps();
    });
    toggle.append(cb, "Mark done");

    card.append(
      head,
      el("p", { className: "sweep-instructions", textContent: sweep.instructions }),
      copyRow(sweepDisplayString(sweep)),
      tags,
      toggle
    );
    list.append(card);
  });

  updateSweepProgress(done);
  renderManualChecks();
}

function renderManualChecks() {
  const ul = $("#manual-checks-list");
  if (!ul || ul.childElementCount) return; // render once
  manualChecks.forEach((m) => {
    ul.append(el("li", {}, el("strong", {}, m.title + ": "), m.detail));
  });
}

function updateSweepProgress(done) {
  const total = sweeps.length;
  const completed = sweeps.filter((s) => done[s.id]).length;
  $("#sweep-progress-fill").style.width = (completed / total) * 100 + "%";
  $("#sweep-progress-label").textContent = `${completed} / ${total} sweeps done`;
}

/* ---------- query composer ---------- */

let queryTokens = [];

function joinOp() {
  return $('input[name="join"]:checked').value;
}

function renderQuery() {
  const pills = $("#query-pills");
  pills.textContent = "";
  queryTokens.forEach((tok, i) => {
    const pill = el("span", { className: "pill" }, tok);
    const x = el("button", { type: "button", textContent: "×", title: "Remove" });
    x.addEventListener("click", () => { queryTokens.splice(i, 1); renderQuery(); });
    pill.append(x);
    pills.append(pill);
  });
  const str = queryTokens.join(joinOp());
  $("#query-string").textContent = str || "(nothing selected yet)";
}

function addToken(tok) {
  tok = tok.trim();
  if (!tok) return;
  if (!queryTokens.includes(tok)) queryTokens.push(tok);
  renderQuery();
}

function renderComposer() {
  const groupsRoot = $("#chip-groups");
  groupsRoot.textContent = "";

  // Group tokens by category, preserving first-seen order.
  const byCat = new Map();
  tokens.forEach((t) => {
    if (!byCat.has(t.category)) byCat.set(t.category, []);
    byCat.get(t.category).push(t);
  });

  byCat.forEach((items, cat) => {
    const group = el("div", { className: "chip-group" }, el("h3", { textContent: cat }));
    const chips = el("div", { className: "chips" });
    items.forEach((t) => {
      const chip = el("button", { className: "chip", type: "button", title: t.meaning });
      if (!t.verified) chip.append(el("span", { className: "u-dot", title: "unverified" }));
      chip.append(t.token);
      chip.addEventListener("click", () => addToken(t.token));
      chips.append(chip);
    });
    group.append(chips);
    groupsRoot.append(group);
  });

  $("#freetext-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#freetext-input");
    addToken(input.value);
    input.value = "";
  });
  document.querySelectorAll('input[name="join"]').forEach((r) =>
    r.addEventListener("change", renderQuery)
  );
  $("#copy-query").addEventListener("click", () => {
    const str = queryTokens.join(joinOp());
    if (str) copyText(str); else toast("Nothing to copy yet");
  });
  $("#clear-query").addEventListener("click", () => { queryTokens = []; renderQuery(); });

  renderQuery();
}

/* ---------- integrity check ---------- */

function renderIntegrity() {
  const grid = $("#integrity-grid");
  grid.textContent = "";

  const keepStr = "!" + KEEP_TAG;
  const negStr = reasonNegationString();

  const cardA = el(
    "div",
    { className: "integrity-card" },
    el("h3", {}, "Transfer pile"),
    el("p", {}, "Everything not marked KEEP."),
    copyRow(keepStr, { small: true })
  );
  const cardB = el(
    "div",
    { className: "integrity-card" },
    el("h3", {}, "Negation of every reason tag"),
    el("p", {}, "Union of the two should be identical. Compare counts in-game."),
    copyRow(negStr, { small: true })
  );
  grid.append(cardA, cardB);
}

/* ---------- token reference ---------- */

function renderReference() {
  const opTable = $("#operators-table");
  opTable.append(
    el("tr", {}, el("th", {}, "Op"), el("th", {}, "Name"), el("th", {}, "Meaning"))
  );
  operators.forEach((o) => {
    opTable.append(
      el("tr", {},
        el("td", { className: "tok" }, o.sym),
        el("td", {}, o.name),
        el("td", {}, o.meaning)
      )
    );
  });

  const tokTable = $("#tokens-table");
  tokTable.append(
    el("tr", {},
      el("th", {}, "Token"), el("th", {}, "Category"), el("th", {}, "Meaning"), el("th", {}, "Status"))
  );
  tokens.forEach((t) => {
    const status = t.verified
      ? el("span", { className: "badge badge-nojudge", textContent: "verified" })
      : unverifiedBadge();
    tokTable.append(
      el("tr", {},
        el("td", { className: "tok" }, t.token),
        el("td", {}, t.category),
        el("td", {}, t.meaning),
        el("td", {}, status)
      )
    );
  });
}

/* ---------- boot ---------- */

function init() {
  initTabs();
  wireModeBar();
  renderSweeps();
  renderComposer();
  renderIntegrity();
  renderReference();
  $("#reset-sweeps").addEventListener("click", () => {
    saveDone({});
    renderSweeps();
    toast("Sweep progress reset");
  });
}

document.addEventListener("DOMContentLoaded", init);
