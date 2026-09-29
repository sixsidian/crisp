import { AppHeader } from "@/components/app-header";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader variant="partner" />
      {children}
    </div>
  );
}
