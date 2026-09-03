/*
 * data.js — the single source of truth for Pokémon GO Triage.
 *
 * Everything the app renders (sweeps, composer chips, reference table, integrity
 * check, PvP prefilter) is derived from the structures below. Keeping it all in one
 * data file is deliberate: the in-game search grammar is the fiddly, change-prone
 * part, so it lives as editable data, not scattered through the UI code.
 *
 * `verified: false` means the token hasn't been tested in-game yet. Verify it in
 * Pokémon GO's own search box, then flip the flag to true. The app shows an
 * "unverified" badge for anything still false so you never trust it blindly.
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
 * The 65k+ character strings people have used mean length is never a concern.
 * Catch year uses the literal form `year2016` (confirmed in-game).
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
 *   tag    — the exact in-game tag NAME you create and apply
 *   token  — how you surface candidates for this reason in-game (null if none exists)
 * tag and token are kept separate because some reasons (hundo, 4star, pvp) have no
 * direct search token: you find them by other means, then tag them.
 */
const reasonTags = [
  { id: "shiny",      tag: "shiny",           label: "Shiny",             token: "shiny",         judgment: "none", pokeGenie: false, verified: true,  note: "Game knows it; unambiguous." },
  { id: "lucky",      tag: "lucky",           label: "Lucky",             token: "lucky",         judgment: "none", pokeGenie: false, verified: true,  note: "Permanent + cheaper power-ups. (You currently have none.)" },
  { id: "shadowpur",  tag: "shadow/purified", label: "Shadow / Purified", token: "shadow,purified", judgment: "none", pokeGenie: false, verified: true, note: "Single combined tag named shadow/purified." },
  { id: "cosmetic",   tag: "cosmetic",        label: "Costume / cosmetic", token: "costume",      judgment: "none", pokeGenie: false, verified: true,  note: "Limited-time looks you can't re-catch." },
  { id: "year2016",   tag: "2016",            label: "Legacy 2016",       token: "year2016",      judgment: "none", pokeGenie: false, verified: true,  note: "Launch year. Sentimental peak." },
  { id: "year2017",   tag: "2017",            label: "Legacy 2017",       token: "year2017",      judgment: "none", pokeGenie: false, verified: true,  note: "Year syntax is yearXXXX. Value drops off fast after 2016." },
  { id: "legendary",  tag: "legendary",       label: "Legendary",         token: "legendary",     judgment: "none", pokeGenie: false, verified: true,  note: "Rare, raid/Master-League value." },
  { id: "mythical",   tag: "mythical",        label: "Mythical",          token: "mythical",      judgment: "none", pokeGenie: false, verified: true,  note: "Separate search term from legendary (e.g. Keldeo, Mew)." },
  { id: "specialbg",  tag: "special-bg",      label: "Special background", token: "background",   judgment: "none", pokeGenie: false, verified: false, note: "The event-background icon on the box thumbnail. VERIFY the token (try background / specialbackground / eventbackground)." },
  { id: "xxl",        tag: "xxl",             label: "XXL size",          token: "xxl",           judgment: "none", pokeGenie: false, verified: true,  note: "Separate size tag." },
  { id: "xxs",        tag: "xxs",             label: "XXS size",          token: "xxs",           judgment: "none", pokeGenie: false, verified: true,  note: "Separate size tag." },
  { id: "regional",   tag: "regional",        label: "Regional exclusive", token: null,           judgment: "none", pokeGenie: false, verified: false, note: "Hard to re-obtain. Found via a species list (no single token)." },
  { id: "hundo",      tag: "hundo",           label: "Perfect IV (100%)", token: "4*",            judgment: "some", pokeGenie: true,  verified: true,  note: "No exact-100% token. 4* narrows the bucket; confirm by appraisal or Poke Genie." },
  { id: "4star",      tag: "4star",           label: "Near-perfect (4★)", token: "4*",            judgment: "some", pokeGenie: true,  verified: true,  note: "Top appraisal bucket that isn't a true hundo. Soft/optional keep (see IV note)." },
  { id: "pvp",        tag: "pvp",             label: "Battle League",     token: null,            judgment: "some", pokeGenie: true,  verified: false, note: "No PvP-rank token. Species-prefilter, then Poke Genie the shortlist. Star rating is NOT a PvP signal." },
];

