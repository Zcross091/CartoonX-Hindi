import { NextRequest, NextResponse } from 'next/server';
import { getShowBySlug } from '@/lib/raretoon';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const show = await getShowBySlug(slug);
    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    return NextResponse.json(show, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      }
    });
  } catch (err: any) {
    console.error('Error in /api/show/[slug]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch show details' },
      { status: 500 }
    );
  }
}

