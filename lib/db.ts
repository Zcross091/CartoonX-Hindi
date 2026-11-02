import Dexie, { Table } from 'dexie';

export interface DownloadItem {
  id: string; // videoCode or episode id
  showSlug: string;
  showTitle: string;
  episodeNumber: number;
  episodeTitle: string;
  poster: string;
  quality: string;
  videoCode: string;
  status: 'queued' | 'downloading' | 'completed' | 'paused' | 'failed';
  totalBytes: number;
  downloadedBytes: number;
  downloadSpeed: string;
  blobData?: Blob;
  createdAt: number;
  completedAt?: number;
}

export interface WatchHistoryItem {
  id: string; // videoCode
  showSlug: string;
  showTitle: string;
  episodeTitle: string;
  episodeNumber: number;
  poster: string;
  currentTime: number;
  duration: number;
  progress: number; // 0 - 100%
  lastWatched: number;
}

export interface FavoriteItem {
  id: string; // showSlug
  title: string;
  poster: string;
  character: string;
  isMovie: boolean;
  addedAt: number;
}

export class CartoonXDatabase extends Dexie {
  downloads!: Table<DownloadItem, string>;
  history!: Table<WatchHistoryItem, string>;
  favorites!: Table<FavoriteItem, string>;

  constructor() {
    super('CartoonXDB');
    this.version(1).stores({
      downloads: 'id, showSlug, status, createdAt',
      history: 'id, showSlug, lastWatched',
      favorites: 'id, addedAt'
    });
  }
}

export const db = new CartoonXDatabase();

