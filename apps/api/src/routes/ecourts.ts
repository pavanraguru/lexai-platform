// ============================================================
// LexAI India — eCourts Sync Route
// POST /v1/ecourts/sync/:case_id   — manual sync trigger
// GET  /v1/ecourts/status/:case_id — last sync result
// PRD SYNC-01: Auto-pull hearing dates from eCourts portal
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import https from 'https';

// ── eCourts API helper ──────────────────────────────────────
const ECOURTS_BASE = 'https://services.ecourts.gov.in/ecourtindiaAPI/api';
const ECOURTS_TOKEN = process.env.ECOURTS_APP_TOKEN || '';
const TIMEOUT_MS = 15000;

interface ECourtsResult {
  case_status?: string;
  next_hearing_date?: string;
  next_hearing_time?: string;
  court_room?: string;
  judge_name?: string;
  last_order_date?: string;
  error?: string;
  portal_unavailable?: boolean;
  cnr_not_found?: boolean;
}

function fetchECourts(cnr: string): Promise<ECourtsResult> {
  return new Promise((resolve) => {
    const url = new URL(`${ECOURTS_BASE}/cnr_status`);
    url.searchParams.set('cnr', cnr.toUpperCase().trim());

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ECOURTS_TOKEN}`,
        'apptoken': ECOURTS_TOKEN,
        'User-Agent': 'LexAI-India/1.0',
      },
      timeout: TIMEOUT_MS,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 404) {
          return resolve({ cnr_not_found: true });
        }
        if (res.statusCode === 503 || res.statusCode === 502) {
          return resolve({ portal_unavailable: true });
        }
        if (res.statusCode !== 200) {
          return resolve({ error: `eCourts API returned HTTP ${res.statusCode}` });
        }
        try {
          const json = JSON.parse(data);
          // eCourts API response shape (as of 2025)
          const caseData = json?.case_details || json?.data || json || {};
          return resolve({
            case_status:       caseData.case_status || caseData.status,
            next_hearing_date: caseData.next_hearing_date || caseData.next_date,
            next_hearing_time: caseData.next_hearing_time || caseData.next_time,
            court_room:        caseData.court_no || caseData.court_room,
            judge_name:        caseData.judge_name || caseData.coram,
            last_order_date:   caseData.last_order_date,
          });
        } catch {
          return resolve({ error: 'Invalid JSON from eCourts API' });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ portal_unavailable: true, error: 'eCourts portal timed out' });
    });

    req.on('error', (err) => {
      // Network-level errors (DNS, connection refused, etc.)
      const msg = err.message || '';
      const isNetworkErr = msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ECONNRESET');
      resolve({
        portal_unavailable: isNetworkErr,
        error: isNetworkErr ? 'eCourts portal unreachable' : err.message,
      });
    });

    req.end();
  });
}

// ── Parse "DD-MM-YYYY" or "YYYY-MM-DD" → Date | null ────────
function parseIndianDate(raw?: string): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  raw = raw.trim();

  // DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`);
    return isNaN(d.getTime()) ? null : d;
  }
  // YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ── Parse time "HH:MM" or "HH:MM AM/PM" ─────────────────────
