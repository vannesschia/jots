export default function TodayPage() {
  return (
    <section className="rounded-2xl border bg-surface p-6 shadow-sm">
      <p className="text-sm font-medium text-brand">Today</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        What do you want to remember?
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Your authenticated Jots workspace is ready.
      </p>
    </section>
  );
}
