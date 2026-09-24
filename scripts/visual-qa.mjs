/**
 * Visual QA for the marketing site.
 *
 * Captures every public route at mobile / tablet / desktop widths and runs
 * automated checks that catch the issues a screenshot alone would not:
 * horizontal overflow, tiny text, weak contrast, off-screen elements,
 * broken images, console errors, and dead links.
 *
 *   node scripts/visual-qa.mjs                  # against http://localhost:3000
 *   BASE=https://example.com node scripts/visual-qa.mjs
 *
 * Screenshots land in .qa-screenshots/ (gitignored).
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.QA_OUT || '.qa-screenshots';

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'pool-contractors', path: '/pool-contractors' },
  { name: 'lead-standards', path: '/lead-standards' },
  { name: 'apply', path: '/apply' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812, isMobile: true },
  { name: 'tablet', width: 768, height: 1024, isMobile: false },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
];

/** Minimum readable body text and minimum tap target. */
const MIN_FONT_PX = 11.5;
const MIN_TAP_PX = 32;
/** WCAG AA for normal text; 3.0 for large text (>=18.66px, or >=14px bold). */
const MIN_CONTRAST_NORMAL = 4.5;
const MIN_CONTRAST_LARGE = 3.0;

const findings = [];
function report(route, viewport, severity, kind, detail) {
  findings.push({ route, viewport, severity, kind, detail });
}

