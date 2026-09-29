/*
 * search-terms.js: ready-made storage search strings for the Search terms tab.
 *
 * Content comes from a private planning doc (pogo-search-queries.md), which is the
 * source of truth. Query strings must stay byte-for-byte identical to it: `npm test`
 * checks every stored string against the doc when the doc is present.
 *
 * The four DAILY queries are generated from KEEPER_TERMS rather than stored, so adding
 * a keeper keyword later updates all four consistently.
 *
 * Operator precedence (confirmed in-game): comma (OR) binds tighter than & (AND), so
 * `age0&a,b` means "caught today AND (a OR b)". No parentheses needed or supported.
 *
 * Description text supports `code` and **bold**. Blocks are { label?, text },
 * { list: [...], ordered? } or { code }.
 *
 * Loaded as a classic script before app.js; these top-level consts are visible there.
 */

/* Every keeper category. Good = any of these; Fodder = none of these. */
const KEEPER_TERMS = [
  "4*", "3*", "shiny", "lucky", "shadow", "purified", "legendary", "mythical",
  "ultrabeast", "costume", "background", "locationbackground", "@special",
  "dynamax", "gigantamax", "xxl", "xxs",
];

/* The text a user replaces in placeholder queries (PVP-2). */
const PLACEHOLDER = "speciesname";

const STATUS = {
  verified: "Verified",
  bestGuess: "Best Guess",
  needsTest: "Needs in-game test",
};

/*
 * Build a daily query from the keeper list.
 *   age          age window token, e.g. "age0-1"
 *   fodder       true: negate every keeper term (&!x); false: OR them together
 *   disappearing true: also exclude tagged and favorited (&!#&!favorite)
 */
function dailyQuery({ age, fodder, disappearing }) {
  const body = fodder
    ? KEEPER_TERMS.map((t) => "&!" + t).join("")
    : "&" + KEEPER_TERMS.join(",");
  return age + body + (disappearing ? "&!#&!favorite" : "");
}

/* Sections in display order. Historical renders collapsed. */
const SEARCH_SECTIONS = [
  { category: "Daily Sort", heading: "Daily sort" },
  { category: "PvE", heading: "PvE" },
  { category: "Gym", heading: "Gym defenders" },
  { category: "PvP", heading: "PvP" },
  { category: "Backlog", heading: "Backlog" },
  { category: "Historical", heading: "Historical", collapsed: true },
];

/* Collapsible "how these work" note shown above the daily four. */
const DAILY_GUIDE = [
  { text: "All four are built from one shared keeper list:" },
  { code: KEEPER_TERMS.join(", ") },
  { list: [
    "The **Good** queries = keeper list joined with commas (any match).",
    "The **Fodder** queries = the same list, every term negated with `&!` (no match).",
  ] },
  { text: "Because one is the exact negation of the other, **every new catch lands in exactly one of the two lists.** Nothing falls into a gap." },
  { label: "Decision markers", text: "`#` (tagged) and `favorite` are treated as decisions you made, not properties of the Pokémon. The **disappearing** versions add `&!#&!favorite` so anything you've tagged or hearted drops off. The **persistent** versions leave those off so tagged Pokémon stay visible." },
  { label: "Age windows", text: "Disappearing lists use `age0-1` to catch late-night catches from yesterday. Persistent lists use `age0` (today only) for a clean daily review. Change the number freely (e.g. `age0-3` after a few days off)." },
  { label: "Daily workflow", text: "" },
  { ordered: true, list: [
    "Run **DAILY-2** (Good, disappearing). Tag the keepers. They vanish as you go.",
    "Run **DAILY-1** (Fodder, disappearing). Check each with the Poke Genie overlay for PvP value. Tag any 90%+ PvP candidates. They vanish.",
    "What's left in DAILY-1 is the transfer pile. Multi-select, then transfer. **No undo on transfers.**",
    "Optional review: run **DAILY-3** and **DAILY-4** to see everything you caught today and what you chose to keep. Prune further if you want.",
  ] },
  { label: "Known gaps", text: "No keyword finds these, so they always land in the fodder lists. Watch for them during the Poke Genie pass:" },
  { list: [
    "**Regional exclusives:** no keyword. Tag them manually when caught.",
    "**New Pokédex species** (first catch of a species): no keyword.",
    "**Trade fodder** you want to hold: no keyword; tag manually.",
  ] },
];

