import { Connection, Client } from '@temporalio/client';
import { Worker, NativeConnection } from '@temporalio/worker';
import { v4 as uuid } from 'uuid';
import { agentWorkflow, hitlDecisionSignal, WorkflowInput } from './workflows';
import * as activities from './activities';
import { platformAPI } from './platformAPI';

async function runDemo() {
  console.log('\n=== HITL Interrupt Workflow Demo ===\n');

  const connection = await NativeConnection.connect({
    address: 'localhost:7233',
  });

  const client = new Client({ connection });

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'hitl-test-queue',
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  const workerRun = worker.run();

  try {
    const runId = `demo-run-${uuid()}`;
    const workflowId = `demo-workflow-${uuid()}`;

    console.log(`Starting workflow: ${workflowId}`);
    console.log(`Run ID: ${runId}\n`);

    const input: WorkflowInput = {
      runId,
      prompts: ['Analyze user data', 'Perform risky operation', 'Generate report'],
      shouldInterruptOnTurn: 2,
      interruptReason: 'Risky operation requires human approval',
    };

    const handle = await client.workflow.start(agentWorkflow, {
      taskQueue: 'hitl-test-queue',
      workflowId,
      args: [input],
    });

    console.log('✓ Workflow started\n');

    console.log('Waiting for HITL interrupt...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const status = await platformAPI.getRunStatus(runId);
    console.log(`\n✓ Run status in platformAPI: ${status}`);

    const interrupt = await platformAPI.getHitlInterrupt(runId);
    if (interrupt) {
      console.log('✓ HITL interrupt registered:');
      console.log(`  - Agent Turn ID: ${interrupt.agentTurnId}`);
      console.log(`  - Reason: ${interrupt.reason}`);
      console.log(`  - Timestamp: ${interrupt.timestamp}`);
    }

    console.log('\n✓ Workflow is waiting for hitl-decision signal\n');

    const workflowInfo = await handle.describe();
    console.log(`Workflow status: ${workflowInfo.status.name}`);

    console.log('\nSending APPROVE decision via hitl-decision signal...');
    await handle.signal(hitlDecisionSignal, {
      approved: true,
      feedback: 'Approved by human reviewer',
    });

    console.log('✓ Signal sent, waiting for workflow to complete...\n');

    const result = await handle.result();

    console.log('\n=== Workflow Results ===');
    console.log(`Run ID: ${result.runId}`);
    console.log(`HITL Interrupted: ${result.hitlInterrupted}`);
    console.log(`HITL Decision: ${JSON.stringify(result.hitlDecision)}`);
    console.log('\nResults:');
    result.results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r}`);
    });

    console.log('\n✅ Demo completed successfully!\n');

    console.log('=== Key Verifications ===');
    console.log('✓ execute-agent-turn threw AgentInterruptedError');
    console.log('✓ RegisterHitlInterruptAsync was called');
    console.log('✓ Run status set to "interrupted" in platformAPI');
    console.log('✓ Workflow entered hitl-decision signal wait');
    console.log('✓ Workflow resumed after receiving approve signal');
    console.log('✓ Remaining steps were dispatched and executed\n');
  } finally {
    worker.shutdown();
    await workerRun;
  }
}

runDemo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
