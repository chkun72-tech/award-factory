# Handyman Quote-to-Follow-up Autopilot

AI agent workflow for local service businesses.

## What this project does

This prototype converts a raw customer repair enquiry into:

- structured job scope
- missing-information questions
- quote draft
- customer reply draft
- follow-up task
- owner-ready next action

It is designed for small handyman and home-service businesses that need to respond faster without losing human control.

## Example

Input:

```text
Hi, my bathroom tap is leaking and I may also need a cabinet fixed.
Can someone come this week? I am in Parramatta.
```

Output:

- Service type: plumbing + general handyman
- Location: Parramatta
- Urgency: medium, may become urgent if leak is active
- Missing info:
  - photo/video of leak
  - severity
  - access time
  - whether emergency call-out is needed
- Quote draft: inspection + repair estimate range
- Customer reply: polite clarification message
- Follow-up task: request photos and confirm availability

## Agent workflow

```text
Customer enquiry
  -> Intake parser
  -> Service classifier
  -> Missing-info checker
  -> Quote draft generator
  -> Customer reply generator
  -> Follow-up task creator
  -> Owner dashboard
```

## Human approval boundary

The system does not automatically send messages to customers. It produces drafts and recommended actions for the business owner to review.

## Why this matters

Small service businesses often lose leads because follow-up is slow or inconsistent. This agent helps owners respond faster, prepare better drafts, and keep jobs moving.

## Hackathon integration notes

This project is Qwen/Alibaba Cloud-ready:

- Qwen can power extraction, classification, and draft generation.
- Alibaba Cloud can store job records, task logs, and agent output history.
- The workflow can be deployed as a small web app or demo service.

## Suggested demo script

1. Paste a customer enquiry.
2. Run the agent workflow.
3. Show extracted job scope.
4. Show quote draft.
5. Show customer reply draft.
6. Show follow-up task.
7. Explain human approval boundary.

## Tech stack

- React
- TypeScript
- Agent workflow architecture
- Qwen-ready model layer
- Alibaba Cloud-ready persistence/deployment path

## Future work

- Photo-based job analysis
- Service-specific quote templates
- Calendar integration
- Invoice/payment integration
- Customer follow-up automation with explicit owner approval

