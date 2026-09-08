import { beforeEach, describe, expect, it } from "vitest";
import { buildApi } from "../src/api.js";
import { InMemoryOperationsRepository } from "../src/adapters/in-memory-repository.js";
import { ScriptedTelephonyAdapter } from "../src/adapters/mock.js";
import { TransportWorkflow } from "../src/workflow/transport-workflow.js";

describe("HTTP API", () => {
  const token = "a-secure-test-token";
  const wardId = "00000000-0000-4000-8000-000000000007";
  let repository: InMemoryOperationsRepository;
  beforeEach(() => { repository = new InMemoryOperationsRepository(); });

  it("keeps health public and protects ward state", async () => {
    const app = buildApi({ repository, workflow:new TransportWorkflow(repository,new ScriptedTelephonyAdapter()), authToken:token });
    expect((await app.inject({ method:"GET",url:"/health" })).statusCode).toBe(200);
    expect((await app.inject({ method:"GET",url:`/api/wards/${wardId}/state` })).statusCode).toBe(401);
    expect((await app.inject({ method:"GET",url:`/api/wards/${wardId}/state`,headers:{authorization:`Bearer ${token}`} })).statusCode).toBe(200);
    await app.close();
  });
});
