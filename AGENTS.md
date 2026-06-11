<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Before modifying auth, session-gating, onboarding, RLS, or data access logic, inspect:

- supabase/schemas/current.sql

Do not invent new tables unless necessary.
Preserve existing schema and RLS policies unless a security issue requires changes.
<!-- END:nextjs-agent-rules -->
