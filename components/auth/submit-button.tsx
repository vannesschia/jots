"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
};

export function SubmitButton({
  children,
  pendingLabel,
  variant,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      className={cn("h-11 w-full")}
      disabled={pending}
      type="submit"
      variant={variant}
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
