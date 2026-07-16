# AF-003｜Architecture Diagram

This diagram explains the demo architecture for **Handyman Quote-to-Follow-up Autopilot**.

```mermaid
flowchart LR
  A["Customer enquiry<br/>SMS / email / web form"] --> B["Intake parser"]
  B --> C["Service classifier"]
  C --> D["Missing-info checker"]
  D --> E["Quote draft generator"]
  D --> F["Customer reply generator"]
  E --> G["Owner review dashboard"]
  F --> G
  G --> H["Follow-up task"]
  G --> I["Human approval gate"]
  I --> J["Owner sends final message"]

  Q["Qwen model layer<br/>extraction + draft generation"] -.-> B
  Q -.-> C
  Q -.-> E
  Q -.-> F

  K["Alibaba Cloud-ready storage<br/>job records + agent logs"] -.-> G
  K -.-> H
```

## Explanation

The project is intentionally scoped to one workflow:

```text
messy customer enquiry -> structured business action
```

The agent helps with:

- extracting job details,
- identifying missing information,
- drafting a non-binding quote,
- drafting a customer reply,
- creating a follow-up task.

The owner remains in control. Nothing is sent to the customer automatically.

## Qwen integration point

Qwen can be used for:

- extracting structured fields from messy customer messages,
- classifying service type,
- generating quote draft text,
- generating customer reply drafts.

## Alibaba Cloud integration point

Alibaba Cloud can be used for:

- storing job records,
- storing agent logs,
- hosting the demo service,
- recording follow-up tasks.

## Safety boundary

The final architecture keeps a human approval gate before any message or quote reaches a real customer.

