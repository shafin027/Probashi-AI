"""Browser end-to-end tests (webapp-testing skill pattern), desktop + mobile.

Run: npm run test:e2e   (starts mock AI + app via with_server.py)
Covers: landing/watermark/layout, mobile menu, offer check with a real image upload
(OCR path), paid report unlock, sign-up, chat with suggestion chips and memory,
natural voice (fake microphone -> STT, TTS playback), account deletion, and
fails on any CSP violation or console error.
"""

import json
import os
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3300")
NO_AI = os.environ.get("NO_AI_URL", "http://localhost:3301")
HERE = os.path.dirname(os.path.abspath(__file__))
AXE = os.path.join(HERE, "..", "node_modules", "axe-core", "axe.min.js")
PAGES = ["/", "/check", "/cost", "/agency", "/ask", "/plan", "/quiz", "/journey", "/login", "/privacy", "/about"]

# Ground truth for the quiz, read from the app's own data (not from the page).
SCENARIOS = json.loads(subprocess.check_output(
    ["node", "--experimental-strip-types", "--no-warnings", "-e", "import('./lib/quiz.ts').then(m=>console.log(JSON.stringify(m.SCENARIOS)))"],
    cwd=os.path.join(HERE, ".."),
))
SCAM_BY_TEXT = {s["bn"]: s["scam"] for s in SCENARIOS}
SHOTS = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SHOTS, exist_ok=True)
CHROMIUM = "/opt/pw-browsers/chromium"

errors = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        errors.append(msg)


