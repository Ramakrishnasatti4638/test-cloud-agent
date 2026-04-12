export class AgentInterruptedError extends Error {
  constructor(
    public readonly reason: string,
    public readonly agentTurnId: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(`Agent interrupted: ${reason}`);
    this.name = 'AgentInterruptedError';
  }
}
