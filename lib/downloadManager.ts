import { db, DownloadItem } from './db';

type ProgressCallback = (item: DownloadItem) => void;

class DownloadManager {
  private activeControllers = new Map<string, AbortController>();
  private listeners = new Set<ProgressCallback>();

  public subscribe(callback: ProgressCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(item: DownloadItem) {
    this.listeners.forEach((cb) => cb(item));
  }

  /**
   * Starts downloading an episode.
   */
  public async startDownload(params: {
    videoCode: string;
    showSlug: string;
    showTitle: string;
    episodeNumber: number;
    episodeTitle: string;
    poster: string;
    quality?: string;
  }): Promise<void> {
    const { videoCode, showSlug, showTitle, episodeNumber, episodeTitle, poster, quality = '720p' } = params;
    const id = videoCode;

    // Check if already in DB
    const existing = await db.downloads.get(id);
    if (existing && existing.status === 'completed') {
      return;
    }

    const newItem: DownloadItem = {
      id,
      showSlug,
      showTitle,
      episodeNumber,
      episodeTitle,
      poster,
      quality,
      videoCode,
      status: 'downloading',
      totalBytes: 0,
      downloadedBytes: 0,
      downloadSpeed: 'Starting...',
      createdAt: Date.now()
    };

    await db.downloads.put(newItem);
    this.notify(newItem);

    // Abort controller for pause/cancel
    const controller = new AbortController();
    this.activeControllers.set(id, controller);

    try {
      // 1. Fetch stream metadata from our internal API
      const metaRes = await fetch(`/api/stream/${videoCode}?quality=${encodeURIComponent(quality)}`, {
        signal: controller.signal
      });

      if (!metaRes.ok) {
        throw new Error(`Failed to resolve stream metadata (${metaRes.status})`);
      }

      const streamData = await metaRes.json();
      const targetSource = streamData.sources?.find((s: any) => s.label?.includes(quality)) || streamData.sources?.[0];
      if (!targetSource?.url) {
        throw new Error('No playable stream source found');
      }

      const masterPlaylistUrl = targetSource.url;

      // 2. Fetch master HLS playlist via our proxy
      const proxyM3u8Url = `/api/proxy?url=${encodeURIComponent(masterPlaylistUrl)}`;
      const playlistRes = await fetch(proxyM3u8Url, { signal: controller.signal });
      const playlistText = await playlistRes.text();

      // Determine segment URLs
      const lines = playlistText.split('\n');
      let segmentUrls: string[] = [];

      // Check if it's a master playlist pointing to sub-variants
      const subVariant = lines.find((l) => l.trim().startsWith('/api/proxy') || l.trim().includes('.m3u8'));
      if (subVariant && !lines.some((l) => l.includes('.ts'))) {
        const subRes = await fetch(subVariant.trim(), { signal: controller.signal });
        const subText = await subRes.text();
        segmentUrls = subText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('/api/proxy') || l.endsWith('.ts'));
      } else {
        segmentUrls = lines
          .map((l) => l.trim())
          .filter((l) => l.startsWith('/api/proxy') || l.endsWith('.ts'));
      }

      if (segmentUrls.length === 0) {
        throw new Error('No video segments found in playlist');
      }

      const totalSegments = segmentUrls.length;
      const chunks: ArrayBuffer[] = [];
      let totalDownloaded = 0;
      let startTime = Date.now();
      let lastBytes = 0;

      for (let i = 0; i < segmentUrls.length; i++) {
        if (controller.signal.aborted) break;

        const segUrl = segmentUrls[i];
        const segRes = await fetch(segUrl, { signal: controller.signal });
        if (!segRes.ok) throw new Error(`Segment fetch failed at index ${i}`);

        const arrayBuf = await segRes.arrayBuffer();
        chunks.push(arrayBuf);
        totalDownloaded += arrayBuf.byteLength;

        // Calculate download speed every 2 seconds or 5 segments
        const elapsedSec = (Date.now() - startTime) / 1000;
        let speedStr = 'Calculating...';
        if (elapsedSec > 0.5) {
          const bytesDiff = totalDownloaded - lastBytes;
          const mbps = (bytesDiff / elapsedSec / (1024 * 1024)).toFixed(1);
          speedStr = `${mbps} MB/s`;
          startTime = Date.now();
          lastBytes = totalDownloaded;
        }

        // Estimate total bytes based on average segment size
        const avgSegmentSize = totalDownloaded / (i + 1);
        const estimatedTotal = Math.round(avgSegmentSize * totalSegments);

        // Update progress in DB
        newItem.downloadedBytes = totalDownloaded;
        newItem.totalBytes = estimatedTotal;
        newItem.downloadSpeed = speedStr;

        await db.downloads.update(id, {
          downloadedBytes: totalDownloaded,
          totalBytes: estimatedTotal,
          downloadSpeed: speedStr
        });
        this.notify(newItem);
      }

      // Finish download: assemble Blob
      const videoBlob = new Blob(chunks, { type: 'video/mp2t' });
      newItem.status = 'completed';
      newItem.blobData = videoBlob;
      newItem.downloadSpeed = 'Completed';
      newItem.completedAt = Date.now();

      await db.downloads.update(id, {
        status: 'completed',
        blobData: videoBlob,
        downloadSpeed: 'Completed',
        completedAt: Date.now()
      });
      this.notify(newItem);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        newItem.status = 'paused';
        newItem.downloadSpeed = 'Paused';
        await db.downloads.update(id, { status: 'paused', downloadSpeed: 'Paused' });
      } else {
        newItem.status = 'failed';
        newItem.downloadSpeed = 'Failed';
        await db.downloads.update(id, { status: 'failed', downloadSpeed: 'Failed' });
      }
      this.notify(newItem);
    } finally {
      this.activeControllers.delete(id);
    }
  }

  public cancelDownload(id: string) {
    const controller = this.activeControllers.get(id);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(id);
    }
    db.downloads.delete(id);
  }

  public async deleteDownload(id: string) {
    this.cancelDownload(id);
    await db.downloads.delete(id);
  }

  public getOfflineUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  public exportBlobToFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public async getStorageEstimate(): Promise<{ usedBytes: number; quotaBytes: number; percent: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 1;
      return {
        usedBytes: used,
        quotaBytes: quota,
        percent: Math.min(100, Math.round((used / quota) * 100))
      };
    }
    return { usedBytes: 0, quotaBytes: 1024 * 1024 * 1024, percent: 0 };
  }
}

export const downloadManager = new DownloadManager();

