/**
 * CartoonX Integration Bridge for AnimeToonHindi Plugin
 */

import * as fs from 'fs';
import * as path from 'path';
import { Episode, ShowSummary, ShowDetail } from './raretoon';
import { StreamSource, DecryptedStreamResult } from './decryptor';

const PLUGIN_DIR = path.join(process.cwd(), 'Plugin');
const DB_PATH = path.join(PLUGIN_DIR, 'streams.json');
const TOON_FILE = path.join(PLUGIN_DIR, 'toonname.txt');

interface PluginDbShow {
  id: string;
  title: string;
  query: string;
  character: string;
  sourceUrl: string;
  poster: string;
  backdrop: string;
  categories: string[];
  totalEpisodes: number;
  episodes: Array<{
    id: string;
    episodeNumber: number;
    seasonNumber?: number;
    title: string;
    videoId: string;
    watchUrl: string;
    downloadUrl?: string;
    sources: Array<{
      quality: string;
      label: string;
      size: string;
      url: string;
      mimeType: string;
    }>;
  }>;
  updatedAt: string;
}

/**
 * Loads the current plugin database
 */
export function getAnimeToonDatabase(): Record<string, PluginDbShow> {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      return data.shows || {};
    }
  } catch (e) {
    console.error('Error reading AnimeToon database:', e);
  }
  return {};
}

/**
 * Converts AnimeToon show entries to CartoonX ShowSummary format
 */
export function getAnimeToonCatalog(): ShowSummary[] {
  const db = getAnimeToonDatabase();
  const shows: ShowSummary[] = [];

  for (const [key, show] of Object.entries(db)) {
    const slug = `animetoon-${key.replace(/\s+/g, '-')}`;
    shows.push({
      id: show.id as any,
      title: show.title,
      slug,
      poster: show.poster || 'https://static.tvmaze.com/uploads/images/original_untouched/6/16288.jpg',
      backdrop: show.backdrop || 'https://static.tvmaze.com/uploads/images/original_untouched/225/563589.jpg',
      categories: show.categories || [show.character, 'Hindi Dubbed', 'AnimeToonHindi'],
      character: show.character,
      isMovie: show.title.toLowerCase().includes('movie'),
      date: show.updatedAt || new Date().toISOString(),
      excerpt: `AnimeToonHindi catalog release with ${show.totalEpisodes} episodes available for streaming.`,
    });
  }

  return shows;
}

/**
 * Returns ShowDetail for a given slug from AnimeToon plugin
 */
export function getAnimeToonShowBySlug(slug: string): ShowDetail | null {
  const db = getAnimeToonDatabase();
  const key = slug.replace(/^animetoon-/, '').replace(/-/g, ' ');

  const show = db[key] || Object.values(db).find((s) => s.title.toLowerCase().includes(key.toLowerCase()));
  if (!show) return null;

  const episodes: Episode[] = show.episodes.map((ep) => ({
    id: ep.id,
    episodeNumber: ep.episodeNumber,
    title: ep.title,
    videoCode: ep.videoId,
    watchUrl: ep.watchUrl,
    downloadUrl: ep.downloadUrl,
  }));

  return {
    id: show.id as any,
    title: show.title,
    slug,
    poster: show.poster,
    backdrop: show.backdrop,
    categories: show.categories,
    character: show.character,
    isMovie: show.title.toLowerCase().includes('movie'),
    date: show.updatedAt,
    excerpt: `AnimeToonHindi release with ${show.totalEpisodes} episodes.`,
    content: `<p>AnimeToonHindi streaming release for ${show.title}. Sourced from store.animetoonhindi.com.</p>`,
    synopsis: `${show.title} in Hindi Dubbed audio with high quality streaming and download options.`,
    episodes,
    genres: ['Animation', 'Comedy', 'Adventure', 'Hindi Dubbed'],
    language: 'Hindi Dubbed',
    network: 'AnimeToonHindi',
  };
}

/**
 * Resolves stream sources for an AnimeToon episode or videoCode
 */
export async function resolveAnimeToonStream(videoCode: string): Promise<DecryptedStreamResult | null> {
  const db = getAnimeToonDatabase();

  // First check if already resolved in streams.json
  for (const show of Object.values(db)) {
    const ep = show.episodes.find((e) => e.videoId === videoCode || e.id.includes(videoCode));
    if (ep && ep.sources && ep.sources.length > 0) {
      const sources: StreamSource[] = ep.sources.map((s) => ({
        quality: s.quality,
        label: s.label,
        mime_type: s.mimeType || 'video/mp4',
        url: s.url,
      }));

      return {
        sources,
        tracks: [],
        poster_url: show.poster,
        duration: 0,
        title: `${show.title} - ${ep.title}`,
      };
    }
  }

  // If not cached, dynamically extract from Razorshell
  try {
    const { extractStreamQualities } = require('../Plugin/index.js');
    const qualities = await extractStreamQualities(videoCode);
    if (qualities && qualities.length > 0) {
      const sources: StreamSource[] = qualities.map((s: any) => ({
        quality: s.quality,
        label: s.label,
        mime_type: s.mimeType || 'video/mp4',
        url: s.url,
      }));

      return {
        sources,
        tracks: [],
        poster_url: '',
        duration: 0,
        title: `Episode (${videoCode})`,
      };
    }
  } catch (err) {
    console.error('Error resolving dynamic AnimeToon stream:', err);
  }

  return null;
}

