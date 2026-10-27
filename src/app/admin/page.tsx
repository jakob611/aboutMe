import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { contactMessages, projects } from "@/db/schema";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

function serializeDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

export default async function AdminPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifyAdminSession(token))) {
    return <AdminLogin />;
  }

  let projectRows: (typeof projects.$inferSelect)[] = [];
  let messageRows: (typeof contactMessages.$inferSelect)[] = [];
  let loadError: string | undefined;
  try {
    [projectRows, messageRows] = await Promise.all([
      getDb().select().from(projects).orderBy(desc(projects.createdAt)),
      getDb().select().from(contactMessages).orderBy(desc(contactMessages.createdAt), desc(contactMessages.id)).limit(40),
    ]);
  } catch {
    console.error("Could not load admin data; check DATABASE_URL and the application tables.");
    loadError = "Could not load admin data. Check DATABASE_URL and the database tables, then refresh.";
  }

  return (
    <AdminDashboard
      loadError={loadError}
      projects={projectRows.map((row) => ({
        ...row,
        createdAt: serializeDate(row.createdAt),
      }))}
      messages={messageRows.map((row) => ({
        ...row,
        createdAt: serializeDate(row.createdAt),
      }))}
    />
  );
}