/*
 * Trait tokens for the composer chips and the reference table.
 */
const tokens = [
  // Appraisal star buckets
  { token: "4*", label: "4★ (top IV bucket)", category: "IV / appraisal", meaning: "Highest appraisal tier. Closest proxy to a hundo, but not exactly 100%.", verified: true },
  { token: "3*", label: "3★", category: "IV / appraisal", meaning: "Second appraisal tier. Not a keep-reason on its own.", verified: true },
  { token: "2*", label: "2★", category: "IV / appraisal", meaning: "Middle appraisal tier.", verified: false },
  { token: "1*", label: "1★", category: "IV / appraisal", meaning: "Low appraisal tier.", verified: false },
  { token: "0*", label: "0★ (nundo bucket)", category: "IV / appraisal", meaning: "Lowest appraisal tier.", verified: false },
  // Status
  { token: "shiny",     label: "Shiny",     category: "Status", meaning: "Shiny variants.", verified: true },
  { token: "lucky",     label: "Lucky",     category: "Status", meaning: "Lucky Pokémon (from trades).", verified: true },
  { token: "shadow",    label: "Shadow",    category: "Status", meaning: "Shadow (Team Rocket) Pokémon.", verified: true },
  { token: "purified",  label: "Purified",  category: "Status", meaning: "Purified Pokémon.", verified: true },
  { token: "costume",   label: "Costume",   category: "Status", meaning: "Costumed / event-cosmetic Pokémon.", verified: true },
  { token: "legendary", label: "Legendary", category: "Status", meaning: "Legendary Pokémon.", verified: true },
  { token: "mythical",  label: "Mythical",  category: "Status", meaning: "Mythical Pokémon. Separate term from legendary.", verified: true },
  { token: "background", label: "background", category: "Status", meaning: "Special/event background. Token unconfirmed; try background / specialbackground / eventbackground.", verified: false },
  { token: "favorite",  label: "Favorite",  category: "Status", meaning: "Favorited (also transfer-protected by the game).", verified: false },
  // Size
  { token: "xxl", label: "XXL", category: "Size", meaning: "Extra-large size record.", verified: true },
  { token: "xxs", label: "XXS", category: "Size", meaning: "Extra-small size record.", verified: true },
  // Date
  { token: "age0-14", label: "age0-14 (last 14 days)", category: "Date", meaning: "Caught within a day range. age0-14 = last two weeks.", verified: false },
  { token: "year2016", label: "year2016 (catch year)", category: "Date", meaning: "Caught in a given year. Syntax is yearXXXX. Confirmed.", verified: true },
  // CP
  { token: "cp1500-", label: "cp1500- (Great League cap-ish)", category: "CP", meaning: "CP range. cp1500- = 1500 and up; -1500 = up to 1500.", verified: false },
  // Tags
  { token: KEEP_TAG, label: "KEEP (your umbrella tag)", category: "Tags", meaning: "Your umbrella keep tag. Bare tag name searches it.", verified: true },
  { token: "!" + KEEP_TAG, label: "!KEEP (transfer candidates)", category: "Tags", meaning: "Everything NOT tagged KEEP. Your transfer-candidate pile.", verified: true },
];

/*
 * PvP-relevant species — starter snapshot, Great League focus, biased toward species
 * you actually catch a lot of. Meta shifts every season, so treat as editable and
 * refresh against current PvPoke Great/Ultra rankings.
 */
