/* Nutrition Readiness Report: make the guest's 4-page PDF and email it.

   POST /api/report   { answers: ['A'..'C' x 9], lead: { name, email, role, institution }, variant: 'k12'|'uni', consent: true }
     -> prints report/report.html for these answers with headless Chromium, emails the PDF, returns { ok, id }
   GET  /api/report?a=CBBBBBBBA&n=Name&r=Role&i=Institution
     -> returns the PDF itself (no email, no personal data stored). Handy for checking a report.

   Environment variables (set in Vercel, never in code):
     RESEND_API_KEY      email service key (resend.com)
     REPORT_FROM         sender, e.g. "Chartwells Dining Readiness <report@reports.kamilabs.co>".
                         Until a domain is verified in Resend, leave it unset: Resend's test sender is used,
                         and Resend only delivers to the email address the Resend account was opened with.
     REPORT_REPLY_TO     optional reply-to address
     REPORT_TO_OVERRIDE  optional: send every report to this address instead of the guest (for testing)
     CHROME_PATH         local testing only: path to a desktop Chrome */
// Vercel runs on AWS Lambda (Amazon Linux 2023) but doesn't set the variable @sparticuz/chromium looks for,
// so tell it, or it skips unpacking the system libraries Chromium needs (libnss3 and friends)
if (process.env.VERCEL && !process.env.AWS_LAMBDA_JS_RUNTIME) process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x';
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const KEYS = /^[ABC]{9}$/;
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

async function makePdf(base, data) {
  const local = process.env.CHROME_PATH;
  if (!local) chromium.setGraphicsMode = true;           // software WebGL (SwiftShader) for the 3D cafeteria
  const browser = await puppeteer.launch(local
    ? { executablePath: local, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
    : { executablePath: await chromium.executablePath(), headless: chromium.headless, args: chromium.args });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(d => { window.REPORT_DATA = d; }, data);
    await page.goto(base + '/report/report.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction('window.REPORT_READY === true', { timeout: 25000 });
    const overflow = await page.evaluate(() => window.reportOverflow ? window.reportOverflow() : []);
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    return { pdf: Buffer.from(pdf), overflow };
  } finally { await browser.close(); }
}

function readData(src) {
  const answers = String(src.answers || '').toUpperCase().replace(/[^ABC]/g, '');
  if (!KEYS.test(answers)) throw Object.assign(new Error('Need 9 answers, each A, B or C'), { status: 400 });
  const lead = src.lead || {};
  return {
    answers: answers.split(''),
    lead: { name: clip(lead.name, 80), role: clip(lead.role, 80), institution: clip(lead.institution, 90) },
    variant: src.variant === 'uni' ? 'uni' : src.variant === 'k12' ? 'k12' : undefined,
    date: new Date().toISOString().slice(0, 10)
  };
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function emailHtml(d) {
  const hi = d.lead.name ? 'Dear ' + esc(d.lead.name.split(' ')[0]) + ',' : 'Hello,';
  const who = d.lead.institution ? esc(d.lead.institution) + '’s' : 'your institution’s';
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#14181F;max-width:560px">
<p>${hi}</p>
<p>Thank you for taking the Nutrition Readiness check with Chartwells. Your personal report is attached as a PDF.</p>
<p>It shows ${who} score across nutrition, food safety, and awareness and sustainability, what is already working, and a game plan for the next 30 days, this term and this year.</p>
<p>Your Chartwells contact will be in touch to go through it with you. You can also write to us at enquiries@compassgroup-chartwells.co.in or call +91 74284 58309.</p>
<p>Warm regards,<br>The Chartwells team<br><span style="color:#5A6170">Chartwells by Compass India · Serving up happy &amp; healthy</span></p>
</div>`;
}

module.exports = async (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const base = process.env.REPORT_BASE_URL || `${proto}://${req.headers.host}`;
  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      const data = readData({ answers: q.a, lead: { name: q.n, role: q.r, institution: q.i }, variant: q.v });
      const { pdf } = await makePdf(base, data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="Nutrition-Readiness-Report.pdf"');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(pdf);
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (body.consent !== true) return res.status(400).json({ ok: false, error: 'Consent is required' });
    const email = clip(body.lead && body.lead.email, 120);
    if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: 'A valid email is required' });
    const data = readData({ answers: (body.answers || []).join(''), lead: body.lead, variant: body.variant });
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ ok: false, error: 'Email is not set up yet (RESEND_API_KEY missing)' });

    const { pdf, overflow } = await makePdf(base, data);
    const to = process.env.REPORT_TO_OVERRIDE || email;
    const inst = data.lead.institution || 'your institution';
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.REPORT_FROM || 'Chartwells Dining Readiness <onboarding@resend.dev>',
        to: [to],
        reply_to: process.env.REPORT_REPLY_TO || undefined,
        subject: `${data.lead.name ? data.lead.name.split(' ')[0] + ', your' : 'Your'} Nutrition Readiness Report for ${inst}`,
        html: emailHtml(data),
        attachments: [{ filename: 'Nutrition-Readiness-Report.pdf', content: pdf.toString('base64') }]
      })
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ ok: false, error: 'Email service: ' + (out.message || r.status) });
    return res.status(200).json({ ok: true, id: out.id, overflow });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ ok: false, error: err.status ? err.message : 'Report could not be made' });
  }
};
