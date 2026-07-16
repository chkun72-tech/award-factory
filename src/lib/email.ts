import type { EmailDigestRecord } from "../types";

export interface EmailProvider {
  name: EmailDigestRecord["provider"];
  send(record: EmailDigestRecord): Promise<EmailDigestRecord>;
}

export class DisabledEmailProvider implements EmailProvider {
  name = "disabled" as const;
  async send(record: EmailDigestRecord): Promise<EmailDigestRecord> {
    return { ...record, provider: this.name, status: "cancelled", updatedAt: new Date().toISOString(), error: "Email notifications are disabled." };
  }
}

export class ConsoleEmailProvider implements EmailProvider {
  name = "console" as const;
  async send(record: EmailDigestRecord): Promise<EmailDigestRecord> {
    console.info(`[Award Factory email digest] ${record.subject}`);
    return { ...record, provider: this.name, status: "sent", sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
}

export function createEmailDigestRecord(params: {
  userId: string;
  workspaceId?: string;
  subject: string;
  body: string;
  provider?: EmailDigestRecord["provider"];
  now?: Date;
}): EmailDigestRecord {
  const now = params.now ?? new Date();
  return {
    id: `email-${now.getTime()}`,
    userId: params.userId,
    workspaceId: params.workspaceId,
    provider: params.provider ?? "disabled",
    status: "pending",
    subject: params.subject,
    body: params.body,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}
