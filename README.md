# Pokémon GO Triage

A small, zero-risk helper for deciding which Pokémon in a bloated storage box are safe
to transfer. It builds combinable in-game search strings and walks you through a
tag-based sweep, so a Pokémon is only cleared for transfer once every keep-reason has
been ruled out.

## The idea

There is no official Pokémon GO API, and any tool that logs into your account or
transfers on your behalf risks a ban. So this tool does none of that. **The game is the
source of truth.** This page holds no copy of your box. It hands you search strings; you
paste them into the game, then select, tag, and transfer by hand. No login, no scanning,
no automation, no risk.

The key move is to store every keep decision as an **in-game tag**, which stays in sync
with the game automatically (unlike an external database, which never does). You tag each
keeper with a reason (`shiny`, `hundo`, `pvp`, and so on) plus one umbrella `KEEP` tag.
Your transfer pile is then simply everything the search `!KEEP` returns.

## How to use it

1. **Guided sweeps.** Work the list top to bottom. The first six sweeps need no judgment
   and no extra tools: copy the string, paste it into the game's search bar, select all,
   and apply the listed tags in one action. Progress is saved on your device.
2. **Poke Genie, used narrowly.** Two sweeps (exact IV and Battle League rank) cover
   things in-game search cannot see. For those, and only those, use Poke Genie on the
   short, pre-filtered list the sweep hands you, then discard its data. Your keep
   decision lives in the game as a tag, so there is nothing to keep in sync.
3. **Query composer.** Click tokens to assemble your own combined search string and copy
   it in one click.
4. **Integrity check.** `!KEEP` and the negation of every reason tag should return the
   same Pokémon. Compare the counts in-game. A mismatch means a keeper is untagged and at
   risk. This is the guard against transferring something you meant to keep.
5. **Token reference.** The search grammar and trait tokens, with an honest note on which
   are confirmed in-game and which still need checking.

## A note on the tokens

The search tokens are recalled from memory and marked "unverified" until confirmed in
the game's own search box. Verify them as you go (`data.js` is the single place to
correct any of them). The `2016` catch-year token and the `xxl` / `xxs` size tokens are
the first ones worth double-checking.

## Running locally

No build step and no dependencies. Either open `index.html` directly in a browser, or
serve it (which keeps saved progress reliable across browsers):

```
npm start
```

Then visit http://localhost:8000.

## Tech

Vanilla HTML, CSS, and JavaScript. One data file (`data.js`) drives every view.

This project has been developed with AI assistance (Claude Code).
