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

