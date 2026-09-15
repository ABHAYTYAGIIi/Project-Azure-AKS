import { autocareApi } from "../api/autocareApi";
import { useApiResource } from "../hooks/useApiResource";
import { ResourcePage } from "./ResourcePage";

export function VehiclesPage() {
  const customers = useApiResource(autocareApi.customers.list);
  return <ResourcePage title="Vehicles" entityLabel="Vehicle" description="Keep vehicle details and mileage ready for every visit." api={autocareApi.vehicles} lookups={{ customers }} fields={[{ name: "customerId", label: "Customer", type: "select", required: true, options: ({ customers: source }) => source.data.map((item) => ({ value: item.id, label: item.name })) }, { name: "make", label: "Make", required: true }, { name: "model", label: "Model", required: true }, { name: "year", label: "Model year", type: "number", min: "1886", required: true }, { name: "licensePlate", label: "License plate", required: true }, { name: "mileage", label: "Mileage (km)", type: "number", min: "0", required: true }]} columns={[{ label: "Vehicle", render: (item) => `${item.make} ${item.model}` }, { label: "Plate", key: "licensePlate" }, { label: "Owner", render: (item, { customers: source }) => source.data.find((customer) => customer.id === item.customerId)?.name || "—" }, { label: "Mileage", render: (item) => `${item.mileage.toLocaleString()} km` }]} />;
}
