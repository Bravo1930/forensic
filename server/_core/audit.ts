import { createHash } from "crypto";
import { ENV } from "./env";

export type AuditEventType =
  | "login"
  | "logout"
  | "login_failed"
  | "session_expired"
  | "access_denied"
  | "data_access"
  | "data_modification"
  | "file_upload"
  | "file_download"
  | "analysis_run"
  | "case_created"
  | "case_deleted"
  | "evidence_deleted"
  | "rate_limit_exceeded"
  | "sql_injection_attempt"
  | "xss_attempt"
  | "invalid_input"
  | "admin_action"
  | "subscription_changed";

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId?: number;
  userEmail?: string;
  ipAddress: string;
  userAgent?: string;
  resource?: string;
  resourceId?: number;
  action: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 10000;
  private sensitiveFields = new Set([
    "password",
    "token",
    "secret",
    "apiKey",
    "Authorization",
  ]);

  private generateEventId(): string {
    return createHash("sha256")
      .update(`${Date.now()}:${Math.random().toString(36)}`)
      .digest("hex")
      .slice(0, 16);
  }

  private sanitizeMetadata(
    meta: Record<string, unknown> = {}
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (this.sensitiveFields.has(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "string" && value.length > 500) {
        sanitized[key] = value.slice(0, 500) + "...";
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  log(event: Omit<AuditEvent, "id" | "timestamp">): void {
    const fullEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      metadata: event.metadata
        ? this.sanitizeMetadata(event.metadata)
        : undefined,
    };

    this.events.push(fullEvent);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    if (event.severity === "critical" || event.severity === "warning") {
      console.warn(
        `[AUDIT ${event.severity.toUpperCase()}] ${event.eventType}: ${event.action}`,
        {
          userId: event.userId,
          ip: event.ipAddress,
          resource: event.resource,
        }
      );
    }
  }

  getRecentEvents(
    limit = 100,
    severity?: "info" | "warning" | "critical"
  ): AuditEvent[] {
    let filtered = this.events;
    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }
    return filtered.slice(-limit);
  }

  getEventsByUser(userId: number, limit = 50): AuditEvent[] {
    return this.events.filter(e => e.userId === userId).slice(-limit);
  }

  getFailedAuthAttempts(ipAddress: string, windowMs = 300000): AuditEvent[] {
    const cutoff = Date.now() - windowMs;
    return this.events.filter(
      e =>
        e.eventType === "login_failed" &&
        e.ipAddress === ipAddress &&
        new Date(e.timestamp).getTime() > cutoff
    );
  }

  getSecurityAlerts(
    severity: "warning" | "critical" = "warning"
  ): AuditEvent[] {
    return this.events.filter(e => e.severity === severity).slice(-100);
  }

  clearOldEvents(maxAgeMs = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.events.length;
    this.events = this.events.filter(
      e => new Date(e.timestamp).getTime() > cutoff
    );
    return before - this.events.length;
  }
}

export const auditLogger = new AuditLogger();

export function createAuditLog(
  eventType: AuditEventType,
  action: string,
  options: {
    userId?: number;
    userEmail?: string;
    ipAddress: string;
    userAgent?: string;
    resource?: string;
    resourceId?: number;
    success?: boolean;
    metadata?: Record<string, unknown>;
    severity?: "info" | "warning" | "critical";
  }
): void {
  const severity =
    options.severity ?? (options.success === false ? "warning" : "info");
  auditLogger.log({
    eventType,
    action,
    userId: options.userId,
    userEmail: options.userEmail,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    resource: options.resource,
    resourceId: options.resourceId,
    success: options.success ?? true,
    severity,
    metadata: options.metadata,
  });
}

export function logSecurityEvent(
  eventType: AuditEventType,
  req: {
    ip?: string;
    headers?: Record<string, unknown>;
    user?: { id?: number; email?: string | null };
  },
  details: {
    action: string;
    resource?: string;
    resourceId?: number;
    success?: boolean;
    metadata?: Record<string, unknown>;
  }
): void {
  createAuditLog(eventType, details.action, {
    userId: req.user?.id,
    userEmail: req.user?.email ?? undefined,
    ipAddress: req.ip || "unknown",
    userAgent: req.headers?.["user-agent"] as string | undefined,
    resource: details.resource,
    resourceId: details.resourceId,
    success: details.success,
    metadata: details.metadata,
  });
}

setInterval(
  () => {
    const removed = auditLogger.clearOldEvents();
    if (removed > 0) {
      console.log(`[Audit] Cleared ${removed} old events`);
    }
  },
  60 * 60 * 1000
);
