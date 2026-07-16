# GitHub publish handoff

Current status:

- Local Git repo exists.
- Commits are ready.
- No remote is configured.
- GitHub repo creation is blocked because no usable GitHub repo-write credential is available in this environment.

Current local commits:

```text
e9451c8 Add AF-003 Devpost submission drafts
39e45f8 Add AF-003 Qwen submission pack
3840028 Build Award Factory production persistence milestone
```

## Fast path after a GitHub repo exists

From:

```powershell
C:\Users\za991\Documents\New project\award-factory
```

Run:

```powershell
git remote add origin https://github.com/<owner>/award-factory.git
git push -u origin master
```

## Recommended repo settings

- Name: `award-factory`
- Visibility: private while preparing submissions
- Description: `Award Factory｜國際競賽工廠 - competition opportunity tracker and submission workflow`
- Do not initialize with README, because this local repo already has one.

## Security notes

- Do not commit `.env`.
- Do not expose `DATABASE_URL` or service-role keys.
- Browser-safe keys only use `VITE_*`.

