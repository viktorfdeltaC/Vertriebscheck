export default function Offline() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#1B2A4A', color: 'white' }}
    >
      <img
        src="/assets/Wertentwickler%20logo1.png"
        alt="Wertentwickler"
        style={{ height: '96px', width: 'auto', marginBottom: '40px', filter: 'brightness(0) invert(1)' }}
      />
      <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}>
        Keine Verbindung
      </h1>
      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', maxWidth: '420px' }}>
        Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="transition-all"
        style={{
          marginTop: '28px',
          background: 'white',
          color: '#1B2A4A',
          fontSize: '14px',
          fontWeight: 500,
          padding: '10px 22px',
          borderRadius: '980px',
          transitionDuration: '150ms',
        }}
      >
        Neu laden
      </button>
    </div>
  );
}
