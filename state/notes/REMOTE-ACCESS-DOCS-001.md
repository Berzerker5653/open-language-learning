# REMOTE-ACCESS-DOCS-001 — notes

Contract: `state/notes/REMOTE-ACCESS-SURVEY-2026-11.md` (owner decision
2026-11-21). Docs-only card.

## Numbering decision

The card said `docs/19_REMOTE_ACCESS.md (next free number — verify)`. Verified:
19/20/21 are taken (`19_PROJECT_FILE_ARCHITECTURE`, `20_CONTRIBUTOR_REVIEW_PACKET`,
`21_HUMAN_REVIEW_RUNBOOKS`), so the guide ships as **`docs/22_REMOTE_ACCESS.md`**.

## Interface terms the guide commits to (shared with the wizard slice)

- Settings entry: **"Connect my phone"** (survey wording) showing the
  `https://<machine>.<tailnet>.ts.net/` serve URL.
- LAN fallback: local-network-access toggle + address + **pairing PIN**;
  plain-HTTP mic limitation stated in-app terms (capabilities honesty from
  WEB-SERVE-001 scope 4).
- `lts-serve` takes an explicit `host:port` (no hardcoded default) — the guide
  therefore says "the port the app shows" and keeps 8788 only as the dry-run
  example.
- DO-NOT box wording follows survey decision 3 (Cloudflare edge TLS = vendor
  sees plaintext; cert-transparency permanence; Funnel = public, no identity).

## Race note

WEB-SERVE-001's complete-but-uncommitted lane (lib.rs/packs.rs/App.tsx/
serve.rs/ipc.ts/bin/) stayed untouched and unstaged throughout; this lane is
markdown + ledger only, gates ran with that WIP in the tree.
