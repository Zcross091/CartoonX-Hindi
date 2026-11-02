import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CURRENT_VERSION = '1.0.0';
const CURRENT_VERSION_CODE = 1;
const GITHUB_REPO = 'Zcross091/CartoonX-Hindi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientVersion = searchParams.get('currentVersion') || CURRENT_VERSION;
    const clientCode = parseInt(searchParams.get('currentCode') || `${CURRENT_VERSION_CODE}`, 10);

    let latestVersion = CURRENT_VERSION;
    let latestVersionCode = CURRENT_VERSION_CODE;
    let downloadUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;
    let releaseNotes = 'Latest Hindi cartoon streaming platform updates, new episodes, and performance improvements.';
    let hasUpdate = false;

    // Check GitHub Releases API
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: {
          'User-Agent': 'CartoonX-Updater/1.0',
          'Accept': 'application/vnd.github.v3+json'
        },
        next: { revalidate: 60 }
      });

      if (ghRes.ok) {
        const release = await ghRes.json();
        const tag = release.tag_name ? release.tag_name.replace(/^v/, '') : CURRENT_VERSION;
        latestVersion = tag;
        releaseNotes = release.body || releaseNotes;

        // Find APK asset in release
        const apkAsset = release.assets?.find((a: any) => a.name.endsWith('.apk'));
        if (apkAsset && apkAsset.browser_download_url) {
          downloadUrl = apkAsset.browser_download_url;
        }

        // Parse version code or compare semver
        const tagParts = tag.split('.').map((p: string) => parseInt(p, 10) || 0);
        const curParts = clientVersion.split('.').map((p: string) => parseInt(p, 10) || 0);

        if (
          tagParts[0] > curParts[0] ||
          (tagParts[0] === curParts[0] && tagParts[1] > curParts[1]) ||
          (tagParts[0] === curParts[0] && tagParts[1] === curParts[1] && tagParts[2] > curParts[2])
        ) {
          hasUpdate = true;
        }
      }
    } catch (e) {
      console.warn('GitHub Releases check failed, fallback to local config:', e);
    }

    return NextResponse.json({
      currentVersion: clientVersion,
      latestVersion,
      latestVersionCode,
      hasUpdate,
      downloadUrl,
      releaseNotes,
      appName: 'CartoonX Hindi'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (err: any) {
    console.error('Error in /api/updates:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to check for updates' },
      { status: 500 }
    );
  }
}

