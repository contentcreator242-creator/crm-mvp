export async function createLeadActivity(
  db: {
    leadActivity?: {
      create(args: {
        data: {
          organizationId: string;
          leadId: string;
          dealId?: string;
          eventType: string;
          description: string;
          metadata?: any;
        };
      }): Promise<unknown>;
    };
  },
  data: {
    organizationId: string;
    leadId: string;
    dealId?: string;
    eventType:
      | "lead_created"
      | "status_changed"
      | "deal_created"
      | "note"
      | "lender_action"
      | "email_sent";
    description: string;
    metadata?: any;
  },
) {
  // Safe no-op if Prisma client wasn't regenerated yet (delegate absent at runtime).
  if (!db.leadActivity) return;

  await db.leadActivity.create({
    data: {
      organizationId: data.organizationId,
      leadId: data.leadId,
      dealId: data.dealId,
      eventType: data.eventType,
      description: data.description,
      metadata: data.metadata,
    },
  });
}

export type LeadActivityListItem = {
  id: string;
  eventType: string;
  description: string;
  createdAt: Date;
  metadata: unknown;
};

export async function listLeadActivities(
  db: {
    leadActivity?: {
      findMany(args: unknown): Promise<LeadActivityListItem[]>;
    };
  },
  input: { leadId: string; organizationId: string; take?: number },
): Promise<LeadActivityListItem[]> {
  if (!db.leadActivity) return [];
  return db.leadActivity.findMany({
    where: { leadId: input.leadId, organizationId: input.organizationId },
    orderBy: { createdAt: "desc" },
    take: input.take ?? 50,
    select: {
      id: true,
      eventType: true,
      description: true,
      createdAt: true,
      metadata: true,
    },
  });
}

export function formatLeadActivityType(eventType: string): string {
  switch (eventType) {
    case "lead_created":
      return "Lead created";
    case "status_changed":
      return "Status changed";
    case "deal_created":
      return "Deal created";
    case "email":
      return "Email";
    case "email_sent":
      return "Email sent";
    case "note":
      return "Note";
    case "lender_action":
      return "Lender action";
    default:
      return eventType.replaceAll("_", " ");
  }
}
