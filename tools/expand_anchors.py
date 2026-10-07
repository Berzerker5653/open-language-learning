#!/usr/bin/env python3
"""Expand YAML anchors/aliases in language-pack files.

The handoff validator (tools/validate_handoff.py) rejects aliases by design
(handoff integrity rule). The ru-RU authoring batches emitted anchors for
compactness. This script rewrites ONLY files that use anchors/aliases, with
aliases resolved, verifying semantic equality (parsed object before ==
parsed object after). Files without aliases are left byte-identical.
"""
import json
import sys
from pathlib import Path

import yaml


class AliasDetectingLoader(yaml.SafeLoader):
    used_alias = False

    def compose_node(self, parent, index):
        if self.check_event(yaml.AliasEvent):
            self.used_alias = True
        return super().compose_node(parent, index)


changed = 0
failed = []
for p in sorted(Path("languages").rglob("*.yaml")) + sorted(Path("languages").rglob("*.yml")):
    text = p.read_text(encoding="utf-8")
    loader = AliasDetectingLoader(text)
    try:
        data = loader.get_single_data()
    except yaml.YAMLError as e:
        failed.append((p, f"load: {e}"))
        continue
    finally:
        loader.dispose()
    if not loader.used_alias:
        continue
    # safe_load aliases share one object; safe_dump would re-anchor it.
    # JSON round-trip de-aliases (pack YAML here is JSON-safe: str keys,
    # scalar/list/dict values).
    data = json.loads(json.dumps(data))
    out = yaml.safe_dump(
        data, allow_unicode=True, sort_keys=False, default_flow_style=False, width=100
    )
    if yaml.safe_load(out) != data:
        failed.append((p, "round-trip inequality"))
        continue
    p.write_text(out, encoding="utf-8")
    changed += 1
print(f"rewrote {changed} files")
for p, e in failed:
    print(f"FAIL {p}: {e}")
sys.exit(1 if failed else 0)
