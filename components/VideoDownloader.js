"use client";

import { useState } from 'react';
import styles from './VideoDownloader.module.css';

export default function VideoDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState('');
  const [downloadState, setDownloadState] = useState(null);

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

  const handleDownload = async (quality = '2160') => {
    setDownloadState({ status: 'fetching', quality });
    setError('');

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Download failed');

      setDownloadState({ status: 'ready', downloadUrl: data.downloadUrl, quality });

      // Auto-trigger download via the browser
      const a = document.createElement('a');
      a.href = data.downloadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        setDownloadState({ status: 'done', downloadUrl: data.downloadUrl, quality });
      }, 1500);

    } catch (err) {
      setError(err.message);
      setDownloadState(null);
    }
  };

  const qualityLabel = (q) => {
    if (q === '2160') return '4K';
    if (q === '1080') return '1080p';
    if (q === '720') return '720p';
    if (q === '480') return '480p';
    return q;
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
          <img
            src={videoInfo.thumbnail}
            alt="Thumbnail"
            className={styles.thumbnail}
            onError={(e) => { if (videoInfo.thumbnailFallback) e.target.src = videoInfo.thumbnailFallback; }}
          />
          <div className={styles.info}>
            <h3 className={styles.title}>{videoInfo.title}</h3>
            <p className={styles.author}>{videoInfo.author}</p>

            {/* Quality buttons */}
            {(!downloadState || downloadState.status === 'done') && (
              <div className={styles.qualityGrid}>
                <button className={`${styles.qualityBtn} ${styles.qualityBtnPrimary}`} onClick={() => handleDownload('2160')}>
                  <span className={styles.qualityBadge}>4K</span>
                  <span>2160p</span>
                </button>
                <button className={styles.qualityBtn} onClick={() => handleDownload('1080')}>
                  <span className={styles.qualityBadge}>FHD</span>
                  <span>1080p</span>
                </button>
                <button className={styles.qualityBtn} onClick={() => handleDownload('720')}>
                  <span className={styles.qualityBadge}>HD</span>
                  <span>720p</span>
                </button>
                <button className={styles.qualityBtn} onClick={() => handleDownload('480')}>
                  <span className={styles.qualityBadge}>SD</span>
                  <span>480p</span>
                </button>
              </div>
            )}

            {/* Loading state */}
            {downloadState && downloadState.status === 'fetching' && (
              <div className={styles.fetchingContainer}>
                <div className={styles.fetchingSpinner}>
                  <div className="spinner"></div>
                </div>
                <p className={styles.fetchingText}>
                  Getting {qualityLabel(downloadState.quality)} download link...
                </p>
              </div>
            )}

            {/* Ready / Done state */}
            {downloadState && (downloadState.status === 'ready' || downloadState.status === 'done') && (
              <div className={styles.doneContainer}>
                <div className={styles.doneIcon}>✅</div>
                <p className={styles.doneText}>
                  Download started! Check your browser's download bar.
                </p>
                <a
                  href={downloadState.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn-primary ${styles.retryBtn}`}
                >
                  Download Again ({qualityLabel(downloadState.quality)})
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
