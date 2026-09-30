"use client";

export function DeleteUserButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm("Delete this user? This can't be undone.")) {
          e.preventDefault();
        }
      }}
      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
    >
      Delete
    </button>
  );
}