def make_offer_letter(path):
    """Render a realistic offer letter photo to upload (exercises cloud and on-device OCR)."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (1400, 900), "white")
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    lines = [
        "AL NOOR CLEANING CO. - RIYADH, KINGDOM OF SAUDI ARABIA",
        "EMPLOYMENT OFFER LETTER",
        "Name: Md. Rahim Uddin   Passport: A01234567",
        "Position: Cleaner        Monthly salary: SAR 1200",
        "Contract: 24 months      Visa type: Work (Iqama by employer)",
        "Recruiting agent fee payable in Bangladesh: BDT 650,000",
        "Visa: FREE VISA - no sponsor needed, pay advance to Mr. Kalam",
    ]
    for i, line in enumerate(lines):
        d.text((50, 70 + i * 105), line, fill="black", font=font)
    img.save(path)


def axe_scan(browser, viewport, label):
    """WCAG 2.2 AA scan of every page with axe-core (accessibility skill). CSP bypass is for the injected scanner only."""
    ctx = browser.new_context(viewport=viewport, bypass_csp=True)
    page = ctx.new_page()
    for path in PAGES:
        page.goto(BASE + path)
        page.wait_for_load_state("networkidle")
        page.add_script_tag(path=AXE)
        res = page.evaluate("""async () => {
          const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } });
          return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes[0]?.target?.join(' ') }));
        }""")
        check(not res, f"[{label}] axe WCAG AA: no serious/critical issues on {path} {res[:3]}")
    ctx.close()


with sync_playwright() as p:
    args = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"]
    kwargs = {"headless": True, "args": args}
    if os.path.exists(CHROMIUM):
        kwargs["executable_path"] = CHROMIUM
    browser = p.chromium.launch(**kwargs)
    letter = os.path.join(SHOTS, "offer-letter.png")
    make_offer_letter(letter)

    for name, viewport in [("desktop", {"width": 1280, "height": 900}), ("mobile", {"width": 390, "height": 844})]:
        axe_scan(browser, viewport, name)
        ctx = browser.new_context(viewport=viewport, permissions=["microphone"])
        page = ctx.new_page()
        problems = []
        page.on("console", lambda m: problems.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: problems.append(f"pageerror: {e}"))
        page.on("response", lambda r: problems.append(f"{r.status} {r.url}") if r.status >= 500 and r.url.startswith(BASE) else None)
        api_calls = []
        page.on("request", lambda r: api_calls.append(r.url.replace(BASE, "")) if "/api/" in r.url else None)

        # ---------- Landing ----------
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        check(page.locator("h1").first.is_visible(), f"[{name}] hero renders")
        check("Built for YUNet AIgnite Buildathon 2026" in page.content(), f"[{name}] buildathon watermark present")
        check(page.locator("#why details").count() >= 6, f"[{name}] why-FAQ answers present")
        check(page.evaluate("document.documentElement.scrollWidth") <= viewport["width"] + 1, f"[{name}] no horizontal scroll on landing")
        imgs_without_alt = page.evaluate("[...document.images].filter(i => !i.alt).length")
        check(imgs_without_alt == 0, f"[{name}] all images have alt text")
        if name == "mobile":
            menu = page.get_by_role("button", name="Menu")
            check(menu.is_visible(), "[mobile] menu button visible")
            menu.click()
            check(page.locator("#main-nav").is_visible(), "[mobile] menu opens")
            page.locator("#main-nav").get_by_text("প্রশ্ন করুন").click()
            page.wait_for_url("**/ask")
            page.wait_for_selector("#main-nav.open", state="detached", timeout=5000)
            check(not page.locator("#main-nav").is_visible(), "[mobile] menu closes after navigation")
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=f"{SHOTS}/{name}-home.png", full_page=True)

        # ---------- Sign up ----------
        phone = "019" + str(int(time.time() * 1000))[-8:]
        page.goto(f"{BASE}/login")
        page.wait_for_load_state("networkidle")
        page.get_by_role("tab", name="Sign up").click()
        page.get_by_label("আপনার নাম · Name").fill("Rahim Uddin")
        page.get_by_label("মোবাইল নম্বর · Mobile").fill(phone)
        page.locator("#password").fill("Probash!2026")
        page.get_by_role("button", name="অ্যাকাউন্ট খুলুন").click()
        page.wait_for_url("**/ask", timeout=20000)
        page.wait_for_load_state("networkidle")
        check(page.get_by_text("আবার স্বাগতম, Rahim").is_visible(), f"[{name}] signed up and greeted by name")
        cookies = {c["name"]: c for c in ctx.cookies()}
        sess = cookies.get("__Host-pa_session")
        check(bool(sess) and sess["httpOnly"] and sess["secure"], f"[{name}] session cookie is HttpOnly + Secure")
        check(page.evaluate("document.cookie").find("pa_session") == -1, f"[{name}] session cookie not readable by JavaScript")

        # ---------- Offer check with real image upload ----------
        page.goto(f"{BASE}/check")
        page.wait_for_load_state("networkidle")
        page.locator("#doc").set_input_files(letter)
        page.wait_for_selector("img[alt='Uploaded document']")
        page.get_by_label("কত টাকা চাইছে? (৳)").fill("650000")
        page.get_by_role("button", name="Check now").click()
        page.wait_for_selector("#result", timeout=60000)
        page.wait_for_timeout(600)
        check(page.locator(".toast").count() == 0, f"[{name}] no celebration while showing a danger verdict (ethics)")
        focused = page.evaluate("document.activeElement && document.activeElement.id")
        check(focused == "verdict-title", f"[{name}] focus moves to the verdict for screen readers ({focused})")
        unlock_bg = page.get_by_role("button", name="Get full report").evaluate("e => getComputedStyle(e).backgroundColor")
        check(unlock_bg in ("rgba(0, 0, 0, 0)", "transparent"), f"[{name}] paid upsell is a calm secondary button, not red ({unlock_bg})")
        result = page.locator("#result").inner_text()
        check("বিপদ" in result, f"[{name}] uploaded offer flagged as danger")
        check("AI document reading" in result, f"[{name}] AI read the uploaded document")
        check("Al Noor Cleaning Co." in result, f"[{name}] employer extracted from document")
        check("SECRET_NEGOTIATION_SCRIPT" not in page.content(), f"[{name}] paid content not in page before payment")
        page.screenshot(path=f"{SHOTS}/{name}-check.png", full_page=True)
        page.get_by_role("button", name="Get full report").click()
        page.get_by_label("মোবাইল নম্বর").fill("01712345678")
        page.get_by_role("button", name="Pay ৳299 (demo)").click()
        page.wait_for_selector("text=SECRET_NEGOTIATION_SCRIPT", timeout=15000)
        check(True, f"[{name}] paid report unlocks after checkout")
        saved = page.evaluate("localStorage.getItem('pa-journey-v1') || ''")
        check("checked_offer" in saved, f"[{name}] checking an offer completes the first milestone")

        # ---------- Chat: memory + suggestions ----------
        page.goto(f"{BASE}/ask")
        page.wait_for_load_state("networkidle")
        page.get_by_label("Your question").fill("আমার সৌদি অফারটা নিয়ে আর কী জানা দরকার?")
        page.get_by_role("button", name="পাঠান", exact=True).click()
        page.wait_for_selector(".bubble-ai >> text=MEMORY_USED", timeout=30000)
        check(page.locator(".memory-pill").first.is_visible(), f"[{name}] answer personalised from memory (vector recall)")
        chips = page.locator(".chip")
        check(chips.count() == 3, f"[{name}] 3 follow-up suggestions shown")
        before = page.locator(".bubble-ai").count()
        chips.first.click()
        page.wait_for_function(f"document.querySelectorAll('.bubble-ai').length > {before}", timeout=30000)
        check(True, f"[{name}] clicking a suggestion continues the conversation")

        # ---------- Natural voice ----------
        mic = page.get_by_role("button", name="Speak in Bangla")
        check(mic.is_visible(), f"[{name}] mic button visible (natural voice)")
        mic.click()
        page.wait_for_selector("text=থামান", timeout=5000)
        page.wait_for_timeout(2200)
        page.get_by_role("button", name="Stop recording").click()
        page.wait_for_selector(".bubble-user >> text=ফ্রি ভিসার অফার", timeout=30000)
        check("/api/voice/stt" in api_calls, f"[{name}] recording transcribed by server STT")
        with page.expect_response(lambda r: "/api/voice/tts" in r.url, timeout=30000) as tts:
            page.get_by_role("button", name="Read aloud").last.click()
        check(tts.value.status == 200 and tts.value.headers.get("content-type") == "audio/mpeg", f"[{name}] natural TTS audio returned")
        page.screenshot(path=f"{SHOTS}/{name}-ask.png", full_page=True)

        # ---------- Other pages ----------
        for path, marker in [("/cost", "৳78,990"), ("/agency", "Demo directory"), ("/plan", "Debt-free in"), ("/privacy", "How it is protected"), ("/about", "Business model with checks and balances")]:
            page.goto(f"{BASE}{path}")
            page.wait_for_load_state("networkidle")
            check(marker in page.content(), f"[{name}] {path} renders")
            check(page.evaluate("document.documentElement.scrollWidth") <= viewport["width"] + 1, f"[{name}] no horizontal scroll on {path}")

        # ---------- Gamification: journey + quiz + manual step ----------
        page.goto(f"{BASE}/journey")
        page.wait_for_load_state("networkidle")
        check(page.locator(".milestone.done").count() >= 2, f"[{name}] completed milestones shown on journey")
        start_pts = int(page.locator(".ring.lg").get_attribute("data-score"))
        check(start_pts >= 20, f"[{name}] readiness points earned from real actions ({start_pts})")
        page.goto(f"{BASE}/quiz")
        page.wait_for_selector(".quiz-q")
        prev = ""
        for _ in range(6):
            for _ in range(60):  # poll: the strict CSP forbids eval-based waits
                if page.locator(".quiz-q").count() == 1 and page.locator(".quiz-q").inner_text().strip() != prev:
                    break
                page.wait_for_timeout(100)
            q = page.locator(".quiz-q").inner_text().strip()
            prev = q
            scam = SCAM_BY_TEXT.get(q)
            check(scam is not None, f"[{name}] quiz question is a known scenario")
            page.get_by_role("button", name="প্রতারণা" if scam else "নিরাপদ").first.click()
            page.wait_for_selector("text=ঠিক! Correct.")
            page.locator(".quiz-card .verdict .btn").click()
        page.wait_for_selector("text=6/6 সঠিক")
        check(True, f"[{name}] quiz completes with 100% when answered correctly")
        page.wait_for_selector(".toast >> text=প্রতারণা চেনার পরীক্ষায় পাস", timeout=5000)
        check(True, f"[{name}] earned milestone is celebrated (positive moment)")
        page.goto(f"{BASE}/journey")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="✓ আমি করেছি").first.click()
        page.wait_for_timeout(400)
        end_pts = int(page.locator(".ring.lg").get_attribute("data-score"))
        check(end_pts >= start_pts + 20, f"[{name}] quiz + manual step raise readiness ({start_pts} -> {end_pts})")
        page.screenshot(path=f"{SHOTS}/{name}-journey.png", full_page=True)

        # Progress follows the account to a new device.
        other = browser.new_context(viewport=viewport)
        op = other.new_page()
        op.goto(f"{BASE}/login")
        op.wait_for_load_state("networkidle")
        op.get_by_label("মোবাইল নম্বর · Mobile").fill(phone)
        op.locator("#password").fill("Probash!2026")
        op.get_by_role("button", name="লগইন করুন").click()
        op.wait_for_url("**/ask", timeout=20000)
        op.goto(f"{BASE}/journey")
        op.wait_for_selector(".ring.lg")
        synced = 0
        for _ in range(100):
            synced = int(op.locator(".ring.lg").get_attribute("data-score") or 0)
            if synced >= end_pts:
                break
            op.wait_for_timeout(150)
        check(synced >= end_pts, f"[{name}] readiness synced to a second device via the account ({synced})")
        other.close()

        # ---------- Account: memories visible, then delete ----------
        page.goto(f"{BASE}/account")
        page.wait_for_selector(".memory-item", timeout=15000)
        check(page.locator(".memory-item").count() >= 2, f"[{name}] account lists remembered items")
        page.screenshot(path=f"{SHOTS}/{name}-account.png", full_page=True)
        page.get_by_role("button", name="Delete my account").click()
        page.get_by_role("button", name="হ্যাঁ, মুছে ফেলুন").click()
        page.wait_for_url(BASE + "/", timeout=15000)
        page.goto(f"{BASE}/account")
        page.wait_for_url("**/login", timeout=15000)
        check(True, f"[{name}] account deleted and session gone")

        csp = [e for e in problems if "Content Security Policy" in e or "Refused to" in e]
        check(not csp, f"[{name}] no CSP violations {csp[:2]}")
        other = [e for e in problems if e not in csp and "favicon" not in e]
        check(not other, f"[{name}] no console errors or 5xx {other[:3]}")
        ctx.close()

    # ---------- Free on-device OCR (Tesseract) when no cloud AI is configured ----------
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    problems = []
    page.on("console", lambda m: problems.append(m.text) if m.type == "error" else None)
    page.goto(f"{NO_AI}/check")
    page.wait_for_load_state("networkidle")
    page.locator("#doc").set_input_files(letter)
    page.wait_for_selector("img[alt='Uploaded document']")
    page.get_by_role("button", name="Check now").click()
    page.wait_for_selector("#result", timeout=180000)
    text = page.locator("#ocrText").input_value()
    check(page.locator("#cost").input_value() == "650000", f"[ocr] asked cost auto-filled from the photo ({page.locator('#cost').input_value()!r})")
    check(page.locator("#salary").input_value() == "1200", "[ocr] salary auto-filled from the photo")
    check("SAR" in text and "1200" in text, f"[ocr] Tesseract read salary from the photo on-device: {text[:80]!r}")
    check("FREE VISA" in text.upper(), "[ocr] Tesseract read the visa line")
    check(page.locator(".flag", has_text="Free / azad visa").count() == 1, "[ocr] on-device text fed the rule engine (free visa flagged)")
    check("Rule-based check" in page.locator("#result").inner_text(), "[ocr] no cloud AI was used")
    check(page.locator(".flag", has_text="Asked cost").count() == 1, "[ocr] auto-filled cost triggered the overcharge check")
    ocr_reqs = []
    page.on("request", lambda r: ocr_reqs.append(r.url))
    check(not [e for e in problems if "Content Security Policy" in e or "Refused" in e], f"[ocr] OCR worker runs under the strict CSP {problems[:2]}")
    page.screenshot(path=f"{SHOTS}/ocr-on-device.png", full_page=True)
    ctx.close()

    browser.close()

print(f"\n{len(errors)} failure(s)")
sys.exit(1 if errors else 0)
