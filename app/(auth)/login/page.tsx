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
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-7 space-y-2 text-center">
          <p className="font-serif text-xl font-bold text-brand">Jots</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Continue to Jots
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
