'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  DownloadCloud, 
  Play, 
  Trash2, 
  Pause, 
  HardDrive, 
  CheckCircle2, 
  FileDown, 
  Sparkles, 
  AlertCircle,
  WifiOff
} from 'lucide-react';
import { db, DownloadItem } from '@/lib/db';
import { downloadManager } from '@/lib/downloadManager';
import { VideoPlayer } from '@/components/VideoPlayer';

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number; percent: number }>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
    percent: 0
  });

  const [activeOfflineItem, setActiveOfflineItem] = useState<{
    item: DownloadItem;
    blobUrl: string;
  } | null>(null);

  const loadDownloads = async () => {
    const all = await db.downloads.orderBy('createdAt').reverse().toArray();
    setDownloads(all);

    const storage = await downloadManager.getStorageEstimate();
    setStorageInfo(storage);
  };

  useEffect(() => {
    loadDownloads();
    // Subscribe to live download progress updates
    const unsubscribe = downloadManager.subscribe(() => {
      loadDownloads();
    });

    const interval = setInterval(loadDownloads, 2000);
    return () => {
      unsubscribe();
      clearInterval(interval);
      if (activeOfflineItem?.blobUrl) {
        URL.revokeObjectURL(activeOfflineItem.blobUrl);
      }
    };
  }, []);

  const handlePlayOffline = (item: DownloadItem) => {
    if (!item.blobData) return;
    if (activeOfflineItem?.blobUrl) {
      URL.revokeObjectURL(activeOfflineItem.blobUrl);
    }
    const blobUrl = downloadManager.getOfflineUrl(item.blobData);
    setActiveOfflineItem({ item, blobUrl });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this downloaded episode to free space?')) {
      await downloadManager.deleteDownload(id);
      loadDownloads();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete ALL downloaded cartoons?')) {
      await db.downloads.clear();
      loadDownloads();
    }
  };

  const handleExportMp4 = (item: DownloadItem) => {
    if (item.blobData) {
      downloadManager.exportBlobToFile(
        item.blobData,
        `${item.showTitle} - ${item.episodeTitle}`
      );
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const activeQueue = downloads.filter((d) => d.status === 'downloading' || d.status === 'queued' || d.status === 'paused');
  const completedList = downloads.filter((d) => d.status === 'completed');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Offline Modal Player */}
      {activeOfflineItem && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <WifiOff className="w-5 h-5" />
              <span>Offline Video Player (No Internet Required)</span>
            </div>
            <button
              onClick={() => {
                URL.revokeObjectURL(activeOfflineItem.blobUrl);
                setActiveOfflineItem(null);
              }}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800"
            >
              Close Offline Player
            </button>
          </div>

          <VideoPlayer
            blobUrl={activeOfflineItem.blobUrl}
            title={activeOfflineItem.item.showTitle}
            episodeTitle={activeOfflineItem.item.episodeTitle}
            episodeNumber={activeOfflineItem.item.episodeNumber}
            showSlug={activeOfflineItem.item.showSlug}
            videoCode={activeOfflineItem.item.videoCode}
            poster={activeOfflineItem.item.poster}
          />
        </div>
      )}

      {/* Header & Storage Meter */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <DownloadCloud className="w-8 h-8 text-emerald-400" />
              <span>In-App Download Manager (ऑफलाइन)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Watch downloaded Hindi cartoons on planes, trains, and road trips without internet!
            </p>
          </div>

          {completedList.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all self-start sm:self-auto"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Downloads</span>
            </button>
          )}
        </div>

        {/* Device Storage Bar */}
        <div className="pt-2 border-t border-slate-700/60">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Device Storage Used:</span>
              <strong className="text-white">{formatBytes(storageInfo.usedBytes)}</strong>
            </span>
            <span className="text-slate-400">
              Total Device Quota: {formatBytes(storageInfo.quotaBytes)}
            </span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, storageInfo.percent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Download Queue */}
      {activeQueue.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
            <span>Active Downloads ({activeQueue.length})</span>
          </h2>

          <div className="space-y-3">
            {activeQueue.map((item) => {
              const percent = item.totalBytes > 0
                ? Math.min(100, Math.round((item.downloadedBytes / item.totalBytes) * 100))
                : 0;

              return (
                <div
                  key={item.id}
                  className="glass-card p-4 rounded-2xl border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative w-16 h-12 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0">
                      <Image
                        src={item.poster}
                        alt={item.episodeTitle}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-white truncate">
                        {item.episodeTitle}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">
                        {item.showTitle} • <span className="text-amber-400 font-bold">{item.quality}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress & Speed */}
                  <div className="flex-1 max-w-xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-400">{item.downloadSpeed}</span>
                      <span className="text-white">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadManager.cancelDownload(item.id)}
                      className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                      title="Cancel Download"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Downloaded Cartoons List */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Downloaded Cartoons Ready Offline ({completedList.length})</span>
        </h2>

        {completedList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedList.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-3xl overflow-hidden glass-card border border-slate-700/60 hover:border-emerald-400/50 transition-all hover:shadow-xl"
              >
                {/* Poster */}
                <div className="relative aspect-video w-full bg-slate-800 overflow-hidden">
                  <Image
                    src={item.poster}
                    alt={item.episodeTitle}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-slate-950/40" />

                  {/* Play Button Overlay */}
                  <button
                    onClick={() => handlePlayOffline(item)}
                    className="absolute inset-0 flex items-center justify-center focus:outline-none"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 fill-current ml-0.5" />
                    </div>
                  </button>

                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-emerald-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-emerald-400/30">
                    Offline Ready
                  </div>

                  <div className="absolute bottom-3 right-3 bg-slate-900/90 text-white font-bold text-[10px] px-2 py-0.5 rounded">
                    {formatBytes(item.totalBytes || item.downloadedBytes)}
                  </div>
                </div>

                {/* Details & Actions */}
                <div className="p-4 bg-slate-900/90 flex flex-col justify-between flex-1">
                  <div>
                    <h4 className="font-extrabold text-sm text-white truncate">
                      {item.episodeTitle}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {item.showTitle} • Hindi Dubbed
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handlePlayOffline(item)}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch (देखें)</span>
                    </button>

                    <button
                      onClick={() => handleExportMp4(item)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title="Save MP4 to Device Gallery"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                      title="Delete Download"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center glass-panel rounded-3xl max-w-md mx-auto p-8 space-y-4">
            <DownloadCloud className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-black text-white">No Downloaded Cartoons Yet</h3>
            <p className="text-xs text-slate-400">
              Browse any cartoon show and click the download button on any episode to watch offline without Wi-Fi!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs"
            >
              Browse Shows
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

