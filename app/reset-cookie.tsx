"use client";

import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";

export function ResetCookie({
  name,
  children,
}: PropsWithChildren<{ name: string }>) {
  const router = useRouter();
  return (
    <button
      style={{ fontFamily: "monospace" }}
      onClick={() => {
        document.cookie = `${name}=; path=/; max-age=-1`;
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
