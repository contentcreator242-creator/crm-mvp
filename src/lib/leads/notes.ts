export async function createLeadNote(
  db: any,
  data: { organizationId: string; leadId: string; content: string },
) {
  if (!db.leadNote) return;
  await db.leadNote.create({
    data: {
      organizationId: data.organizationId,
      leadId: data.leadId,
      content: data.content,
    },
  });
}

export async function listLeadNotes(
  db: any,
  input: { organizationId: string; leadId: string; take?: number },
): Promise<Array<{ id: string; content: string; createdAt: Date }>> {
  if (!db.leadNote) return [];
  return db.leadNote.findMany({
    where: { organizationId: input.organizationId, leadId: input.leadId },
    orderBy: { createdAt: "desc" },
    take: input.take ?? 200,
  });
}
