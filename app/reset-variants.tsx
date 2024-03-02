"use client";

import { useRouter } from "next/navigation";

export function ResetVariants() {
  const router = useRouter();
  return (
    <button
      style={{ fontFamily: 'monospace'}}
      onClick={() => {
        document.cookie = `assignedVariants=`;
        router.refresh();
      }}
    >
      reset
    </button>
  );
}
