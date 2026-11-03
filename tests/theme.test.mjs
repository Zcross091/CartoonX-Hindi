import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
const buildGradle = fs.readFileSync('android/app/build.gradle', 'utf8');
const versionJson = JSON.parse(fs.readFileSync('version.json', 'utf8'));

test('Blood Red and Pure White Theme Verification', (t) => {
  // 1. Remote Focus Styles
  assert.ok(html.includes('outline: 3px solid #ffffff'), 'TV focusable elements must have pure white focus outline');
  assert.ok(html.includes('rgba(220, 38, 38, 0.85)'), 'TV focusable elements must have blood red focus glow');
  assert.ok(html.includes('border-color: #dc2626'), 'Focus border must use blood red (#dc2626)');

  // 2. Obsidian & Blood Red Backgrounds
  assert.ok(html.includes('background-color: #080203'), 'Body background must use deep obsidian red-black (#080203)');
  assert.ok(html.includes('rgba(185, 28, 28, 0.35)'), 'Glass TV cards must have blood red tinted borders');

  // 3. Author Watermark
  assert.ok(html.includes('text-red-500 tracking-wide">Zcross</span>'), 'Watermark author name must be styled in red-500');

  // 4. No remaining amber UI classes in index.html
  const amberMatches = [...html.matchAll(/(?:text|bg|border)-amber-\d+/g)].map(m => m[0]);
  assert.equal(amberMatches.length, 0, `All amber UI classes must be removed; found: ${amberMatches.join(', ')}`);

  // 5. Version Synchronization
  assert.match(buildGradle, /versionCode 11/, 'build.gradle versionCode must be 11');
  assert.match(buildGradle, /versionName "1.1.0"/, 'build.gradle versionName must be 1.1.0');
  assert.equal(versionJson.version, '1.1.0', 'version.json version must be 1.1.0');
  assert.equal(versionJson.versionCode, 11, 'version.json versionCode must be 11');
  assert.equal(versionJson.tagName, 'v1.1.0', 'version.json tagName must be v1.1.0');
});
