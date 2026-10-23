import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
export async function open(url, { w = 1280, h = 720, mobile = false, storage } = {}) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  if (storage) await p.addInitScript((s) => { if (sessionStorage.getItem('__fx')) return; sessionStorage.setItem('__fx', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  await p.goto(url);
  return { b, ctx, p, errors };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
