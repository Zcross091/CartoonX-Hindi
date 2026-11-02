'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, DownloadCloud, CheckCircle2, AlertCircle, X, ArrowUpCircle } from 'lucide-react';

interface UpdateData {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  downloadUrl: string;
  releaseNotes: string;
}

export const UpdateNotifier: React.FC = () => {
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Check for updates
  const checkForUpdates = async () => {
    try {
      let currentVersion = '1.0.0';
      let currentCode = 1;

      // Check if running inside native Android wrapper
      if (typeof window !== 'undefined' && (window as any).AndroidApp) {
        const androidApp = (window as any).AndroidApp;
        if (androidApp.getAppVersion) currentVersion = androidApp.getAppVersion();
        if (androidApp.getAppVersionCode) currentCode = androidApp.getAppVersionCode();
      }

      const res = await fetch(`/api/updates?currentVersion=${encodeURIComponent(currentVersion)}&currentCode=${currentCode}`);
      if (res.ok) {
        const data: UpdateData = await res.json();
        if (data.hasUpdate) {
          setUpdateData(data);
          setShowModal(true);
        }
      }
    } catch (e) {
      console.warn('Update check failed:', e);
    }
  };

  useEffect(() => {
    // Check 3 seconds after app launch
    const timer = setTimeout(checkForUpdates, 3000);

    // Register bridge callbacks for native Android updater
    if (typeof window !== 'undefined') {
      (window as any).onUpdateProgress = (percent: number, downloaded: number, total: number) => {
        setIsDownloading(true);
        setDownloadProgress(percent);
        const mb = (downloaded / (1024 * 1024)).toFixed(1);
        const totalMb = (total / (1024 * 1024)).toFixed(1);
        setDownloadSpeed(`${mb} MB / ${totalMb} MB (${percent}%)`);
      };

      (window as any).onUpdateComplete = () => {
        setIsDownloading(false);
        setStatusMessage('Launching package installer...');
      };

      (window as any).onUpdateError = (msg: string) => {
        setIsDownloading(false);
        setStatusMessage(`Update error: ${msg}`);
      };

      // Listen for custom trigger from Settings page
      window.addEventListener('check-for-updates', () => {
        checkForUpdates();
      });
    }

    return () => clearTimeout(timer);
  }, []);

  const handleStartUpdate = () => {
    if (!updateData) return;

    if (typeof window !== 'undefined' && (window as any).AndroidApp?.downloadAndInstallUpdate) {
      // In-app native update
      setIsDownloading(true);
      setDownloadProgress(1);
      setStatusMessage('Downloading new update in background...');
      (window as any).AndroidApp.downloadAndInstallUpdate(
        updateData.downloadUrl,
        updateData.latestVersion
      );
    } else {
      // Web / Browser download
      window.open(updateData.downloadUrl, '_blank');
      setShowModal(false);
    }
  };

  if (!showModal || !updateData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-400/50 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-center">
        {/* Close Button */}
        {!isDownloading && (
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-pink-500 p-0.5 shadow-xl shadow-orange-500/20">
          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            <ArrowUpCircle className="w-8 h-8 text-amber-400 animate-bounce-slow" />
          </div>
        </div>

        <div className="inline-block bg-amber-400/20 text-amber-300 font-extrabold text-[10px] px-3 py-1 rounded-full border border-amber-400/30 mb-2">
          In-Place Update Available
        </div>

        <h3 className="text-xl font-black text-white mb-1">
          New CartoonX Update! 🎉
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Version <strong className="text-white">{updateData.latestVersion}</strong> is ready. Updates in-place without losing your watch history or downloads!
        </p>

        {/* Release Notes */}
        <div className="bg-slate-800/80 rounded-2xl p-3.5 mb-5 text-left border border-slate-700/60 max-h-32 overflow-y-auto">
          <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
            What's New in this Update:
          </h4>
          <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
            {updateData.releaseNotes}
          </p>
        </div>

        {/* Progress Bar if Downloading */}
        {isDownloading ? (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400">Downloading Update...</span>
              <span className="text-white">{downloadProgress}%</span>
            </div>

            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{downloadSpeed}</span>
              <span className="text-emerald-400 font-bold">In-app installer</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-colors"
            >
              Later (बाद में)
            </button>

            <button
              onClick={handleStartUpdate}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black text-sm shadow-xl shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Update Now (अपडेट)</span>
            </button>
          </div>
        )}

        {statusMessage && (
          <p className="text-xs text-amber-300 font-bold mt-3">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
};

