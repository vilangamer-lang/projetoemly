#!/usr/bin/env python3
"""Gera versoes transparentes da logo horizontal (slide 23).

A arte fonte e BRANCA sobre fundo azul solido #054464 (RGB sem alpha).
Para cada pixel, o alpha e a distancia normalizada da cor do pixel a cor
de fundo (un-blend de branco sobre o fundo, por canal, pegando o maximo).
A cor RGB de TODOS os pixels vira a tinta escolhida (branco puro ou
#054464), entao o antialias fica sem franja azul: so o alpha varia.

Saidas (em public/assets/brandbook/):
  - emlyn-logo-horizontal-white-transparent.png  (tinta branca)
  - emlyn-logo-horizontal-blue-transparent.png   (tinta #054464)

Ambas recortadas ao bounding box da arte + margem uniforme.
"""

import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BRANDBOOK = os.path.join(ROOT, "public", "assets", "brandbook")
SRC = os.path.join(BRANDBOOK, "emlyn-logo-horizontal-slide-23-blue.png")

BG = (5, 68, 100)  # #054464
MARGIN = 12  # px de respiro uniforme ao redor da arte

OUTPUTS = (
    ("emlyn-logo-horizontal-white-transparent.png", (255, 255, 255)),
    ("emlyn-logo-horizontal-blue-transparent.png", (5, 68, 100)),
)


def build_alpha(src: Image.Image) -> Image.Image:
    """Alpha por pixel = max por canal de (pixel - fundo) / (255 - fundo)."""
    width, height = src.size
    alpha = Image.new("L", (width, height), 0)
    src_px = src.load()
    alpha_px = alpha.load()
    scale = tuple(255.0 - c for c in BG)
    for y in range(height):
        for x in range(width):
            r, g, b = src_px[x, y][:3]
            a = max(
                (r - BG[0]) / scale[0],
                (g - BG[1]) / scale[1],
                (b - BG[2]) / scale[2],
            )
            if a <= 0.0:
                continue
            alpha_px[x, y] = min(255, round(a * 255.0))
    return alpha


def crop_box(alpha: Image.Image) -> tuple[int, int, int, int]:
    bbox = alpha.getbbox()
    if bbox is None:
        raise SystemExit("Nenhum pixel de arte encontrado (alpha todo zero).")
    left, top, right, bottom = bbox
    width, height = alpha.size
    return (
        max(0, left - MARGIN),
        max(0, top - MARGIN),
        min(width, right + MARGIN),
        min(height, bottom + MARGIN),
    )


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    alpha = build_alpha(src)
    box = crop_box(alpha)
    alpha_cropped = alpha.crop(box)

    print(f"fonte: {SRC} {src.mode} {src.size}")
    print(f"crop: bbox+{MARGIN}px -> {box} ({alpha_cropped.size[0]}x{alpha_cropped.size[1]})")

    for filename, ink in OUTPUTS:
        out = Image.new("RGBA", alpha_cropped.size, ink + (0,))
        out.putalpha(alpha_cropped)
        path = os.path.join(BRANDBOOK, filename)
        out.save(path)

        check = Image.open(path)
        alpha_min, alpha_max = check.getchannel("A").getextrema()
        print(
            f"{filename}: mode={check.mode} size={check.size[0]}x{check.size[1]} "
            f"alpha_min={alpha_min} alpha_max={alpha_max} ink=rgb{ink}"
        )


if __name__ == "__main__":
    main()