/*
 * Every query. Fields follow the planning doc:
 *   id, title, category, query (string, or an array when one entry has several
 *   strings), whenToUse, description (blocks), status, hasPlaceholder.
 */
const searchQueries = [
  /* ---------- Daily Sort ---------- */
  {
    id: "DAILY-1",
    title: "Fodder, disappears when tagged",
    category: "Daily Sort",
    query: dailyQuery({ age: "age0-1", fodder: true, disappearing: true }),
    whenToUse: "Daily, step 2: Poke Genie pass on fodder, then transfer what's left.",
    description: [
      { label: "What it shows", text: "recent catches that match none of the keeper categories and haven't been tagged or favorited yet. These are likely transfers unless they have PvP value." },
      { label: "How to use", text: "your daily Poke Genie pass. Check each one's PvP rating. Tag any worth keeping and it disappears from the list, so the count on screen is how many are still unsorted. Transfer whatever's left." },
      { label: "Replaces", text: "the original `age0&!4*&!3*&!shiny&...&!#` string (ORIG-1, under Historical). Adds backgrounds, Dynamax/Gigantamax, XXL/XXS, and `!favorite`; widens to `age0-1`." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "DAILY-2",
    title: "Good stuff, disappears when tagged",
    category: "Daily Sort",
    query: dailyQuery({ age: "age0-1", fodder: false, disappearing: true }),
    whenToUse: "Daily, step 1: sort recent good catches and tag the keepers.",
    description: [
      { label: "What it shows", text: "recent catches that match at least one keeper category and haven't been tagged or favorited yet. Reads as: caught today or yesterday AND (hundo OR 3-star OR shiny OR …) AND untagged AND not favorited." },
      { label: "How to use", text: "initial sort of the good pile. Tag each keeper (KEEP, PVE, PVP tiers, etc.) and it disappears. Items in here that are only `3*` on a non-meta species are usually transfers (see PvE). Being in this list means \"review,\" not \"automatically keep.\"" },
      { label: "Replaces", text: "the original `age0-1&4*,3*,shiny,...,favorite` string (ORIG-2, under Historical). Adds costume, backgrounds, `@special`, Dynamax/Gigantamax, XXL/XXS; removes `favorite` as a match term and makes tagged/favorited Pokémon disappear." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "DAILY-3",
    title: "Fodder, persistent",
    category: "Daily Sort",
    query: dailyQuery({ age: "age0", fodder: true, disappearing: false }),
    whenToUse: "Daily review: today's low-tier catches you chose to keep.",
    description: [
      { label: "What it shows", text: "everything caught today that isn't in a keeper category, **including ones you've tagged.**" },
      { label: "How to use", text: "after you've transferred today's fodder, whatever remains here is the low-tier catches you decided to keep (usually PvP candidates). Quick daily count and a second chance to prune." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "DAILY-4",
    title: "Good stuff, persistent",
    category: "Daily Sort",
    query: dailyQuery({ age: "age0", fodder: false, disappearing: false }),
    whenToUse: "Daily review: everything good you caught today.",
    description: [
      { label: "What it shows", text: "every catch today that matches any keeper category, tagged or not." },
      { label: "How to use", text: "\"look what I got today\" view. Also a second-pass prune of the good pile." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },

  /* ---------- PvE ---------- */
  {
    id: "PVE-1",
    title: "Over-keep audit",
    category: "PvE",
    query: "#KEEP&!#PVP&!#PVE&!shiny&!lucky&!shadow&!purified&!legendary&!mythical&!ultrabeast&!costume&!background&!dynamax&!gigantamax",
    whenToUse: "One-time cleanup, then occasional: find keepers held only for IVs.",
    description: [
      { label: "What it shows", text: "everything tagged KEEP that has no PvP or PvE role and no special status. In other words, things kept purely for IVs." },
      { label: "How to use", text: "sort by Name and go species by species. Anything not on the PvE allow-list is a transfer candidate. One-time cleanup, then occasional." },
      { label: "Rule", text: "a Pokémon gets a `PVE` tag **only if its species is a current top attacker for some type.** Keep up to **six per species** (one raid team). Anything in the good pile that's there only because it's `3*`, and isn't a PvP candidate, goes to transfer." },
      { label: "Open item", text: "the species allow-list still needs to be built from a current best-attackers-by-type list." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "PVE-2",
    title: "Too many copies of a PvE species",
    category: "PvE",
    query: "#PVE&count7-",
    whenToUse: "Occasional: prune PvE species down to the best six.",
    description: [
      { label: "What it shows", text: "PvE-tagged Pokémon of species where you own 7+ copies." },
      { label: "How to use", text: "prune each species down to its best six." },
      { label: "Best Guess caveat", text: "`count` counts every copy you own of that dex number (forms merged), not just PVE-tagged ones. So this can include species where only a few copies are actually tagged. Treat as a candidate list." },
    ],
    status: STATUS.bestGuess,
    hasPlaceholder: false,
  },

  /* ---------- Gym ---------- */
  {
    id: "DEF-1",
    title: "Candidate finder (first-time setup)",
    category: "Gym",
    query: "+chansey,+snorlax,+slakoth,+shuckle,+metagross&!#DEF",
    whenToUse: "One-time setup: find gym defender candidates to tag DEF.",
    description: [
      { label: "What it shows", text: "every member of those evolution families that isn't tagged DEF yet. (`+metagross` = Beldum line; `+slakoth` = Slaking line; `+snorlax` includes Munchlax.)" },
      { label: "How to use", text: "pick the best one or two per species, tag them `DEF`. Edit the species list to taste." },
      { label: "Why these", text: "" },
      { list: [
        "Coin cap is **50/day**, reached after **8 h 20 min** defending. (Verified.)",
        "**One of each species per gym.** (Verified, older source.)",
        "Therefore: keep **one or two each of several bulky species**, not many copies of one.",
        "Commonly cited choices: Blissey, Chansey, Slaking, Snorlax, Metagross. (Verified as commonly cited.) Chansey's low max CP keeps its motivation fuller in-gym. (Verified in a 2021 source; worth re-checking.)",
        "**Shuckle (Best Guess):** coins depend on time in the gym, not strength. Shuckle's value is low CP / slow motivation decay, not being hard to beat. Fine to keep one; not a real wall.",
      ] },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "DEF-2",
    title: "Available defenders",
    category: "Gym",
    query: "#DEF&!defender",
    whenToUse: "At a gym: find tagged defenders that are home.",
    description: [
      { label: "What it shows", text: "tagged defenders that are home (not currently in a gym)." },
      { label: "How to use", text: "open this when you're at a gym you can drop into." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },

  /* ---------- PvP ---------- */
  {
    id: "PVP-1",
    title: "League duplicate review (run once per league)",
    category: "PvP",
    query: ["#GL", "#UL", "#LC"],
    whenToUse: "Occasional: keep the best copy per species, per league.",
    description: [
      { label: "How to use", text: "sort by **Name** so duplicates of each species sit together. Keep the best one per species per league. Keep a second only if it's a different form: shadow vs. non-shadow play differently." },
      { label: "Tag scheme", text: "" },
      { list: [
        "`KEEP`: keeper",
        "`PVP`: any PvP candidate",
        "`PVP-90%` / `PVP-99%` / `PVP-100%`: Poke Genie PvP score tier",
        "`LC` / `GL` / `UL`: league(s) where that score applies",
      ] },
      { text: "Only 90%+ candidates are kept. Example: 95% in both Great and Ultra gets `KEEP, PVP, PVP-90%, GL, UL`." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "PVP-2",
    title: "Pre-tag check (prevention)",
    category: "PvP",
    query: "+speciesname&#PVP",
    whenToUse: "Before every new PvP tag: check for a better copy you already have.",
    description: [
      { label: "How to use", text: "before tagging a new PvP candidate, run this. If you already have one at or above the new one's score for the same league, transfer the new one instead of tagging it. This is what stops duplicates from coming back." },
      { text: "Type the new catch's species above; it replaces `speciesname` (e.g. `+medicham&#PVP`)." },
    ],
    status: STATUS.verified,
    hasPlaceholder: true,
  },
  {
    id: "PVP-3",
    title: "XL prune list",
    category: "PvP",
    query: "#PVP&#XL",
    whenToUse: "Occasional: prune PvP candidates that need XL Candy.",
    description: [
      { label: "How to use", text: "transfer anything here you'll honestly never candy up, unless it's something you'd actually build." },
      { label: "XL tag rule", text: "add one tag, `XL`, to any PvP candidate whose target level needs XL Candy. This captures nearly all the \"never going to happen\" keepers without tracking dust amounts. Existing candidates need a one-time rescan in Poke Genie to apply it." },
      { label: "Why XL", text: "power-up cost is **not searchable**, so it needs a tag. Best Guess, from the power-up cost curve: the ~400k-dust cases are almost always Pokémon whose target league level is above 40, which also means **XL Candy.** Dust is renewable; XL Candy for a random species usually isn't." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "PVP-4",
    title: "Cheap-to-finish GL candidates (proxy)",
    category: "PvP",
    query: "#GL&cp1300-1500",
    whenToUse: "Occasional: GL candidates that are cheap to finish.",
    description: [
      { label: "What it shows", text: "GL-tagged Pokémon already close to the 1500 cap. These are cheap to finish, so they're your real keepers." },
      { label: "Best Guess", text: "CP distance from the cap only roughly tracks cost; **level** is what actually drives it. For Ultra League, swap in `#UL` and ranges relative to 2500 (e.g. `cp2200-2500` / `cp-1800`, adjust to taste)." },
    ],
    status: STATUS.bestGuess,
    hasPlaceholder: false,
  },
  {
    id: "PVP-5",
    title: "Expensive GL candidates (proxy, scan these first)",
    category: "PvP",
    query: "#GL&cp-1000",
    whenToUse: "One-time: scan these first when applying the XL tag.",
    description: [
      { label: "What it shows", text: "GL-tagged Pokémon far from the 1500 cap. Scan these first when applying the `XL` tag." },
      { label: "Best Guess", text: "CP distance from the cap only roughly tracks cost; **level** is what actually drives it. For Ultra League, swap in `#UL` and ranges relative to 2500 (e.g. `cp2200-2500` / `cp-1800`, adjust to taste)." },
    ],
    status: STATUS.bestGuess,
    hasPlaceholder: false,
  },

  /* ---------- Backlog ---------- */
  {
    id: "BULK-1",
    title: "Bulk-poor backlog sweep (recommended)",
    category: "Backlog",
    query: "0-3defense,0-2hp&0-3hp,0-2defense&0-3attack&!shiny&!lucky&!shadow&!purified&!legendary&!mythical&!ultrabeast&!costume&!background&!locationbackground&!@special&!dynamax&!gigantamax&!xxl&!xxs&!#&!favorite&!year2016-2018",
    whenToUse: "Occasional sweep of the whole box, not a daily query.",
    description: [
      { label: "What it shows", text: "bulk-poor Pokémon that don't have 15 attack, aren't special, and aren't tagged or favorited. Old 2016–2018 catches are protected as lucky-trade fodder. The exclusions match the daily keeper list." },
      { label: "How the IV logic works", text: "the intended OR-of-ANDs is rewritten as an AND-of-ORs, which works without parentheses: `(Def ≤ 3 OR HP ≤ 2) AND (HP ≤ 3 OR Def ≤ 2)`. (Derived logic, checked case by case; not from a source.) `0-3attack` protects 15-attack Pokémon that may be PvE-useful." },
      { label: "How to use", text: "an **occasional backlog sweep** of the existing box, not a daily query (the daily fodder list already covers new catches). Review, then transfer." },
      { label: "Verified in-game", text: "`year2016-2018` range syntax works (same count as `year2016,year2017,year2018`)." },
    ],
    status: STATUS.needsTest,
    hasPlaceholder: false,
  },

  /* ---------- Historical ---------- */
  {
    id: "ORIG-1",
    title: "Original fodder filter",
    category: "Historical",
    query: "age0&!4*&!3*&!shiny&!lucky&!shadow&!purified&!legendary&!mythical&!ultrabeast&!costume&!favorite&!@special&!#",
    whenToUse: "Reference only. Superseded by DAILY-1.",
    description: [
      { label: "Missing", text: "backgrounds, Dynamax/Gigantamax, XXL/XXS." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "ORIG-2",
    title: "Original good filter",
    category: "Historical",
    query: "age0-1&4*,3*,shiny,lucky,legendary,mythical,shadow,purified,favorite",
    whenToUse: "Reference only. Superseded by DAILY-2.",
    description: [
      { label: "Missing", text: "costume, backgrounds, `@special`, Ultra Beasts, Dynamax/Gigantamax, XXL/XXS. Worked correctly because comma binds tighter than `&`. Tagged Pokémon did not disappear." },
    ],
    status: STATUS.verified,
    hasPlaceholder: false,
  },
  {
    id: "BULK-ORIG",
    title: "Community-suggested bulk string (as received)",
    category: "Historical",
    query: "0-4defense&0-2hp,0-2defense&0-4hp,0-3defense&0-3hp&!legendary&!mythical&!ultra beasts&!shiny&!shadow&!lucky&!@special&!costume&!raid&!year 2016-2018&!xxs&!xxl&!background",
    whenToUse: "Reference only. Use BULK-1 instead.",
    description: [
      { label: "Intent", text: "find Pokémon with poor defense/HP (attack ignored). Low bulk ≈ no PvP value. Numbers are appraisal bars per stat: 0 = 0, 4 = 15, 2 = up to ~10, 3 = up to ~14." },
      { label: "Intended logic", text: "(HP ≤ 2 bars) OR (Def ≤ 2 bars) OR (both ≤ 3 bars)." },
      { label: "Actual logic", text: "(because comma binds tighter than `&`):" },
      { code: "(def 0-4) & (hp 0-2 OR def 0-2) & (hp 0-4 OR def 0-3) & (hp 0-3) & exclusions" },
      { text: "Two clauses are always true, so it really filters: HP ≤ 3 bars AND (HP ≤ 2 bars OR Def ≤ 2 bars). **Narrower than intended**, so it's safe, just less thorough." },
      { label: "Problems", text: "" },
      { list: [
        "**No `!#` or `!favorite`**: shows tagged and favorited Pokémon. Real risk if bulk-transferring from it.",
        "**No age filter**: searches the whole box (why ~200+ results appeared).",
        "**Flags strong PvE attackers**: e.g. a 15/15/10 Metagross has poor bulk by this test but is a good raid attacker.",
        "**Not excluded:** `3*` is possible with low HP (15/15/10 ≈ 89%), purified, Dynamax/Gigantamax.",
        "**Best Guess on syntax:** `!ultra beasts` (with a space) may match nothing. The keyword is `ultrabeast`. `year 2016-2018` (with a space) is unconfirmed.",
      ] },
    ],
    status: STATUS.bestGuess,
    hasPlaceholder: false,
  },
];
