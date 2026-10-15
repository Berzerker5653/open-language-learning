# `tmp/venv-review` — what it is, before anyone deletes it

Inspected read-only on GamingPC, 2026-10-15. **Nothing was deleted, modified or
executed** from it beyond `pip freeze`, which writes no venv state.

## Facts

| question | measurement |
|---|---|
| size | 2.5 GiB total; `site-packages/tensorflow` alone is **2.1 GiB** (2.22.0rc0) |
| interpreter | `python3.14.7`, created by `/usr/bin/python3 -m venv /home/hunter/game-dev/LTS/tmp/venv-review` (see `pyvenv.cfg`) |
| editable / path-linked installs | none — the only `.pth` is the venv's own `distutils-precedence.pth` |
| package count | 41, pinned exactly in `state/evidence/VENV-REVIEW-2026-10-15/FREEZE.txt` (`navec==0.10.0`, `DAWG2-Python==0.9.0`, `h5py`, `keras`, `tensorflow==2.22.0rc0`, …) |
| git status | gitignored (`​.gitignore:86` covers `tmp/`), so it is absent from every clone and every CI run |
| is it referenced by tracked files? | **yes** — `docs/review/2026-10-05-external-pack-review.md:48-50` documents `tmp/venv-review/bin/python tmp/review.py`, `tmp/ja-deep.py`, `tmp/fix-ru-stress.py` as the reproduction path for that review's counts and findings |
| do those scripts still exist? | yes: `tmp/review.py` (6,035 B), `tmp/ja-deep.py` (3,532 B), `tmp/fix-ru-stress.py` (4,020 B), all dated 2026-10-05 — also gitignored |

## Why it is not simply disposable

1. A tracked review document names it as the environment that reproduces that
   document's numbers. Deleting the venv silently breaks the reproduction path
   the repo still cites.
2. `tmp/fix-ru-stress.py` is a **repair** script, not a read-only audit: the
   Russian stress data it touched has since been regenerated wholesale by the
   content-depth batch, so re-running it against today's tree is not a
   reproduction, it is a mutation. Nobody should run it to "check whether the
   venv is still needed".
3. It is the owner's scratch directory inside `tmp/`, and I have no
   authorization to delete owner files.

## Why it is safe to delete *if the owner chooses*

The freeze pins every version, so the environment is regenerable:

```
python3 -m venv tmp/venv-review
tmp/venv-review/bin/pip install -r state/evidence/VENV-REVIEW-2026-10-15/FREEZE.txt
```

The cost is a ~2.1 GiB TensorFlow download, and the scripts themselves would
still need to be preserved separately (they are not in git). If the owner wants
the review path kept without the disk cost, the honest move is to move the three
scripts into `tools/` or `scripts/` (where they become tracked, reviewable code)
and then delete the venv — that is a decision, not a cleanup I should make
unilaterally.
