import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function AdminPage(): Promise<React.JSX.Element> {
  // Middleware already guarantees an admin session here; read it for display.
  const session = await getSession();
  return <AdminDashboard username={session?.username ?? "admin"} />;
}
