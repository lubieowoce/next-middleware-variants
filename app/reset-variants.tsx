"use client";

import { useRouter } from "next/navigation";

export function ResetVariants() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        document.cookie = `assignedVariants=`;
        router.refresh();
      }}
    >
      Reset variants
    </button>
  );
}
