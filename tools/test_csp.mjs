// Guards the Content-Security-Policy and supply-chain rules (docs/auth-sync-plan.md §8):
// no inline scripts or inline event handlers, no unsafe script sources, every external script
// and CDN URL in the source is covered by the policy, pinned and integrity-checked.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

function cspOf(html) {
  const metas = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/g)];
  assert.equal(metas.length, 1, 'exactly one CSP meta tag');
  const directives = {};
  for (const part of metas[0][1].split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives[name] = sources;
  }
  return { directives, index: metas[0].index };
}

/** True when `url` is allowed by a CSP source list (host or host+path prefix). */
function allowed(sources, url) {
  return sources.some((source) => {
    if (!source.startsWith('https://')) return false;
    if (source.includes('*.')) {
      const suffix = source.replace('https://*', '');
      return new URL(url).hostname.endsWith(suffix.replace(/\/$/, ''));
    }
    return source.endsWith('/') ? url.startsWith(source) : new URL(url).origin === source;
  });
}

for (const page of ['index.html', 'privacy.html']) {
  const html = read(page);
  const { directives, index } = cspOf(html);
  const firstScript = html.indexOf('<script');
  assert.ok(firstScript === -1 || index < firstScript, `${page}: CSP must precede every script`);
  assert.equal(/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), false, `${page}: no inline event handlers`);
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)];
  assert.equal(inlineScripts.length, 0, `${page}: no inline <script> blocks`);
  const scriptSrc = directives['script-src'] || directives['default-src'] || [];
  for (const unsafe of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'data:']) {
    assert.equal(scriptSrc.includes(unsafe), false, `${page}: script-src must not allow ${unsafe}`);
  }
  assert.ok(directives['object-src']?.includes("'none'") || directives['default-src']?.includes("'none'"), `${page}: object-src 'none'`);
  for (const [, src] of html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/g)) {
    if (src.startsWith('https://')) assert.ok(allowed(scriptSrc, src), `${page}: script ${src} not in script-src`);
  }
}

// Every hard-coded CDN URL in the app source must be pinned to an exact version and allowed.
const { directives } = cspOf(read('index.html'));
const cdnSources = [...directives['script-src'], ...directives['connect-src']];
for (const file of readdirSync(join(ROOT, 'src/islands'))) {
  const text = read(join('src/islands', file));
  for (const [url] of text.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/[^'"`\s]+/g)) {
    assert.match(url, /@\d+\.\d+\.\d+\//, `${file}: CDN URL must pin an exact version: ${url}`);
    assert.ok(allowed(cdnSources, url), `${file}: CDN URL not covered by the CSP: ${url}`);
  }
  if (/document\.createElement\('script'\)/.test(text) && /cdn\.jsdelivr\.net/.test(text)) {
    assert.match(text, /\.integrity\s*=/, `${file}: CDN scripts must set Subresource Integrity`);
  }
}

// The pronunciation model is fetched from Hugging Face (redirects to the *.hf.co CDN).
const captBank = JSON.parse(read('database/speech/capt_token_bank.json'));
assert.ok(allowed(directives['connect-src'], captBank.model.url), `Speech model URL not in connect-src: ${captBank.model.url}`);
assert.ok(directives['connect-src'].includes('https://*.hf.co'), 'connect-src must allow the Hugging Face CDN redirect');

// Clickjacking guard runs before the app (GitHub Pages cannot send frame-ancestors headers).
assert.match(read('assets/js/boot-theme.js'), /window\.top\s*===\s*window\.self/);
const indexHtml = read('index.html');
assert.ok(indexHtml.indexOf('<script src="assets/js/boot-theme.js') < indexHtml.indexOf('<script type="module" src="assets/js/preact/islands.js'), 'boot-theme.js must run before the app');

// Template-string markup must not contain inline handlers (blocked by the CSP); data-ui-* actions
// must exist in the ActionBinder allowlist.
const { UI_ACTIONS } = await import('../src/islands/ActionBinder.js');
for (const file of readdirSync(join(ROOT, 'src/islands'))) {
  const code = read(join('src/islands', file)).replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/\son(click|error|load|change|input|keydown|keyup|submit|mouse\w+|touch\w+|pointer\w+)=\\?["']/.test(code), false, `${file}: inline event handler in markup`);
  for (const [, name] of code.matchAll(/data-ui-(?:click|keydown|change)="([A-Za-z]+)"/g)) {
    assert.ok(Object.hasOwn(UI_ACTIONS, name), `${file}: data-ui action "${name}" is not in UI_ACTIONS`);
  }
}
assert.ok(Object.hasOwn(UI_ACTIONS, 'rateCurrentCard'), 'dynamic rating handler must be allowlisted');

console.log('csp tests passed');
