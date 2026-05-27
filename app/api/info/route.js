import { NextResponse } from 'next/server';

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Use YouTube oEmbed API — works from any IP, no auth needed
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );

    if (!oembedRes.ok) {
      return NextResponse.json({ error: 'Invalid YouTube URL or video not found' }, { status: 400 });
    }

    const oembed = await oembedRes.json();
    const videoId = extractVideoId(url);

    return NextResponse.json({
      title: oembed.title,
      author: oembed.author_name,
      thumbnail: videoId
        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        : oembed.thumbnail_url,
      thumbnailFallback: oembed.thumbnail_url,
      videoId,
    });
  } catch (error) {
    console.error('Error fetching video info:', error);
    return NextResponse.json({ error: 'Failed to fetch video information' }, { status: 500 });
  }
}
