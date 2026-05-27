"use client";

import { useState } from 'react';
import styles from './VideoDownloader.module.css';

export default function VideoDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState('');
  const [downloadState, setDownloadState] = useState(null);
  // downloadState: { status, phase, percent, speed, totalSize, eta, downloadUrl }

  const fetchInfo = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setDownloadState(null);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch info');
      setVideoInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const format = 'bestvideo[height<=2160]+bestaudio/best';
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format)}`;

    setDownloadState({ status: 'connecting', phase: 'video', percent: '0%', speed: '—', totalSize: '—', eta: '—' });

    const evtSource = new EventSource(downloadUrl);

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'phase') {
          setDownloadState(prev => ({
            ...prev,
            phase: data.phase,
            percent: data.phase === 'merging' ? '100%' : '0%',
            speed: data.phase === 'merging' ? '—' : prev?.speed || '—',
            status: data.phase === 'merging' ? 'merging' : 'downloading',
          }));
        } else if (data.type === 'progress') {
          setDownloadState(prev => ({
            ...prev,
            status: 'downloading',
            percent: data.percent || prev?.percent || '0%',
            speed: data.speed || prev?.speed || '—',
            totalSize: data.totalSize || prev?.totalSize || '—',
            eta: data.eta || prev?.eta || '—',
            phase: data.phase || prev?.phase || 'video',
          }));
        } else if (data.type === 'done') {
          setDownloadState(prev => ({
            ...prev,
            status: 'done',
            downloadUrl: data.downloadUrl,
            percent: '100%',
          }));
          evtSource.close();
          // Auto-trigger browser download
          const a = document.createElement('a');
          a.href = data.downloadUrl;
          a.setAttribute('download', '');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (data.type === 'error') {
          setDownloadState(prev => ({
            ...prev,
            status: 'error',
          }));
          evtSource.close();
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      // Only set error if we haven't completed
      setDownloadState(prev => {
        if (prev?.status === 'done') return prev;
        return { ...prev, status: 'error' };
      });
    };
  };

  const parsePercent = (str) => {
    if (!str) return 0;
    const n = parseFloat(str.replace('%', '').trim());
    return isNaN(n) ? 0 : Math.min(n, 100);
  };

  const phaseLabel = (phase) => {
    if (phase === 'video') return 'Downloading Video Stream';
    if (phase === 'audio') return 'Downloading Audio Stream';
    if (phase === 'merging') return 'Merging Streams (ffmpeg)';
    return 'Processing';
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <form onSubmit={fetchInfo} className={styles.form}>
        <input
          type="url"
          placeholder="Paste YouTube Link Here..."
          className="input-field"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <div className="spinner"></div> : 'Fetch Video'}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {videoInfo && (
        <div className={styles.preview}>
          <img src={videoInfo.thumbnail} alt="Thumbnail" className={styles.thumbnail} />
          <div className={styles.info}>
            <h3 className={styles.title}>{videoInfo.title}</h3>
            <p className={styles.duration}>Duration: {Math.floor(videoInfo.duration / 60)}:{String(videoInfo.duration % 60).padStart(2, '0')}</p>

            {!downloadState && (
              <button className="btn-primary" onClick={handleDownload} style={{ marginTop: '1rem', width: '100%' }}>
                Download 4K Quality
              </button>
            )}

            {downloadState && downloadState.status !== 'done' && downloadState.status !== 'error' && (
              <div className={styles.progressContainer}>
                <div className={styles.phaseLabel}>{phaseLabel(downloadState.phase)}</div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={`${styles.progressBarFill} ${downloadState.phase === 'merging' ? styles.progressBarPulse : ''}`}
                    style={{ width: downloadState.phase === 'merging' ? '100%' : `${parsePercent(downloadState.percent)}%` }}
                  />
                </div>
                <div className={styles.statsRow}>
                  <span className={styles.statItem}>
                    <span className={styles.statIcon}>📊</span>
                    {downloadState.percent || '0%'}
                  </span>
                  <span className={styles.statItem}>
                    <span className={styles.statIcon}>⚡</span>
                    {downloadState.speed || '—'}
                  </span>
                  <span className={styles.statItem}>
                    <span className={styles.statIcon}>💾</span>
                    {downloadState.totalSize || '—'}
                  </span>
                  <span className={styles.statItem}>
                    <span className={styles.statIcon}>⏱️</span>
                    {downloadState.eta || '—'}
                  </span>
                </div>
              </div>
            )}

            {downloadState && downloadState.status === 'done' && (
              <div className={styles.doneContainer}>
                <div className={styles.doneIcon}>✅</div>
                <p className={styles.doneText}>Download complete! Your file should be saving now.</p>
                <a href={downloadState.downloadUrl} download className={`btn-primary ${styles.retryBtn}`}>
                  Download Again
                </a>
              </div>
            )}

            {downloadState && downloadState.status === 'error' && (
              <div className={styles.errorContainer}>
                <p className={styles.error}>Download failed. Please try again.</p>
                <button className="btn-primary" onClick={handleDownload} style={{ marginTop: '0.5rem', width: '100%' }}>
                  Retry Download
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
