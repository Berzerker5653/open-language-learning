#!/usr/bin/env python3
"""Deterministic CycloneDX 1.5 SBOM for the whole product (SEC-001).

Two ecosystems ship in one product, so one SBOM covers both:

  * Rust  - `cargo metadata` for the workspace (crates/* and apps/desktop/src-tauri).
            Registry packages carry the crates.io sha256 from `checksum`.
  * JS    - pnpm-lock.yaml at the repo root (v9, possibly several YAML documents).

The output is stable across runs: components are sorted, no random serial
number, and metadata.timestamp is omitted unless --timestamp or
SOURCE_DATE_EPOCH is provided. A stable SBOM is diffable in review, which is
the point of producing one.

Dev-only JS packages are flagged `cdx:js:dev` only where an importer records
them as devDependencies and no importer records them as a production
dependency; the lockfile says nothing about dev-ness of transitive-only
packages, and inventing that would be a guess. npm hashes come from the
lockfile `resolution.integrity` values.
"""

import argparse
import base64
import json
import subprocess
import sys
import tomllib
import uuid
from pathlib import Path

import yaml


REPO = Path(__file__).resolve().parent.parent
APP_NAME = "open-language-learning"


def workspace_version() -> str:
    text = (REPO / "Cargo.toml").read_text()
    for line in text.splitlines():
        if line.startswith("version ="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("no [workspace.package] version in Cargo.toml")


def cargo_components():
    meta = json.loads(
        subprocess.run(
            ["cargo", "metadata", "--format-version", "1"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
    )
    member_ids = set(meta["workspace_members"])
    # Modern cargo dropped `checksum` from metadata; Cargo.lock is the
    # authoritative source of crates.io sha256 values.
    lock = tomllib.loads((REPO / "Cargo.lock").read_text())
    checksums = {
        (p["name"], p["version"]): p["checksum"]
        for p in lock.get("package", [])
        if "checksum" in p
    }
    components = []
    for pkg in meta["packages"]:
        purl = f"pkg:cargo/{pkg['name']}@{pkg['version']}"
        component = {
            "bom-ref": purl,
            "type": "library",
            "name": pkg["name"],
            "version": pkg["version"],
            "purl": purl,
            "properties": [],
        }
        if pkg["id"] in member_ids:
            # First-party code ships with the product; it has no registry hash.
            component["scope"] = "internal"
            component["properties"].append(
                {"name": "cdx:rust:workspace-member", "value": "true"}
            )
        else:
            component["scope"] = "external"
            if pkg.get("license"):
                # CycloneDX `id` must be a single SPDX id; expressions such as
                # "MIT OR Apache-2.0" belong in `expression`.
                lic = pkg["license"]
                shape = {"id": lic} if " " not in lic else {"expression": lic}
                component["licenses"] = [{"license": shape}]
            checksum = checksums.get((pkg["name"], pkg["version"])) or pkg.get("checksum")
            if checksum:
                component["hashes"] = [{"alg": "SHA-256", "content": checksum}]
        components.append(component)
    return components


def split_pnpm_key(key: str):
    """`@scope/name@1.2.3(peer@9)` -> ('@scope/name', '1.2.3')."""
    key = key.split("(", 1)[0]
    at = key.rfind("@")
    if at <= 0:
        return key, ""
    return key[:at], key[at + 1 :]


def pnpm_components():
    lock = REPO / "pnpm-lock.yaml"
    if not lock.exists():
        raise SystemExit(f"missing lockfile: {lock}")
    docs = [d for d in yaml.safe_load_all(lock.read_text()) if isinstance(d, dict)]
    dev_keys = set()
    prod_keys = set()
    packages = {}
    local = {}
    for doc in docs:
        for path, importer in (doc.get("importers") or {}).items():
            for field, target in (("devDependencies", dev_keys), ("dependencies", prod_keys)):
                for key, entry in (importer.get(field) or {}).items():
                    resolved = (entry or {}).get("version", "")
                    if resolved:
                        target.add(split_pnpm_key(f"{key}@{resolved}"))
            if path != ".":
                manifest = REPO / path / "package.json"
                if manifest.exists():
                    data = json.loads(manifest.read_text())
                    local[data["name"]] = data.get("version", "")
        for key, entry in (doc.get("packages") or {}).items():
            name, version = split_pnpm_key(key)
            if not name or not version or version.startswith("link") or name in local:
                continue
            packages.setdefault((name, version), entry)
    components = []
    for name, version in sorted(local.items()):
        purl = f"pkg:npm/{name}@{version}"
        components.append(
            {
                "bom-ref": purl,
                "type": "library",
                "name": name,
                "version": version,
                "purl": purl,
                "scope": "internal",
                "properties": [{"name": "cdx:js:workspace-package", "value": "true"}],
            }
        )
    for (name, version), entry in sorted(packages.items()):
        purl = f"pkg:npm/{name}@{version}"
        component = {
            "bom-ref": purl,
            "type": "library",
            "name": name,
            "version": version,
            "purl": purl,
            "scope": "external",
            "properties": [],
        }
        # A package that is a production dependency anywhere stays required;
        # dev-ness of one workspace importer is not evidence about the product.
        if (name, version) in dev_keys and (name, version) not in prod_keys:
            component["scope"] = "optional"
            component["properties"].append({"name": "cdx:js:dev", "value": "true"})
        integrity = (entry or {}).get("resolution", {}).get("integrity")
        if integrity:
            alg, _, payload = integrity.partition("-")
            if alg and payload:
                component["hashes"] = [
                    {"alg": f"SHA-{alg[3:]}" if alg.startswith("sha") else alg.upper(),
                     "content": base64.b64decode(payload).hex()}
                ]
        if isinstance(entry, dict) and entry.get("license"):
            component["licenses"] = [{"license": {"id": entry["license"]}}]
        components.append(component)
    return components


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--output", default="dist/sbom/open-language-learning.cdx.json")
    ap.add_argument(
        "--timestamp",
        action="store_true",
        help="include metadata.timestamp (breaks byte-stable diffs)",
    )
    args = ap.parse_args()

    version = workspace_version()
    components = sorted(
        cargo_components() + pnpm_components(),
        key=lambda c: (c["purl"], c["name"], c["version"]),
    )
    refs = [c["bom-ref"] for c in components]
    if len(refs) != len(set(refs)):
        dupes = sorted({r for r in refs if refs.count(r) > 1})
        raise SystemExit(f"duplicate bom-refs: {dupes[:5]}")

    metadata = {
        "tools": [{"vendor": "Open Language Learning", "name": "tools/sbom.py", "version": "1.0"}],
        "component": {
            "bom-ref": f"pkg:generic/{APP_NAME}@{version}",
            "type": "application",
            "name": APP_NAME,
            "version": version,
            "purl": f"pkg:generic/{APP_NAME}@{version}",
        },
    }
    if args.timestamp:
        metadata["timestamp"] = subprocess.run(
            ["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"], check=True, capture_output=True, text=True
        ).stdout.strip()

    bom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": "urn:uuid:"
        + str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"pkg:generic/{APP_NAME}@{version}\n" + "\n".join(refs),
            )
        ),
        "version": 1,
        "metadata": metadata,
        "components": components,
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(bom, indent=2, sort_keys=True) + "\n")
    rust = sum(1 for c in components if c["purl"].startswith("pkg:cargo/"))
    npm = sum(1 for c in components if c["purl"].startswith("pkg:npm/"))
    first = sum(1 for c in components if c.get("scope") == "internal")
    print(
        f"{out}: {len(components)} components ({rust} cargo, {npm} npm, {first} first-party)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
