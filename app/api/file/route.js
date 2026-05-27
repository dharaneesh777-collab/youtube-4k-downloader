import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat, unlink } from 'fs/promises';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('path');

  if (!jobId || jobId.includes('..') || jobId.includes('/') || jobId.includes('\\')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), '.temp', `${jobId}.mp4`);

  try {
    const stats = await stat(filePath);
    const data = createReadStream(filePath);

    const res = new NextResponse(data, {
      status: 200,
      headers: new Headers({
        'Content-Disposition': `attachment; filename="video_${jobId}.mp4"`,
        'Content-Type': 'video/mp4',
        'Content-Length': stats.size.toString(),
      }),
    });

    data.on('close', () => {
      unlink(filePath).catch(console.error);
    });

    return res;
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
