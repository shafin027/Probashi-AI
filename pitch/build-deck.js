// Builds the 5-slide YUNet AIgnite Buildathon pitch deck.
// Run: NODE_PATH=<dir with pptxgenjs, react-icons, react, react-dom, sharp> node pitch/build-deck.js
// Theme: "Forest Canopy" (theme-factory skill) with a terracotta danger accent.

const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");

const OUT = path.join(__dirname, "Probashi-AI-Pitch.pptx");
const APPLY_THEME = process.env.APPLY_THEME_JS;

const THEME = {
  name: "Forest Canopy",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1D2A1C", lt1: "FFFFFF", dk2: "2D4A2B", lt2: "F1F0E8",
    accent1: "2D4A2B", accent2: "A4AC86", accent3: "B5452F", accent4: "7D8471",
    accent5: "2F7D3A", accent6: "D8A31A", hlink: "2D4A2B", folHlink: "7D8471",
  },
};
const HEX = { forest: "2D4A2B", olive: "A4AC86", sage: "7D8471", red: "B5452F", green: "2F7D3A", amber: "D8A31A", ink: "1D2A1C", mist: "F1F0E8", white: "FFFFFF" };

async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: `#${color}`, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.title = "Probashi AI: Check before you pay";
  pres.author = "Probashi AI";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  pres.defineSlideMaster({
    title: "DARK",
    background: { color: C.text2 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.45, w: 12.1, h: 1.3, fontSize: 36, bold: true, color: C.background1, valign: "top", margin: 0 }, text: "" } },
      { text: { text: "Built for YUNet AIgnite Buildathon 2026", options: { x: 0.6, y: 6.95, w: 6, h: 0.35, fontSize: 10, color: C.accent2, margin: 0 } } },
    ],
    slideNumber: { x: 12.3, y: 6.95, w: 0.5, h: 0.35, fontSize: 10, color: C.accent2 },
  });
  pres.defineSlideMaster({
    title: "LIGHT",
    background: { color: C.background1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.45, w: 12.1, h: 1.0, fontSize: 36, bold: true, color: C.text2, valign: "top", margin: 0 }, text: "" } },
      { text: { text: "Probashi AI · Built for YUNet AIgnite Buildathon 2026", options: { x: 0.6, y: 6.95, w: 8, h: 0.35, fontSize: 10, color: C.accent4, margin: 0 } } },
    ],
    slideNumber: { x: 12.3, y: 6.95, w: 0.5, h: 0.35, fontSize: 10, color: C.accent4 },
  });

  const card = (slide, x, y, w, h, fill, name) =>
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill },
      shadow: { type: "outer", color: "000000", opacity: 0.12, blur: 6, offset: 2, angle: 90 }, objectName: name,
    });
  const iconCircle = async (slide, Comp, x, y, d, bg, fg, name) => {
    slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg }, objectName: `${name} circle` });
    const pad = d * 0.24;
    slide.addImage({ data: await icon(Comp, fg), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad, altText: name, objectName: `${name} icon` });
  };

  // ---------- 1. Problem ----------
  pres.addSection({ title: "Problem" });
  let s = pres.addSlide({ masterName: "DARK", sectionTitle: "Problem" });
  s.addText("Bangladeshi workers pay up to 5× the legal price just to leave home", { placeholder: "title" });
  const stats = [
    ["11.3 lakh", "went abroad for work in 2025", "BMET / RMMRU"],
    ["$35.6B", "remittance in FY2025-26, a record", "Bangladesh Bank"],
    ["24%", "of complainants with permits got the promised job", "BMET arbitration study"],
  ];
  stats.forEach(([v, l, src], i) => {
    const y = 2.0 + i * 1.55;
    s.addText(v, { x: 0.6, y, w: 2.9, h: 0.75, fontFace: THEME.headFontFace, fontSize: 40, bold: true, color: C.accent2, margin: 0, isTextBox: true, objectName: `stat ${i + 1} value` });
    s.addText([{ text: l, options: { breakLine: true } }, { text: src, options: { fontSize: 11, color: C.accent2 } }], { x: 3.55, y: y + 0.05, w: 2.9, h: 0.9, fontSize: 15, color: C.background1, margin: 0, valign: "top", isTextBox: true, objectName: `stat ${i + 1} label` });
  });
  card(s, 6.9, 1.95, 5.8, 4.7, HEX.white, "chart card");
  s.addChart(
    pres.charts.BAR,
    [
      { name: "Official ceiling", labels: ["Malaysia", "Saudi Arabia", "Singapore"], values: [0.79, 1.65, 2.62] },
      { name: "What workers report paying", labels: ["Malaysia", "Saudi Arabia", "Singapore"], values: [4.25, 4.36, 5.74] },
    ],
    {
      x: 7.05, y: 2.05, w: 5.5, h: 4.5, barDir: "col", barGrouping: "clustered",
      chartColors: [HEX.olive, HEX.red], showTitle: true, title: "Migration cost, Tk lakh", titleFontSize: 14, titleColor: HEX.ink, titleFontFace: "+mn-lt",
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 11, dataLabelColor: HEX.ink, dataLabelFontFace: "+mn-lt", dataLabelFormatCode: "0.0",
      catAxisLabelColor: HEX.ink, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt", valAxisHidden: true,
      valGridLine: { style: "none" }, catGridLine: { style: "none" },
      showLegend: true, legendPos: "b", legendFontSize: 11, legendColor: HEX.ink, legendFontFace: "+mn-lt",
    },
  );
  s.addNotes(
    "Bangladesh runs on remittances, but workers pay several times the government ceiling, mostly to middlemen (dalals). Sources: OKUP study via Dhaka Tribune (Saudi Tk 4.36 lakh, Singapore Tk 5.74 lakh); Malaysia midpoint of Tk 3.5–5 lakh reported vs Tk 78,990 set in 2021. Ceilings from Ministry of Expatriates' Welfare circulars. Government apps (Ami Probashi) handle registration, but nobody checks the offer itself before money changes hands.",
  );

  // ---------- 2. Solution ----------
  pres.addSection({ title: "Solution" });
  s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Solution" });
  s.addText("Probashi AI checks the offer before the money changes hands", { placeholder: "title" });
  const feats = [
    [fa.FaCameraRetro, "Offer Checker", "Snap a visa, contract or WhatsApp offer. AI reads it and flags fraud, overcharging and visa tricks in plain Bangla."],
    [fa.FaCalculator, "True cost calculator", "Official ceiling vs. what you're asked, debt payoff months, and take-home after the contract."],
    [fa.FaIdBadge, "Agency licence check", "RL number, licence status and verified complaints. Sponsored agencies can't buy a better score."],
    [fa.FaMicrophone, "Ask by voice in Bangla", "Low-literacy friendly. Answers cite sources and surface the 16135 helpline in emergencies."],
  ];
  for (let i = 0; i < feats.length; i++) {
    const [Ic, t, d] = feats[i];
    const x = 0.6 + (i % 2) * 3.95;
    const y = 1.75 + Math.floor(i / 2) * 2.55;
    card(s, x, y, 3.7, 2.3, HEX.mist, `feature ${i + 1} card`);
    await iconCircle(s, Ic, x + 0.3, y + 0.3, 0.7, HEX.forest, HEX.white, `feature ${i + 1}`);
    s.addText(t, { x: x + 1.15, y: y + 0.3, w: 2.4, h: 0.7, fontSize: 17, bold: true, color: C.text2, valign: "middle", margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.3, y: y + 1.1, w: 3.15, h: 1.1, fontSize: 13, color: C.text1, valign: "top", margin: 0, isTextBox: true });
  }
  // Verdict mock
  card(s, 8.65, 1.75, 4.05, 4.85, HEX.forest, "verdict mock");
  s.addText("The result anyone can read", { x: 8.95, y: 1.95, w: 3.5, h: 0.5, fontSize: 16, bold: true, color: C.background1, margin: 0, isTextBox: true });
  const lights = [[HEX.green, "Looks safe", "verify with BMET"], [HEX.amber, "Caution", "fix 2 issues first"], [HEX.red, "Danger", "don't pay"]];
  lights.forEach(([col, t, d], i) => {
    const y = 2.7 + i * 1.15;
    s.addShape(pres.shapes.OVAL, { x: 8.95, y, w: 0.8, h: 0.8, fill: { color: col }, line: { color: HEX.white, width: 1.5 }, objectName: `signal ${t}` });
    s.addText([{ text: t, options: { bold: true, breakLine: true } }, { text: d, options: { fontSize: 13, color: C.accent2 } }], { x: 9.95, y, w: 2.5, h: 0.8, fontSize: 16, color: C.background1, valign: "middle", margin: 0, isTextBox: true });
  });
  s.addText("Score, reasons, sources, next steps", { x: 8.95, y: 6.05, w: 3.5, h: 0.4, fontSize: 12, italic: true, color: C.accent2, margin: 0, isTextBox: true });
  s.addNotes("Four features: the Offer Checker is the hero. Demo the sample scam offer live: free visa, Tk 6.5 lakh, passport to a dalal. It comes back red with 9 reasons in Bangla.");

  // ---------- 3. How it works ----------
  pres.addSection({ title: "How it works" });
  s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "How it works" });
  s.addText("AI reads the paper, transparent rules make the call", { placeholder: "title" });
  const steps = [
    [fa.FaFileUpload, "Upload or speak", "Photo/PDF of visa, contract, IPA, or a voice note"],
    [fa.FaBrain, "Claude vision AI", "Extracts employer, job, salary, visa type; spots mismatches"],
    [fa.FaBalanceScale, "Rule engine", "Official costs, minimum wages, licence list, scam corridors"],
    [fa.FaUsers, "Verdict + family share", "Bangla report, negotiation script, WhatsApp to family"],
  ];
  for (let i = 0; i < steps.length; i++) {
    const [Ic, t, d] = steps[i];
    const x = 0.6 + i * 3.1;
    await iconCircle(s, Ic, x + 0.95, 1.8, 1.0, i === 2 ? HEX.red : HEX.forest, HEX.white, `step ${i + 1}`);
    if (i < steps.length - 1) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.3, y: 2.12, w: 0.6, h: 0.36, fill: { color: HEX.olive }, line: { color: HEX.olive }, objectName: `arrow ${i + 1}` });
    s.addText(t, { x, y: 2.95, w: 2.9, h: 0.45, fontSize: 17, bold: true, color: C.text2, align: "center", margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.1, y: 3.4, w: 2.7, h: 0.9, fontSize: 13, color: C.text1, align: "center", valign: "top", margin: 0, isTextBox: true });
  }
  const pillars = [
    ["Trust by design", "AI can add warnings but never remove a rule-based one. Every fact shows its source."],
    ["Works offline-first", "If AI is down or the key is missing, the rule engine and FAQ still answer."],
    ["Stack", "Next.js on Vercel · Claude API (vision + structured JSON) · Web Speech API for Bangla voice"],
  ];
  pillars.forEach(([t, d], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 4.75, 3.85, 1.4, HEX.mist, `pillar ${i + 1}`);
    s.addText([{ text: t, options: { bold: true, fontSize: 16, color: C.text2, breakLine: true } }, { text: d, options: { fontSize: 13, color: C.text1 } }], { x: x + 0.25, y: 4.9, w: 3.35, h: 1.15, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true });
  });
  s.addNotes("Hybrid design: Claude reads messy documents and writes in Bangla; a deterministic rule engine owns the verdict, so it is explainable and cannot be bought. Unit cost per AI report is about Tk 10-20.");

  // ---------- 4. Business ----------
  pres.addSection({ title: "Business" });
  s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Business" });
  s.addText("Free safety for all, paid value that saves lakhs", { placeholder: "title" });
  const rows = [
    ["Stream", "Price", "Why it's fair"],
    ["Verified Offer Report", "Tk 299 once", "Saves Tk 1–5 lakh; money back if we miss a flag"],
    ["Family Plan", "Tk 149 / month", "Unlimited reports, remittance & debt planner"],
    ["Licensed partner referrals", "Bounty / 10–20%", "Remittance, courses, insurance, fair loans; always disclosed"],
    ["Sponsored agency listing", "Tk 5–15k / month", "Labelled; can never change a risk score"],
  ];
  s.addTable(
    rows.map((r, ri) => r.map((c) => ({ text: c, options: ri === 0 ? { bold: true, color: HEX.white, fill: { color: HEX.forest } } : { color: HEX.ink, fill: { color: ri % 2 ? HEX.white : HEX.mist } } }))),
    { x: 0.6, y: 1.75, w: 7.6, colW: [2.5, 1.7, 3.4], fontSize: 13, fontFace: "Calibri", border: { type: "solid", pt: 0.5, color: "DCDCCF" }, rowH: 0.62, valign: "middle" },
  );
  const econ = [
    ["~90%", "gross margin per report (AI Tk 10–20 + 2% gateway)"],
    ["1% → Tk 33L+", "of yearly migrants buying one report, before plans & partners"],
    ["8+ countries", "same corridors: Nepal, India, Pakistan, Philippines, Indonesia…"],
  ];
  econ.forEach(([v, l], i) => {
    const y = 1.75 + i * 1.6;
    card(s, 8.65, y, 4.05, 1.4, i === 0 ? HEX.forest : HEX.mist, `economics ${i + 1}`);
    s.addText(v, { x: 8.9, y: y + 0.12, w: 3.6, h: 0.6, fontFace: THEME.headFontFace, fontSize: 26, bold: true, color: i === 0 ? C.background1 : C.text2, margin: 0, isTextBox: true });
    s.addText(l, { x: 8.9, y: y + 0.72, w: 3.6, h: 0.6, fontSize: 12, color: i === 0 ? C.accent2 : C.text1, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText("Checks and balances: scores can't be bought · every commission shown · money-back guarantee", { x: 0.6, y: 5.15, w: 7.6, h: 0.5, fontSize: 13, italic: true, color: C.accent3, margin: 0, isTextBox: true });
  s.addNotes("Revenue never depends on which agency the worker picks, which removes the conflict of interest dalals have. Year-1 illustration: 1% of ~11 lakh migrants x Tk 299 = Tk 33 lakh from reports alone. Assumptions, not forecasts.");

  // ---------- 5. Team & next steps ----------
  pres.addSection({ title: "Team" });
  s = pres.addSlide({ masterName: "DARK", sectionTitle: "Team" });
  s.addText("Built by a builder from Bangladesh, for Bangladesh, ready for the world", { placeholder: "title" });
  card(s, 0.6, 2.0, 5.6, 3.6, HEX.white, "participant card");
  await iconCircle(s, fa.FaUserAlt, 0.95, 2.35, 1.1, HEX.forest, HEX.white, "participant");
  s.addText([{ text: "Shafin", options: { bold: true, fontSize: 22, color: C.text2, breakLine: true } }, { text: "Founder & builder, Probashi AI", options: { fontSize: 14, color: C.accent4 } }], { x: 2.3, y: 2.35, w: 3.7, h: 1.1, valign: "middle", margin: 0, isTextBox: true });
  s.addText(
    [
      { text: "Product, AI and full-stack development", options: { bullet: true, breakLine: true } },
      { text: "Motivated by families who lost lakhs to dalals", options: { bullet: true, breakLine: true } },
      { text: "github.com/shafin027/CS  (probashi-ai/)", options: { bullet: true, breakLine: true } },
      { text: "Live demo link: add your Vercel URL here", options: { bullet: true } },
    ],
    { x: 0.95, y: 3.75, w: 5.0, h: 1.7, fontSize: 14, color: C.text1, valign: "top", margin: 0, paraSpaceAfter: 8, isTextBox: true },
  );
  const road = [
    [fa.FaFlagCheckered, "Now", "Live MVP: offer check, cost, agency, voice Q&A, family planner"],
    [fa.FaHandshake, "Next 3 months", "Real BMET licence sync, bKash checkout, 100 pilot families via migrant NGOs"],
    [fa.FaGlobeAsia, "12 months", "Nepal & Pakistan data packs; licensed remittance & insurance partners"],
  ];
  for (let i = 0; i < road.length; i++) {
    const [Ic, t, d] = road[i];
    const y = 2.0 + i * 1.55;
    await iconCircle(s, Ic, 6.8, y + 0.1, 0.85, HEX.olive, HEX.forest, `roadmap ${t}`);
    s.addText([{ text: t, options: { bold: true, fontSize: 17, breakLine: true } }, { text: d, options: { fontSize: 13, color: C.accent2 } }], { x: 7.9, y, w: 4.8, h: 1.1, color: C.background1, valign: "middle", margin: 0, isTextBox: true });
  }
  s.addNotes("Edit the participant card with your full name, university/role and photo before submitting. Replace the live demo line with your Vercel URL. Ask: judges' introductions to migrant NGOs (BRAC Migration Programme, OKUP, WARBE) for the pilot.");

  await pres.writeFile({ fileName: OUT });
  if (APPLY_THEME) {
    const { applyTheme } = require(APPLY_THEME);
    await applyTheme(OUT, THEME);
  }
  console.log("Wrote", OUT);
})();
