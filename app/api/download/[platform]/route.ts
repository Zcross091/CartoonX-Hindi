import { NextRequest, NextResponse } from 'next/server';

const GITHUB_REPO = 'Zcross091/CartoonX-Hindi';

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform?.toLowerCase();

  let assetName = '';
  let downloadFilename = '';
  let contentType = '';

  if (platform === 'android' || platform === 'android-tv' || platform === 'apk') {
    assetName = 'CartoonX-AndroidTV-Signed.apk';
    downloadFilename = 'CartoonX-AndroidTV-v1.0.0.apk';
    contentType = 'application/vnd.android.package-archive';
  } else if (platform === 'apple' || platform === 'apple-tv' || platform === 'tvos' || platform === 'zip') {
    assetName = 'CartoonX-AppleTV-tvOS.zip';
    downloadFilename = 'CartoonX-AppleTV-tvOS-v1.0.0.zip';
    contentType = 'application/zip';
  } else {
    return NextResponse.json(
      { error: 'Invalid platform. Supported platforms: android, apple' },
      { status: 400 }
    );
  }

  const directGithubDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/latest/download/${assetName}`;

  try {
    // Follow redirect to obtain direct blob storage stream
    const upstreamResponse = await fetch(directGithubDownloadUrl, {
      headers: {
        'User-Agent': 'CartoonX-Web/1.0',
        'Accept': '*/*'
      },
      redirect: 'follow',
      cache: 'no-store'
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      // Fallback: If streaming fails, direct 302 redirect so user still receives the file
      return NextResponse.redirect(directGithubDownloadUrl, { status: 302 });
    }

    // Stream the binary file directly to user with attachment headers
    // The user's browser immediately downloads the file directly without any GitHub page
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');

    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(upstreamResponse.body as unknown as BodyInit, {
      status: 200,
      headers
    });
  } catch (err) {
    console.error(`Direct download proxy error for ${platform}:`, err);
    return NextResponse.redirect(directGithubDownloadUrl, { status: 302 });
  }
}
