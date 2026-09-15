export function LoadingState({ label = "Loading AutoCare data…" }) {
  return <div className="state-card loading-state"><span className="spinner" />{label}</div>;
}

export function ErrorState({ message, retry }) {
  return <div className="state-card error-state"><strong>Something needs attention</strong><span>{message}</span>{retry && <button className="button button-secondary" onClick={retry}>Try again</button>}</div>;
}

export function EmptyState({ title, message, action }) {
  return <div className="state-card empty-state"><strong>{title}</strong><span>{message}</span>{action}</div>;
}
