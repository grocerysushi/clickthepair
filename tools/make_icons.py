#!/usr/bin/env python3
"""Draw the Click the Pair app icons (same design as the favicon) with Pillow.

Run once, or again if the logo changes:   python tools/make_icons.py
Writes favicon.ico and icons/*.png.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLUE, WHITE, YELLOW = (36, 86, 230, 255), (255, 255, 255, 255), (255, 183, 3, 255)
S = 1024  # draw large, then scale down for smooth edges


def logo(rounded=True, inset=0.0):
    """The two-tile logo on a 64-unit grid. inset shrinks the artwork toward the center."""
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if rounded:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 14 // 64, fill=BLUE)
    else:
        d.rectangle([0, 0, S - 1, S - 1], fill=BLUE)
    scale = S / 64 * (1 - inset)
    off = S * inset / 2
    u = lambda v: off + v * scale
    for x in (9, 35):
        d.rounded_rectangle([u(x), u(20), u(x + 20), u(44)], radius=6 * scale, fill=WHITE)
    for cx in (19, 45):
        d.ellipse([u(cx - 5), u(27), u(cx + 5), u(37)], fill=YELLOW)
    return im


def save(im, size, rel, flatten=False):
    out = im.resize((size, size), Image.LANCZOS)
    if flatten:                                   # iOS home-screen icons must not be transparent
        bg = Image.new('RGB', out.size, BLUE[:3])
        bg.paste(out, mask=out.split()[3])
        out = bg
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path, optimize=True)
    print('wrote', rel, out.size)


rounded = logo()
square = logo(rounded=False)
maskable = logo(rounded=False, inset=0.2)          # artwork inside the 80% safe zone

save(rounded, 192, 'icons/icon-192.png')
save(rounded, 512, 'icons/icon-512.png')
save(maskable, 512, 'icons/icon-maskable-512.png')
save(square, 180, 'icons/apple-touch-icon.png', flatten=True)
rounded.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
print('wrote favicon.ico')
