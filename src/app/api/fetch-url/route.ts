import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 使用原生 fetch 获取 URL 内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch URL' },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const content = await response.text();

    return NextResponse.json({
      content,
      contentType,
      status: response.status,
    });
  } catch (error) {
    console.error('Fetch URL error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch URL' },
      { status: 500 }
    );
  }
}
