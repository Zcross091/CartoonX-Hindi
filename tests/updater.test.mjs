import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Android Release Keystore exists and has valid size', () => {
  const keystorePath = 'android/app/release.keystore';
  assert.ok(fs.existsSync(keystorePath), 'release.keystore must exist');
  const stats = fs.statSync(keystorePath);
  assert.ok(stats.size > 1000, 'release.keystore should be at least 1KB in size');
});

test('In-app version comparison logic', () => {
  const isNewer = (tag, cur) => {
    const t = tag.replace(/^v/, '').split('.').map(Number);
    const c = cur.replace(/^v/, '').split('.').map(Number);
    if (t[0] > c[0]) return true;
    if (t[0] === c[0] && t[1] > c[1]) return true;
    if (t[0] === c[0] && t[1] === c[1] && t[2] > c[2]) return true;
    return false;
  };

  assert.equal(isNewer('v1.0.1', '1.0.0'), true);
  assert.equal(isNewer('v1.1.0', '1.0.5'), true);
  assert.equal(isNewer('v2.0.0', '1.9.9'), true);
  assert.equal(isNewer('v1.0.0', '1.0.0'), false);
  assert.equal(isNewer('v0.9.0', '1.0.0'), false);
});

test('Zero-rate-limit version.json configuration', () => {
  assert.ok(fs.existsSync('version.json'), 'version.json must exist in root');
  const v = JSON.parse(fs.readFileSync('version.json', 'utf8'));
  assert.ok(v.versionCode >= 2, 'versionCode must be at least 2');
  assert.ok(v.apkUrl.includes('CartoonX-AndroidTV-Signed.apk'), 'apkUrl must point to Signed APK');
});

test('TV Player primary button strictly toggles Play and Pause', () => {
  const html = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
  assert.ok(html.includes('id="play-pause-btn"'), 'play-pause-btn must exist in player HUD');
  assert.ok(html.includes('onclick="togglePlayPause()"'), 'play-pause-btn must invoke togglePlayPause()');
  assert.ok(!html.includes('Interactive Player'), 'Must not contain confusing "Interactive Player" button text');
  assert.ok(!html.includes('▶ Play / ⏸ Pause'), 'Must not contain placeholder "Play / Pause" text');
  assert.ok(html.includes('isIframePlaying'), 'Must track isIframePlaying state for cross-origin players');
});

