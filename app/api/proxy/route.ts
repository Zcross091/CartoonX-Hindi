import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Referer': 'https://bysekoze.com/'
      }
    });

    if (!res.ok) {
      return new NextResponse(`Target responded with ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || '';
    const isM3U8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl');

    if (isM3U8) {
      const playlistText = await res.text();
      const baseUrl = new URL(targetUrl);

      // Rewrite playlist URIs to route through our proxy
      const rewritten = playlistText.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          // Check for URI inside tag, e.g. URI="index.m3u8"
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const abs = new URL(uri, baseUrl).toString();
              return `URI="/api/proxy?url=${encodeURIComponent(abs)}"`;
            });
          }
          return line;
        }

        // Relative or absolute URL line
        const absUrl = new URL(trimmed, baseUrl).toString();
        return `/api/proxy?url=${encodeURIComponent(absUrl)}`;
      }).join('\n');

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // Binary segment (.ts or video chunk)
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'video/MP2T',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err: any) {
    console.error('Error in /api/proxy:', err);
    return new NextResponse(err.message || 'Proxy error', { status: 500 });
  }
}

