export function Logo({ showTag = false }: { showTag?: boolean }) {
  return (
    <div className="logo">
      <div className="logo-mark">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
          <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6" />
          <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6" />
          <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.3" />
        </svg>
      </div>
      <span className="logo-name">Samsiq</span>
      {showTag && <span className="logo-tag">by Hultech</span>}
    </div>
  );
}
