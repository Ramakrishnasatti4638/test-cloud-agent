# Test Cloud Agent - Additional Documentation

## Overview
This document provides supplementary information about the test-cloud-agent repository and its usage patterns.

## Workflow Architecture

### Signal Flow
The HITL (Human-in-the-Loop) workflow uses Temporal signals to communicate decisions:

```
Agent Workflow
    ↓
Execute Agent Turn (Activity)
    ↓
Should Interrupt? 
    ↓ YES
Throw AgentInterruptedError
    ↓
Register HITL Interrupt (Activity)
    ↓
Wait for hitl-decision Signal (5 min timeout)
    ↓
Process Decision (Approve/Reject)
    ↓
Continue with Next Turn
```

## Activity Functions

### executeAgentTurn
Executes a single agent turn with optional interrupt capability:
- **Input**: runId, turnId, prompt, shouldInterrupt flag
- **Output**: AgentTurnOutput with response and completion status
- **Error Handling**: Throws AgentInterruptedError if shouldInterrupt is true

### registerHitlInterruptAsync
Registers an interrupt with the platform API:
- Logs interrupt metadata including timestamp and reason
- Integrates with external platform for human review

### processApprovedTurn
Handles approved turns after HITL review

### processRejectedTurn
Handles rejected turns after HITL review

## Testing Coverage

The `workflow.test.ts` file includes comprehensive tests for:
- Basic workflow execution without interrupts
- HITL interrupt scenarios
- Signal handling and decision processing
- Error cases and edge conditions
- Multi-turn execution flows

## Usage Example

```typescript
const input: WorkflowInput = {
  runId: 'run-123',
  prompts: ['First prompt', 'Second prompt', 'Third prompt'],
  shouldInterruptOnTurn: 2,
  interruptReason: 'Requires human approval'
};

const result = await workflowClient.execute(agentWorkflow, input);
```

## Error Handling

### AgentInterruptedError
Custom error thrown when an agent turn is interrupted. The workflow catches this and initiates HITL.

### Validation
Input validation ensures:
- runId is not empty
- turnId is not empty
- prompt is not empty

## Configuration

### Temporal Retry Policy
- Maximum attempts: 3
- Start-to-close timeout: 1 minute

### Decision Timeout
- HITL decision signal timeout: 5 minutes
- If no decision received within timeout, workflow fails

## Integration Points

### Platform API
The workflow integrates with a platform API to:
1. Register HITL interrupts
2. Retrieve human decisions
3. Log workflow events

## Best Practices

1. **Always provide meaningful interrupt reasons** for better human decision-making
2. **Use unique runIds** to track workflows in external systems
3. **Set appropriate turnId naming** for easier debugging
4. **Monitor HITL decision timeouts** to prevent workflow failures
5. **Log relevant metadata** for audit trails and analytics

## Troubleshooting

### Workflow Timeout
If workflows timeout during HITL wait:
- Ensure decision signal is sent with correct runId
- Check Temporal worker connectivity
- Verify platform API is accessible

### Activity Failures
If activities fail:
- Check input validation (all fields required)
- Verify platform API endpoints are reachable
- Check Temporal worker logs for detailed errors

## Future Enhancements

- [ ] Support for parallel turn execution
- [ ] Dynamic timeout configuration
- [ ] Batch decision processing
- [ ] Webhook notifications for human reviewers
- [ ] Audit logging integration
- [ ] Metrics and observability improvements

## References

- [Temporal Documentation](https://docs.temporal.io)
- [Workflow Patterns](https://docs.temporal.io/workflows)
- [Signal Handling](https://docs.temporal.io/workflows#signals)
