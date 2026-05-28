import { createHash } from "crypto";

interface AnomalyRecord {
  type: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  blocked: boolean;
}

interface RequestPattern {
  endpoint: string;
  method: string;
  count: number;
  userId?: number;
  ip: string;
  timestamp: number;
}

class AnomalyDetector {
  private anomalies = new Map<string, AnomalyRecord>();
  private requestHistory: RequestPattern[] = [];
  private maxHistorySize = 5000;
  private alertThreshold = 10;
  private blockDuration = 300000;

  private getAnomalyKey(ip: string, type: string): string {
    return `${ip}:${type}`;
  }

  recordRequest(
    ip: string,
    endpoint: string,
    method: string,
    userId?: number
  ): boolean {
    const pattern: RequestPattern = {
      endpoint,
      method,
      count: 1,
      userId,
      ip,
      timestamp: Date.now(),
    };

    this.requestHistory.push(pattern);

    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }

    return this.checkAnomalies(ip, endpoint, userId);
  }

  private checkAnomalies(
    ip: string,
    endpoint: string,
    userId?: number
  ): boolean {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(
      r => r.ip === ip && now - r.timestamp < 60000
    );

    if (recentRequests.length > 100) {
      this.recordAnomaly(ip, "high_request_volume", 5);
    }

    const suspiciousPaths = ["/admin", "/api/stripe", "/api/payment", "/users"];
    if (suspiciousPaths.some(p => endpoint.includes(p)) && !userId) {
      this.recordAnomaly(ip, "unauthorized_sensitive_access", 3);
    }

    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /alter\s+table/i,
    ];
    if (sqlPatterns.some(p => p.test(endpoint))) {
      this.recordAnomaly(ip, "sql_injection_detected", 10);
      return true;
    }

    const xssPatterns = [/<script/i, /javascript:/i, /onerror=/i, /onload=/i];
    if (xssPatterns.some(p => p.test(endpoint))) {
      this.recordAnomaly(ip, "xss_pattern_detected", 10);
      return true;
    }

    return this.isBlocked(ip);
  }

  private recordAnomaly(ip: string, type: string, severity = 1): void {
    const key = this.getAnomalyKey(ip, type);
    const existing = this.anomalies.get(key);

    if (existing) {
      existing.count += severity;
      existing.lastSeen = Date.now();
    } else {
      this.anomalies.set(key, {
        type,
        count: severity,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        blocked: false,
      });
    }
  }

  isBlocked(ip: string): boolean {
    const now = Date.now();
    let totalScore = 0;

    this.anomalies.forEach((record, key) => {
      if (key.startsWith(ip + ":") && record.count >= this.alertThreshold) {
        if (now - record.lastSeen < this.blockDuration) {
          totalScore += record.count;
        }
      }
    });

    return totalScore >= this.alertThreshold;
  }

  getAnomalyReport(
    ip: string
  ): { type: string; count: number; severity: string }[] {
    const report: { type: string; count: number; severity: string }[] = [];

    this.anomalies.forEach((record, key) => {
      if (key.startsWith(ip + ":")) {
        let severity = "low";
        if (record.count >= 10) severity = "critical";
        else if (record.count >= 5) severity = "high";
        else if (record.count >= 3) severity = "medium";

        report.push({ type: record.type, count: record.count, severity });
      }
    });

    return report.sort((a, b) => b.count - a.count);
  }

  clearExpiredAnomalies(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.anomalies.forEach((record, key) => {
      if (now - record.lastSeen > this.blockDuration * 2) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.anomalies.delete(key));

    this.requestHistory = this.requestHistory.filter(
      r => now - r.timestamp < 300000
    );
  }

  detectBruteForce(ip: string): boolean {
    const now = Date.now();
    const recentFailed = this.requestHistory.filter(
      r => r.ip === ip && now - r.timestamp < 300000
    );
    return recentFailed.length >= 20;
  }

  getBlockedIPs(): string[] {
    const blocked = new Set<string>();
    const now = Date.now();

    this.anomalies.forEach((record, key) => {
      if (
        record.count >= this.alertThreshold &&
        now - record.lastSeen < this.blockDuration
      ) {
        const ip = key.split(":")[0];
        blocked.add(ip);
      }
    });

    return Array.from(blocked);
  }
}

export const anomalyDetector = new AnomalyDetector();

setInterval(() => {
  anomalyDetector.clearExpiredAnomalies();
}, 60000);

export function checkRequestAnomaly(
  ip: string,
  endpoint: string,
  method: string,
  userId?: number
): { blocked: boolean; reason?: string } {
  const blocked = anomalyDetector.isBlocked(ip);

  if (blocked) {
    return { blocked: true, reason: "Anomalous activity detected" };
  }

  const isBruteForce = anomalyDetector.detectBruteForce(ip);
  if (isBruteForce) {
    return { blocked: true, reason: "Potential brute force attempt detected" };
  }

  const shouldBlock = anomalyDetector.recordRequest(
    ip,
    endpoint,
    method,
    userId
  );

  if (shouldBlock) {
    return { blocked: true, reason: "Suspicious request pattern blocked" };
  }

  return { blocked: false };
}
