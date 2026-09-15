import { useCallback, useEffect, useState } from "react";

export function useApiResource(load) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setData(await load()); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  }, [load]);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, error, refresh, setData };
}
