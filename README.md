# Jots

Jots is a Next.js App Router application using cookie-based Supabase
authentication.

## Getting Started

Copy `.env.example` to `.env` and fill in the values from the Supabase project
settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Auth Configuration

Jots uses Google as its only sign-in provider. In Supabase Auth settings, enable
Google and disable the Email provider.

To configure Google sign-in:

1. Create Google OAuth credentials and add the Supabase callback URL shown in
   the Supabase Google provider settings to Google's authorized redirect URIs.
2. Enable Google in Supabase Auth providers and enter the Google client ID and
   secret.
3. Add these application redirect URLs to the Supabase redirect allow list:
   `http://localhost:3000/auth/callback` and
   `https://your-production-domain/auth/callback`.
4. Set `NEXT_PUBLIC_SITE_URL` to the deployed application origin in production.

## Database Policies

The RLS migration is stored in `supabase/migrations`. It is intentionally not
applied to the linked project by application setup commands. Review and apply it
through the normal Supabase migration workflow.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
