/**
 * Types for CartoonX AnimeToonHindi Scraper Plugin
 */

export interface QualityOption {
  quality: '360p' | '480p' | '720p' | '1080p';
  label: string;
  size: string;
  url: string;
  mimeType: string;
}

export interface EpisodeStreamInfo {
  id: string;
  episodeNumber: number;
  seasonNumber?: number;
  title: string;
  videoId: string;
  watchUrl: string;
  downloadUrl?: string;
  sources: QualityOption[];
  resolvedAt?: string;
}

export interface ShowSearchResult {
  id: string;
  title: string;
  url: string;
  poster: string;
  character: string;
  serverType: string;
  isHindi: boolean;
}

export interface ShowStreamCatalog {
  id: string;
  title: string;
  query: string;
  character: string;
  sourceUrl: string;
  poster: string;
  backdrop: string;
  categories: string[];
  totalEpisodes: number;
  episodes: EpisodeStreamInfo[];
  updatedAt: string;
}

export interface PluginDatabase {
  version: string;
  updatedAt: string;
  shows: Record<string, ShowStreamCatalog>;
}

export interface ScraperOptions {
  maxEpisodesPerShow?: number;
  resolveStreamUrls?: boolean;
  preferredLanguage?: 'Hindi' | 'Telugu' | 'Tamil' | 'All';
  silent?: boolean;
}

