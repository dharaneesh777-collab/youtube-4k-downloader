import { NextResponse } from 'next/server';
import { execSync, execFileSync } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

function findYtDlp() {
  // 1. System PATH (Docker / global install)
  try {
    const p = execSync('which yt-dlp 2>/dev/null', { encoding: 'utf8' }).trim();
    if (p) return p;
  } catch {}
  try {
    const p = execSync('where yt-dlp 2>nul', { encoding: 'utf8' }).trim().split('\n')[0];
    if (p) return p;
  } catch {}

  // 2. node_modules (local dev)
  const winBin = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
  if (existsSync(winBin)) return winBin;
  const linBin = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
  if (existsSync(linBin)) return linBin;

  return 'yt-dlp';
}

const ytdlpPath = findYtDlp();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const stdout = execFileSync(ytdlpPath, [
      url,
      '--dump-single-json',
      '--no-warnings',
      '--no-call-home',
      '--no-check-certificate',
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 });

    const info = JSON.parse(stdout);
    return NextResponse.json(info);
  } catch (error) {
    console.error('Error fetching video info:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch video information' }, { status: 500 });
  }
}