/** Runs in the page. Returns structured layout problems. */
const auditFn = ({ MIN_FONT_PX, MIN_TAP_PX, MIN_CONTRAST_NORMAL, MIN_CONTRAST_LARGE }) => {
  const out = {
    overflow: null,
    offscreen: [],
    tinyText: [],
    smallTargets: [],
    lowContrast: [],
    brokenImages: [],
    emptyHeadings: [],
  };

  const docW = document.documentElement.clientWidth;

  // --- horizontal overflow -------------------------------------------------
  const scrollW = document.documentElement.scrollWidth;
  if (scrollW > docW + 1) {
    out.overflow = { scrollWidth: scrollW, clientWidth: docW };
  }

  const parseRGB = (s) => {
    const m = s && s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (fg, bg) => {
    const a = lum(fg), b = lum(bg);
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  };
  const composite = (fg, bg) => {
    if (fg.a >= 1) return fg;
    return {
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
    };
  };
  const effectiveBg = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = parseRGB(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.95) return c;
      node = node.parentElement;
    }
    return { r: 8, g: 9, b: 11, a: 1 };
  };

  const describe = (el) => {
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '';
    const txt = (el.textContent || '').trim().slice(0, 45);
    return `${el.tagName.toLowerCase()}${cls} :: "${txt}"`;
  };

  const all = Array.from(document.querySelectorAll('body *'));

  for (const el of all) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    // Elements pushed outside the viewport horizontally. An element inside a
    // deliberate horizontal scroller, or inside an off-screen container (e.g.
    // the form honeypot), is not a layout fault.
    const inScroller = (() => {
      let n = el.parentElement;
      while (n && n !== document.body) {
        const st = getComputedStyle(n);
        if (st.overflowX === 'auto' || st.overflowX === 'scroll') return true;
        if (st.overflow === 'hidden' && n.getBoundingClientRect().left < -100) return true;
        n = n.parentElement;
      }
      return false;
    })();

    if (!inScroller && rect.width > 0 && (rect.right > docW + 1 || rect.left < -1)) {
      // Only report the element itself, not every descendant.
      const parent = el.parentElement;
      const pr = parent ? parent.getBoundingClientRect() : null;
      const parentAlsoOver = pr && (pr.right > docW + 1 || pr.left < -1);
      if (!parentAlsoOver) {
        out.offscreen.push({
          el: describe(el),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          docW,
        });
      }
    }

    // Direct text nodes only, so we judge the element actually rendering text.
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();

    if (ownText.length > 1) {
      const fs = parseFloat(style.fontSize);
      if (fs && fs < MIN_FONT_PX) {
        out.tinyText.push({ el: describe(el), fontSize: fs });
      }

      const fg = parseRGB(style.color);
      const bg = effectiveBg(el);
      if (fg && bg) {
        const ratio = contrast(composite(fg, bg), bg);
        const weight = parseInt(style.fontWeight, 10) || 400;
        const isLarge = fs >= 18.66 || (fs >= 14 && weight >= 700);
        const need = isLarge ? MIN_CONTRAST_LARGE : MIN_CONTRAST_NORMAL;
        if (ratio < need) {
          out.lowContrast.push({
            el: describe(el),
            ratio: Math.round(ratio * 100) / 100,
            need,
            fontSize: fs,
          });
        }
      }
    }

    // Tap targets.
    const tag = el.tagName.toLowerCase();
    const isControl =
      tag === 'button' ||
      (tag === 'a' && el.getAttribute('href')) ||
      tag === 'select' ||
      tag === 'summary' ||
      (tag === 'input' && !['hidden'].includes(el.type));

    // A checkbox/radio inside a label is tapped via the label, so measure that
    // instead. Skip-links and other visually-hidden controls are exempt: they
    // only materialise on focus.
    const wrappingLabel = el.closest('label');
    const effectiveRect =
      (tag === 'input' && wrappingLabel)
        ? wrappingLabel.getBoundingClientRect()
        : rect;
    const visuallyHidden =
      el.closest('.sr-only') !== null ||
      (el.className && typeof el.className === 'string' &&
        el.className.includes('sr-only')) ||
      rect.width <= 1 || rect.height <= 1 ||
      // Parked far off-canvas (skip links, form honeypots).
      rect.right < -10 || rect.left > docW + 10;

    /*
      WCAG 2.5.8 exempts a link rendered inline within a sentence — you cannot
      pad it without wrecking the line box, and the surrounding text gives the
      user a large target area anyway. Detect it as: an inline-displayed anchor
      whose parent carries text of its own beyond the link.
    */
    const inlineInSentence = (() => {
      if (tag !== 'a') return false;
      if (style.display !== 'inline') return false;
      const parent = el.parentElement;
      if (!parent) return false;
      const parentText = (parent.textContent || '').trim().length;
      const ownText = (el.textContent || '').trim().length;
      return parentText > ownText + 10;
    })();

    if (isControl && !visuallyHidden && !inlineInSentence &&
        effectiveRect.width > 0 && effectiveRect.height > 0) {
      if (effectiveRect.height < MIN_TAP_PX || effectiveRect.width < 12) {
        out.smallTargets.push({
          el: describe(el),
          w: Math.round(effectiveRect.width),
          h: Math.round(effectiveRect.height),
        });
      }
    }

    // Headings that render empty.
    if (/^h[1-6]$/.test(tag) && (el.textContent || '').trim() === '') {
      out.emptyHeadings.push(describe(el));
    }
  }

  for (const img of Array.from(document.images)) {
    // A lazy image below the fold has not started loading yet, so `complete`
    // being false says nothing about whether it works. Only judge images the
    // browser has actually been asked to fetch.
    const r = img.getBoundingClientRect();
    const inViewport = r.top < window.innerHeight * 1.5 && r.bottom > -100;
    const deferred = img.loading === 'lazy' && !inViewport;
    if (deferred) continue;
    if (!img.complete || img.naturalWidth === 0) {
      out.brokenImages.push(img.currentSrc || img.src || '(no src)');
    }
  }

  return out;
};

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const linkTargets = new Set();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    for (const route of ROUTES) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });
      page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

      const url = BASE + route.path;
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

      if (!resp || resp.status() >= 400) {
        report(route.name, vp.name, 'error', 'http', `HTTP ${resp ? resp.status() : 'no response'}`);
      }

      // Let fonts settle so text measurements are real.
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(350);

      const audit = await page.evaluate(auditFn, {
        MIN_FONT_PX,
        MIN_TAP_PX,
        MIN_CONTRAST_NORMAL,
        MIN_CONTRAST_LARGE,
      });

      if (audit.overflow) {
        report(route.name, vp.name, 'error', 'overflow',
          `page scrolls horizontally: ${audit.overflow.scrollWidth}px content in ${audit.overflow.clientWidth}px viewport`);
      }
      for (const o of audit.offscreen.slice(0, 6)) {
        report(route.name, vp.name, 'error', 'offscreen',
          `${o.el} spans ${o.left}..${o.right} (viewport 0..${o.docW})`);
      }
      for (const t of dedupe(audit.tinyText).slice(0, 6)) {
        report(route.name, vp.name, 'warn', 'tiny-text', `${t.fontSize}px — ${t.el}`);
      }
      for (const c of dedupe(audit.lowContrast).slice(0, 8)) {
        report(route.name, vp.name, 'warn', 'contrast',
          `ratio ${c.ratio} (needs ${c.need}) at ${c.fontSize}px — ${c.el}`);
      }
      for (const s of dedupe(audit.smallTargets).slice(0, 6)) {
        report(route.name, vp.name, 'warn', 'tap-target', `${s.w}x${s.h}px — ${s.el}`);
      }
      for (const b of audit.brokenImages) {
        report(route.name, vp.name, 'error', 'broken-image', b);
      }
      for (const h of audit.emptyHeadings) {
        report(route.name, vp.name, 'warn', 'empty-heading', h);
      }
      for (const e of consoleErrors.slice(0, 5)) {
        report(route.name, vp.name, 'error', 'console', e);
      }

      // Collect internal links once (desktop pass).
      if (vp.name === 'desktop') {
        const hrefs = await page.evaluate(() =>
          Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'))
        );
        for (const h of hrefs) {
          if (h && h.startsWith('/')) linkTargets.add(h);
        }
        // Verify in-page anchors resolve to a real element.
        const anchors = hrefs.filter((h) => h && h.includes('#') && !h.startsWith('http'));
        for (const a of new Set(anchors)) {
          const id = a.split('#')[1];
          if (!id) continue;
          const exists = await page.evaluate((i) => !!document.getElementById(i), id);
          const samePage = a.startsWith('#') || a.startsWith(route.path + '#') ||
            (route.path === '/' && a.startsWith('/#'));
          if (samePage && !exists) {
            report(route.name, vp.name, 'error', 'dead-anchor', `${a} — no element with id="${id}"`);
          }
        }
      }

      await page.screenshot({
        path: path.join(OUT, `${route.name}__${vp.name}.png`),
        fullPage: true,
      });

      await page.close();
    }

    // Mobile menu behaviour.
    if (vp.name === 'mobile') {
      const page = await context.newPage();
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const toggle = page.locator('button[aria-label="Open menu"]');
      if (await toggle.count()) {
        await toggle.first().click();
        await page.waitForTimeout(400);
        const sheet = page.locator('#hq-mobile-nav');
        if (!(await sheet.isVisible())) {
          report('home', 'mobile', 'error', 'mobile-menu', 'sheet did not open');
        } else {
          await page.screenshot({ path: path.join(OUT, 'home__mobile-menu.png'), fullPage: false });
          const close = page.locator('#hq-mobile-nav button[aria-label="Close menu"]');
          if (await close.count()) {
            await close.first().click();
            await page.waitForTimeout(400);
            if (await sheet.count() && await sheet.isVisible()) {
              report('home', 'mobile', 'error', 'mobile-menu', 'sheet did not close');
            }
          } else {
            report('home', 'mobile', 'error', 'mobile-menu', 'no close button');
          }
        }
      } else {
        report('home', 'mobile', 'error', 'mobile-menu', 'no open-menu button found');
      }

      // Sticky header must stay pinned after scrolling.
      await page.evaluate(() => window.scrollTo(0, 1200));
      await page.waitForTimeout(400);
      const headerTop = await page.evaluate(() => {
        const h = document.querySelector('header');
        return h ? Math.round(h.getBoundingClientRect().top) : null;
      });
      if (headerTop === null || Math.abs(headerTop) > 2) {
        report('home', 'mobile', 'error', 'sticky-header', `header top = ${headerTop} after scroll (expected ~0)`);
      }

      // Anchor navigation must clear the sticky header.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.goto(BASE + '/#faq', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const clearance = await page.evaluate(() => {
        const el = document.getElementById('faq');
        const h = document.querySelector('header');
        if (!el || !h) return null;
        return Math.round(el.getBoundingClientRect().top - h.getBoundingClientRect().bottom);
      });
      if (clearance !== null && clearance < -4) {
        report('home', 'mobile', 'error', 'anchor-offset',
          `#faq sits ${Math.abs(clearance)}px behind the sticky header`);
      }
      await page.screenshot({ path: path.join(OUT, 'home__mobile-anchor-faq.png'), fullPage: false });
      await page.close();
    }

    await context.close();
  }

  // Internal link check.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  for (const href of Array.from(linkTargets).sort()) {
    const clean = href.split('#')[0];
    if (!clean || clean.startsWith('/_next')) continue;
    const r = await p.goto(BASE + clean, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    const status = r ? r.status() : 0;
    // /app correctly redirects to /sign-in for signed-out visitors.
    const ok = status === 200 || (clean.startsWith('/app') && [200, 307, 302].includes(status));
    if (!ok) report('links', 'desktop', 'error', 'dead-link', `${clean} -> HTTP ${status}`);
  }
  await ctx.close();
  await browser.close();

  // ---- Output -------------------------------------------------------------
  const errors = findings.filter((f) => f.severity === 'error');
  const warns = findings.filter((f) => f.severity === 'warn');

  const lines = [];
  lines.push(`Visual QA — ${BASE}`);
  lines.push(`${ROUTES.length} routes x ${VIEWPORTS.length} viewports`);
  lines.push(`errors: ${errors.length}   warnings: ${warns.length}`);
  lines.push('');

  const group = (list, title) => {
    if (!list.length) return;
    lines.push(`== ${title} ==`);
    const byKind = {};
    for (const f of list) (byKind[f.kind] ||= []).push(f);
    for (const kind of Object.keys(byKind).sort()) {
      lines.push(`-- ${kind} (${byKind[kind].length})`);
      for (const f of byKind[kind]) {
        lines.push(`   [${f.route} / ${f.viewport}] ${f.detail}`);
      }
    }
    lines.push('');
  };
  group(errors, 'ERRORS');
  group(warns, 'WARNINGS');

  const text = lines.join('\n');
  await writeFile(path.join(OUT, 'report.txt'), text, 'utf8');
  console.log(text);

  process.exit(errors.length ? 1 : 0);
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = JSON.stringify(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
