import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /<html lang="en">/i, 'document language is required');
assert.match(html, /name="viewport"/i, 'responsive viewport is required');
assert.match(html, /<a class="skip-link" href="#main">Skip to main content<\/a>/, 'skip link is required');
assert.match(html, /<main id="main"/, 'landmark is required');
assert.match(html, /<h1>Cryptic public access<\/h1>/, 'one clear primary heading is required');
for (const target of ['./compute/', 'https://crypticnews.org/', 'https://github.com/machackabook/HyperPolyGlot-SOS-/pull/6', 'https://github.com/machackabook/Cryptic']) {
  assert.ok(html.includes(`href="${target}"`), `required destination missing: ${target}`);
}
assert.doesNotMatch(html, /<script\b|esm\.sh|@main|@tailwindcss\/browser/i, 'entry must not execute mutable third-party application code');
assert.doesNotMatch(html, /href="javascript:/i, 'javascript URLs are forbidden');
console.log('PASS: static public-entry contract; navigation, semantics, and no runtime imports');
