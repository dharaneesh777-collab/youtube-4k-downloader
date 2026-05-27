import VideoDownloader from '@/components/VideoDownloader';

export default function Home() {
  return (
    <main style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '4rem 2rem',
      flex: 1 
    }}>
      <h1 className="title-gradient" style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>
        Ultra Download
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', textAlign: 'center', maxWidth: '500px', fontSize: '1.1rem' }}>
        Download YouTube videos in stunning 4K resolution. Fast, secure, and beautiful.
      </p>
      
      <VideoDownloader />
    </main>
  );
}
