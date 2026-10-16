#!/usr/bin/env python3
"""Download Rocketbox human character assets for blender-realistic-people & apartment-vr-tour."""
import json
import os
import urllib.request
from pathlib import Path

REV = "0943055db6ec570bcef9f2c8b41c9e5467c808f9"
REPO = "microsoft/Microsoft-Rocketbox"
RAW = f"https://raw.githubusercontent.com/{REPO}/{REV}/"
TREE_URL = f"https://api.github.com/repos/{REPO}/git/trees/{REV}?recursive=1"

BASE_DIR = Path(__file__).resolve().parent
ASSET_ROOT = BASE_DIR / "rocketbox_assets"

MODELS = [
    "Female_Party_02",
    "Female_Adult_03",
    "Male_Adult_10",
    "Male_Adult_09",
]

MOTIONS = {
    "f_idle_neutral_02.max.fbx": "Assets/Animations/Female/idle_variations/f_idle_neutral_02.max.fbx",
    "m_idle_neutral_02.max.fbx": "Assets/Animations/Male/idle_variations/m_idle_neutral_02.max.fbx",
}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "fanverse-asset-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def main():
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    tree_cache = ASSET_ROOT / "_tree.json"
    if not tree_cache.exists():
        print("Fetching Microsoft-Rocketbox git tree...")
        tree_cache.write_bytes(get(TREE_URL))
    tree = json.loads(tree_cache.read_text(encoding="utf-8"))["tree"]
    paths = [t["path"] for t in tree if t["type"] == "blob"]

    for m in MODELS:
        fbx_Out = ASSET_ROOT / m / "Export" / f"{m}_facial.fbx"
        tex_dir = ASSET_ROOT / m / "Textures"
        fbx_Out.parent.mkdir(parents=True, exist_ok=True)
        tex_dir.mkdir(parents=True, exist_ok=True)

        if not fbx_Out.exists() or fbx_Out.stat().st_size == 0:
            hit = [p for p in paths if p.endswith(f"/{m}/Export/{m}_facial.fbx")]
            if not hit:
                raise RuntimeError(f"Could not find {m}_facial.fbx in repo tree")
            print(f"Downloading {m}_facial.fbx ...")
            fbx_Out.write_bytes(get(RAW + urllib.parse.quote(hit[0])))

        # Find all .tga textures for this model
        prefix = hit[0].rsplit("/Export/", 1)[0] + "/Textures/" if 'hit' in locals() and hit else None
        if not prefix:
            hit_any = [p for p in paths if f"/{m}/Textures/" in p]
            prefix = hit_any[0].rsplit("/Textures/", 1)[0] + "/Textures/"
        tgas = [p for p in paths if p.startswith(prefix) and p.lower().endswith(".tga")]
        for tga_path in tgas:
            fn = tga_path.rsplit("/", 1)[-1]
            dst = tex_dir / fn
            if not dst.exists() or dst.stat().st_size == 0:
                print(f"  texture {fn} ...")
                dst.write_bytes(get(RAW + urllib.parse.quote(tga_path)))

    motions_dir = ASSET_ROOT / "motions"
    motions_dir.mkdir(parents=True, exist_ok=True)
    for fn, rel in MOTIONS.items():
        dst = motions_dir / fn
        if not dst.exists() or dst.stat().st_size == 0:
            print(f"Downloading motion {fn} ...")
            dst.write_bytes(get(RAW + urllib.parse.quote(rel)))

    print("Rocketbox assets ready at:", ASSET_ROOT)


if __name__ == "__main__":
    main()
