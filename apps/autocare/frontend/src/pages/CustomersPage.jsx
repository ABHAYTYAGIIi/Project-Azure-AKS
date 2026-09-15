import { autocareApi } from "../api/autocareApi";
import { ResourcePage } from "./ResourcePage";

export function CustomersPage() { return <ResourcePage title="Customers" entityLabel="Customer" description="Manage the people who trust AutoCare with their vehicles." api={autocareApi.customers} fields={[{ name: "name", label: "Full name", required: true }, { name: "email", label: "Email address", type: "email", required: true }, { name: "phone", label: "Phone number", required: true }]} columns={[{ label: "Customer", key: "name" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" }]} />; }
