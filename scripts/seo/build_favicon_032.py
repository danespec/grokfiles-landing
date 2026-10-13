#!/usr/bin/env python3
"""GAH-SEO-032: deterministic 48/96px favicon using the site's existing colors.

No third-party font, image service, network, or new customer/private evidence.
The three-letter glyph reflects the existing text-only site header brand.
"""
import argparse
import struct
from pathlib import Path
import zlib

COLORS = {"background": (10, 77, 87, 255), "foreground": (255, 255, 255, 255)}
GLYPHS = {
    "G": ("01111","10000","10000","10111","10001","10001","01110"),
    "A": ("01110","10001","10001","11111","10001","10001","10001"),
    "H": ("10001","10001","10001","11111","10001","10001","10001"),
}

def png_chunk(name, data):
    body = name + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xffffffff)

def pixels(size):
    assert size in (48,96)
    # Three 5px glyphs plus 1px spaces; centered with human-readable headroom.
    grid = [[COLORS["background"] for _ in range(size)] for _ in range(size)]
    scale = size // 24
    glyphw = 5 * scale
    gap = scale
    width = 3 * glyphw + 2 * gap
    left = (size - width) // 2
    top = (size - 7 * scale) // 2
    for i, ch in enumerate("GAH"):
        for y, row in enumerate(GLYPHS[ch]):
            for x, pixel in enumerate(row):
                if pixel != "1":
                    continue
                cx,cy = left + i * (glyphw + gap) + x * scale,top+y*scale
                for py in range(cy,cy+scale):
                    for px in range(cx,cx+scale):
                        grid[py][px] = COLORS["foreground"]
    # Small rounded corners, with same shade as page background.
    radius = size // 8
    for y in range(size):
        for x in range(size):
            if x<radius and y<radius and (x-radius+1)**2+(y-radius+1)**2>radius**2:
                grid[y][x]=(244,247,249,0)
            elif x>=size-radius and y<radius and (x-(size-radius))**2+(y-radius+1)**2>radius**2:
                grid[y][x]=(244,247,249,0)
            elif x<radius and y>=size-radius and (x-radius+1)**2+(y-(size-radius))**2>radius**2:
                grid[y][x]=(244,247,249,0)
            elif x>=size-radius and y>=size-radius and (x-(size-radius))**2+(y-(size-radius))**2>radius**2:
                grid[y][x]=(244,247,249,0)
    return grid

def png(size):
    raw = b"".join(b"\x00"+b"".join(bytes(pixel) for pixel in row) for row in pixels(size))
    return (b"\x89PNG\r\n\x1a\n" +
       png_chunk(b"IHDR",struct.pack(">IIBBBBB",size,size,8,6,0,0,0)) +
       png_chunk(b"IDAT",zlib.compress(raw,level=9)) +
       png_chunk(b"IEND",b""))

def ico():
    entries=[(size,png(size)) for size in (48,96)]
    offset=6+16*len(entries)
    header=struct.pack("<HHH",0,1,len(entries))
    images=[]
    for size,blob in entries:
        header+=struct.pack("<BBBBHHII",size,size,0,0,1,32,len(blob),offset)
        offset+=len(blob)
        images.append(blob)
    return header+b"".join(images)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",default="favicon.ico")
    args=parser.parse_args()
    out=Path(args.output)
    assert out.name=="favicon.ico"
    out.write_bytes(ico())
    print("GAH-SEO-032 icon bytes",out.stat().st_size)
