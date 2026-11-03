import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');

test('Consolidated Single-Banner Shows Verification', (t) => {
  // Extract DEFAULT_SHOWS from index.html
  const match = html.match(/const DEFAULT_SHOWS = (\[[\s\S]*?\]);\s*let allShows/);
  assert.ok(match, 'DEFAULT_SHOWS must be found in index.html');

  const shows = JSON.parse(match[1]);
  assert.equal(shows.length, 13, 'There should be exactly 13 consolidated single-banner shows');

  const showIds = shows.map(s => s.id);

  // Check essential shows are present
  assert.ok(showIds.includes('ben-10-classic'), 'Ben 10 consolidated show present');
  assert.ok(showIds.includes('doraemon-classic'), 'Doraemon consolidated show present');
  assert.ok(showIds.includes('slugterra-classic'), 'Slugterra consolidated show present');
  assert.ok(showIds.includes('huddy-mera-buddy'), 'Huddy Mera Buddy consolidated show present');
  assert.ok(showIds.includes('phineas-and-ferb'), 'Phineas and Ferb consolidated show present');

  // Verify Ben 10 consolidation
  const ben10 = shows.find(s => s.id === 'ben-10-classic');
  assert.ok(ben10.seasons.length >= 9, 'Ben 10 should house Classic (S1-4), Alien Force (S1-3), Ultimate Alien (S1-2)');
  assert.ok(!showIds.includes('ben-10-alien-force'), 'Alien Force must NOT have a duplicate home banner');
  assert.ok(!showIds.includes('ben-10-ultimate-alien'), 'Ultimate Alien must NOT have a duplicate home banner');

  // Verify Doraemon consolidation
  const doraemon = shows.find(s => s.id === 'doraemon-classic');
  assert.ok(doraemon.seasons.length >= 4, 'Doraemon should house Season 1, 8, 14, and Movies');

  // Verify MovieBox UI elements exist in DOM
  assert.ok(html.includes('id="detail-season-select"'), 'MovieBox season dropdown selector exists in HTML');
  assert.ok(html.includes('id="detail-sort-btn"'), 'MovieBox sort toggle button exists in HTML');
  assert.ok(html.includes('toggleDetailSort()'), 'toggleDetailSort function exists in JavaScript');
  assert.ok(html.includes('selectDetailSeason'), 'selectDetailSeason function exists in JavaScript');

  // Verify Permanent Hovering Author Watermark
  assert.ok(html.includes('id="author-watermark"'), 'Author watermark container exists');
  assert.ok(html.includes('Made by'), 'Watermark contains "Made by" text');
  assert.ok(html.includes('Zcross'), 'Watermark contains "Zcross" author name');
  assert.ok(html.includes('pointer-events-none'), 'Watermark is click-through and non-blocking');
  assert.ok(html.includes('z-[70]'), 'Watermark hovers over player with high z-index');

  // Verify Genuine TMDB Stream Mappings (Billy & Mandy must NOT be 2473 The Avengers 1961!)
  const huddy = shows.find(s => s.id === 'huddy-mera-buddy');
  assert.equal(huddy.tmdbId, 897, 'Huddy Mera Buddy must map to Billy & Mandy TMDB 897, not The Avengers 2473');
  assert.equal(ben10.tmdbId, 4686, 'Ben 10 Classic must map to TMDB 4686');

  // Verify Player HUD Server Switcher
  assert.ok(html.includes('id="switch-server-btn"'), 'Switch Server button exists in Player HUD');
  assert.ok(html.includes('switchStreamServer'), 'switchStreamServer function exists in JavaScript');
});
