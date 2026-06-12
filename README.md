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

### Testing On A Physical Device

Start the dev server on the local network:

```bash
npm run dev -- --hostname 0.0.0.0
```

On a device connected to the same network, open
`http://<your-mac-ip>:3000`. The Next.js config automatically allows the
machine's active IPv4 addresses for development assets and endpoints.
Restart the dev server after changing networks so the allow list is refreshed.

For Google sign-in on the device, also add
`http://<your-mac-ip>:3000/auth/callback` to the Supabase Auth redirect allow
list. Development OAuth uses the origin of the browser request, while
production continues to use `NEXT_PUBLIC_SITE_URL`.

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

The RLS and onboarding migrations are stored in `supabase/migrations`. The
onboarding migration hardens profile validation and creates the public
`avatars` bucket with per-user upload/delete policies.

Migrations are intentionally not applied to the linked project by application
setup commands. Review and apply them through the normal Supabase migration
workflow before testing onboarding against a hosted project.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
