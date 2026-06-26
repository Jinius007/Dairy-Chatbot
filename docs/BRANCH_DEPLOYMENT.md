# Branch: Catalyst + Sarvam only

This branch uses **Zoho Catalyst** and **Sarvam AI** exclusively. There is no Supabase, Gemini, Vercel, or ElevenLabs integration.

| Component | Location |
|-----------|----------|
| Frontend | Catalyst Slate |
| API | `catalyst/functions/pashumitra_api/` |
| Knowledge + RAG | `catalyst/.../lib/knowledge/` + `lib/rag-retrieval.ts` |
| Deploy guide | [CATALYST_DEPLOY.md](./CATALYST_DEPLOY.md) |

Production `master` uses a different stack — do not merge without a migration plan.
