import { describe, expect, it } from "vitest";
import { InMemoryOperationsRepository } from "../src/adapters/in-memory-repository.js";
import { ScriptedTelephonyAdapter, MockTTSAdapter } from "../src/adapters/mock.js";
import { hashPin } from "../src/security/pin.js";
import { TransportWorkflow, WorkflowError } from "../src/workflow/transport-workflow.js";
import { ConversationController, StaleOperationError } from "../src/conversation/controller.js";

async function fixture(responses: Array<"accepted"|"rejected"|"timeout"|"failed"> = ["accepted"]) {
  const repository = new InMemoryOperationsRepository();
  repository.staff.set("nurse", { id:"nurse",name:"Nurse Priya",role:"nurse",phone:"+15550000001",pinHash:await hashPin("2468"),onDuty:true,availability:"available",currentZone:"ward-7-a",skills:[],activeTaskCount:1 });
  repository.staff.set("porter-1", { id:"porter-1",name:"Ravi",role:"transporter",phone:"+15550000002",pinHash:await hashPin("1111"),onDuty:true,availability:"available",currentZone:"ward-7-a",skills:["patient_transport"],activeTaskCount:1 });
  repository.staff.set("porter-2", { id:"porter-2",name:"Aman",role:"transporter",phone:"+15550000003",pinHash:await hashPin("2222"),onDuty:true,availability:"available",currentZone:"ward-7-b",skills:["patient_transport"],activeTaskCount:0 });
  repository.beds.set("bed-18", { id:"bed-18",label:"Bed 18",wardId:"ward-7",zone:"ward-7-a",status:"occupied",patientId:"patient-18",patientReadyForTransport:true });
  const telephony = new ScriptedTelephonyAdapter(responses);
  const workflow = new TransportWorkflow(repository, telephony, 20);
  return { repository, telephony, workflow };
}

const intent = { type:"CREATE_TRANSPORT" as const,bedId:"bed-18",destination:"Radiology",urgency:"routine" as const,transportMode:"wheelchair" as const };

describe("transport workflow", () => {
  it("verifies a caller and assigns an accepted task", async () => {
    const { repository, telephony, workflow } = await fixture();
    const controller = new ConversationController(repository, workflow, new MockTTSAdapter(), "call-1");
    expect((await controller.identify("+15550000001"))?.name).toBe("Nurse Priya");
    expect(await controller.verifyCaller("2468")).toBe(true);
    const task = await controller.handleTransport(intent, "request-0001");
    expect(task.status).toBe("accepted");
    expect(task.assignedStaffId).toBe("porter-1");
    expect(telephony.calls).toHaveLength(1);
  });

  it("rejects an incorrect PIN", async () => {
    const { repository, workflow } = await fixture();
    const controller = new ConversationController(repository, workflow, new MockTTSAdapter(), "call-1");
    await controller.identify("+15550000001");
    expect(await controller.verifyCaller("0000")).toBe(false);
    await expect(controller.handleTransport(intent, "request-0002")).rejects.toMatchObject({ code:"UNVERIFIED_CALLER" });
  });

  it("returns the existing task for duplicate requests", async () => {
    const { repository, workflow } = await fixture(["accepted"]);
    const one = await workflow.createAndDispatch({ intent,requestedBy:"nurse",idempotencyKey:"same-key",operationId:crypto.randomUUID(),revision:1 });
    const two = await workflow.createAndDispatch({ intent,requestedBy:"nurse",idempotencyKey:"other-key",operationId:crypto.randomUUID(),revision:2 });
    expect(two.id).toBe(one.id);
    expect(repository.tasks.size).toBe(1);
  });

  it("tries the next transporter after rejection", async () => {
    const { workflow, telephony } = await fixture(["rejected", "accepted"]);
    const task = await workflow.createAndDispatch({ intent,requestedBy:"nurse",idempotencyKey:"request-0003",operationId:crypto.randomUUID(),revision:1 });
    expect(telephony.calls.map(c => c.participantIdentity)).toEqual(["transporter-porter-1", "transporter-porter-2"]);
    expect(task.assignedStaffId).toBe("porter-2");
  });

  it("escalates when all candidates fail", async () => {
    const { workflow, repository } = await fixture(["timeout", "rejected"]);
    const task = await workflow.createAndDispatch({ intent,requestedBy:"nurse",idempotencyKey:"request-0004",operationId:crypto.randomUUID(),revision:1 });
    expect(task.status).toBe("failed");
    expect(repository.notifications).toHaveLength(1);
  });

  it("refuses transport for an unready patient", async () => {
    const { workflow, repository } = await fixture();
    repository.beds.get("bed-18")!.patientReadyForTransport = false;
    await expect(workflow.createAndDispatch({ intent,requestedBy:"nurse",idempotencyKey:"request-0005",operationId:crypto.randomUUID(),revision:1 })).rejects.toEqual(expect.objectContaining<Partial<WorkflowError>>({ code:"PATIENT_NOT_READY" }));
  });

  it("cancels a task immediately before assignment", async () => {
    const { workflow, repository } = await fixture();
    const task = await repository.createTransportTask({ patientId:"patient-18",bedId:"bed-18",wardId:"ward-7",originZone:"ward-7-a",destination:"Radiology",urgency:"routine",transportMode:"wheelchair",requestedBy:"nurse",status:"requested" }, "request-0006");
    const cancelled = await workflow.cancel(task.id, "nurse", crypto.randomUUID(), 1);
    expect(cancelled.status).toBe("cancelled");
  });

  it("requests acknowledgement when cancelling after assignment", async () => {
    const { workflow, repository } = await fixture();
    const task = await repository.createTransportTask({ patientId:"patient-18",bedId:"bed-18",wardId:"ward-7",originZone:"ward-7-a",destination:"Radiology",urgency:"routine",transportMode:"wheelchair",requestedBy:"nurse",status:"dispatching" }, "request-0007");
    const assigned = await repository.assignTask(task.id, "porter-1");
    const cancelled = await workflow.cancel(assigned.id, "nurse", crypto.randomUUID(), 1);
    expect(cancelled.status).toBe("cancellation_requested");
  });

  it("rejects a stale result after interruption", async () => {
    const { repository, telephony, workflow } = await fixture();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const original = repository.getBedState.bind(repository);
    repository.getBedState = async id => { await gate; return original(id); };
    const controller = new ConversationController(repository, workflow, new MockTTSAdapter(), "call-1");
    await controller.identify("+15550000001");
    await controller.verifyCaller("2468");
    const pending = controller.handleTransport(intent, "request-0008");
    await controller.interrupt();
    release();
    await expect(pending).rejects.toBeInstanceOf(StaleOperationError);
    expect(repository.tasks.size).toBe(0);
    expect(telephony.calls).toHaveLength(0);
  });
});

it('cannot bypass PIN verification by interrupting or beginning another turn', async () => {
  const { repository, workflow } = await fixture();
  const controller = new ConversationController(repository, workflow, new MockTTSAdapter(), 'call-security');
  await controller.identify('+15550000001');
  await controller.verifyCaller('0000');
  await controller.interrupt();
  controller.beginTurn();
  await expect(controller.handleTransport(intent, 'no-pin-bypass')).rejects.toMatchObject({ code: 'UNVERIFIED_CALLER' });
  expect(repository.tasks.size).toBe(0);
});
