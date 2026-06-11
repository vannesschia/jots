"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    setError(null);
    startTransition(async () => {
      const result = await logout();

      if (result.error) {
        setError(result.error);
        return;
      }

      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={pending}
        onClick={handleLogout}
        type="button"
        variant="ghost"
      >
        <LogOut />
        {pending ? "Signing out..." : "Sign out"}
      </Button>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
