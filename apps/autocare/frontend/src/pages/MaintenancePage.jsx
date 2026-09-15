import { useState } from "react";
import { autocareApi } from "../api/autocareApi";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStates";
import { PageHeader, StatusBadge } from "../components/AppShell";
import { useApiResource } from "../hooks/useApiResource";

export function MaintenancePage() {
  const { data: vehicles, loading, error, refresh } = useApiResource(autocareApi.vehicles.list);
  const [selectedVehicle, setSelectedVehicle] = useState(""); const [analysis, setAnalysis] = useState(null); const [state, setState] = useState({ loading: false, error: "" });
  async function runAnalysis() { if (!selectedVehicle) { setState({ loading: false, error: "Select a vehicle before running analysis." }); return; } setState({ loading: true, error: "" }); setAnalysis(null); try { setAnalysis(await autocareApi.analyzeVehicle(selectedVehicle)); setState({ loading: false, error: "" }); } catch (requestError) { setState({ loading: false, error: requestError.message }); } }
  return <><PageHeader eyebrow="VEHICLE HEALTH" title="Maintenance analysis" description="Use service history and current mileage to guide the next conversation with a customer." />
    <section className="analysis-layout"><article className="data-card analysis-action"><span className="analysis-icon"><Icon name="maintenance" size={28} /></span><h2>Analyze a vehicle</h2><p>AutoCare sends selected vehicle details and completed service history to the maintenance service.</p>{loading ? <LoadingState label="Loading vehicles…" /> : error ? <ErrorState message={error} retry={refresh} /> : vehicles.length === 0 ? <EmptyState title="No vehicles available" message="Add a vehicle first, then return for maintenance analysis." /> : <><label>Vehicle<select value={selectedVehicle} onChange={(event) => setSelectedVehicle(event.target.value)}><option value="">Choose a vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.licensePlate}</option>)}</select></label><button className="button button-primary" onClick={runAnalysis} disabled={state.loading}>{state.loading ? "Analyzing…" : "Run maintenance analysis"}<Icon name="arrow" size={18} /></button>{state.error && <p className="form-error">{state.error}</p>}</>}</article>
      <article className="data-card analysis-result"><p className="eyebrow">RECOMMENDATION</p>{analysis ? <><StatusBadge status={analysis.riskLevel} /><h2>{analysis.recommendation}</h2><dl><div><dt>Current mileage</dt><dd>{analysis.inputs.mileage.toLocaleString()} km</dd></div><div><dt>Vehicle age</dt><dd>{analysis.inputs.vehicleAgeYears} years</dd></div><div><dt>Completed services</dt><dd>{analysis.inputs.serviceHistoryCount}</dd></div></dl></> : <div className="result-placeholder"><Icon name="maintenance" size={42} /><strong>Ready when you are</strong><span>Select a vehicle to see its deterministic maintenance recommendation.</span></div>}</article></section>
  </>;
}
