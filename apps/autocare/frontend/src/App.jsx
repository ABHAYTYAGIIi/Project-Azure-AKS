import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { BookingsPage } from "./pages/BookingsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { ServiceCentersPage } from "./pages/ServiceCentersPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { routeFromLocation, routeUrl } from "./utils/routing";

const pages = { dashboard: DashboardPage, customers: CustomersPage, vehicles: VehiclesPage, "service-centers": ServiceCentersPage, bookings: BookingsPage, maintenance: MaintenancePage };

export default function App() {
  const [route, setRoute] = useState(routeFromLocation()); const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { const updateRoute = () => setRoute(routeFromLocation()); window.addEventListener("popstate", updateRoute); return () => window.removeEventListener("popstate", updateRoute); }, []);
  const navigate = (nextRoute) => { window.history.pushState({}, "", routeUrl(nextRoute)); setRoute(nextRoute); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const Page = pages[route] || DashboardPage;
  return <AppShell route={route} navigate={navigate} menuOpen={menuOpen} setMenuOpen={setMenuOpen}><Page navigate={navigate} /></AppShell>;
}
