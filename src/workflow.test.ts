import { TestWorkflowEnvironment } from '@temporalio/testing';
import { WorkflowClient, WorkflowNotFoundError } from '@temporalio/client';
import { Worker, Runtime } from '@temporalio/worker';
import { v4 as uuid } from 'uuid';
import { agentWorkflow, hitlDecisionSignal, WorkflowInput, WorkflowResult } from './workflows';
import * as activities from './activities';
import { platformAPI } from './platformAPI';

describe('HITL Interrupt Workflow', () => {
  let testEnv: TestWorkflowEnvironment;
  let client: WorkflowClient;
  let worker: Worker;

  beforeAll(async () => {
    Runtime.install({
      logger: {
        log: () => {},
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: console.warn,
        error: console.error,
      },
    });

    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  beforeEach(async () => {
    platformAPI.reset();
    client = testEnv.client;

    worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('./workflows'),
      activities,
    });
  });

  afterEach(async () => {
    worker?.shutdown();
  });

  describe('AgentInterruptedError Handling', () => {
    it('should call RegisterHitlInterruptAsync when execute-agent-turn throws AgentInterruptedError', async () => {
      const runId = `run-${uuid()}`;
      const workflowId = `workflow-${uuid()}`;

      const input: WorkflowInput = {
        runId,
        prompts: ['First prompt', 'Second prompt'],
        shouldInterruptOnTurn: 1,
        interruptReason: 'Testing HITL interrupt',
      };

      const registerSpy = jest.spyOn(platformAPI, 'registerHitlInterrupt');

      const handle = await client.start(agentWorkflow, {
        taskQueue: 'test-queue',
        workflowId,
        args: [input],
      });

      await worker.runUntil(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(registerSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            runId,
            agentTurnId: 'turn-1',
            reason: 'Testing HITL interrupt',
          })
        );

        await handle.signal(hitlDecisionSignal, { approved: true });

        const result = await handle.result();
        expect(result.hitlInterrupted).toBe(true);
      });

      registerSpy.mockRestore();
    }, 30000);

    it('should set run status to interrupted in platformAPI', async () => {
      const runId = `run-${uuid()}`;
      const workflowId = `workflow-${uuid()}`;

      const input: WorkflowInput = {
        runId,
        prompts: ['Interrupt me'],
        shouldInterruptOnTurn: 1,
        interruptReason: 'Status check test',
      };

      const handle = await client.start(agentWorkflow, {
        taskQueue: 'test-queue',
        workflowId,
        args: [input],
      });

      await worker.runUntil(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const status = await platformAPI.getRunStatus(runId);
        expect(status).toBe('interrupted');

        const interrupt = await platformAPI.getHitlInterrupt(runId);
        expect(interrupt).toBeDefined();
        expect(interrupt?.runId).toBe(runId);
        expect(interrupt?.reason).toBe('Status check test');

        await handle.signal(hitlDecisionSignal, { approved: false });
        await handle.result();
      });
    }, 30000);

    it('should enter hitl-decision signal wait after RegisterHitlInterruptAsync', async () => {
      const runId = `run-${uuid()}`;
      const workflowId = `workflow-${uuid()}`;

      const input: WorkflowInput = {
        runId,
        prompts: ['Wait for signal'],
        shouldInterruptOnTurn: 1,
        interruptReason: 'Signal wait test',
      };

      const handle = await client.start(agentWorkflow, {
        taskQueue: 'test-queue',
        workflowId,
        args: [input],
      });

      await worker.runUntil(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const workflowInfo = await handle.describe();
        expect(workflowInfo.status.name).toBe('RUNNING');

        const interrupt = await platformAPI.getHitlInterrupt(runId);
        expect(interrupt).toBeDefined();

        await handle.signal(hitlDecisionSignal, { approved: true });
        const result = await handle.result();

        expect(result.hitlInterrupted).toBe(true);
        expect(result.hitlDecision).toEqual({ approved: true });
      });
    }, 30000);
  });

  describe('HITL Decision Signal - Approve', () => {
    it('should resume workflow and dispatch next steps when approved', async () => {
      const runId = `run-${uuid()}`;
      const workflowId = `workflow-${uuid()}`;

      const input: WorkflowInput = {
        runId,
        prompts: ['First', 'Second', 'Third'],
        shouldInterruptOnTurn: 2,
        interruptReason: 'Approve test',
      };

      const handle = await client.start(agentWorkflow, {
        taskQueue: 'test-queue',
        workflowId,
        args: [input],
      });

      await worker.runUntil(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await handle.signal(hitlDecisionSignal, {
          approved: true,
          feedback: 'Looks good, proceed',
        });

        const result = await handle.result();

        expect(result.hitlInterrupted).toBe(true);
        expect(result.hitlDecision?.approved).toBe(true);
        expect(result.hitlDecision?.feedback).toBe('Looks good, proceed');
        expect(result.results).toHaveLength(4);
        expect(result.results[0]).toContain('Processed: First');
        expect(result.results[1]).toContain('approved and processed');
        expect(result.results[2]).toContain('Processed: Third');
      });
    }, 30000);

    it('should process remaining prompts after approval', async () => {
      const runId = `run-${uuid()}`;
      const workflowId = `workflow-${uuid()}`;

      const input: WorkflowInput = {
        runId,
        prompts: ['Prompt 1', 'Prompt 2', 'Prompt 3', 'Prompt 4'],
        shouldInterruptOnTurn: 1,
        interruptReason: 'Multi-step test',
      };

      const handle = await client.start(agentWorkflow, {
        taskQueue: 'test-queue',
        workflowId,
        args: [input],
      });

      await worker.runUntil(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await handle.signal(hitlDecisionSignal, { approved: true });

        const result = await handle.result();

        expect(result.results).toHaveLength(4);
        expect(result.results[0]).toContain('approved and processed');
        expect(result.results[1]).toContain('Processed: Prompt 2');
        expect(result.results[2]).toContain('Processed: Prompt 3');
        expect(result.results[3]).toContain('Processed: Prompt 4');
      });
    }, 30000);
  });

  describe('HITL Decision Signal - Reject', () => {
    it('should terminate workflow when rejected', async () => {
      const runId = `run-${uuid()}`;
      const workflowId = `workflow-${uuid()}`;

      const input: WorkflowInput = {
        runId,
        prompts: ['First', 'Second', 'Third'],
        shouldInterruptOnTurn: 1,
        interruptReason: 'Reject test',
      };

      const handle = await client.start(agentWorkflow, {
        taskQueue: 'test-queue',
        workflowId,
        args: [input],
      });

      await worker.runUntil(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await handle.signal(hitlDecisionSignal, {
          approved: false,
          feedback: 'Stop execution',
        });

        const result = await handle.result();

        expect(result.hitlInterrupted).toBe(true);
        expect(result.hitlDecision?.approved).toBe(false);
        expect(result.results).toHaveLength(1);
        expect(result.results[0]).toContain('rejected and cancelled');
      });
    }, 30000);

    it('should not process remaining prompts after rejection', async () => {
      const runId = `run-${uuid()}`;
      const workflowId = `workflow-${uuid()}`;

      const input: WorkflowInput = {
        runId,
        prompts: ['Prompt 1', 'Prompt 2', 'Prompt 3'],
        shouldInterruptOnTurn: 2,
        interruptReason: 'Rejection stops workflow',
      };

      const handle = await client.start(agentWorkflow, {
        taskQueue: 'test-queue',
        workflowId,
        args: [input],
      });

      await worker.runUntil(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await handle.signal(hitlDecisionSignal, { approved: false });

        const result = await handle.result();

        expect(result.results).toHaveLength(2);
        expect(result.results[0]).toContain('Processed: Prompt 1');
        expect(result.results[1]).toContain('rejected and cancelled');
      });
    }, 30000);
  });

  describe('Normal Workflow Without Interruption', () => {
    it('should complete normally when no interruption occurs', async () => {
      const runId = `run-${uuid()}`;
      const workflowId = `workflow-${uuid()}`;

      const input: WorkflowInput = {
        runId,
        prompts: ['Normal 1', 'Normal 2', 'Normal 3'],
      };

      const handle = await client.start(agentWorkflow, {
        taskQueue: 'test-queue',
        workflowId,
        args: [input],
      });

      await worker.runUntil(async () => {
        const result = await handle.result();

        expect(result.hitlInterrupted).toBe(false);
        expect(result.hitlDecision).toBeUndefined();
        expect(result.results).toHaveLength(3);
        expect(result.results[0]).toContain('Processed: Normal 1');
        expect(result.results[1]).toContain('Processed: Normal 2');
        expect(result.results[2]).toContain('Processed: Normal 3');

        const status = await platformAPI.getRunStatus(runId);
        expect(status).toBeUndefined();
      });
    }, 30000);
  });
});
