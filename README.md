# gca-pm

## One-time setup

```bash
git config core.hooksPath .githooks
```

This activates a pre-push hook that rebuilds `backend/dist` and
`frontend/.next/standalone` (both tracked in git for cPanel's git-pull
deploys) and blocks the push if the rebuild doesn't match what's committed.
