/*
 * data.js — the single source of truth for Pokémon GO Triage.
 *
 * Everything the app renders (sweeps, composer chips, reference table, integrity
 * check, PvP prefilter) is derived from the structures below. Keeping it all in one
 * data file is deliberate: the in-game search grammar is the fiddly, change-prone
 * part, so it lives as editable data, not scattered through the UI code.
 *
 * `verified: false` means the token is recalled from memory, NOT confirmed in-game.
 * Verify it in Pokémon GO's own search box, then flip the flag to true. The app shows
 * an "unverified" badge for anything still false so you never trust it blindly.
 *
 * Loaded as a classic script before app.js; these top-level consts are visible there.
 */

/* The umbrella keep tag. Applied to every keeper alongside its reason tag. */
const KEEP_TAG = "KEEP";

/*
 * Search grammar operators. In Pokémon GO's search box:
 *   &  = AND (intersection)
 *   ,  = OR  (union)
 *   !  = NOT (negation)   — confirmed working with tags (e.g. !KEEP)
 *   -  = range, e.g. cp1500-2500, age0-14
 * The 65k+ character strings people have used mean you never have to worry about
 * length; combine freely.
 */
const operators = [
  { sym: "&", name: "AND", meaning: "Both conditions must match (intersection).", verified: true },
  { sym: ",", name: "OR", meaning: "Either condition matches (union). Also joins a species list.", verified: true },
  { sym: "!", name: "NOT", meaning: "Excludes matches. Confirmed working on tags, e.g. !KEEP.", verified: true },
  { sym: "-", name: "range", meaning: "A numeric range, e.g. cp1500-2500 or age0-14 (blank side = open).", verified: true },
];

/*
 * Reason tags. Each keeper gets one of these PLUS the umbrella KEEP tag, applied in a
 * single multi-select action (confirmed you can apply more than one tag at once).
 *   token   — how you surface candidates for this reason in-game
 *   negate  — the tag name the integrity check negates (usually the tag itself)
 * `token` and the tag name are kept separate because some reasons (hundo, nearperfect,
 * pvp) have no direct search token — you find them by other means, then tag them.
 */
const reasonTags = [
  { id: "shiny",       tag: "shiny",       label: "Shiny",             token: "shiny",     judgment: "none", pokeGenie: false, verified: false, note: "Game knows it; unambiguous." },
  { id: "lucky",       tag: "lucky",       label: "Lucky",             token: "lucky",     judgment: "none", pokeGenie: false, verified: false, note: "Permanent + cheaper power-ups. Effectively always-keep." },
  { id: "shadow",      tag: "shadow",      label: "Shadow",            token: "shadow",    judgment: "none", pokeGenie: false, verified: false, note: "Raid-valuable. Decide your policy." },
  { id: "purified",    tag: "purified",    label: "Purified",          token: "purified",  judgment: "none", pokeGenie: false, verified: false, note: "Optional keep; your call." },
  { id: "cosmetic",    tag: "cosmetic",    label: "Costume / cosmetic", token: "costume",  judgment: "none", pokeGenie: false, verified: false, note: "Limited-time looks you can't re-catch." },
  { id: "legacy2016",  tag: "legacy2016",  label: "Legacy 2016 catch", token: "2016",      judgment: "none", pokeGenie: false, verified: false, note: "Sentimental OG catches. VERIFY the year-search token in-game." },
  { id: "xxl",         tag: "xxl",         label: "XXL size",          token: "xxl",       judgment: "none", pokeGenie: false, verified: false, note: "Size record." },
  { id: "xxs",         tag: "xxs",         label: "XXS size",          token: "xxs",       judgment: "none", pokeGenie: false, verified: false, note: "Size record." },
  { id: "hundo",       tag: "hundo",       label: "Perfect IV (100%)", token: "4*",        judgment: "some", pokeGenie: true,  verified: false, note: "No exact-100% token. 4* narrows the bucket; confirm by appraisal or Poke Genie." },
  { id: "nearperfect", tag: "nearperfect", label: "Near-perfect IV",   token: "4*",        judgment: "some", pokeGenie: true,  verified: false, note: "Top appraisal bucket that isn't a true hundo." },
  { id: "pvp",         tag: "pvp",         label: "Battle League",     token: null,        judgment: "some", pokeGenie: true,  verified: false, note: "No PvP-rank search token. Species-prefilter, then Poke Genie the shortlist." },
];

/*
 * Trait tokens for the composer chips and the reference table.
 * category groups them in the UI.
 */
