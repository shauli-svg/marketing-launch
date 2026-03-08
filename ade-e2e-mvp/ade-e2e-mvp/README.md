# Autonomous Delivery Engine — E2E MVP

A bounded-autonomy TypeScript scaffold for a delivery-oriented coding agent.

## What this repository is

This is **not** a general super-agent.
It is a narrow vertical slice that can:

1. ingest a structured task,
2. map a repository,
3. select a bounded working set,
4. create an explicit execution plan,
5. apply execution policy and file budgets,
6. run verification gates,
7. produce PR-ready artifacts,
8. stop safely when evidence is insufficient.

## Current behavior

The MVP currently includes:

- working code for repo mapping, context selection, planning, policy checks, decisions, journaling, and artifact writing
- a dry-run executor that records intended actions without mutating a target repo
- a local verifier that can either simulate verification or run allowlisted commands
- a CLI for end-to-end execution against a fixture repo
- tests for critical decision and routing logic

## Run

```bash
npm install
npm run test
npm run run:sample
```

The sample command runs the agent against `examples/repos/demo-app` and writes a journal to `.ade/journal.json`.

## MVP constraints

- TypeScript repos only
- max 5 file edits by default
- no auth/schema/infra/payment changes without approval
- no dependency upgrades unless explicitly requested
- no unlimited retries

## Marketing vertical: Campaign Launch Pack Agent

This repo now includes a marketing-focused vertical built on the same bounded-agent pattern.

It can:
- inspect a marketing site repo,
- identify likely landing-page / CTA / form / tracking files,
- generate a launch pack,
- write immediate campaign artifacts to disk.

### Run the marketing sample

```bash
npm install
npm run run:campaign-sample
```

Artifacts are written to `.ade/campaign` and include:
- landing page copy
- ad variants
- follow-up email sequence
- UTM plan
- event map
- launch checklist
