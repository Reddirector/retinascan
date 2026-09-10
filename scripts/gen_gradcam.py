#!/usr/bin/env python3
"""Generate synthetic Grad-CAM heatmap PNGs for the RetinaScan demo.

Each PNG is a 256x192 RGBA jet-colormap heatmap with soft gaussian blobs
centered on "lesion" regions. Higher intensity = stronger model attention.
- eyescan1 (No DR): faint uniform low attention, no hot spots.
- eyescan2 (Moderate NPDR): medium blobs for microaneurysms/hemorrhages.
- eyescan3 (Proliferative): intense blobs + neovascularization cluster.
"""
import struct, zlib, math, random

W, H = 256, 192

def jet(t):
    """Map t in [0,1] to a jet-colormap RGBA tuple (blue->cyan->yellow->red)."""
    t = max(0.0, min(1.0, t))
    r = max(0.0, min(1.0, 1.5 - abs(4.0 * t - 3.0)))
    g = max(0.0, min(1.0, 1.5 - abs(4.0 * t - 2.0)))
    b = max(0.0, min(1.0, 1.5 - abs(4.0 * t - 1.0)))
    return (int(r * 255), int(g * 255), int(b * 255))

def blob(cx, cy, sigma, peak):
    """Return a function adding a gaussian blob to a field."""
    def add(field):
        for y in range(H):
            for x in range(W):
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                v = peak * math.exp(-d2 / (2 * sigma * sigma))
                if v > field[y * W + x]:
                    field[y * W + x] = v
    return add

def write_png(path, field, alpha_max=0.62):
    raw = b""
    for y in range(H):
        raw += b"\x00"  # filter: none
        for x in range(W):
            t = field[y * W + x]
            r, g, b = jet(t)
            a = int(255 * alpha_max * (t ** 0.8)) if t > 0.04 else 0
            raw += struct.pack("BBBB", r, g, b, a)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path)

def base_field(floor):
    return [floor + random.random() * 0.05 for _ in range(W * H)]

random.seed(42)

# eyescan1 — No DR: very faint, even attention
f1 = base_field(0.10)
write_png("public/assets/gradcam/gradcam_eyescan1.png", f1)

# eyescan2 — Moderate NPDR: several medium lesion blobs (microaneurysms,
# hemorrhages, exudates) scattered mid-periphery
f2 = base_field(0.14)
blobs2 = [
    (88, 78, 10, 0.72), (150, 96, 8, 0.64), (118, 132, 12, 0.58),
    (172, 128, 7, 0.66), (96, 118, 6, 0.52), (140, 64, 6, 0.5),
]
for cx, cy, s, p in blobs2:
    blob(cx, cy, s, p)(f2)
# subtle optic-disc ring attention
blob(128, 96, 26, 0.34)(f2)
write_png("public/assets/gradcam/gradcam_eyescan2.png", f2)

# eyescan3 — Proliferative: intense hot cluster + neovascularization streaks
f3 = base_field(0.16)
blobs3 = [
    (112, 84, 16, 0.95), (168, 118, 13, 0.9), (86, 128, 11, 0.82),
    (148, 66, 9, 0.78), (190, 88, 8, 0.7), (128, 148, 10, 0.74),
    (64, 92, 7, 0.6),
]
for cx, cy, s, p in blobs3:
    blob(cx, cy, s, p)(f3)
blob(128, 96, 30, 0.5)(f3)  # disc involvement
write_png("public/assets/gradcam/gradcam_eyescan3.png", f3)

print("done")
