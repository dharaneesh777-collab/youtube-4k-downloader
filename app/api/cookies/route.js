import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('cookies');

    if (!file) {
      return NextResponse.json({ error: 'No cookies file uploaded' }, { status: 400 });
    }

    const cookiesDir = path.join(process.cwd(), 'cookies');
    try { await mkdir(cookiesDir, { recursive: true }); } catch (e) {}

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const cookiePath = path.join(cookiesDir, 'cookies.txt');

    await writeFile(cookiePath, buffer);

    return NextResponse.json({ success: true, message: 'Cookies uploaded successfully' });
  } catch (error) {
    console.error('Error uploading cookies:', error);
    return NextResponse.json({ error: 'Failed to upload cookies' }, { status: 500 });
  }
}
