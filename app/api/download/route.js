import { NextResponse } from 'next/server';

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt-api.kwiatekmiki.com',
];

async function tryDownload(url, videoQuality) {
  const body = JSON.stringify({
    url,
    videoQuality: videoQuality || '2160',
    filenameStyle: 'pretty',
    youtubeVideoCodec: 'h264',
  });

  for (const instance of COBALT_INSTANCES) {
    try {
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });

      const data = await res.json();

      if (data.status === 'tunnel' || data.status === 'redirect') {
        return { success: true, url: data.url, filename: data.filename || 'video.mp4' };
      }

      if (data.status === 'picker' && data.picker && data.picker.length > 0) {
        // Return first (best) option from picker
        return { success: true, url: data.picker[0].url, filename: 'video.mp4' };
      }

      console.error(`Cobalt instance ${instance} returned:`, data);
    } catch (err) {
      console.error(`Cobalt instance ${instance} failed:`, err.message);
    }
  }

  return { success: false, error: 'All download services are currently unavailable. Please try again later.' };
}

export async function POST(request) {
  try {
    const { url, quality } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const result = await tryDownload(url, quality);

    if (result.success) {
      return NextResponse.json({
        downloadUrl: result.url,
        filename: result.filename,
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to process download request' }, { status: 500 });
  }
}
