import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <Topbar email={user.email} />
      <div className="mx-auto max-w-7xl px-5 py-8">{children}</div>
    </div>
  );
}
