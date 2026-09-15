import { Icon } from "./Icon";

const navigation = [
  ["dashboard", "Dashboard", "dashboard"], ["customers", "Customers", "customers"],
  ["vehicles", "Vehicles", "vehicles"], ["service-centers", "Service centers", "centers"],
  ["bookings", "Bookings", "bookings"], ["maintenance", "Maintenance", "maintenance"]
];

export function AppShell({ route, navigate, children, menuOpen, setMenuOpen }) {
  return <div className="app-frame">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark">A</div><div><strong>AutoCare</strong><span>Service operations</span></div><button className="icon-button close-button" onClick={() => setMenuOpen(false)}><Icon name="close" /></button></div>
      <nav aria-label="Primary navigation">{navigation.map(([target, label, icon]) => <button key={target} className={route === target ? "nav-link active" : "nav-link"} onClick={() => { navigate(target); setMenuOpen(false); }}><Icon name={icon} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><span className="online-dot" />API-connected workspace</div>
    </aside>
    {menuOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <section className="content-area"><header className="mobile-header"><button className="icon-button" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button><strong>AutoCare</strong></header>{children}</section>
  </div>;
}

export function PageHeader({ eyebrow = "OPERATIONS", title, description, action }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

export function StatusBadge({ status }) {
  return <span className={`status-badge status-${status?.toLowerCase()}`}>{status}</span>;
}
