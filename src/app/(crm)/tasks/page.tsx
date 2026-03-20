import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { crmStatusBadgeClass } from "@/lib/ui/crmBadges";
import { PageHeader } from "@/components/crm-shell";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export default async function TasksPage() {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const tasks = await prisma.task.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  async function markDone(formData: FormData) {
    "use server";

    const { userId, orgId, orgSlug } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/organization/create");

    const taskId = String(formData.get("taskId") || "");
    const prismaInner = getPrisma();
    const organizationIdInner = await resolveOrganizationId(orgId, orgSlug ?? null);

    await prismaInner.task.updateMany({
      where: { id: taskId, organizationId: organizationIdInner },
      data: { status: "done" },
    });

    redirect("/tasks");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tasks"
        description="Follow-ups and actions scoped to your active organization."
        eyebrow="Operations"
        actions={
          <Link href="/tasks/new" className="adm-btn-primary text-sm">
            New task
          </Link>
        }
      />

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead className="adm-thead">
            <tr>
              <th className="adm-th">Title</th>
              <th className="adm-th">Due date</th>
              <th className="adm-th">Status</th>
              <th className="adm-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr className="adm-tr">
                <td className="adm-td py-12 text-center text-slate-500" colSpan={4}>
                  No tasks yet.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="adm-tr">
                  <td className="adm-td font-semibold text-slate-900">{task.title}</td>
                  <td className="adm-td tabular-nums text-slate-800">{formatDate(task.dueAt)}</td>
                  <td className="adm-td">
                    <span className={crmStatusBadgeClass(task.status)}>{task.status}</span>
                  </td>
                  <td className="adm-td">
                    {task.status !== "done" ? (
                      <form action={markDone}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button type="submit" className="btn-secondary-sm">
                          Mark complete
                        </button>
                      </form>
                    ) : (
                      <span className={crmStatusBadgeClass("done")}>done</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