function parseTime(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2,'0')}:${match[2]}`;
}

export const ecourtsRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/ecourts/sync/:case_id
  fastify.post('/sync/:case_id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id, id: user_id } = req.user;
    const { case_id } = req.params as { case_id: string };

    // 1. Fetch the case and validate
    const caseRecord = await fastify.prisma.case.findFirst({
      where: { id: case_id, tenant_id },
      select: { id: true, cnr_number: true, title: true, court: true, court_level: true },
    });

    if (!caseRecord) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
    }

    if (!caseRecord.cnr_number?.trim()) {
      return reply.status(400).send({
        error: { code: 'NO_CNR', message: 'This case has no CNR number. Add a CNR number to the case before syncing.' },
      });
    }

    const cnr = caseRecord.cnr_number.trim().toUpperCase();

    // 2. Rate-limit: prevent sync more than once per 5 minutes per case
    const recentSync = await fastify.prisma.courtSyncJob.findFirst({
      where: {
        case_id,
        tenant_id,
        synced_at: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        status: 'success',
      },
      orderBy: { synced_at: 'desc' },
    });

    if (recentSync) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'This case was synced less than 5 minutes ago. Please wait before syncing again.',
        },
        data: { last_sync: recentSync },
      });
    }

    const startTime = Date.now();

    // 3. Call eCourts API
    const result = await fetchECourts(cnr);
    const responseTimeMs = Date.now() - startTime;

    // 4. Determine sync status
    let syncStatus: 'success' | 'failed' | 'cnr_not_found' | 'portal_unavailable';
    if (result.portal_unavailable) syncStatus = 'portal_unavailable';
    else if (result.cnr_not_found)  syncStatus = 'cnr_not_found';
    else if (result.error)          syncStatus = 'failed';
    else                            syncStatus = 'success';

    // 5. Parse dates
    const nextHearingDate = parseIndianDate(result.next_hearing_date);
    const nextHearingTime = parseTime(result.next_hearing_time);
    const lastOrderDate   = parseIndianDate(result.last_order_date);

    // 6. Only update DB records on success
    let hearing: any = null;
    let conflictDetected = false;

    if (syncStatus === 'success' && nextHearingDate) {
      // Check for conflicting existing hearing on same date
      const existing = await fastify.prisma.hearing.findFirst({
        where: {
          case_id,
          tenant_id,
          date: nextHearingDate,
        },
      });

      conflictDetected = !!existing;

      if (!existing) {
        // Create new hearing from eCourts data
        hearing = await fastify.prisma.hearing.create({
          data: {
            tenant_id,
            case_id,
            date:       nextHearingDate,
            time:       nextHearingTime || undefined,
            court_room: result.court_room || undefined,
            judge_name: result.judge_name || undefined,
            purpose:    'misc', // user can update
            created_by: user_id,
          },
        });
      } else {
        // Update existing hearing with fresh data
        hearing = await fastify.prisma.hearing.update({
          where: { id: existing.id },
          data: {
            ...(nextHearingTime  && { time:       nextHearingTime }),
            ...(result.court_room && { court_room: result.court_room }),
            ...(result.judge_name && { judge_name: result.judge_name }),
          },
        });
      }

      // Update case next_hearing_date and status if eCourts says it changed
      await fastify.prisma.case.update({
        where: { id: case_id },
        data: {
          next_hearing_date: nextHearingDate,
          ...(result.judge_name && { judge_name: result.judge_name }),
        },
      });

      // Create a notification
      await fastify.prisma.notification.create({
        data: {
          tenant_id,
          user_id,
          type:       'hearing_reminder',
          title:      'eCourts Sync Complete',
          message:    `Next hearing for ${caseRecord.title} is on ${nextHearingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          action_url: `/cases/${case_id}?tab=hearings`,
          read:       false,
        },
      });
    }

    // 7. Log the sync job
    const syncJob = await fastify.prisma.courtSyncJob.create({
      data: {
        tenant_id,
        case_id,
        hearing_id:          hearing?.id || undefined,
        cnr_number:          cnr,
        court_portal:        'ecourts',
        trigger:             'manual',
        status:              syncStatus,
        fetched_date:        nextHearingDate || undefined,
        fetched_time:        nextHearingTime || undefined,
        fetched_court_room:  result.court_room || undefined,
        fetched_status:      result.case_status || undefined,
        fetched_order_date:  lastOrderDate || undefined,
        conflict_detected:   conflictDetected,
        auto_updated:        !conflictDetected,
        error_message:       result.error || undefined,
        response_time_ms:    responseTimeMs,
      },
    });

    // 8. Return appropriate response
    if (syncStatus === 'portal_unavailable') {
      return reply.status(503).send({
        error: {
          code: 'PORTAL_UNAVAILABLE',
          message: 'The eCourts portal is currently unavailable. Please try again later.',
        },
        data: { sync_job: syncJob },
      });
    }

    if (syncStatus === 'cnr_not_found') {
      return reply.status(404).send({
        error: {
          code: 'CNR_NOT_FOUND',
          message: `CNR number ${cnr} was not found on eCourts. Please verify the CNR is correct.`,
        },
        data: { sync_job: syncJob },
      });
    }

    if (syncStatus === 'failed') {
      return reply.status(500).send({
        error: { code: 'SYNC_FAILED', message: result.error || 'eCourts sync failed' },
        data: { sync_job: syncJob },
      });
    }

    return reply.send({
      data: {
        sync_job:          syncJob,
        hearing:           hearing,
        next_hearing_date: nextHearingDate?.toISOString().split('T')[0] || null,
        next_hearing_time: nextHearingTime,
        case_status:       result.case_status,
        conflict_detected: conflictDetected,
        message:           nextHearingDate
          ? `Next hearing: ${nextHearingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}${nextHearingTime ? ' at ' + nextHearingTime : ''}`
          : 'Synced successfully. No upcoming hearing date found on eCourts.',
      },
    });
  });

  // GET /v1/ecourts/status/:case_id — last sync result + history
  fastify.get('/status/:case_id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { tenant_id } = req.user;
    const { case_id } = req.params as { case_id: string };

    const [lastSync, history] = await Promise.all([
      fastify.prisma.courtSyncJob.findFirst({
        where: { case_id, tenant_id },
        orderBy: { synced_at: 'desc' },
      }),
      fastify.prisma.courtSyncJob.findMany({
        where: { case_id, tenant_id },
        orderBy: { synced_at: 'desc' },
        take: 10,
      }),
    ]);

    return reply.send({ data: { last_sync: lastSync, history } });
  });
};
