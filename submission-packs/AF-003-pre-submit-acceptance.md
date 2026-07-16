# AF-003｜Pre-submit Acceptance Report

Date: 2026-07-16  
Official source checked: https://qwencloud-hackathon.devpost.com/

## Official facts observed

- Hackathon: Global AI Hackathon Series with Qwen Cloud.
- Deadline shown by Devpost: July 20, 2026 at 2:00pm PDT.
- Format: online, public.
- Participants shown: 7,986 at time of check.
- Prize messaging:
  - page headline mentions $70K+ in cash and cloud credits,
  - prize section shows $45,000 in cash.
- Relevant track: Track 4, Autopilot Agent.
- Track 4 expects real-world business workflow automation, ambiguous inputs, external tools, and human-in-the-loop checkpoints.

## Official submission requirements observed

- Code repository URL for judging/testing.
- Repository must contain all source code, assets, and instructions.
- Repository must be public and open source.
- Open source license file must be visible on GitHub.
- Proof of Alibaba Cloud deployment is required.
- Architecture diagram is required.
- About 3-minute public video is required.
- Text description is required.
- Track must be identified.

## Current readiness

| Item | Status | Evidence |
|---|---:|---|
| GitHub repo exists | PASS | https://github.com/chkun72-tech/award-factory |
| Local source pushed | PASS | latest pushed branch `main` |
| License file added | PASS | `LICENSE` |
| Architecture diagram prepared | PASS | `submission-packs/AF-003-architecture-diagram.md` |
| Demo prototype prepared | PASS | `submission-packs/af003-demo-prototype.html` |
| Devpost copy prepared | PASS | `submission-packs/AF-003-devpost-submission-copy.md` |
| Recording narration prepared | PASS | `submission-packs/AF-003-recording-narration.md` |
| Manual checklist prepared | PASS | `submission-packs/AF-003-manual-submit-checklist.md` |
| Public video uploaded | FAIL | Not recorded/uploaded yet |
| Alibaba Cloud backend proof | FAIL | Plan exists, real deployment proof not yet implemented |
| Final eligibility confirmation | NEEDS REVIEW | Australia appears not excluded, but final rule acceptance should be checked in Devpost flow |

## Decision

Do not submit final Devpost entry yet.

Proceed with the next minimum blocker:

1. Create tiny Alibaba Cloud-backed proof endpoint or equivalent code/deployment proof.
2. Record the 3-minute demo video using the prepared prototype and narration.
3. Make sure GitHub repo remains public and license is visible.
4. Then complete manual Devpost submission.

## Current best track

Track 4: Autopilot Agent.

Reason:

The project directly demonstrates a real-world business workflow:

```text
customer enquiry -> job scope -> missing information -> quote draft -> reply draft -> follow-up task -> human approval
```

