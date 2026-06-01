"""Generate Android mipmap icons from assets/app-icon.png."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "app-icon.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

LAUNCHER = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

FOREGROUND = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def resize(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source icon: {SRC}")

    img = Image.open(SRC).convert("RGBA")

    for folder, size in LAUNCHER.items():
        out = RES / folder
        out.mkdir(parents=True, exist_ok=True)
        icon = resize(img, size)
        icon.save(out / "ic_launcher.png", "PNG")
        icon.save(out / "ic_launcher_round.png", "PNG")

    for folder, size in FOREGROUND.items():
        out = RES / folder
        out.mkdir(parents=True, exist_ok=True)
        resize(img, size).save(out / "ic_launcher_foreground.png", "PNG")

    print("Android icons generated.")


if __name__ == "__main__":
    main()
