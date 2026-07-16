# Handyman Quote-to-Follow-up Autopilot

Qwen Cloud Hackathon demo project.

## Summary

Handyman Quote-to-Follow-up Autopilot is an AI agent workflow for local service businesses. It turns messy customer repair enquiries into structured job scopes, missing-information questions, quote drafts, customer reply drafts, and follow-up tasks.

The goal is to help small business owners respond faster while keeping human approval before any customer-facing message or quote is sent.

## Problem

Local service businesses often receive incomplete customer enquiries:

- unclear job type
- missing photos
- missing urgency details
- no clear access time
- no structured follow-up

This creates delays and lost leads.

## Demo scenario

Input:

```text
Hi, my bathroom tap is leaking and I may also need a cabinet fixed.
Can someone come this week? I am in Parramatta.
```

The agent produces:

- structured job scope
- missing-information checklist
- owner next action
- quote draft
- customer reply draft
- follow-up task

## Agent workflow

```text
Customer enquiry
  -> Intake parser
  -> Service classifier
  -> Missing-info checker
  -> Quote draft generator
  -> Reply draft generator
  -> Follow-up task creator
  -> Owner dashboard
```

## Human approval boundary

This project is intentionally designed as an assistant, not an autonomous contractor.

It does not:

- send messages to customers automatically
- make binding quotes
- accept jobs on behalf of the business owner
- replace site inspection or professional judgement

It does:

- prepare drafts
- structure messy information
- reduce repetitive admin work
- help the owner decide the next step

## Qwen / Alibaba Cloud integration path

The prototype is prepared for a Qwen / Alibaba Cloud implementation:

- Qwen model call for message extraction and draft generation
- Alibaba Cloud storage for job records and agent logs
- Alibaba Cloud deployment option for the demo app

For the current demo, the workflow is represented as a lightweight browser prototype so judges can see the full user journey clearly.

## Files in this pack

- `af003-demo-prototype.html` — clickable demo prototype
- `AF-003-devpost-submission-copy.md` — Devpost submission draft
- `AF-003-3min-video-shotlist.md` — 3-minute video script
- `AF-003-qwen-cloud-hackathon.md` — full preparation pack

## How to run the prototype

Open:

```text
submission-packs/af003-demo-prototype.html
```

Then click:

```text
Run Autopilot
```

No backend or secret key is required for this static demo.

## Future work

- Add real Qwen API integration
- Add Alibaba Cloud persistence
- Add photo-based job analysis
- Add service-specific quote templates
- Add explicit owner approval workflow
- Add calendar and invoice integrations

