import { autocareApi } from "../api/autocareApi";
import { StatusBadge } from "../components/AppShell";
import { useApiResource } from "../hooks/useApiResource";
import { ResourcePage } from "./ResourcePage";

const optionList = (source, label) => source.data.map((item) => ({ value: item.id, label: label(item) }));
const formatDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function BookingsPage() {
  const customers = useApiResource(autocareApi.customers.list); const vehicles = useApiResource(autocareApi.vehicles.list); const serviceCenters = useApiResource(autocareApi.serviceCenters.list); const serviceTypes = useApiResource(autocareApi.serviceTypes.list);
  const lookups = { customers, vehicles, serviceCenters, serviceTypes };
  return <ResourcePage title="Bookings" entityLabel="Booking" description="Coordinate appointments across customers, vehicles, and workshops." api={autocareApi.bookings} lookups={lookups} fields={[{ name: "customerId", label: "Customer", type: "select", required: true, options: ({ customers: source }) => optionList(source, (item) => item.name) }, { name: "vehicleId", label: "Vehicle", type: "select", required: true, options: ({ vehicles: source }) => optionList(source, (item) => `${item.make} ${item.model} · ${item.licensePlate}`) }, { name: "serviceCenterId", label: "Service center", type: "select", required: true, options: ({ serviceCenters: source }) => optionList(source, (item) => `${item.name} · ${item.city}`) }, { name: "serviceTypeId", label: "Service type", type: "select", required: true, options: ({ serviceTypes: source }) => optionList(source, (item) => item.name) }, { name: "scheduledAt", label: "Appointment time", type: "datetime-local", required: true }, { name: "notes", label: "Notes" }]} columns={[{ label: "Appointment", render: (item) => formatDate(item.scheduledAt) }, { label: "Vehicle", render: (item, sources) => { const vehicle = sources.vehicles.data.find((value) => value.id === item.vehicleId); return vehicle ? `${vehicle.make} ${vehicle.model}` : "—"; } }, { label: "Service", render: (item, sources) => sources.serviceTypes.data.find((value) => value.id === item.serviceTypeId)?.name || "—" }, { label: "Status", render: (item) => <StatusBadge status={item.status} /> }]} />;
}
