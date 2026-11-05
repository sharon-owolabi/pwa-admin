#!/usr/bin/env python3
"""
Draws the PWA icons from the brand icon (public/brand/fusion-icon.png) on the
page background colour. Run once, commit the PNGs:

    python3 scripts/generate-pwa-icons.py

The source is 76x84, so large icons are upscaled and a little soft; replace
public/brand/fusion-icon.png with a bigger master and re-run for crisper ones.
"""
from PIL import Image

BACKGROUND = (243, 240, 239, 255)  # --fx-bg, light: #f3f0ef
SOURCE = Image.open("public/brand/fusion-icon.png").convert("RGBA")


def draw(size: int, fill: float, path: str) -> None:
    """A size x size icon with the logo `fill` of the height, centred."""
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    h = round(size * fill)
    w = round(h * SOURCE.width / SOURCE.height)
    logo = SOURCE.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(logo, ((size - w) // 2, (size - h) // 2))
    canvas.convert("RGB").save(path, optimize=True)
    print(path, size)


draw(192, 0.62, "public/icons/icon-192.png")
draw(512, 0.62, "public/icons/icon-512.png")
# Maskable: the platform crops to a circle or squircle, so keep the logo inside the central safe zone.
draw(512, 0.46, "public/icons/icon-maskable-512.png")
draw(180, 0.62, "public/icons/apple-touch-icon.png")
