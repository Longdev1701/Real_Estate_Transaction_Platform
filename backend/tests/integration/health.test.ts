import { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";

describe("GET /api/health", () => {
  let server: ReturnType<typeof app.listen>;
  let baseUrl = "";

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it("returns the public health payload", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      service: "real-estate-transaction-backend",
      status: "ok",
    });
  });
});
