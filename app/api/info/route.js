import { NextResponse } from 'next/server';
import { create } from 'youtube-dl-exec';
import path from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

function findYtDlp() {
  // 1. Check node_modules (local dev on Windows)
  const localBin = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
  if (existsSync(localBin)) return localBin;

  // 2. Check for Linux binary in node_modules
  const linuxBin = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
  if (existsSync(linuxBin)) return linuxBin;

  // 3. Check system PATH
  try {
    const sysPath = execSync('which yt-dlp 2>/dev/null || where yt-dlp 2>nul', { encoding: 'utf8' }).trim().split('\n')[0];
    if (sysPath) return sysPath;
  } catch {}

  // 4. Fallback
  return 'yt-dlp';
}

const youtubedl = create(findYtDlp());

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      referer: url
    });

    return NextResponse.json(info);
  } catch (error) {
    console.error('Error fetching video info:', error);
    return NextResponse.json({ error: 'Failed to fetch video information' }, { status: 500 });
  }
}
