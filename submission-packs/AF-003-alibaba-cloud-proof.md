# AF-003｜Alibaba Cloud Deployment Proof Plan

Official requirement found on Devpost:

> Include Proof of Alibaba Cloud Deployment. The backend must be running on Alibaba Cloud, and the proof should be a link to a code file in the repository that demonstrates use of Alibaba Cloud services and APIs.

## Current status

Status: **not yet complete**

The current demo is a static browser prototype. It is useful for recording the workflow, but it does not yet satisfy the Alibaba Cloud backend proof requirement.

## Minimum compliant plan

Add a tiny backend endpoint deployed on Alibaba Cloud that records agent runs.

Suggested endpoint:

```text
POST /api/agent-runs
```

Payload:

```json
{
  "customerMessage": "Hi, my bathroom tap is leaking...",
  "serviceType": "plumbing + general handyman",
  "location": "Parramatta",
  "humanApprovalRequired": true
}
```

Response:

```json
{
  "id": "run_001",
  "status": "recorded",
  "provider": "Alibaba Cloud"
}
```

## Suggested Alibaba Cloud services

Use the simplest available combination:

- Alibaba Cloud Function Compute for the API endpoint.
- Alibaba Cloud Object Storage Service or Table Store for storing run logs.

## Required repo evidence

Before Devpost submission, add a real file such as:

```text
server/alibaba-agent-runs.ts
```

That file should visibly use Alibaba Cloud SDK/configuration and document:

- service name,
- environment variables,
- deploy command,
- public endpoint URL,
- how to test the endpoint.

## Blocker

Devpost submission should not be marked final until a real Alibaba Cloud deployment proof link exists.

