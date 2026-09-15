import { useState } from "react";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStates";
import { PageHeader } from "../components/AppShell";
import { useApiResource } from "../hooks/useApiResource";

function Field({ field, value, onChange, lookups }) {
  const options = field.options?.(lookups) || [];
  if (field.type === "select") return <label>{field.label}<select required={field.required} value={value ?? ""} onChange={(event) => onChange(field.name, event.target.value)}><option value="">Select {field.label.toLowerCase()}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  return <label>{field.label}<input required={field.required} type={field.type || "text"} min={field.min} step={field.step} value={value ?? ""} placeholder={field.placeholder} onChange={(event) => onChange(field.name, event.target.value)} /></label>;
}

export function ResourcePage({ title, description, api, fields, columns, lookups = {}, entityLabel }) {
  const { data, loading, error, refresh } = useApiResource(api.list);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState({});
  const [submitState, setSubmitState] = useState({ loading: false, error: "", success: "" });
  const lookupLoading = Object.values(lookups).some((lookup) => lookup.loading);
  const lookupError = Object.values(lookups).find((lookup) => lookup.error)?.error;

  async function submit(event) {
    event.preventDefault();
    setSubmitState({ loading: true, error: "", success: "" });
    const payload = Object.fromEntries(fields.map((field) => [field.name, field.type === "number" ? Number(values[field.name]) : values[field.name]]));
    try { await api.create(payload); setValues({}); setSubmitState({ loading: false, error: "", success: `${entityLabel} created successfully.` }); await refresh(); }
    catch (requestError) { setSubmitState({ loading: false, error: requestError.message, success: "" }); }
  }

  return <>
    <PageHeader title={title} description={description} action={<button className="button button-primary" onClick={() => setFormOpen((open) => !open)}><Icon name="plus" size={18} />New {entityLabel}</button>} />
    {formOpen && <section className="form-panel"><div className="form-heading"><div><h2>New {entityLabel}</h2><p>Add a record to AutoCare.</p></div><button className="icon-button" onClick={() => setFormOpen(false)}><Icon name="close" /></button></div>{lookupError ? <ErrorState message={lookupError} /> : lookupLoading ? <LoadingState label="Loading form options…" /> : <form className="record-form" onSubmit={submit}>{fields.map((field) => <Field key={field.name} field={field} value={values[field.name]} lookups={lookups} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} />)}<div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="button button-primary" disabled={submitState.loading}>{submitState.loading ? "Saving…" : `Create ${entityLabel}`}</button></div>{submitState.error && <p className="form-error">{submitState.error}</p>}{submitState.success && <p className="form-success">{submitState.success}</p>}</form>}</section>}
    <section className="data-card"><div className="card-header"><div><h2>{title}</h2><p>{data.length} total</p></div><button className="text-button" onClick={refresh}>Refresh</button></div>{loading ? <LoadingState /> : error ? <ErrorState message={error} retry={refresh} /> : data.length === 0 ? <EmptyState title={`No ${title.toLowerCase()} yet`} message={`Create your first ${entityLabel.toLowerCase()} to get started.`} action={<button className="button button-primary" onClick={() => setFormOpen(true)}>Create {entityLabel}</button>} /> : <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{data.map((item) => <tr key={item.id}>{columns.map((column) => <td key={column.label}>{column.render ? column.render(item, lookups) : item[column.key]}</td>)}</tr>)}</tbody></table></div>}</section>
  </>;
}
