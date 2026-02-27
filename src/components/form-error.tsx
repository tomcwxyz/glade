"use client";

import { useEffect, useRef } from "react";

export function FormError({ message }: { message: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && ref.current) {
      ref.current.focus();
    }
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="mb-6 px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth"
    >
      {message}
    </div>
  );
}
