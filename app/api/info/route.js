import { NextResponse } from 'next/server';
import { execSync, execFileSync } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

function findYtDlp() {
  try {
    const p = execSync('which yt-dlp 2>/dev/null', { encoding: 'utf8' }).trim();
    if (p) return p;
  } catch {}
  try {
    const p = execSync('where yt-dlp 2>nul', { encoding: 'utf8' }).trim().split('\n')[0];
    if (p) return p;
  } catch {}

  const winBin = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
  if (existsSync(winBin)) return winBin;
  const linBin = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
  if (existsSync(linBin)) return linBin;

  return 'yt-dlp';
}

function getCookiesPath() {
  const p = path.join(process.cwd(), 'cookies', 'cookies.txt');
  return existsSync(p) ? p : null;
}

const ytdlpPath = findYtDlp();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const args = [
      url,
      '--dump-single-json',
      '--no-warnings',
    ];

    const cookiesPath = getCookiesPath();
    if (cookiesPath) {
      args.push('--cookies', cookiesPath);
    }

    const stdout = execFileSync(ytdlpPath, args, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });

    const info = JSON.parse(stdout);
    return NextResponse.json(info);
  } catch (error) {
    const errMsg = error.stderr || error.message || '';
    console.error('Error fetching video info:', errMsg);

    if (errMsg.includes('Sign in') || errMsg.includes('cookies')) {
      return NextResponse.json({
        error: 'YouTube requires authentication. Please upload your browser cookies using the cookie button above.',
        needsCookies: true,
      }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch video information' }, { status: 500 });
  }
}