const tokens = [
  // Appraisal star buckets
  { token: "4*", label: "4★ (top IV bucket)", category: "IV / appraisal", meaning: "Highest appraisal tier. Closest proxy to a hundo, but not exactly 100%.", verified: false },
  { token: "3*", label: "3★", category: "IV / appraisal", meaning: "Second appraisal tier.", verified: false },
  { token: "2*", label: "2★", category: "IV / appraisal", meaning: "Middle appraisal tier.", verified: false },
  { token: "1*", label: "1★", category: "IV / appraisal", meaning: "Low appraisal tier.", verified: false },
  { token: "0*", label: "0★ (nundo bucket)", category: "IV / appraisal", meaning: "Lowest appraisal tier.", verified: false },
  // Status
  { token: "shiny",    label: "Shiny",    category: "Status", meaning: "Shiny variants.", verified: false },
  { token: "lucky",    label: "Lucky",    category: "Status", meaning: "Lucky Pokémon (from trades).", verified: false },
  { token: "shadow",   label: "Shadow",   category: "Status", meaning: "Shadow (Team Rocket) Pokémon.", verified: false },
  { token: "purified", label: "Purified", category: "Status", meaning: "Purified Pokémon.", verified: false },
  { token: "costume",  label: "Costume",  category: "Status", meaning: "Costumed / event-cosmetic Pokémon.", verified: false },
  { token: "favorite", label: "Favorite", category: "Status", meaning: "Favorited (also transfer-protected by the game).", verified: false },
  // Size
  { token: "xxl", label: "XXL", category: "Size", meaning: "Extra-large size record.", verified: false },
  { token: "xxs", label: "XXS", category: "Size", meaning: "Extra-small size record.", verified: false },
  // Date
  { token: "age0-14", label: "age0-14 (last 14 days)", category: "Date", meaning: "Caught within a day range. age0-14 = last two weeks.", verified: false },
  { token: "2016", label: "2016 (catch year)", category: "Date", meaning: "Caught in a given year. VERIFY the exact form in-game.", verified: false },
  // CP
  { token: "cp1500-", label: "cp1500- (Great League cap-ish)", category: "CP", meaning: "CP range. cp1500- = 1500 and up; -1500 = up to 1500.", verified: false },
  // Tags
  { token: KEEP_TAG, label: "KEEP (your umbrella tag)", category: "Tags", meaning: "Your umbrella keep tag. Bare tag name searches it.", verified: true },
  { token: "!" + KEEP_TAG, label: "!KEEP (transfer candidates)", category: "Tags", meaning: "Everything NOT tagged KEEP. Your transfer-candidate pile.", verified: true },
];

/*
 * The initial-sort sweep sequence. Order matters: the zero-judgment, no-Poke-Genie
 * sweeps run first and strip big certain chunks before any effort is spent.
 * Each: paste `string` in-game, select-all in the result, apply `applyTags`.
 */
const sweeps = [
  { n: 1, id: "shiny",    title: "Shiny",              string: "shiny",              applyTags: ["shiny", KEEP_TAG],    pokeGenie: false,
    instructions: "Select all shinies and tag them shiny + KEEP. Unambiguous, no judgment." },
  { n: 2, id: "lucky",    title: "Lucky",              string: "lucky",              applyTags: ["lucky", KEEP_TAG],    pokeGenie: false,
    instructions: "Lucky Pokémon are permanent and cheaper to power up. Tag lucky + KEEP." },
  { n: 3, id: "shadow",   title: "Shadow / Purified",  string: "shadow,purified",    applyTags: ["shadow", KEEP_TAG],   pokeGenie: false,
    instructions: "Decide your policy. Shadows are raid-valuable. Tag shadow (or purified) + KEEP." },
  { n: 4, id: "cosmetic", title: "Costume / cosmetic", string: "costume",            applyTags: ["cosmetic", KEEP_TAG], pokeGenie: false,
    instructions: "Limited-time looks you can't re-catch. Tag cosmetic + KEEP." },
  { n: 5, id: "legacy",   title: "Legacy catches",     string: "2016",               applyTags: ["legacy2016", KEEP_TAG], pokeGenie: false,
    instructions: "Your sentimental OG bucket. VERIFY the year token first; add other early years if you care about them." },
  { n: 6, id: "size",     title: "Size records",       string: "xxl,xxs",            applyTags: ["xxl", KEEP_TAG],      pokeGenie: false,
    instructions: "Tag XXL and XXS records. Use xxl and xxs separately if you want distinct tags." },
  { n: 7, id: "iv",       title: "Perfect / near-perfect IV", string: "4*&!KEEP",     applyTags: ["hundo", KEEP_TAG],    pokeGenie: true,
    instructions: "4* is the top bucket, NOT exact 100%. Appraise the (small) set by hand OR Poke Genie it for exact IV. Tag true 100s hundo, the rest nearperfect. First legit Poke Genie use." },
  { n: 8, id: "pvp",      title: "Battle League",       string: "__PVP_PREFILTER__",  applyTags: ["pvp", KEEP_TAG],      pokeGenie: true,
    instructions: "Search runs no PvP rank. Use the species-prefilter string below to isolate untagged league-relevant species, then Poke Genie ONLY that shortlist for rank. Tag winners pvp + KEEP. Discard the Poke Genie DB after. Second legit Poke Genie use." },
];

/*
 * PvP-relevant species — starter snapshot, Great League focus, biased toward species
 * you actually catch a lot of (so the sweep-8 prefilter is worth running). This is a
 * moving target: the PvP meta shifts every season, so treat this as editable and
 * refresh it against current PvPoke Great/Ultra rankings. Legendaries you rarely have
 * spares of are intentionally left out.
 */
const pvpSpecies = [
  "Medicham", "Azumarill", "Altaria", "Skarmory", "Bastiodon", "Swampert", "Lanturn",
  "Talonflame", "Trevenant", "Mandibuzz", "Sableye", "Whiscash", "Umbreon", "Scrafty",
  "Dewgong", "Diggersby", "Wigglytuff", "Drapion", "Quagsire", "Jellicent", "Clodsire",
  "Annihilape", "Lickitung", "Hypno", "Cofagrigus", "Toxapex", "Vigoroth", "Pelipper",
  "Gligar", "Marowak", "Serperior", "Venusaur", "Charizard", "Feraligatr", "Poliwrath",
];

/* Build the sweep-8 prefilter string: species OR-joined, AND not-already-kept. */
function pvpPrefilterString() {
  return pvpSpecies.join(",") + "&!" + KEEP_TAG;
}

/* Build the integrity-check compound: negate every reason tag, ANDed together.
 * Should return the SAME in-game result set as `!KEEP`. A mismatch = a tagging gap. */
function reasonNegationString() {
  const uniqueTags = [...new Set(reasonTags.map((r) => r.tag))];
  return uniqueTags.map((t) => "!" + t).join("&");
}
