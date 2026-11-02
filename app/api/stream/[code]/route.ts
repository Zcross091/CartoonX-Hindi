import { NextRequest, NextResponse } from 'next/server';
import { resolveStreamSources } from '@/lib/decryptor';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code;
    if (!code) {
      return NextResponse.json({ error: 'Video code is required' }, { status: 400 });
    }

    const streamData = await resolveStreamSources(code);

    // Map each source with a proxied URL that bypasses browser CORS
    const proxiedSources = streamData.sources.map((s) => ({
      ...s,
      directUrl: s.url,
      proxiedUrl: `/api/proxy?url=${encodeURIComponent(s.url)}`
    }));

    return NextResponse.json({
      ...streamData,
      sources: proxiedSources
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120',
      }
    });
  } catch (err: any) {
    console.error('Error in /api/stream/[code]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to resolve stream sources' },
      { status: 500 }
    );
  }
}

