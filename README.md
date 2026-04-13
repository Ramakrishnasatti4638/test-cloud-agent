# test-cloud-agent

A test repository for cloud agent functionality with Temporal workflow integration.

## Overview

This repository implements and tests Human-in-the-Loop (HITL) interrupt workflows using Temporal. It demonstrates how to build robust agent workflows that can pause for human review and approval before continuing execution.

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/Ramakrishnasatti4638/test-cloud-agent.git
cd test-cloud-agent
npm install
```

**Note:** Make sure you have Node.js 16+ and npm installed before running the installation.

## Features

- **Human-in-the-Loop (HITL) Workflows**: Pause agent execution for human review and approval
- **Temporal Integration**: Leverages Temporal for durable workflow execution
- **Agent Turn Management**: Process multiple agent turns with interrupt capabilities
- **Signal-based Decision Making**: Use Temporal signals to communicate approval/rejection decisions
- **Comprehensive Testing**: Jest-based test suite for workflow validation

## Project Structure

```
src/
├── workflows.ts       # Main Temporal workflow definitions
├── activities.ts      # Temporal activity implementations
├── platformAPI.ts     # Platform API integrations
├── errors.ts          # Custom error definitions
├── demo.ts            # Demo and example usage
└── workflow.test.ts   # Workflow test suite
```

## Development

Build the project:
```bash
npm run build
```

Run tests:
```bash
npm test
```

Format code:
```bash
npm run format
```

Lint code:
```bash
npm run lint
```

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## License

MIT

---
*Test branch update: Small change made for testing purposes.*

## Check 1 Update

This is a small change made on the "check-1" branch for testing purposes.

## Check 2 Update

This is a small change made on the "check-2" branch for testing purposes.