const pvpSpecies = [
  "Medicham", "Azumarill", "Altaria", "Skarmory", "Bastiodon", "Swampert", "Lanturn",
  "Talonflame", "Trevenant", "Mandibuzz", "Sableye", "Whiscash", "Umbreon", "Scrafty",
  "Dewgong", "Diggersby", "Wigglytuff", "Drapion", "Quagsire", "Jellicent", "Clodsire",
  "Annihilape", "Lickitung", "Hypno", "Cofagrigus", "Toxapex", "Vigoroth", "Pelipper",
  "Gligar", "Marowak", "Serperior", "Venusaur", "Charizard", "Feraligatr", "Poliwrath",
];

/*
 * Regional exclusives — well-known ones, editable. These are hard to replace once
 * transferred (caught while travelling or via limited events).
 */
const regionalSpecies = [
  "Kangaskhan", "Farfetch'd", "Mr. Mime", "Tauros", "Heracross", "Corsola", "Torkoal",
  "Zangoose", "Seviper", "Relicanth", "Volbeat", "Illumise", "Tropius", "Pachirisu",
  "Chatot", "Carnivine", "Pansage", "Pansear", "Panpour", "Maractus", "Sigilyph",
  "Throh", "Sawk", "Heatmor", "Durant", "Bouffalant", "Emolga", "Klefki",
];

/*
 * The initial-sort sweep sequence. Order matters: the zero-judgment, no-Poke-Genie
 * sweeps run first and strip big certain chunks before any effort is spent.
 * Each: paste `string` in-game, select-all in the result, apply `applyTags`.
 *
 * The !KEEP question, settled: EVERY initial-sort sweep uses the plain token/list, so
 * you see every copy including ones already kept for another reason. That matters most
 * on the IV and PvP sweeps: your best battler might be a Pokémon you already kept as a
 * 2016 catch, and you still want to spot and tag it. The `&!KEEP` narrowing is ONLY for
 * ongoing triage of newly caught Pokémon later, noted in those two sweeps.
 */
