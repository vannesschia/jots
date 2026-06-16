"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { getInitials } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  avatarUrl?: string | null;
  className?: string;
  displayName: string;
  fallbackClassName?: string;
  imageAlt?: string;
  imageClassName?: string;
  size?: "sm" | "default" | "lg";
};

export function UserAvatar({
  avatarUrl,
  className,
  displayName,
  fallbackClassName,
  imageAlt = "",
  imageClassName,
  size,
}: UserAvatarProps) {
  return (
    <Avatar className={className} key={avatarUrl ?? "fallback"} size={size}>
      {avatarUrl ? (
        <AvatarImage
          alt={imageAlt}
          className={imageClassName}
          src={avatarUrl}
        />
      ) : null}
      <AvatarFallback className={cn("font-medium", fallbackClassName)}>
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
