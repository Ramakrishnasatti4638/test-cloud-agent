import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  ApplicationFailure,
} from '@temporalio/workflow';
import type * as activities from './activities';

const { executeAgentTurn, registerHitlInterruptAsync, processApprovedTurn, processRejectedTurn } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '1 minute',
    retry: {
      maximumAttempts: 3,
    },
  });

export interface HitlDecision {
  approved: boolean;
  feedback?: string;
}

export interface WorkflowInput {
  runId: string;
  prompts: string[];
  shouldInterruptOnTurn?: number;
  interruptReason?: string;
}

export interface WorkflowResult {
  runId: string;
  results: string[];
  hitlInterrupted: boolean;
  hitlDecision?: HitlDecision;
}

export const hitlDecisionSignal = defineSignal<[HitlDecision]>('hitl-decision');

/**
 * Main agent workflow with HITL interrupt support
 * Enhanced on demo/check branch
 */
export async function agentWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  console.log(`[Workflow] Starting agent workflow for run: ${input.runId}`);

  const results: string[] = [];
  let hitlInterrupted = false;
  let hitlDecision: HitlDecision | undefined;
  let hitlDecisionReceived = false;

  setHandler(hitlDecisionSignal, (decision: HitlDecision) => {
    console.log(`[Workflow] Received hitl-decision signal: ${JSON.stringify(decision)}`);
    hitlDecision = decision;
    hitlDecisionReceived = true;
  });

  for (let i = 0; i < input.prompts.length; i++) {
    const turnId = `turn-${i + 1}`;
    const shouldInterrupt = input.shouldInterruptOnTurn === i + 1;

    console.log(`[Workflow] Processing turn ${i + 1}/${input.prompts.length}`);

    try {
      const result = await executeAgentTurn({
        runId: input.runId,
        turnId,
        prompt: input.prompts[i],
        shouldInterrupt,
        interruptReason: input.interruptReason,
      });

      results.push(result.response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Agent interrupted')) {
        console.log(`[Workflow] Caught AgentInterruptedError, calling RegisterHitlInterruptAsync`);
        hitlInterrupted = true;

        await registerHitlInterruptAsync({
          runId: input.runId,
          agentTurnId: turnId,
          reason: input.interruptReason || 'Unknown interrupt',
          timestamp: new Date(),
          metadata: { turnIndex: i + 1 },
        });

        console.log(`[Workflow] Waiting for hitl-decision signal...`);
        await condition(() => hitlDecisionReceived, '5 minutes');

        console.log(`[Workflow] hitl-decision received, processing decision`);

        if (!hitlDecision) {
          throw ApplicationFailure.create({
            message: 'HITL decision timeout or missing',
          });
        }

        if (hitlDecision.approved) {
          console.log(`[Workflow] Decision: APPROVED, dispatching next steps`);
          const approvedResult = await processApprovedTurn(input.runId, turnId);
          results.push(approvedResult);
        } else {
          console.log(`[Workflow] Decision: REJECTED, terminating workflow`);
          const rejectedResult = await processRejectedTurn(input.runId, turnId);
          results.push(rejectedResult);
          break;
        }
      } else {
        throw error;
      }
    }
  }

  console.log(`[Workflow] Workflow completed for run: ${input.runId}`);

  return {
    runId: input.runId,
    results,
    hitlInterrupted,
    hitlDecision,
  };
}
