import { AgentInterruptedError } from './errors';
import { platformAPI, HitlInterrupt } from './platformAPI';

export interface AgentTurnInput {
  runId: string;
  turnId: string;
  prompt: string;
  shouldInterrupt?: boolean;
  interruptReason?: string;
}

export interface AgentTurnOutput {
  turnId: string;
  response: string;
  completed: boolean;
}

export function validateAgentTurnInput(input: AgentTurnInput): void {
  if (!input.runId || input.runId.trim() === '') {
    throw new Error('runId is required and cannot be empty');
  }
  if (!input.turnId || input.turnId.trim() === '') {
    throw new Error('turnId is required and cannot be empty');
  }
  if (!input.prompt || input.prompt.trim() === '') {
    throw new Error('prompt is required and cannot be empty');
  }
}

export async function executeAgentTurn(input: AgentTurnInput): Promise<AgentTurnOutput> {
  validateAgentTurnInput(input);
  console.log(`[Activity] Executing agent turn: ${input.turnId}`);

  if (input.shouldInterrupt) {
    console.log(`[Activity] Throwing AgentInterruptedError for turn: ${input.turnId}`);
    throw new AgentInterruptedError(input.interruptReason || 'Manual interrupt', input.turnId, {
      runId: input.runId,
    });
  }

  return {
    turnId: input.turnId,
    response: `Processed: ${input.prompt}`,
    completed: true,
  };
}

export async function registerHitlInterruptAsync(interrupt: HitlInterrupt): Promise<void> {
  console.log(`[Activity] RegisterHitlInterruptAsync called for run: ${interrupt.runId}`);
  await platformAPI.registerHitlInterrupt(interrupt);
}

export async function processApprovedTurn(runId: string, turnId: string): Promise<string> {
  console.log(`[Activity] Processing approved turn: ${turnId} for run: ${runId}`);
  return `Turn ${turnId} approved and processed`;
}

export async function processRejectedTurn(runId: string, turnId: string): Promise<string> {
  console.log(`[Activity] Processing rejected turn: ${turnId} for run: ${runId}`);
  return `Turn ${turnId} rejected and cancelled`;
}
