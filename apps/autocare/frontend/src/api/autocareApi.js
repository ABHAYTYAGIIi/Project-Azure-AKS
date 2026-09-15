import { apiClient } from "./client";

function resource(name) {
  return {
    list: () => apiClient.get(`/${name}`),
    create: (values) => apiClient.post(`/${name}`, values),
    update: (id, values) => apiClient.put(`/${name}/${id}`, values),
    remove: (id) => apiClient.remove(`/${name}/${id}`)
  };
}

export const autocareApi = {
  customers: resource("customers"),
  vehicles: resource("vehicles"),
  serviceCenters: resource("service-centers"),
  serviceTypes: resource("service-types"),
  bookings: resource("bookings"),
  analyzeVehicle: (id) => apiClient.post(`/vehicles/${id}/maintenance-analysis`, {})
};
