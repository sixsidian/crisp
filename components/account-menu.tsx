"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export function AccountMenu({
  label,
  links,
}: {
  label: string;
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex max-w-[9rem] items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent sm:max-w-[14rem]"
      >
        <span className="truncate">{label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" className="shrink-0 text-muted">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] z-20 flex w-44 flex-col gap-0.5 rounded-lg border border-border bg-surface p-1.5 shadow-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-hover"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-0.5 border-t border-border pt-1.5">
            <SignOutButton variant="menu" />
          </div>
        </div>
      )}
    </div>
  );
}
