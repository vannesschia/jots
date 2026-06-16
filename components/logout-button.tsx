"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
  containerClassName?: string;
  size?: ComponentProps<typeof Button>["size"];
  variant?: ComponentProps<typeof Button>["variant"];
};

export function LogoutButton({
  className,
  containerClassName,
  size,
  variant = "ghost",
}: LogoutButtonProps) {
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
    <div className={cn("flex flex-col items-end gap-1", containerClassName)}>
      <Button
        className={className}
        disabled={pending}
        onClick={handleLogout}
        size={size}
        type="button"
        variant={variant}
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
