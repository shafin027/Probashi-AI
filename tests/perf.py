"""Low-end phone performance check: 4x CPU slowdown + slow 4G, mobile viewport.

Reports JS transferred, LCP, CLS and long-task blocking time for key pages and
fails if the budget is exceeded. Run via: npm run test:perf
"""

import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3300")
PAGES = ["/", "/check", "/journey", "/ask"]
BUDGET = {"js_kb": 450, "lcp_ms": 4000, "cls": 0.1, "tbt_ms": 900}
CHROMIUM = "/opt/pw-browsers/chromium"

OBSERVERS = """
window.__perf = { lcp: 0, cls: 0, tbt: 0 };
new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.tbt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
"""

results, failures = {}, []
with sync_playwright() as p:
    kwargs = {"headless": True}
    if os.path.exists(CHROMIUM):
        kwargs["executable_path"] = CHROMIUM
    browser = p.chromium.launch(**kwargs)
    for path in PAGES:
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        cdp = ctx.new_cdp_session(page)
        cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 1.6 * 1024 * 1024 / 8, "uploadThroughput": 750 * 1024 / 8})
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        js_bytes = {"n": 0}
        req_types = {}
        cdp.on("Network.responseReceived", lambda e: req_types.__setitem__(e["requestId"], e["type"]))
        cdp.on("Network.loadingFinished", lambda e: js_bytes.__setitem__("n", js_bytes["n"] + (e["encodedDataLength"] if req_types.get(e["requestId"]) == "Script" else 0)))
        page.add_init_script(OBSERVERS)
        page.goto(BASE + path, wait_until="load")
        page.wait_for_timeout(2500)
        page.mouse.wheel(0, 1200)  # scroll to surface layout shifts from reveals
        page.wait_for_timeout(1200)
        perf = page.evaluate("window.__perf")
        r = {"js_kb": round(js_bytes["n"] / 1024), "lcp_ms": round(perf["lcp"]), "cls": round(perf["cls"], 3), "tbt_ms": round(perf["tbt"])}
        results[path] = r
        for k, limit in BUDGET.items():
            if r[k] > limit:
                failures.append(f"{path} {k}={r[k]} > {limit}")
        ctx.close()
    browser.close()

print(json.dumps(results, indent=2))
out = os.environ.get("PERF_OUT")
if out:
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
print("budget:", BUDGET)
print("FAIL " + "; ".join(failures) if failures else "PASS all pages within budget")
sys.exit(1 if failures else 0)
