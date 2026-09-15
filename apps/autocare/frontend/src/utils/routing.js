const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function routeFromLocation() {
  const pathname = window.location.pathname;
  const relativePath = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  return relativePath.replace(/^\//, "") || "dashboard";
}

export function routeUrl(route) {
  return `${basePath}/${route === "dashboard" ? "" : route}`;
}
