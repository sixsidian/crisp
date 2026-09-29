import { AppHeader } from "@/components/app-header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader variant="admin" />
      {children}
    </div>
  );
}
