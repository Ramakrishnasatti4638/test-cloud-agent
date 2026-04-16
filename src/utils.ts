/**
 * Utility functions for workflow statistics and analysis
 * Updated for demo/check branch
 */

export interface WorkflowStats {
  totalTurns: number;
  completedTurns: number;
  interruptedTurns: number;
  executionTimeMs: number;
  averageTurnTimeMs: number;
}

export function calculateWorkflowStats(
  totalTurns: number,
  completedTurns: number,
  interruptedTurns: number,
  startTime: Date,
  endTime: Date
): WorkflowStats {
  const executionTimeMs = endTime.getTime() - startTime.getTime();
  const averageTurnTimeMs = completedTurns > 0 ? executionTimeMs / completedTurns : 0;

  return {
    totalTurns,
    completedTurns,
    interruptedTurns,
    executionTimeMs,
    averageTurnTimeMs,
  };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

export function summarizeWorkflowExecution(stats: WorkflowStats): string {
  return `Execution Summary: ${stats.completedTurns}/${stats.totalTurns} turns completed in ${formatDuration(stats.executionTimeMs)} (avg: ${formatDuration(stats.averageTurnTimeMs)}/turn)`;
}

/**
 * Calculate success rate of workflow execution
 * Added on demo/check branch
 * Updated: Part of 5-file batch modification test
 */
export function calculateSuccessRate(stats: WorkflowStats): number {
  if (stats.totalTurns === 0) return 0;
  return (stats.completedTurns / stats.totalTurns) * 100;
}

/**
 * Validate workflow statistics for consistency
 * Added during demo/check batch update
 */
export function validateStats(stats: WorkflowStats): boolean {
  return stats.totalTurns >= stats.completedTurns + stats.interruptedTurns;
}
