// Instant skeleton shown while the menu page loads from the server
// Matches the visual layout: logo circle → name → search bar → category pills → cards
export default function MenuLoading() {
  return (
    <div style={{ background: '#fdfaf5', minHeight: '100svh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, #fff8f0 0%, #fdfaf5 100%)', padding: '60px 20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#f0ebe2', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: 160, height: 22, borderRadius: 8, background: '#f0ebe2', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: 100, height: 14, borderRadius: 6, background: '#f0ebe2', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ height: 44, borderRadius: 12, background: '#f0ebe2', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>

      {/* Category pills */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 8, overflowX: 'hidden' }}>
        {[80, 100, 70, 90, 80].map((w, i) => (
          <div key={i} style={{ width: w, height: 32, borderRadius: 999, background: '#f0ebe2', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>

      {/* Menu item skeletons */}
      <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #ece7dc', borderRadius: 16, padding: 14, display: 'flex', gap: 12 }}>
            <div style={{ width: 88, height: 88, borderRadius: 12, background: '#f0ebe2', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 16, borderRadius: 6, background: '#f0ebe2', width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: 12, borderRadius: 6, background: '#f0ebe2', width: '90%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: 12, borderRadius: 6, background: '#f0ebe2', width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
