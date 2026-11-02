import { NextRequest, NextResponse } from 'next/server';
import { getCatalog } from '@/lib/raretoon';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '16', 10);
    const search = searchParams.get('search') || undefined;
    const categorySlug = searchParams.get('category') || undefined;

    const catalog = await getCatalog({
      page,
      perPage,
      search,
      categorySlug
    });

    return NextResponse.json(catalog, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      }
    });
  } catch (err: any) {
    console.error('Error in /api/catalog:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}

