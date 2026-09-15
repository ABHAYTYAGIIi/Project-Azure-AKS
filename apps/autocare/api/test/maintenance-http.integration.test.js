import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return JSON.parse(body);
}

test("Express forwards maintenance analysis to a FastAPI-compatible HTTP service", async () => {
  let maintenancePayload;
  const maintenanceServer = http.createServer(async (request, response) => {
    assert.equal(request.method, "POST");
    assert.equal(request.url, "/maintenance-analysis");
    maintenancePayload = await readJson(request);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ riskLevel: "medium", recommendation: "Schedule a routine maintenance check." }));
  });
  await listen(maintenanceServer);

  const maintenancePort = maintenanceServer.address().port;
  process.env.NODE_ENV = "test";
  process.env.DATABASE_PROVIDER = "memory";
  process.env.MAINTENANCE_SERVICE_URL = `http://127.0.0.1:${maintenancePort}`;
  process.env.MAINTENANCE_SERVICE_TIMEOUT_MS = "1000";

  const { app } = await import("../src/app.js");
  const apiServer = http.createServer(app);
  await listen(apiServer);
  const apiPort = apiServer.address().port;
  const api = `http://127.0.0.1:${apiPort}/api`;

  async function create(path, values) {
    const response = await fetch(`${api}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values)
    });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  }

  try {
    const customer = await create("/customers", {
      name: "Integration Test", email: "integration@example.test", phone: "+91-9000000000"
    });
    const vehicle = await create("/vehicles", {
      customerId: customer.id, make: "Tata", model: "Nexon", year: 2021,
      licensePlate: "HTTP-TEST-01", mileage: 56000
    });
    const center = await create("/service-centers", {
      name: "Integration Center", address: "1 Test Street", city: "Bengaluru", phone: "+91-9000000001"
    });
    const serviceType = await create("/service-types", {
      name: "Integration Service", description: "Integration test service", estimatedDurationMinutes: 30, basePrice: 500
    });
    const booking = await create("/bookings", {
      customerId: customer.id, vehicleId: vehicle.id, serviceCenterId: center.id,
      serviceTypeId: serviceType.id, scheduledAt: "2026-12-01T10:00:00Z", status: "completed"
    });
    assert.equal(booking.status, "completed");

    const response = await fetch(`${api}/vehicles/${vehicle.id}/maintenance-analysis`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}"
    });
    assert.equal(response.status, 200);
    const { data: analysis } = await response.json();

    assert.deepEqual(maintenancePayload, {
      mileage: 56000, vehicle_age_years: 5, service_history: [serviceType.name]
    });
    assert.equal(analysis.riskLevel, "medium");
    assert.equal(analysis.recommendation, "Schedule a routine maintenance check.");
    assert.equal(analysis.inputs.serviceHistoryCount, 1);
  } finally {
    await close(apiServer);
    await close(maintenanceServer);
  }
});
