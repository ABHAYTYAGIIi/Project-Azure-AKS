import { useCallback } from "react";
import { autocareApi } from "../api/autocareApi";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStates";
import { PageHeader, StatusBadge } from "../components/AppShell";
import { useApiResource } from "../hooks/useApiResource";

function formatDate(value) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not scheduled"; }

export function DashboardPage({ navigate }) {
  const loadDashboard = useCallback(async () => {
    const [customers, vehicles, bookings, centers] = await Promise.all([autocareApi.customers.list(), autocareApi.vehicles.list(), autocareApi.bookings.list(), autocareApi.serviceCenters.list()]);
    return { customers, vehicles, bookings, centers };
  }, []);
  const { data, loading, error, refresh } = useApiResource(loadDashboard);
  if (loading) return <><PageHeader title="Operations dashboard" description="A live view of your service business." /><LoadingState /></>;
  if (error) return <><PageHeader title="Operations dashboard" description="A live view of your service business." /><ErrorState message={error} retry={refresh} /></>;
  const upcoming = data.bookings.filter((booking) => booking.status !== "cancelled" && new Date(booking.scheduledAt) >= new Date()).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const recent = [...data.bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const attentionVehicles = [...data.vehicles].sort((a, b) => b.mileage - a.mileage).slice(0, 3);
  const stats = [["Customers", data.customers.length, "customers"], ["Vehicles", data.vehicles.length, "vehicles"], ["Upcoming bookings", upcoming.length, "bookings"], ["Service centers", data.centers.length, "centers"]];
  return <><PageHeader title="Operations dashboard" description="Your service desk at a glance." action={<button className="button button-primary" onClick={() => navigate("bookings")}><Icon name="plus" size={18} />New booking</button>} />
    <section className="stats-grid">{stats.map(([label, value, icon]) => <article className="stat-card" key={label}><span className="stat-icon"><Icon name={icon} /></span><div><span>{label}</span><strong>{value}</strong></div></article>)}</section>
    <section className="dashboard-grid"><article className="data-card recent-card"><div className="card-header"><div><h2>Recent bookings</h2><p>Latest service activity</p></div><button className="text-button" onClick={() => navigate("bookings")}>View all</button></div>{recent.length ? <div className="activity-list">{recent.map((booking) => <div className="activity-row" key={booking.id}><div className="activity-icon"><Icon name="bookings" size={18} /></div><div><strong>{formatDate(booking.scheduledAt)}</strong><span>Service appointment</span></div><StatusBadge status={booking.status} /></div>)}</div> : <EmptyState title="No bookings yet" message="Create a booking when a customer schedules service." />}</article>
      <article className="data-card maintenance-card"><div className="card-header"><div><h2>Maintenance attention</h2><p>Vehicles ready for on-demand risk analysis</p></div><button className="text-button" onClick={() => navigate("maintenance")}>Analyze</button></div>{attentionVehicles.length ? <div className="attention-list">{attentionVehicles.map((vehicle) => <div key={vehicle.id}><span className="vehicle-avatar"><Icon name="vehicles" size={17} /></span><div><strong>{vehicle.make} {vehicle.model}</strong><span>{vehicle.mileage.toLocaleString()} km recorded</span></div><button className="text-button" onClick={() => navigate("maintenance")}>Review</button></div>)}</div> : <EmptyState title="No vehicles to assess" message="Add a vehicle to enable maintenance recommendations." />}</article>
    </section>
  </>;
}