const sweeps = [
  { n: 1, id: "shiny",    title: "Shiny",              string: "shiny",              applyTags: ["shiny", KEEP_TAG],           pokeGenie: false,
    instructions: "Select all shinies and tag them shiny + KEEP. Unambiguous, no judgment." },
  { n: 2, id: "lucky",    title: "Lucky",              string: "lucky",              applyTags: ["lucky", KEEP_TAG],           pokeGenie: false,
    instructions: "Lucky Pokémon are permanent and cheaper to power up. Tag lucky + KEEP. (You may have none.)" },
  { n: 3, id: "shadowpur", title: "Shadow / Purified", string: "shadow,purified",    applyTags: ["shadow/purified", KEEP_TAG],  pokeGenie: false,
    instructions: "One combined tag named shadow/purified. Shadows are raid-valuable. Tag shadow/purified + KEEP." },
  { n: 4, id: "cosmetic", title: "Costume / cosmetic", string: "costume",            applyTags: ["cosmetic", KEEP_TAG],        pokeGenie: false,
    instructions: "Limited-time looks you can't re-catch. Tag cosmetic + KEEP." },
  { n: 5, id: "legacy",   title: "Legacy years",       string: "year2016",           applyTags: ["2016", KEEP_TAG],            pokeGenie: false,
    instructions: "Year syntax is yearXXXX. Do 2016 first (launch-year nostalgia). Repeat for any later year you decide is worth it, tagging with that year's name + KEEP. Reminder: catch year has ZERO mechanical benefit, so value drops off fast after 2016. Don't blanket-keep a whole recent year just for the date." },
  { n: 6, id: "xxl",      title: "XXL size",           string: "xxl",                applyTags: ["xxl", KEEP_TAG],             pokeGenie: false,
    instructions: "Tag XXL records xxl + KEEP." },
  { n: 7, id: "xxs",      title: "XXS size",           string: "xxs",                applyTags: ["xxs", KEEP_TAG],             pokeGenie: false,
    instructions: "Tag XXS records xxs + KEEP. (Kept separate from XXL on purpose.)" },
  { n: 8, id: "legendary", title: "Legendary",         string: "legendary",          applyTags: ["legendary", KEEP_TAG],       pokeGenie: false,
    instructions: "Tag legendary + KEEP. Your event Mewtwo is here (also tag it hundo, special-bg, and favorite it in-game)." },
  { n: 9, id: "mythical",  title: "Mythical",          string: "mythical",           applyTags: ["mythical", KEEP_TAG],        pokeGenie: false,
    instructions: "Separate search term from legendary. Tag mythical + KEEP (e.g. Keldeo, Mew)." },
  { n: 10, id: "specialbg", title: "Special background", string: "background",        applyTags: ["special-bg", KEEP_TAG],      pokeGenie: false,
    instructions: "The event-background icon on the box thumbnail (e.g. the snowflake mark on your Mewtwo). VERIFY the token in-game: try background, specialbackground, or eventbackground, and correct it in data.js. Tag special-bg + KEEP." },
  { n: 11, id: "regional", title: "Regional exclusives", string: "__REGIONAL_LIST__",  applyTags: ["regional", KEEP_TAG],       pokeGenie: false,
    instructions: "Hard to replace once gone. The string is a species list (editable in data.js). Tag any you own regional + KEEP." },
  { n: 12, id: "iv",      title: "Perfect / near-perfect IV", string: "4*",           applyTags: ["hundo | 4star", KEEP_TAG],    pokeGenie: true,
    instructions: "Shows ALL your 4-stars (including ones already kept). 4* is the top bucket, NOT exact 100%. Appraise by hand or Poke Genie for exact IV: tag true 100s hundo + KEEP, the rest 4star + KEEP. Note: high IV mainly helps raids/Master League/trophy and is NOT a PvP signal, so 4star is a soft keep. Ongoing (new catches only) later: use 4*&!KEEP. First legit Poke Genie use." },
  { n: 13, id: "pvp",     title: "Battle League",       string: "__PVP_LIST__",       applyTags: ["pvp", KEEP_TAG],             pokeGenie: true,
    instructions: "Shows ALL league-relevant species you own, including ones already kept, because the goal is also to find your best battlers to power up (your best Poliwrath might be a 2016 keeper). Search runs no PvP rank, and star rating does NOT indicate PvP value, so Poke Genie this list for rank and tag winners pvp + KEEP. Discard the Poke Genie DB after. Ongoing (new catches only) later: append &!KEEP. Second legit Poke Genie use." },
];

/*
 * Manual keep-checks that search can't cleanly do. Shown as a note on the sweeps tab
 * so they aren't forgotten, rather than faked as searches.
 */
const manualChecks = [
  { title: "Invested Pokémon", detail: "Anything you've powered up, put an Elite TM into, or spent lots of candy/XL on. Transferring wastes that investment. No reliable search; eyeball high-CP mons and your battle teams." },
  { title: "Living dex", detail: "Keep at least one of each species you care about having in the Pokédex, even a bad one. There's no clean search; check before mass-transferring a common species you might be down to your last of." },
];

/* Build the PvP sweep string: the full species list (plain, no !KEEP). */
function pvpListString() {
  return pvpSpecies.join(",");
}

/* Build the regionals sweep string: species OR-joined (plain). */
function regionalListString() {
  return regionalSpecies.join(",");
}

/* Resolve any placeholder token in a sweep's `string` field. */
function resolveSweepString(sweep) {
  if (sweep.string === "__PVP_LIST__") return pvpListString();
  if (sweep.string === "__REGIONAL_LIST__") return regionalListString();
  return sweep.string;
}

/* Build the integrity-check compound: negate every reason tag, ANDed together.
 * Should return the SAME in-game result set as `!KEEP`. A mismatch = a tagging gap.
 * Note the shadow/purified tag contains a slash: verify !shadow/purified negates
 * correctly in-game (the slash isn't a grammar operator, so it should be literal). */
function reasonNegationString() {
  const uniqueTags = [...new Set(reasonTags.map((r) => r.tag))];
  return uniqueTags.map((t) => "!" + t).join("&");
}
