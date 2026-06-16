import { requireProfile } from "@/lib/profile/dal";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireProfile();

  return (
    <div className="grid h-svh grid-rows-[minmax(0,1fr)] bg-background">
      <main className="mx-auto h-full min-h-0 w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
