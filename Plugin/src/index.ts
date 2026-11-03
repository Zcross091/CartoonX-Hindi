/**
 * CartoonX AnimeToonHindi Plugin
 * Entry point and public API
 */

import * as path from 'path';
import {
  searchStore,
  scrapeShow,
  normalizeQuery,
  detectCharacter,
  cleanHtmlText,
} from './scraper';
import { resolveCodedewZipper } from './resolver';
import { extractStreamQualities } from './extractor';
import {
  readToonList,
  scrapeAllToons,
  watchToonFile,
  loadDatabase,
  saveDatabase,
} from './toonWatcher';
import {
  QualityOption,
  EpisodeStreamInfo,
  ShowSearchResult,
  ShowStreamCatalog,
  PluginDatabase,
  ScraperOptions,
} from './types';

export class AnimeToonPlugin {
  private toonFilePath: string;
  private dbPath: string;

  constructor(options: { toonFilePath?: string; dbPath?: string } = {}) {
    const pluginDir = __dirname;
    this.toonFilePath = options.toonFilePath || path.resolve(pluginDir, '..', 'toonname.txt');
    this.dbPath = options.dbPath || path.resolve(pluginDir, '..', 'streams.json');
  }

  /**
   * Searches AnimeToonHindi store for cartoons
   */
  async search(query: string, options: { maxPages?: number } = {}): Promise<ShowSearchResult[]> {
    return searchStore(query, options);
  }

  /**
   * Scrapes a show page from its archive URL
   */
  async getShow(postUrl: string, query?: string, options?: ScraperOptions): Promise<ShowStreamCatalog | null> {
    return scrapeShow(postUrl, query || 'Show', options);
  }

  /**
   * Resolves direct MP4 stream sources for any video ID on Razorshell / JuicyCodes
   */
  async resolveStreams(videoId: string): Promise<QualityOption[]> {
    return extractStreamQualities(videoId);
  }

  /**
   * Scrapes all cartoons currently listed in toonname.txt
   */
  async scrapeCatalog(options?: ScraperOptions): Promise<PluginDatabase> {
    return scrapeAllToons(this.toonFilePath, {
      ...options,
      dbPath: this.dbPath,
    });
  }

  /**
   * Returns current cached catalog database
   */
  getCatalog(): PluginDatabase {
    return loadDatabase(this.dbPath);
  }

  /**
   * Watches toonname.txt for added cartoons and triggers auto-scraping
   */
  watch(options?: ScraperOptions) {
    return watchToonFile(this.toonFilePath, {
      ...options,
      dbPath: this.dbPath,
    });
  }
}

// Default export
export default AnimeToonPlugin;

// Named exports
export {
  searchStore,
  scrapeShow,
  resolveCodedewZipper,
  extractStreamQualities,
  readToonList,
  scrapeAllToons,
  watchToonFile,
  loadDatabase,
  saveDatabase,
  normalizeQuery,
  detectCharacter,
  cleanHtmlText,
};

// Export types
export * from './types';

