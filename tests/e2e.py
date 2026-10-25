"""Browser end-to-end tests (webapp-testing skill pattern), desktop + mobile.

Run: npm run test:e2e   (starts mock AI + app via with_server.py)
Covers: landing/watermark/layout, mobile menu, offer check with a real image upload
(OCR path), paid report unlock, sign-up, chat with suggestion chips and memory,
natural voice (fake microphone -> STT, TTS playback), account deletion, and
fails on any CSP violation or console error.
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3300")
SHOTS = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SHOTS, exist_ok=True)
CHROMIUM = "/opt/pw-browsers/chromium"

errors = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        errors.append(msg)


def make_offer_letter(path):
    """Render a realistic offer letter image to upload (exercises the OCR path)."""
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (1000, 700), "white")
    d = ImageDraw.Draw(img)
    lines = [
        "AL NOOR CLEANING CO. - RIYADH, KINGDOM OF SAUDI ARABIA",
        "EMPLOYMENT OFFER LETTER",
        "Name: Md. Rahim Uddin   Passport: A01234567",
        "Position: Cleaner        Monthly salary: SAR 1200",
        "Contract: 24 months      Visa type: Work (Iqama by employer)",
        "Recruiting agent fee payable in Bangladesh: BDT 650,000",
    ]
    for i, line in enumerate(lines):
        d.text((40, 60 + i * 80), line, fill="black")
    img.save(path)


with sync_playwright() as p:
    args = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"]
    kwargs = {"headless": True, "args": args}
    if os.path.exists(CHROMIUM):
        kwargs["executable_path"] = CHROMIUM
    browser = p.chromium.launch(**kwargs)
    letter = os.path.join(SHOTS, "offer-letter.png")
    make_offer_letter(letter)

    for name, viewport in [("desktop", {"width": 1280, "height": 900}), ("mobile", {"width": 390, "height": 844})]:
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
        result = page.locator("#result").inner_text()
        check("বিপদ" in result, f"[{name}] uploaded offer flagged as danger")
        check("AI document reading" in result, f"[{name}] AI read the uploaded document")
        check("Al Noor Cleaning Co." in result, f"[{name}] employer extracted from document")
        check("SECRET_NEGOTIATION_SCRIPT" not in page.content(), f"[{name}] paid content not in page before payment")
        page.screenshot(path=f"{SHOTS}/{name}-check.png", full_page=True)
        page.get_by_role("button", name="Unlock").click()
        page.get_by_label("মোবাইল নম্বর").fill("01712345678")
        page.get_by_role("button", name="Pay ৳299 (demo)").click()
        page.wait_for_selector("text=SECRET_NEGOTIATION_SCRIPT", timeout=15000)
        check(True, f"[{name}] paid report unlocks after checkout")

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
        for path, marker in [("/cost", "৳78,990"), ("/agency", "Demo directory"), ("/plan", "Debt-free in"), ("/privacy", "How it is protected")]:
            page.goto(f"{BASE}{path}")
            page.wait_for_load_state("networkidle")
            check(marker in page.content(), f"[{name}] {path} renders")
            check(page.evaluate("document.documentElement.scrollWidth") <= viewport["width"] + 1, f"[{name}] no horizontal scroll on {path}")

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

    browser.close()

print(f"\n{len(errors)} failure(s)")
sys.exit(1 if errors else 0)
