# Milestone 2 — Safe revert point

**Tag:** `milestone-2` (commit `9e88bbe`)

State at this tag:
- Conversation logging via Vercel `/api/log-turn`
- Gujarati TTS fix (Google fallback for unsupported Bhashini languages)
- Capacitor Android shell + branded icon
- Single-animal NDDB ration calculator in chat

## Revert if herd ration feature breaks

```bash
git fetch --tags
git checkout milestone-2 -- .
git commit -m "Revert to milestone-2 (pre-herd ration advisor)"
git push
```

Or hard reset local branch (destructive):

```bash
git reset --hard milestone-2
git push --force-with-lease   # only if you intend to overwrite remote
```

Redeploy Supabase Edge Functions after revert:

```bash
supabase functions deploy chat
```
