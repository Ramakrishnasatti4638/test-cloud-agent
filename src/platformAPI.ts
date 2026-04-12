export type RunStatus = 'running' | 'interrupted' | 'completed' | 'failed';

export interface HitlInterrupt {
  runId: string;
  agentTurnId: string;
  reason: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class PlatformAPI {
  private runStatuses = new Map<string, RunStatus>();
  private hitlInterrupts = new Map<string, HitlInterrupt>();

  async setRunStatus(runId: string, status: RunStatus): Promise<void> {
    console.log(`[PlatformAPI] Setting run ${runId} status to: ${status}`);
    this.runStatuses.set(runId, status);
  }

  async getRunStatus(runId: string): Promise<RunStatus | undefined> {
    return this.runStatuses.get(runId);
  }

  async registerHitlInterrupt(interrupt: HitlInterrupt): Promise<void> {
    console.log(`[PlatformAPI] Registering HITL interrupt for run: ${interrupt.runId}`);
    this.hitlInterrupts.set(interrupt.runId, interrupt);
    await this.setRunStatus(interrupt.runId, 'interrupted');
  }

  async getHitlInterrupt(runId: string): Promise<HitlInterrupt | undefined> {
    return this.hitlInterrupts.get(runId);
  }

  reset(): void {
    this.runStatuses.clear();
    this.hitlInterrupts.clear();
  }
}

export const platformAPI = new PlatformAPI();
