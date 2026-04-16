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

export class WorkflowTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowTimeoutError';
  }
}

/**
 * Error thrown when platform API is unavailable
 * Added on demo/check branch
 */
export class PlatformAPIError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'PlatformAPIError';
  }
}
