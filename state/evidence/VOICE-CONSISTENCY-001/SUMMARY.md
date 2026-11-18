# VOICE-CONSISTENCY-001 — bake-time narrator guard: gate evidence (2026-11-18)

LTS repo @ main tree, run by the guard-implementation lane. Commands, exit codes, key lines.

| gate | command | exit | key lines |
|---|---|---|---|
| guard unit tests | `.venv/bin/python -m unittest scripts/test_voice_guard.py -v` | 0 | `Ran 12 tests ... OK` (see gates-guard.log) |
| rustfmt | `cargo fmt -p lts-langpack -- --check` | 0 | clean (empty log = complete -q output) |
| clippy | `cargo clippy -q -p lts-langpack --all-targets -- -D warnings` | 0 | clean (empty log = complete -q output) |
| media audit tests | `cargo test -q -p lts-langpack --test media` | 0 | `test result: ok. 17 passed; 0 failed` (includes new `narrator_sidecar_is_declared_data_not_an_unlisted_asset`) |

Iterated failures during implementation (both fixed, final runs above are clean):
- fmt: one assert_eq! needed rustfmt's multi-line form.
- clippy: `cloned_ref_to_slice_refs` on `&[declared.clone()]` -> `std::slice::from_ref(&declared)`.
- first media-test run failed: asserted the diagnostic's `path` field; `Diagnostic::new`'s
  first ctor arg lands in `.file` (path is the pointer, empty here) -> assert `.file`.

## CLI smoke (smoke-pack/, scratch pack — never the real ru pack)
1. Wrong-speaker sentence bake (`--tts qwen3 --speaker ryan`, pack declares ono_anna):
   `narrator-conflict xx.sent.demo.a1.b1.c1: media/narrator.json declares the pack narrator
   as {"runtime": "qwen3-tts", "voice": "ono_anna"}, but this run would write synthesizer
   {"runtime": "qwen3-tts", "voice": "ryan"}; refusing the row (VOICE-CONSISTENCY-001 ...)`
   Non-sentence target (`xx.lex.demo.word`) was NOT refused (proceeded to synthesis), as contracted.
2. Refused row carryover (`--only xx.sent.demo.a1.b1.c1`, pre-existing rows): run exited 1
   with `refused=1`, and `manifest.jsonl` rows verified semantically identical to the
   pre-run copy (`rows semantically identical: True`) — prior rows untouched, no synthesis, no wav writes.

## CI wiring
- scripts/ci.sh: `unittest discover -s scripts -p 'test_voice_guard.py'` added next to
  test_derive_kanji_radicals.py (verified discover run: `Ran 12 tests ... OK`; bash -n OK).
- .github/workflows/ci.yml schemas job: `- run: python scripts/test_voice_guard.py` added
  after test_generate_pack_audio.py.
