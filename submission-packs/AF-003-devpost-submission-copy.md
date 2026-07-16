# AF-003｜Devpost Submission Copy Draft

## Project title

Handyman Quote-to-Follow-up Autopilot

## Tagline

An AI agent that turns messy customer repair enquiries into structured job scopes, quote drafts, customer replies, and follow-up tasks.

## Inspiration

Small local service businesses lose time and revenue because customer enquiries are often incomplete, scattered, and hard to follow up. A handyman business owner may receive requests through SMS, email, phone notes, or social messages. Each request needs clarification, pricing context, a customer reply, and a next action.

The inspiration for this project is simple: give the owner an AI operations assistant that helps them respond faster without removing human approval.

## What it does

Handyman Quote-to-Follow-up Autopilot takes a raw customer enquiry and converts it into:

- a structured job scope
- missing-information questions
- urgency and location notes
- a quote draft
- a customer reply draft
- an internal follow-up task
- an owner-ready next action

The agent does not auto-send messages to real customers. It prepares drafts and recommendations for the business owner to review.

## How we built it

The prototype is designed as an agent workflow:

1. Intake parser reads the customer message.
2. Service classifier identifies the likely job type.
3. Missing-information checker decides what must be clarified.
4. Quote draft generator prepares a non-binding draft.
5. Customer reply generator creates a polite response.
6. Follow-up task creator records the next business action.
7. Owner dashboard shows the result in a practical workflow.

If required by the hackathon rules, the model layer can use Qwen for extraction and draft generation, with Alibaba Cloud used for backend storage, logs, or deployment evidence.

## Challenges we ran into

The biggest challenge is keeping the agent useful without making unsafe promises. A repair quote can depend on photos, site conditions, parts, travel time, and business policy. The system therefore treats quotes as drafts and keeps the owner in the loop.

Another challenge is scope control. Instead of building a full CRM, the project focuses on one high-value workflow: enquiry to quote draft to follow-up.

## Accomplishments that we're proud of

- A focused real-world use case for AI agents.
- Clear human approval boundary.
- Reusable workflow for local service businesses.
- Practical outputs that a business owner can understand immediately.
- A demo flow that can be extended into scheduling, invoicing, and payments later.

## What we learned

AI agents are most useful in small businesses when they reduce repetitive operational steps. The owner does not need a complex dashboard first. They need faster triage, clearer next actions, and reliable follow-up.

## What's next

Next steps:

- Add photo-based job context.
- Connect quote templates by service category.
- Add customer approval tracking.
- Add optional calendar and invoice integrations.
- Add business-specific pricing rules.

## Built with

- AI agent workflow
- Qwen-ready model layer
- Alibaba Cloud-ready backend path
- React prototype
- TypeScript

## Safety / human approval note

All customer-facing messages and quote drafts require human review before sending. The system is an assistant, not an autonomous contractor or legal pricing authority.

