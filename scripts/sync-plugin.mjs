#!/usr/bin/env node

/**
 * CartoonX AnimeToon Sync Script
 * Copies Plugin/streams.json to Android TV assets and validates catalog integrity.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pluginDbPath = path.join(rootDir, 'Plugin', 'streams.json');
const androidAssetPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'web', 'streams.json');

console.log('🔄 Syncing CartoonX AnimeToon Plugin database...');

if (!fs.existsSync(pluginDbPath)) {
  console.error(`❌ Plugin streams database not found at: ${pluginDbPath}`);
  console.log('💡 Run `npm run plugin:scrape` first to generate streams.json');
  process.exit(1);
}

try {
  const content = fs.readFileSync(pluginDbPath, 'utf8');
  const data = JSON.parse(content);
  const shows = data.shows || {};
  const showKeys = Object.keys(shows);

  let totalEpisodes = 0;
  for (const key of showKeys) {
    const show = shows[key];
    const epCount = show.episodes ? show.episodes.length : 0;
    totalEpisodes += epCount;
  }

  // Ensure target directory exists
  fs.mkdirSync(path.dirname(androidAssetPath), { recursive: true });
  fs.writeFileSync(androidAssetPath, content, 'utf8');

  console.log(`✅ Successfully synced ${showKeys.length} shows (${totalEpisodes} episodes) to Android TV assets!`);
  console.log(`📂 Destination: ${androidAssetPath}`);
  console.log('\nCatalog breakdown:');
  for (const key of showKeys) {
    const show = shows[key];
    console.log(`  • ${show.character || key}: ${show.title} (${show.episodes ? show.episodes.length : 0} eps)`);
  }
} catch (err) {
  console.error('❌ Failed to sync streams database:', err);
  process.exit(1);
}
