#!/usr/bin/env python3
"""Draw simple toolbar icons with the standard library."""

import struct
import zlib
from pathlib import Path

PAPER = (243, 236, 223, 255)
SEAL = (141, 59, 49, 255)
CREAM = (255, 250, 244, 255)


def write_png(path: Path, size: int) -> None:
    pixels = bytearray(size * size * 4)
    radius = size * 0.22
    cx = cy = (size - 1) / 2
    outer = size * 0.34
    inner = size * 0.16

    def put(x: int, y: int, color: tuple[int, int, int, int]) -> None:
        index = (y * size + x) * 4
        pixels[index : index + 4] = bytes(color)

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            # Rounded square.
            ax = abs(dx) - (size / 2 - radius)
            ay = abs(dy) - (size / 2 - radius)
            corner = max(ax, 0) ** 2 + max(ay, 0) ** 2
            if ax > 0 and ay > 0 and corner > radius * radius:
                continue
            dist = (dx * dx + dy * dy) ** 0.5
            if inner < dist <= outer:
                put(x, y, SEAL)
            elif dist <= inner:
                put(x, y, CREAM)
            else:
                put(x, y, PAPER)

    raw = b"".join(b"\x00" + pixels[y * size * 4 : (y + 1) * size * 4] for y in range(size))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    out = Path(__file__).resolve().parents[1] / "public" / "icons"
    out.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        write_png(out / f"icon{size}.png", size)


if __name__ == "__main__":
    main()
