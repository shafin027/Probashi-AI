"""End-to-end smoke test (webapp-testing skill pattern).

Run from probashi-ai/ after `npm run build`:
  python ../.claude/skills/webapp-testing/scripts/with_server.py \
    --server "npm run start -- -p 3100" --port 3100 -- python tests/e2e.py
"""

import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3100")
SHOTS = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SHOTS, exist_ok=True)
CHROMIUM = "/opt/pw-browsers/chromium"

errors = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        errors.append(msg)


with sync_playwright() as p:
    kwargs = {"headless": True}
    if os.path.exists(CHROMIUM):
        kwargs["executable_path"] = CHROMIUM
    try:
        browser = p.chromium.launch(**kwargs)
    except Exception:
        browser = p.chromium.launch(headless=True)

    for name, viewport in [("desktop", {"width": 1280, "height": 900}), ("mobile", {"width": 390, "height": 844})]:
        page = browser.new_page(viewport=viewport)
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
        # Count failed same-origin requests (external fonts may be blocked in CI sandboxes).
        page.on("response", lambda r: console_errors.append(f"{r.status} {r.url}") if r.status >= 400 and r.url.startswith(BASE) else None)

        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        check(page.locator("h1").first.is_visible(), f"[{name}] landing hero renders")
        check(page.locator("#watermark").is_visible() or page.locator("#watermark").count() == 1, f"[{name}] buildathon watermark present")
        check("Built for YUNet AIgnite Buildathon 2026" in page.content(), f"[{name}] watermark text present")
        check(page.locator("#why details").count() >= 6, f"[{name}] why-FAQ has answers")
        scroll_w = page.evaluate("document.documentElement.scrollWidth")
        check(scroll_w <= viewport["width"] + 1, f"[{name}] no horizontal scroll ({scroll_w}px)")
        page.screenshot(path=f"{SHOTS}/{name}-home.png", full_page=True)

        # Offer check with the sample scam offer
        page.goto(f"{BASE}/check")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="উদাহরণ").click()
        page.get_by_role("button", name="Check now").click()
        page.wait_for_selector("#result", timeout=90000)
        result_text = page.locator("#result").inner_text()
        check("বিপদ" in result_text, f"[{name}] sample scam is flagged as danger")
        check(page.locator(".flag-high").count() >= 2, f"[{name}] multiple high-severity flags shown")
        page.screenshot(path=f"{SHOTS}/{name}-check.png", full_page=True)

        # Agency lookup
        page.goto(f"{BASE}/agency")
        page.wait_for_load_state("networkidle")
        page.get_by_label("Agency name or RL number").fill("RL-1004")
        page.get_by_role("button", name="খুঁজুন").click()
        check(page.get_by_text("লাইসেন্স বাতিল").first.is_visible(), f"[{name}] cancelled agency is shown as cancelled")

        # Cost calculator
        page.goto(f"{BASE}/cost")
        page.wait_for_load_state("networkidle")
        check("৳78,990" in page.content(), f"[{name}] Malaysia official cost shown")
        page.screenshot(path=f"{SHOTS}/{name}-cost.png", full_page=True)

        # Ask (works offline without an API key)
        page.goto(f"{BASE}/ask")
        page.wait_for_load_state("networkidle")
        page.get_by_label("Your question").fill("পাসপোর্ট মালিক আটকে রেখেছে")
        page.get_by_role("button", name="পাঠান", exact=True).click()
        page.wait_for_function("document.querySelectorAll('.bubble-ai').length >= 2", timeout=90000)
        check("16135" in page.locator(".bubble-ai").last.inner_text(), f"[{name}] emergency answer includes helpline")
        page.screenshot(path=f"{SHOTS}/{name}-ask.png", full_page=True)

        page.goto(f"{BASE}/plan")
        page.wait_for_load_state("networkidle")
        check(page.get_by_text("Debt-free in").is_visible(), f"[{name}] money planner renders")

        check(not console_errors, f"[{name}] no console errors or failed requests {console_errors[:3]}")
        page.close()

    browser.close()

print(f"\n{len(errors)} failure(s)")
sys.exit(1 if errors else 0)
