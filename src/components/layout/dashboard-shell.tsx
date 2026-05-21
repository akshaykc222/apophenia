import { Sidebar } from "./sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-8">{children}</div>
      </main>
      <Sidebar />
    </div>
  );
}
