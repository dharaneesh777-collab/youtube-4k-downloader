import { spawn, execSync } from 'child_process';
import { unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

function findBinary(name, winModulePath, linModulePath) {
  try {
    const p = execSync(`which ${name} 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (p) return p;
  } catch {}
  try {
    const p = execSync(`where ${name} 2>nul`, { encoding: 'utf8' }).trim().split('\n')[0];
    if (p) return p;
  } catch {}

  if (existsSync(winModulePath)) return winModulePath;
  if (existsSync(linModulePath)) return linModulePath;

  return name;
}

function getCookiesPath() {
  const p = path.join(process.cwd(), 'cookies', 'cookies.txt');
  return existsSync(p) ? p : null;
}

const ytdlpPath = findBinary(
  'yt-dlp',
  path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe'),
  path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp')
);

const ffmpegPath = findBinary(
  'ffmpeg',
  path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
  path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg')
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const format = searchParams.get('format') || 'bestvideo[height<=2160]+bestaudio/best';

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const tempDir = path.join(process.cwd(), '.temp');
  try { await mkdir(tempDir, { recursive: true }); } catch (e) {}

  const jobId = crypto.randomBytes(16).toString('hex');
  const outputPath = path.join(tempDir, `${jobId}.mp4`);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const args = [
        url,
        '-f', format,
        '--merge-output-format', 'mp4',
        '-o', outputPath,
        '--ffmpeg-location', ffmpegPath,
        '--no-warnings',
        '--newline',
        '--progress-template', '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._total_bytes_str)s|%(progress._eta_str)s',
      ];

      const cookiesPath = getCookiesPath();
      if (cookiesPath) {
        args.push('--cookies', cookiesPath);
      }

      const proc = spawn(ytdlpPath, args, { windowsHide: true });

      let currentPhase = 'video';
      let phaseCount = 0;

      proc.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.includes('[download] Destination:')) {
            phaseCount++;
            if (phaseCount === 1) currentPhase = 'video';
            else if (phaseCount === 2) currentPhase = 'audio';
            sendEvent({ type: 'phase', phase: currentPhase });
            continue;
          }

          if (line.includes('[Merger]')) {
            sendEvent({ type: 'phase', phase: 'merging' });
            continue;
          }

          const parts = line.trim().split('|');
          if (parts.length === 4) {
            const [percent, speed, totalSize, eta] = parts.map(s => s.trim());
            sendEvent({
              type: 'progress',
              phase: currentPhase,
              percent, speed, totalSize, eta,
            });
          }
        }
      });

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        if (text.includes('[download]')) {
          const match = text.match(/(\d+\.?\d*)%\s+of\s+~?\s*([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+(\S+)/);
          if (match) {
            sendEvent({
              type: 'progress',
              phase: currentPhase,
              percent: match[1] + '%',
              speed: match[3],
              totalSize: match[2],
              eta: match[4],
            });
          }
        }
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          sendEvent({ type: 'done', downloadUrl: `/api/file?path=${encodeURIComponent(jobId)}` });
        } else {
          sendEvent({ type: 'error', message: 'Download failed. You may need to upload browser cookies.' });
          unlink(outputPath).catch(() => {});
        }
        controller.close();
      });

      proc.on('error', (err) => {
        sendEvent({ type: 'error', message: err.message });
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
