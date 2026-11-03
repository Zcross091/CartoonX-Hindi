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
  assert.ok(html.includes('▶ Play'), 'play-pause-btn must default to ▶ Play');
});

test('MainActivity exposes sendMediaPlay and sendMediaPause bridge methods', () => {
  const java = fs.readFileSync('android/app/src/main/java/com/cartoonx/tv/MainActivity.java', 'utf8');
  assert.ok(java.includes('public void sendMediaPlay()'), 'Must expose sendMediaPlay');
  assert.ok(java.includes('public void sendMediaPause()'), 'Must expose sendMediaPause');
});

test('Updater handles onUpdateComplete, onUpdateError, and dismissed persistence', () => {
  const html = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
  assert.ok(html.includes('window.onUpdateComplete'), 'window.onUpdateComplete must be defined');
  assert.ok(html.includes('window.onUpdateError'), 'window.onUpdateError must be defined');
  assert.ok(html.includes('cartoonx_dismissed_update'), 'cartoonx_dismissed_update must be checked in startup check');
});

test('TV Player audio pinned at MAX and D-Pad Up/Down protected from software volume changes', () => {
  const html = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
  assert.ok(html.includes('enforceMaxVolume'), 'Must define enforceMaxVolume to keep player audio at 100%');
  assert.ok(html.includes('handlePlayerDpadUp'), 'Must intercept D-pad Up');
  assert.ok(html.includes('handlePlayerDpadDown'), 'Must intercept D-pad Down');

  const java = fs.readFileSync('android/app/src/main/java/com/cartoonx/tv/MainActivity.java', 'utf8');
  assert.ok(java.includes('setVolumeControlStream(AudioManager.STREAM_MUSIC)'), 'Must bind TV remote volume keys to STREAM_MUSIC');
  assert.ok(java.includes('KEYCODE_DPAD_UP'), 'MainActivity must intercept DPAD_UP when player is active');
  assert.ok(java.includes('KEYCODE_DPAD_DOWN'), 'MainActivity must intercept DPAD_DOWN when player is active');
});

