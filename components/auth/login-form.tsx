import { SubmitButton } from "@/components/auth/submit-button";
import { signInWithGoogle } from "@/lib/auth/actions";

type LoginFormProps = {
  initialError?: string;
};

export function LoginForm({ initialError }: LoginFormProps) {
  return (
    <div className="space-y-4">
      {initialError ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {initialError}
        </p>
      ) : null}
      <form action={signInWithGoogle}>
        <SubmitButton pendingLabel="Opening Google...">
          <span aria-hidden="true" className="text-base font-semibold">
            G
          </span>
          Continue with Google
        </SubmitButton>
      </form>
    </div>
  );
}
