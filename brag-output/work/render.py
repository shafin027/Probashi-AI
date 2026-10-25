"""Renders compose.html frame by frame (every frame a pure function of time).

Usage: python3 render.py [--stills] [--fps 30] [--size 1920x1080]
  --stills   only write review stills (scene midpoints and mid-transitions)
"""

import os
import sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
DURATION = 21.6
W, H = 1920, 1080
stills_only = "--stills" in sys.argv

# scene holds + transitions (seconds), for review before the full render
STILLS = [1.2, 2.9, 3.6, 5.4, 6.05, 8.2, 12.6, 13.2, 15.6, 16.25, 18.2, 18.7, 21.0]

out_dir = os.path.join(HERE, "stills" if stills_only else "frames")
os.makedirs(out_dir, exist_ok=True)

with sync_playwright() as p:
    exe = "/opt/pw-browsers/chromium"
    browser = p.chromium.launch(**({"executable_path": exe} if os.path.exists(exe) else {}))
    page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
    page.goto("file://" + os.path.join(HERE, "compose.html"))
    page.wait_for_function("window.__ready === true", timeout=30000)
    times = STILLS if stills_only else [i / FPS for i in range(int(round(DURATION * FPS)))]
    for i, t in enumerate(times):
        page.evaluate(f"window.renderAt({t})")
        name = f"t{t:05.2f}.png" if stills_only else f"{i:04d}.png"
        page.screenshot(path=os.path.join(out_dir, name))
        if not stills_only and i % 60 == 0:
            print(f"frame {i}/{len(times)}", flush=True)
    browser.close()
print("done", len(times), "images in", out_dir)
