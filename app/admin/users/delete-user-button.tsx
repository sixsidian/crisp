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
      className="btn btn-danger-ghost btn-sm"
    >
      Delete
    </button>
  );
}
