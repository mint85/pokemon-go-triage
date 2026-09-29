/*
 * Drift check: every query string in search-terms.js must match the planning doc
 * (pogo-search-queries.md) byte for byte, and the generated DAILY-1..4 must match
 * the four strings in the doc.
 *
 * The doc is private and not committed. Tests that need it are skipped (with a
 * visible reason) when it's missing. Point at another copy with POGO_MD=path.
 *
 * Run: npm test
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const MD_PATH = process.env.POGO_MD || path.join(ROOT, "internal-docs", "pogo-search-queries.md");
const HAVE_MD = fs.existsSync(MD_PATH);
const SKIP = HAVE_MD ? false : `planning doc not found at ${MD_PATH} (set POGO_MD to check drift)`;
if (!HAVE_MD) console.warn(`\n⚠  Drift checks SKIPPED: ${SKIP}\n`);

/* Load the classic browser script in a sandbox and pull out its top-level consts. */
function loadSearchTerms() {
  const src = fs.readFileSync(path.join(ROOT, "search-terms.js"), "utf8");
  return vm.runInContext(
    src + "\n;({ KEEPER_TERMS, dailyQuery, searchQueries, DAILY_GUIDE })",
    vm.createContext({})
  );
}

const ID_HEADING = /^(?:#{2,4} |\*\*)([A-Z]+(?:-[A-Z0-9]+)+) — /;
const ANY_HEADING = /^#{1,6} /;

/*
 * Parse the doc into fenced code blocks, each tagged with the query ID whose
 * heading it sits under (null when outside any query section).
 */
function parseDoc(md) {
  const blocks = [];
  const ids = [];
  let owner = null;
  let fence = null;
  for (const line of md.split("\n")) {
    if (fence) {
      if (line.startsWith("```")) { blocks.push({ owner, text: fence.join("\n") }); fence = null; }
      else fence.push(line);
      continue;
    }
    if (line.startsWith("```")) { fence = []; continue; }
    const m = line.match(ID_HEADING);
    if (m) { owner = m[1]; ids.push(owner); }
    else if (ANY_HEADING.test(line)) owner = null;
  }
  return { blocks, ids };
}

const asArray = (q) => (Array.isArray(q) ? [...q] : [q]);
const descCode = (entry) => entry.description.filter((b) => b.code != null).map((b) => b.code);

const api = loadSearchTerms();
const doc = HAVE_MD ? parseDoc(fs.readFileSync(MD_PATH, "utf8")) : null;

test("every doc query ID has an entry, and every entry is in the doc", { skip: SKIP }, () => {
  const stored = api.searchQueries.map((q) => q.id);
  assert.deepEqual([...stored].sort(), [...doc.ids].sort());
});

test("stored query strings match the doc byte for byte", { skip: SKIP }, () => {
  for (const entry of api.searchQueries) {
    const codeInDesc = descCode(entry);
    const docQueries = doc.blocks
      .filter((b) => b.owner === entry.id && !codeInDesc.includes(b.text))
      .map((b) => b.text);
    assert.deepEqual(asArray(entry.query), docQueries, `${entry.id} drifted from the doc`);
  }
});

test("every code block in the doc is accounted for", { skip: SKIP }, () => {
  const keeperLine = api.KEEPER_TERMS.join(", ");
  for (const b of doc.blocks) {
    if (b.owner === null) {
      assert.equal(b.text, keeperLine, `unowned code block is not the keeper list:\n${b.text}`);
      continue;
    }
    const entry = api.searchQueries.find((q) => q.id === b.owner);
    const known = [...asArray(entry.query), ...descCode(entry)];
    assert.ok(known.includes(b.text), `${b.owner} has a doc block the app doesn't store:\n${b.text}`);
  }
});

test("keeper list matches the doc's shared list", { skip: SKIP }, () => {
  const unowned = doc.blocks.filter((b) => b.owner === null).map((b) => b.text);
  assert.deepEqual(unowned, [api.KEEPER_TERMS.join(", ")]);
});

test("generated DAILY-1..4 match the doc exactly", { skip: SKIP }, () => {
  const generated = {
    "DAILY-1": api.dailyQuery({ age: "age0-1", fodder: true, disappearing: true }),
    "DAILY-2": api.dailyQuery({ age: "age0-1", fodder: false, disappearing: true }),
    "DAILY-3": api.dailyQuery({ age: "age0", fodder: true, disappearing: false }),
    "DAILY-4": api.dailyQuery({ age: "age0", fodder: false, disappearing: false }),
  };
  for (const [id, str] of Object.entries(generated)) {
    const inDoc = doc.blocks.filter((b) => b.owner === id).map((b) => b.text);
    assert.deepEqual(inDoc, [str], `${id} generator output differs from the doc`);
    assert.equal(api.searchQueries.find((q) => q.id === id).query, str, `${id} entry isn't using the generator`);
  }
});

/* These run without the doc. */

test("query strings are single-line with no stray whitespace", () => {
  for (const entry of api.searchQueries) {
    for (const s of asArray(entry.query)) {
      assert.ok(!/[\r\n\t]/.test(s), `${entry.id} contains a line break or tab`);
      assert.equal(s, s.trim(), `${entry.id} has leading/trailing whitespace`);
    }
  }
});

test("placeholder flag matches the queries that contain it", () => {
  for (const entry of api.searchQueries) {
    const has = asArray(entry.query).some((s) => s.includes("speciesname"));
    assert.equal(entry.hasPlaceholder, has, `${entry.id} hasPlaceholder is wrong`);
  }
});

test("statuses use the three allowed labels", () => {
  const allowed = ["Verified", "Best Guess", "Needs in-game test"];
  for (const entry of api.searchQueries) assert.ok(allowed.includes(entry.status), entry.id);
});
