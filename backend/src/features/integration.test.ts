import { describe, it } from "node:test";
import assert from "node:assert";
import http from "node:http";
import app from "../app";

describe("Universal Backend Architecture & Client Integration Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  it("starts the server and registers routes successfully", async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };
    baseUrl = `http://localhost:${address.port}`;
    assert.ok(baseUrl.startsWith("http://localhost:"));
  });

  it("GET /api/health returns 200, success=true, and propagates x-request-id", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, "ok");
    assert.strictEqual(body.service, "sofiya-bangles-backend");
    assert.ok(res.headers.get("x-request-id"));
  });

  it("GET /api returns endpoint manifest with /api/cart", async () => {
    const res = await fetch(`${baseUrl}/api`);
    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(body.endpoints));
    assert.ok(body.endpoints.includes("/api/cart"));
    assert.ok(body.endpoints.includes("/api/products"));
  });

  it("GET /api/products returns standard pagination envelope", async () => {
    const res = await fetch(`${baseUrl}/api/products?page=1&limit=5`);
    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.limit, 5);
  });

  it("GET /api/categories returns array of categories", async () => {
    const res = await fetch(`${baseUrl}/api/categories`);
    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it("GET /api/settings/business-profile returns business profile", async () => {
    const res = await fetch(`${baseUrl}/api/settings/business-profile`);
    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data);
  });

  it("Unknown route triggers centralized 404 handler with AppError envelope and requestId", async () => {
    const res = await fetch(`${baseUrl}/api/unknown-route-test`);
    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 404);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "ROUTE_NOT_FOUND");
    assert.ok(body.requestId);
  });

  it("Protected endpoint without credentials returns 401 UNAUTHORIZED envelope", async () => {
    const res = await fetch(`${baseUrl}/api/cart`);
    const body = (await res.json()) as any;
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");
    assert.ok(body.requestId);
  });

  it("stops test server cleanly", async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
