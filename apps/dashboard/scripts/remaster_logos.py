#!/usr/bin/env python3
"""
Remasterización de logos institucionales UTA / FISEI.

- Los logos UTA son monocromos (azul institucional sobre blanco): se reconstruye
  un canal alfa real a partir de la luminancia, se amplía x4 con Lanczos y se
  aplica un realce de bordes suave. Se generan variantes azul y blanca (para
  fondos oscuros) y una versión vectorial SVG (potrace).
- El escudo FISEI tiene blancos internos que forman parte del diseño: solo se
  elimina el fondo exterior mediante relleno por inundación desde los bordes.

Uso:
    pip install pillow opencv-python-headless numpy potracer
    python scripts/remaster_logos.py ../Logos public/brand
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

UTA_BLUE = (0, 51, 102)  # #003366
SCALE = 4


def upscale_gray(gray: np.ndarray, scale: int = SCALE) -> np.ndarray:
    h, w = gray.shape
    big = cv2.resize(gray, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    # Suavizado preservando bordes + unsharp mask para nitidez
    big = cv2.bilateralFilter(big, 7, 40, 7)
    blur = cv2.GaussianBlur(big, (0, 0), 2.2)
    big = cv2.addWeighted(big, 1.6, blur, -0.6, 0)
    return np.clip(big, 0, 255).astype(np.uint8)


def ink_alpha(gray: np.ndarray) -> np.ndarray:
    """Convierte luminancia en opacidad de 'tinta' con curva de contraste."""
    ink = 255.0 - gray.astype(np.float32)
    lo, hi = 18.0, 150.0  # todo lo más claro que lo es fondo; más oscuro que hi es tinta plena
    a = np.clip((ink - lo) / (hi - lo), 0, 1)
    a = a * a * (3 - 2 * a)  # smoothstep para bordes limpios
    return (a * 255).astype(np.uint8)


def colorize(alpha: np.ndarray, rgb: tuple[int, int, int]) -> Image.Image:
    h, w = alpha.shape
    out = np.zeros((h, w, 4), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = rgb
    out[..., 3] = alpha
    return Image.fromarray(out, "RGBA")


MAX_SIDE = 1200


def trim(img: Image.Image, pad: int = 8) -> Image.Image:
    img = _trim(img, pad)
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return img


def _trim(img: Image.Image, pad: int) -> Image.Image:
    bbox = img.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    return img.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, img.width), min(b + pad, img.height)))


def to_svg(alpha: np.ndarray, color_hex: str, out: Path) -> None:
    try:
        import potrace  # potracer
    except ImportError:
        print("  (potracer no instalado; se omite SVG)")
        return
    bitmap = potrace.Bitmap(alpha > 110)
    paths = bitmap.trace(turdsize=4, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                         alphamax=1.0, opticurve=True, opttolerance=0.2)
    h, w = alpha.shape
    parts = []
    for curve in paths:
        sp = curve.start_point
        d = [f"M{sp.x:.2f},{sp.y:.2f}"]
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{seg.c.x:.2f},{seg.c.y:.2f}L{seg.end_point.x:.2f},{seg.end_point.y:.2f}")
            else:
                d.append(f"C{seg.c1.x:.2f},{seg.c1.y:.2f} {seg.c2.x:.2f},{seg.c2.y:.2f} "
                         f"{seg.end_point.x:.2f},{seg.end_point.y:.2f}")
        d.append("Z")
        parts.append("".join(d))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="{color_hex}" '
           f'fill-rule="evenodd"><path d="{" ".join(parts)}"/></svg>')
    out.write_text(svg, encoding="utf-8")


def process_mono(src: Path, dst_dir: Path, name: str) -> None:
    im = Image.open(src).convert("RGBA")
    flat = Image.new("RGBA", im.size, (255, 255, 255, 255))
    flat.alpha_composite(im)  # los píxeles transparentes pasan a ser fondo blanco
    gray = np.array(flat.convert("L"))
    big = upscale_gray(gray)
    alpha = ink_alpha(big)
    blue = trim(colorize(alpha, UTA_BLUE))
    white = trim(colorize(alpha, (255, 255, 255)))
    blue.save(dst_dir / f"{name}.png", optimize=True)
    white.save(dst_dir / f"{name}-white.png", optimize=True)
    to_svg(np.array(blue.getchannel("A")), "#003366", dst_dir / f"{name}.svg")
    print(f"  {name}: {gray.shape[::-1]} -> {blue.size}")


def process_fisei(src: Path, dst_dir: Path, name: str) -> None:
    rgb = np.array(Image.open(src).convert("RGB"))
    h, w = rgb.shape[:2]
    big = cv2.resize(rgb, (w * SCALE, h * SCALE), interpolation=cv2.INTER_LANCZOS4)
    big = cv2.bilateralFilter(big, 7, 35, 7)
    blur = cv2.GaussianBlur(big, (0, 0), 2.0)
    big = np.clip(cv2.addWeighted(big, 1.5, blur, -0.5, 0), 0, 255).astype(np.uint8)

    # Máscara de "casi blanco" y relleno por inundación desde los bordes => fondo exterior
    nearly_white = (big.min(axis=2) > 225).astype(np.uint8)
    n, labels = cv2.connectedComponents(nearly_white, connectivity=4)
    border = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    background = np.isin(labels, list(border))
    # Bordes suaves: alfa graduado según distancia al fondo
    dist = cv2.distanceTransform((~background).astype(np.uint8), cv2.DIST_L2, 5)
    alpha = np.clip(dist / 2.5, 0, 1)
    whiteness = (big.astype(np.float32).min(axis=2) - 200) / 55
    alpha = np.where(dist < 3, alpha * (1 - np.clip(whiteness, 0, 1)) + alpha * 0.0, alpha)
    rgba = np.dstack([big, (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])
    img = trim(Image.fromarray(rgba, "RGBA").filter(ImageFilter.UnsharpMask(1.2, 60, 2)))
    img.save(dst_dir / f"{name}.png", optimize=True)
    print(f"  {name}: {(w, h)} -> {img.size}")


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "../Logos")
    dst = Path(sys.argv[2] if len(sys.argv) > 2 else "public/brand")
    dst.mkdir(parents=True, exist_ok=True)
    print("Remasterizando logos…")
    process_mono(src / "uta.jpg", dst, "uta-seal")
    process_mono(src / "NlogUTA_Mesa-de-trabajo-1-448x169.png", dst, "uta-horizontal")
    process_fisei(src / "fisei uta.jpg", dst, "fisei-seal")
    print("Listo ->", dst.resolve())


if __name__ == "__main__":
    main()
