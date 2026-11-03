/**
 * Toon List Watcher & Batch Scraper
 */

import * as fs from 'fs';
import * as path from 'path';
import { searchStore, scrapeShow, normalizeQuery } from './scraper';
import { PluginDatabase, ShowStreamCatalog, ScraperOptions } from './types';

const DB_FILE_NAME = 'streams.json';

/**
 * Parses toonname.txt into an array of clean cartoon names
 */
export function readToonList(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const toons: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Skip 'etc' or placeholders
    if (/^(etc|and\s+more|\.\.\.)$/i.test(trimmed)) continue;
    toons.push(trimmed);
  }

  return Array.from(new Set(toons));
}

/**
 * Loads the existing streams database or initializes a new one
 */
export function loadDatabase(dbPath: string): PluginDatabase {
  if (fs.existsSync(dbPath)) {
    try {
      const content = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      // Fallback
    }
  }

  return {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    shows: {},
  };
}

/**
 * Saves database to disk safely
 */
export function saveDatabase(dbPath: string, db: PluginDatabase) {
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

/**
 * Scrapes all cartoons listed in toonname.txt
 */
export async function scrapeAllToons(
  toonFilePath: string,
  options: ScraperOptions & { dbPath?: string } = {}
): Promise<PluginDatabase> {
  const pluginDir = path.dirname(toonFilePath);
  const dbPath = options.dbPath || path.join(pluginDir, DB_FILE_NAME);
  const db = loadDatabase(dbPath);

  const toons = readToonList(toonFilePath);
  const log = options.silent ? () => {} : console.log;

  log(`\n======================================================`);
  log(` CartoonX AnimeToonHindi Scraper Plugin`);
  log(` Found ${toons.length} cartoon(s) in: ${path.basename(toonFilePath)}`);
  log(`======================================================\n`);

  for (let i = 0; i < toons.length; i++) {
    const toon = toons[i];
    const normalized = normalizeQuery(toon);
    log(`[${i + 1}/${toons.length}] Processing: "${toon}"...`);

    try {
      let searchResults = await searchStore(normalized, { maxPages: 3 });
      if (searchResults.length === 0 || !searchResults.some((r) => r.isHindi)) {
        const hindiSearch = await searchStore(`${normalized} hindi`, { maxPages: 3 });
        searchResults = [...searchResults, ...hindiSearch];
      }

      let scrapedCatalog: ShowStreamCatalog | null = null;

      // Try top releases until we get valid episodes
      for (const result of searchResults.slice(0, 6)) {
        log(`  ⏳ Scraping: ${result.title} (${result.url})...`);
        const show = await scrapeShow(result.url, toon, options);
        if (show && show.episodes.length > 0) {
          scrapedCatalog = show;
          break;
        }
      }

      // If full query didn't yield working links, try simplified keyword
      if (!scrapedCatalog) {
        let fallbackQuery: string | null = null;
        if (/courage/i.test(normalized)) fallbackQuery = 'courage hindi';
        else if (/ben\s+10/i.test(normalized)) fallbackQuery = 'ben 10';
        else if (normalized.split(/\s+/).length > 2) fallbackQuery = normalized.split(/\s+/).slice(0, 2).join(' ') + ' hindi';

        if (fallbackQuery && fallbackQuery.toLowerCase() !== normalized.toLowerCase()) {
          log(`  🔄 Falling back to search keyword: "${fallbackQuery}"...`);
          const fallbackResults = await searchStore(fallbackQuery, { maxPages: 3 });
          for (const result of fallbackResults.slice(0, 6)) {
            log(`  ⏳ Scraping: ${result.title}...`);
            const show = await scrapeShow(result.url, toon, options);
            if (show && show.episodes.length > 0) {
              scrapedCatalog = show;
              break;
            }
          }
        }
      }

      if (!scrapedCatalog) {
        log(`  ❌ Could not resolve playable stream links for "${toon}"`);
        continue;
      }

      db.shows[toon.toLowerCase()] = scrapedCatalog;
      saveDatabase(dbPath, db);

      const streamCount = scrapedCatalog.episodes.filter(e => e.sources.length > 0).length;
      log(`  ✅ Successfully cataloged "${scrapedCatalog.title}": ${scrapedCatalog.episodes.length} episodes (${streamCount} with direct MP4 streams)`);
    } catch (err: any) {
      log(`  ❌ Error processing "${toon}": ${err.message}`);
    }
  }

  log(`\n🎉 Scraping complete! Database saved to: ${dbPath}\n`);
  return db;
}

/**
 * Watches toonname.txt for added cartoons and scrapes them automatically
 */
export function watchToonFile(
  toonFilePath: string,
  options: ScraperOptions & { dbPath?: string } = {}
) {
  const pluginDir = path.dirname(toonFilePath);
  const dbPath = options.dbPath || path.join(pluginDir, DB_FILE_NAME);
  let debounceTimeout: NodeJS.Timeout | null = null;
  let isProcessing = false;

  console.log(`👀 Watching for changes in: ${toonFilePath}`);
  console.log(`   (Add any new cartoon line to the file to trigger auto-scraping)\n`);

  const processChanges = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const currentToons = readToonList(toonFilePath);
      const db = loadDatabase(dbPath);
      const missingToons = currentToons.filter(t => !db.shows[t.toLowerCase()]);

      if (missingToons.length > 0) {
        console.log(`\n🔔 Detected ${missingToons.length} new cartoon(s) added: ${missingToons.join(', ')}`);
        for (const toon of missingToons) {
          console.log(`🚀 Auto-scraping new toon: "${toon}"...`);
          const searchResults = await searchStore(normalizeQuery(toon), { maxPages: 2 });
          if (searchResults.length > 0) {
            const show = await scrapeShow(searchResults[0].url, toon, options);
            if (show) {
              db.shows[toon.toLowerCase()] = show;
              saveDatabase(dbPath, db);
              console.log(`✅ Added "${show.title}" (${show.episodes.length} eps) to ${DB_FILE_NAME}`);
            }
          }
        }
      }
    } catch (e: any) {
      console.error(`Watcher error: ${e.message}`);
    } finally {
      isProcessing = false;
    }
  };

  const watcher = fs.watch(toonFilePath, (eventType) => {
    if (eventType === 'change') {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(processChanges, 800);
    }
  });

  return watcher;
}
