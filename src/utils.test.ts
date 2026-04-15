import { calculateWorkflowStats, formatDuration, summarizeWorkflowExecution } from './utils';

describe('Workflow Utilities', () => {
  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds correctly', () => {
      expect(formatDuration(1000)).toBe('1.00s');
      expect(formatDuration(5500)).toBe('5.50s');
      expect(formatDuration(59999)).toBe('60.00s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(125000)).toBe('2m 5s');
    });
  });

  describe('calculateWorkflowStats', () => {
    it('should calculate workflow statistics correctly', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T00:01:30Z');

      const stats = calculateWorkflowStats(5, 3, 1, startTime, endTime);

      expect(stats.totalTurns).toBe(5);
      expect(stats.completedTurns).toBe(3);
      expect(stats.interruptedTurns).toBe(1);
      expect(stats.executionTimeMs).toBe(90000);
      expect(stats.averageTurnTimeMs).toBe(30000);
    });

    it('should handle zero completed turns', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T00:00:10Z');

      const stats = calculateWorkflowStats(5, 0, 1, startTime, endTime);

      expect(stats.completedTurns).toBe(0);
      expect(stats.averageTurnTimeMs).toBe(0);
    });
  });

  describe('summarizeWorkflowExecution', () => {
    it('should generate a summary string', () => {
      const stats = {
        totalTurns: 10,
        completedTurns: 8,
        interruptedTurns: 1,
        executionTimeMs: 120000,
        averageTurnTimeMs: 15000,
      };

      const summary = summarizeWorkflowExecution(stats);

      expect(summary).toContain('8/10 turns completed');
      expect(summary).toContain('2m 0s');
      expect(summary).toContain('15.00s/turn');
    });
  });
});
