import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const initialError = error
    ? "Authentication could not be completed. Please try again."
    : undefined;

  return (
    <main className="flex min-h-svh items-center justify-center px-8 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 sm:p-8 shadow-[0_2px_4px_rgb(0_0_0/0.08),0_12px_24px_color-mix(in_oklab,var(--brand)_18%,transparent)]">
        <div className="mb-7 space-y-2 text-center">
          <div className="mx-auto mb-4 size-16 rounded-[1.35rem] bg-[linear-gradient(to_bottom,color-mix(in_oklab,white_88%,var(--brand)),color-mix(in_oklab,white_72%,var(--brand)))] p-px shadow-[0_2px_4px_rgb(0_0_0/0.08),0_12px_24px_color-mix(in_oklab,var(--brand)_18%,transparent)]">
            <div className="flex size-full items-center justify-center rounded-[calc(1.35rem-1px)] bg-[linear-gradient(to_bottom,color-mix(in_oklab,white_98%,var(--brand)),color-mix(in_oklab,white_90%,var(--brand)))] shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]">
              <div
                aria-hidden="true"
                className="size-7 bg-foreground [mask:url('/pen-swirl.svg')_center/contain_no-repeat] [-webkit-mask:url('/pen-swirl.svg')_center/contain_no-repeat]"
              />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Jots
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in or create your account with Google.
          </p>
        </div>
        <LoginForm initialError={initialError} />
      </section>
    </main>
  );
}
