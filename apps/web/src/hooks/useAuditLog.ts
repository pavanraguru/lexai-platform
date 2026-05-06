// apps/web/src/hooks/useAuditLog.ts
// Client-side audit hook — captures document views, downloads, tab switches, screenshot attempts

import { useCallback, useEffect } from 'react';
import { useAuthStore } from './useAuth';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useAuditLog() {
  const { token } = useAuthStore();

  const log = useCallback(async (
    event_type: string,
    entity_type: string,
    entity_id: string,
    resource_name: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!token) return;
    try {
      await fetch(`${BASE}/v1/team/audit-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event_type, entity_type, entity_id, resource_name, metadata }),
      });
    } catch (e) {
      // Silently fail — audit logging should never break the app
    }
  }, [token]);

  return { log };
}

// ── Hook for case page — auto-logs case_view + tab visibility ─
export function useCaseAudit(caseId: string, caseTitle: string) {
  const { log } = useAuditLog();

  // Log case view on mount
  useEffect(() => {
    if (!caseId || !caseTitle) return;
    log('case_view', 'case', caseId, caseTitle);
  }, [caseId]);

  // Log tab visibility changes
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && caseId) {
        log('tab_hidden', 'case', caseId, caseTitle, { hidden_at: new Date().toISOString() });
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [caseId, caseTitle]);

  // Detect screenshot attempt (PrintScreen key)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && e.key === '3') || (e.metaKey && e.shiftKey && e.key === '4')) {
        log('screenshot_attempt', 'case', caseId, caseTitle, { key: e.key });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [caseId, caseTitle]);

  const logDocView = (docId: string, filename: string) =>
    log('doc_view', 'document', docId, filename, { case_id: caseId });

  const logDocDownload = (docId: string, filename: string) =>
    log('doc_download', 'document', docId, filename, { case_id: caseId });

  return { logDocView, logDocDownload };
}
