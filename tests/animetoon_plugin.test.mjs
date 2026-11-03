import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const html = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
const java = fs.readFileSync('android/app/src/main/java/com/cartoonx/tv/MainActivity.java', 'utf8');
const streamsJson = JSON.parse(fs.readFileSync('Plugin/streams.json', 'utf8'));

test('AnimeToon Plugin Integration Verification', (t) => {
  // 1. Verify Plugin Database
  assert.ok(streamsJson.shows, 'Plugin streams.json must contain shows');
  const showKeys = Object.keys(streamsJson.shows);
  assert.ok(showKeys.includes('courage the cowardly dog'), 'Must include Courage');
  assert.ok(showKeys.includes('doraemon'), 'Must include Doraemon');
  assert.ok(showKeys.includes('shin chan'), 'Must include Shin Chan');
  assert.ok(showKeys.includes('ben 10 classic'), 'Must include Ben 10 Classic');
  assert.ok(showKeys.includes('slugterra'), 'Must include Slugterra');
  assert.ok(showKeys.includes('oggy and the cockroaches'), 'Must include Oggy');

  // 2. Verify Android Asset Sync
  assert.ok(fs.existsSync('android/app/src/main/assets/web/streams.json'), 'Asset streams.json must exist');
  const assetStreams = JSON.parse(fs.readFileSync('android/app/src/main/assets/web/streams.json', 'utf8'));
  assert.equal(Object.keys(assetStreams.shows).length, showKeys.length, 'Asset streams must match Plugin database');

  // 3. Verify TV App Implementation
  assert.ok(html.includes('loadAnimetoonStreams'), 'index.html must define loadAnimetoonStreams()');
  assert.ok(html.includes('findAnimetoonEpisode'), 'index.html must define findAnimetoonEpisode()');
  assert.ok(html.includes('Server 1 (AnimeToon Direct)'), 'STREAM_SERVERS must define Server 1 as AnimeToon Direct');

  // 4. Verify MainActivity Frame Security Interceptor
  assert.ok(java.includes('razorshell.space') || java.includes('groovy.monster'), 'MainActivity must intercept Razorshell streams');
  assert.ok(java.includes('content-security-policy') && java.includes('x-frame-options'), 'MainActivity must strip CSP and X-Frame-Options');

  // 5. Verify Sync Script
  const syncOut = execSync('node scripts/sync-plugin.mjs').toString();
  assert.ok(syncOut.includes('Successfully synced'), 'scripts/sync-plugin.mjs must execute cleanly');
});
