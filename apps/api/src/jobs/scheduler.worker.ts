// ============================================================
// LexAI India — Reminder & Scheduler Worker
// PRD v1.1 CAL-03 (Hearing Reminders), WA-01 (Cause List),
// CN-01 (Client Notifications), CM-11 (eCourts Sync)
// Runs daily — triggered by BullMQ repeat jobs
// ============================================================

import 'dotenv/config';
import { Worker, Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const prisma = new PrismaClient();

// ── IST helpers ───────────────────────────────────────────────
function todayIST(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setHours(0, 0, 0, 0);
  return istNow;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── 1. Hearing Reminders (PRD CAL-03) ────────────────────────
// Sends push + email at D-30, D-7, D-1
async function processHearingReminders() {
  const today = todayIST();
  const reminderDays = [30, 7, 1];
  let sent = 0;

  for (const days of reminderDays) {
    const targetDate = addDays(today, days);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const fieldName = days === 30 ? 'reminder_30d_sent'
                    : days === 7  ? 'reminder_7d_sent'
                    : 'reminder_1d_sent';

    // Find hearings on that date where reminder not yet sent
    const hearings = await prisma.hearing.findMany({
      where: {
        date: targetDate,
        [fieldName]: false,
      },
      include: {
        case: {
          select: {
            id: true, title: true, court: true, cnr_number: true,
            assigned_advocates: true, client_id: true,
            tenant_id: true,
          },
        },
      },
    });

    for (const hearing of hearings) {
      const { case: c } = hearing;
      if (!c) continue;

      // Notify each assigned advocate (in-app + email)
      for (const advocateId of c.assigned_advocates) {
        const advocate = await prisma.user.findUnique({
          where: { id: advocateId },
          select: { full_name: true, email: true },
        });

        // In-app notification
        await prisma.notification.create({
          data: {
            tenant_id: c.tenant_id,
            user_id: advocateId,
            type: days === 30 ? 'hearing_reminder_30d'
                : days === 7  ? 'hearing_reminder_7d'
                : 'hearing_reminder_1d',
            title: `Hearing in ${days} day${days > 1 ? 's' : ''}: ${c.title}`,
            message: `${hearing.purpose?.replace(/_/g, ' ')} at ${c.court}${hearing.time ? ` at ${hearing.time} IST` : ''} on ${new Date(hearing.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`,
            action_url: `/cases/${c.id}`,
            related_case_id: c.id,
            related_hearing_id: hearing.id,
          },
        });

        // Phase 2b: Send email via Resend
        if (advocate?.email && process.env.RESEND_API_KEY) {
          try {
            await sendHearingReminderEmail({
              to: advocate.email,
              advocateName: advocate.full_name,
              caseTitle: c.title,
              court: c.court,
              date: new Date(hearing.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              time: hearing.time || 'Time to be confirmed',
              purpose: hearing.purpose?.replace(/_/g, ' ') || '',
              daysUntil: days,
              caseUrl: `${process.env.APP_URL || 'https://lexai-platform-web.vercel.app'}/cases/${c.id}`,
            });
          } catch (emailErr: any) {
            console.warn('[Scheduler] Email failed:', emailErr.message);
          }
        }

        sent++;
      }

      // Mark reminder as sent
      await prisma.hearing.update({
        where: { id: hearing.id },
        data: { [fieldName]: true },
      });
    }
  }

  console.log(`[Scheduler] Hearing reminders: ${sent} notifications sent`);
  return sent;
}

// ── 2. Day-of Briefing (PRD CAL-07) ──────────────────────────
async function processDayOfBriefing() {
  const today = todayIST();
  let sent = 0;

  const hearingsToday = await prisma.hearing.findMany({
    where: { date: today },
    include: {
      case: {
        select: {
          id: true, title: true, court: true, cnr_number: true,
          assigned_advocates: true, tenant_id: true,
        },
      },
    },
  });

  // Group by advocate
  const byAdvocate: Record<string, any[]> = {};
  for (const h of hearingsToday) {
    if (!h.case) continue;
    for (const advocateId of h.case.assigned_advocates) {
      if (!byAdvocate[advocateId]) byAdvocate[advocateId] = [];
      byAdvocate[advocateId].push(h);
    }
  }

  for (const [advocateId, hearings] of Object.entries(byAdvocate)) {
    const firstHearing = hearings[0];
    await prisma.notification.create({
      data: {
        tenant_id: firstHearing.case.tenant_id,
        user_id: advocateId,
        type: 'hearing_day_briefing',
        title: `Today: ${hearings.length} hearing${hearings.length > 1 ? 's' : ''}`,
        message: hearings.map(h => `${h.case.title} — ${h.case.court}${h.time ? ` at ${h.time}` : ''}`).join('\n'),
        action_url: '/calendar/today-briefing',
      },
    });
    sent++;
  }

  console.log(`[Scheduler] Day-of briefings: ${sent} sent`);
  return sent;
}

// ── 3. Task Due Reminders (PRD WF-04) ────────────────────────
async function processTaskReminders() {
  const today = todayIST();
  const tomorrow = addDays(today, 1);
  let sent = 0;

  // Tasks due tomorrow
  const tasksDueTomorrow = await prisma.task.findMany({
    where: {
      due_date: tomorrow,
      status: { in: ['todo', 'in_progress'] },
    },
    include: {
      case: { select: { id: true, title: true, tenant_id: true } },
    },
  });

  for (const task of tasksDueTomorrow) {
    for (const assigneeId of task.assigned_to) {
      await prisma.notification.create({
        data: {
          tenant_id: task.case.tenant_id,
          user_id: assigneeId,
          type: 'task_due_tomorrow',
          title: `Task due tomorrow: ${task.title}`,
          message: `Case: ${task.case.title}`,
          action_url: `/cases/${task.case_id}`,
          related_case_id: task.case_id,
        },
      });
      sent++;
    }
  }

  // Overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: {
      due_date: { lt: today },
      status: { in: ['todo', 'in_progress'] },
    },
    include: {
      case: { select: { id: true, title: true, tenant_id: true } },
    },
    take: 100,
  });

  for (const task of overdueTasks) {
    for (const assigneeId of task.assigned_to) {
      // Check if we already sent an overdue notif today
      const existing = await prisma.notification.findFirst({
        where: {
          user_id: assigneeId,
          type: 'task_overdue',
          related_case_id: task.case_id,
          created_at: { gte: today },
        },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          tenant_id: task.case.tenant_id,
          user_id: assigneeId,
          type: 'task_overdue',
          title: `Overdue: ${task.title}`,
          message: `Due: ${new Date(task.due_date!).toLocaleDateString('en-IN')} — Case: ${task.case.title}`,
          action_url: `/cases/${task.case_id}`,
          related_case_id: task.case_id,
        },
      });
      sent++;
    }
  }

  console.log(`[Scheduler] Task reminders: ${sent} notifications sent`);
  return sent;
}

// ── 4. Client Hearing Reminders D-7 and D-2 (PRD CN-01) ──────
async function processClientReminders() {
  const today = todayIST();
  const targetDays = [7, 2];
  let sent = 0;

  for (const days of targetDays) {
    const targetDate = addDays(today, days);

    const hearings = await prisma.hearing.findMany({
      where: { date: targetDate },
      include: {
        case: {
          select: {
            id: true, title: true, court: true, tenant_id: true,
            client_id: true, client_instruction_default: true,
          },
        },
      },
    });

    for (const hearing of hearings) {
      if (!hearing.case.client_id) continue;

      const client = await prisma.client.findUnique({
        where: { id: hearing.case.client_id },
        select: {
          id: true, full_name: true, phone: true, email: true,
          whatsapp_opted_in: true, sms_opted_in: true, email_opted_in: true,
          notification_prefs: true,
        },
      });

      if (!client) continue;

      // Check notification preferences
      const prefs = client.notification_prefs as any || {};
      if (prefs.hearing_reminder === false) continue;

      // Create client notification record
      const notif = await prisma.clientNotification.create({
        data: {
          tenant_id: hearing.case.tenant_id,
          client_id: client.id,
          case_id: hearing.case.id,
          hearing_id: hearing.id,
          notification_type: days === 7 ? 'hearing_reminder_7d' : 'hearing_reminder_2d',
          channels_attempted: [
            ...(client.whatsapp_opted_in ? ['whatsapp'] : []),
            ...(client.sms_opted_in ? ['sms'] : []),
            ...(client.email_opted_in ? ['email'] : []),
          ],
          content_snapshot: {
            client_name: client.full_name,
            case_title: hearing.case.title,
            hearing_date: new Date(hearing.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            court: hearing.case.court,
            time: hearing.time || 'Time to be confirmed',
            purpose: hearing.purpose?.replace(/_/g, ' '),
          },
          client_instruction: hearing.client_instruction || hearing.case.client_instruction_default,
          scheduled_for: new Date(),
        },
      });

      // TODO Phase 2c: Queue WhatsApp message via WhatsApp Business API
      // TODO Phase 2c: Queue SMS via MSG91
      // TODO Phase 2c: Queue email via Resend
      // For now: log that it's ready to send
      console.log(`[Scheduler] Client reminder queued: ${client.full_name} for case ${hearing.case.title} (D-${days})`);

      sent++;
    }
  }

  console.log(`[Scheduler] Client reminders: ${sent} queued`);
  return sent;
}

// ── 5. Overdue Invoice Reminders (PRD INV-04) ────────────────
async function processInvoiceReminders() {
  const today = todayIST();
  let sent = 0;

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'issued',
      due_date: { lt: today },
    },
    include: {
      client: { select: { id: true, full_name: true, phone: true, email: true, whatsapp_opted_in: true } },
    },
  });

  for (const invoice of overdueInvoices) {
    // Check reminder schedule: send on due date, D+3, D+7
    const dueDaysAgo = Math.floor((today.getTime() - new Date(invoice.due_date!).getTime()) / (1000 * 60 * 60 * 24));
    if (![0, 3, 7].includes(dueDaysAgo)) continue;

    const reminderKey = today.toISOString().split('T')[0];
    const alreadySent = (invoice.reminder_sent_dates || []).some(
      (d: any) => new Date(d).toISOString().split('T')[0] === reminderKey
    );
    if (alreadySent) continue;

    // Update reminder_sent_dates
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'overdue',
        reminder_sent_dates: {
          push: today,
        },
      },
    });

    // TODO Phase 2c: Queue WhatsApp payment reminder
    console.log(`[Scheduler] Invoice reminder: ₹${Number(invoice.balance_paise) / 100} overdue from ${invoice.client.full_name}`);
    sent++;
  }

  console.log(`[Scheduler] Invoice reminders: ${sent} sent`);
  return sent;
}

// ── 6. eCourts Auto-Sync (PRD CM-11) ─────────────────────────
async function processECourtsSyncs() {
  const today = todayIST();
  let synced = 0, conflicts = 0, errors = 0;

  // Find all cases with CNR numbers where sync is enabled
  const casesToSync = await prisma.case.findMany({
    where: {
      cnr_number: { not: null },
      ecourts_sync_enabled: true,
      status: { notIn: ['closed', 'decided'] },
    },
    select: {
      id: true, cnr_number: true, court: true, court_level: true,
      next_hearing_date: true, tenant_id: true,
    },
    take: 100, // Process max 100 per run
  });

  console.log(`[eCourts Sync] Processing ${casesToSync.length} cases`);

  for (const caseRecord of casesToSync) {
    const syncJob = await prisma.courtSyncJob.create({
      data: {
        tenant_id: caseRecord.tenant_id,
        case_id: caseRecord.id,
        cnr_number: caseRecord.cnr_number!,
        court_portal: getPortalForCourt(caseRecord.court_level),
        trigger: 'scheduled',
        status: 'running',
      },
    });

    try {
      const startTime = Date.now();
      const result = await scrapeCNR(caseRecord.cnr_number!, caseRecord.court_level);
      const responseTime = Date.now() - startTime;

      if (!result) {
        await prisma.courtSyncJob.update({
          where: { id: syncJob.id },
          data: { status: 'cnr_not_found', synced_at: new Date() },
        });
        continue;
      }

      // Check for conflict with manually entered date
      let conflictDetected = false;
      let autoUpdated = false;

      if (result.next_date) {
        const fetchedDate = new Date(result.next_date);
        const existingDate = caseRecord.next_hearing_date;

        if (!existingDate) {
          // No existing date — auto-update
          await prisma.case.update({
            where: { id: caseRecord.id },
            data: {
              next_hearing_date: fetchedDate,
              last_synced_at: new Date(),
            },
          });
          autoUpdated = true;
        } else if (fetchedDate.toISOString().split('T')[0] !== new Date(existingDate).toISOString().split('T')[0]) {
          // Dates differ — flag conflict, don't auto-update
          conflictDetected = true;

          // Notify advocates about the conflict
          const fullCase = await prisma.case.findUnique({
            where: { id: caseRecord.id },
            select: { assigned_advocates: true, title: true },
          });

          if (fullCase) {
            for (const advocateId of fullCase.assigned_advocates) {
              await prisma.notification.create({
                data: {
                  tenant_id: caseRecord.tenant_id,
                  user_id: advocateId,
                  type: 'ecourts_sync_conflict',
                  title: `Date conflict: ${fullCase.title}`,
                  message: `eCourts shows ${fetchedDate.toLocaleDateString('en-IN')} but your calendar shows ${new Date(existingDate).toLocaleDateString('en-IN')}. Please verify.`,
                  action_url: `/cases/${caseRecord.id}`,
                  related_case_id: caseRecord.id,
                },
              });
            }
          }
          conflicts++;
        } else {
          // Dates match — just update last_synced_at
          await prisma.case.update({
            where: { id: caseRecord.id },
            data: { last_synced_at: new Date() },
          });
        }
      }

      await prisma.courtSyncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'success',
          fetched_date: result.next_date ? new Date(result.next_date) : null,
          fetched_time: result.next_time || null,
          fetched_court_room: result.court_room || null,
          fetched_status: result.case_status || null,
          conflict_detected: conflictDetected,
          auto_updated: autoUpdated,
          response_time_ms: responseTime,
          synced_at: new Date(),
        },
      });

      synced++;

    } catch (err: any) {
      errors++;
      await prisma.courtSyncJob.update({
        where: { id: syncJob.id },
        data: {
          status: err.message?.includes('portal') ? 'portal_unavailable' : 'failed',
          error_message: err.message,
          synced_at: new Date(),
        },
      });
    }

    // Rate limit: 1 request per 2 seconds (be respectful to court portals)
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`[eCourts Sync] Done: ${synced} synced, ${conflicts} conflicts, ${errors} errors`);
  return { synced, conflicts, errors };
}

// ── eCourts Scraper (Phase 1 implementation) ──────────────────
async function scrapeCNR(cnr: string, courtLevel: string): Promise<{
  next_date: string | null;
  next_time: string | null;
  court_room: string | null;
  case_status: string | null;
} | null> {
  // Phase 1: Query eCourts case status API
  // URL: https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/getCaseStatus
  // This requires session cookies — using a headless approach via the public endpoint

  try {
    const res = await fetch(`https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/getCaseStatus&cino=${cnr}&apptype=72`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 LexAI-India-Legal-Platform/1.1 (lawtech; +https://lexai.in)',
        'Accept': 'application/json, text/plain',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`eCourts portal returned ${res.status}`);
    }

    const text = await res.text();

    // Parse eCourts response — handles both JSON and HTML formats
    let nextDate: string | null = null;
    let nextTime: string | null = null;
    let courtRoom: string | null = null;
    let caseStatus: string | null = null;

    // Try JSON first (newer eCourts API)
    try {
      const json = JSON.parse(text);
      // eCourts JSON structure varies by court
      const caseInfo = json?.case_details || json?.caseDetails || json?.data || json;
      nextDate = caseInfo?.next_hearing_date || caseInfo?.nextHearingDate || caseInfo?.next_date || null;
      nextTime = caseInfo?.next_hearing_time || caseInfo?.nextHearingTime || null;
      courtRoom = caseInfo?.court_room || caseInfo?.courtRoom || null;
      caseStatus = caseInfo?.case_status || caseInfo?.caseStatus || caseInfo?.status || null;
    } catch {
      // Fall back to HTML parsing
      // eCourts HTML typically contains dates in formats like "15-Apr-2025" or "15/04/2025"
      const datePatterns = [
        /next[^<]*date[^<]*?(\d{1,2}[-/]\w{3,9}[-/]\d{2,4})/i,
        /next[^<]*hearing[^<]*?(\d{2}[-/]\d{2}[-/]\d{4})/i,
        /(\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})/i,
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          // Normalise to YYYY-MM-DD
          const raw = match[1];
          const months: Record<string, string> = {
            jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
            jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'
          };
          let normalised: string | null = null;
          // DD-Mon-YYYY
          const m1 = raw.match(/(\d{1,2})-(\w{3})-(\d{4})/i);
          if (m1) normalised = `${m1[3]}-${months[m1[2].toLowerCase()]}-${m1[1].padStart(2,'0')}`;
          // DD/MM/YYYY
          const m2 = raw.match(/(\d{1,2})\/(\d{2})\/(\d{4})/);
          if (m2) normalised = `${m2[3]}-${m2[2]}-${m2[1].padStart(2,'0')}`;

          if (normalised) { nextDate = normalised; break; }
        }
      }

      // Extract case status from HTML
      const statusMatch = text.match(/case[^<]*status[^<]*?:\s*<[^>]*>([^<]+)/i)
        || text.match(/Status[^<]*?<[^>]*>([^<]{3,30})</i);
      if (statusMatch) caseStatus = statusMatch[1].trim();

      // Extract court room
      const roomMatch = text.match(/court[^<]*room[^<]*?(?:no\.?|number)?\s*:?\s*(\w+)/i);
      if (roomMatch) courtRoom = roomMatch[1];
    }

    if (!nextDate && !caseStatus) {
      console.log(`[eCourts] CNR ${cnr}: could not parse response (${text.length} chars)`);
      return null;
    }

    console.log(`[eCourts] CNR ${cnr}: parsed — next: ${nextDate}, status: ${caseStatus}`);
    return { next_date: nextDate, next_time: nextTime, court_room: courtRoom, case_status: caseStatus };

  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new Error('eCourts portal timeout');
    }
    throw new Error(`eCourts portal unavailable: ${err.message}`);
  }
}

function getPortalForCourt(courtLevel: string): any {
  if (courtLevel === 'supreme_court') return 'supreme_court';
  if (courtLevel === 'high_court') return 'ecourts';
  if (courtLevel === 'tribunal') return 'nclt';
  return 'ecourts';
}


// ── Email via Resend ──────────────────────────────────────────
async function sendHearingReminderEmail(opts: {
  to: string; advocateName: string; caseTitle: string; court: string;
  date: string; time: string; purpose: string; daysUntil: number; caseUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const subject = opts.daysUntil === 1
    ? `⚖ Tomorrow: Hearing in ${opts.caseTitle}`
    : `⚖ Hearing in ${opts.daysUntil} days: ${opts.caseTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1E3A5F; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #D4AF37; margin: 0; font-size: 20px;">⚖ LexAI India</h1>
        <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Hearing Reminder</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <p style="color: #374151; margin: 0 0 16px;">Dear ${opts.advocateName},</p>
        <p style="color: #374151;">You have a hearing scheduled in <strong>${opts.daysUntil === 1 ? 'tomorrow' : opts.daysUntil + ' days'}</strong>:</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: bold; color: #1e3a5f; font-size: 16px;">${opts.caseTitle}</p>
          <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">📍 ${opts.court}</p>
          <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">📅 ${opts.date}</p>
          <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">🕐 ${opts.time} IST</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px; text-transform: capitalize;">📋 ${opts.purpose}</p>
        </div>
        <a href="${opts.caseUrl}" style="display: inline-block; background: #1E3A5F; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold; margin-top: 8px;">
          View Case Details →
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">LexAI India · AI-Powered Legal Platform</p>
      </div>
    </div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'LexAI India <reminders@lexai.in>',
      to: opts.to,
      subject,
      html,
    }),
  });
}

// ── Worker setup ──────────────────────────────────────────────
const worker = new Worker('scheduler', async (job: Job) => {
  const { task } = job.data;
  console.log(`[Scheduler] Running task: ${task}`);

  switch (task) {
    case 'hearing_reminders':    return processHearingReminders();
    case 'day_of_briefing':      return processDayOfBriefing();
    case 'task_reminders':       return processTaskReminders();
    case 'client_reminders':     return processClientReminders();
    case 'invoice_reminders':    return processInvoiceReminders();
    case 'ecourts_sync':         return processECourtsSyncs();
    default:
      console.warn(`[Scheduler] Unknown task: ${task}`);
  }
}, { connection: redis, concurrency: 1 });

// ── Schedule recurring jobs ───────────────────────────────────
async function setupSchedule() {
  const schedulerQueue = new Queue('scheduler', { connection: redis });

  const JOBS = [
    { name: 'hearing_reminders', cron: '0 8 * * *',  tz: 'Asia/Kolkata' },  // 8:00 AM IST
    { name: 'day_of_briefing',   cron: '0 7 * * *',  tz: 'Asia/Kolkata' },  // 7:00 AM IST
    { name: 'task_reminders',    cron: '0 8 * * *',  tz: 'Asia/Kolkata' },  // 8:00 AM IST
    { name: 'client_reminders',  cron: '0 6 * * *',  tz: 'Asia/Kolkata' },  // 6:00 AM IST
    { name: 'invoice_reminders', cron: '0 9 * * *',  tz: 'Asia/Kolkata' },  // 9:00 AM IST
    { name: 'ecourts_sync',      cron: '0 2 * * *',  tz: 'Asia/Kolkata' },  // 2:00 AM IST
    { name: 'cause_list',        cron: '30 6 * * *', tz: 'Asia/Kolkata' },  // 6:30 AM IST (build + send by 7)
  ];

  for (const job of JOBS) {
    await schedulerQueue.upsertJobScheduler(
      job.name,
      { pattern: job.cron },
      { name: job.name, data: { task: job.name } }
    );
    console.log(`[Scheduler] Scheduled: ${job.name} @ ${job.cron} IST`);
  }

  console.log('✅ All scheduled jobs registered');
}

setupSchedule().catch(console.error);

worker.on('completed', (job) => console.log(`[Scheduler] ✅ ${job.data.task} done`));
worker.on('failed', (job, err) => console.error(`[Scheduler] ❌ ${job?.data?.task} failed:`, err.message));

console.log('⏰ LexAI Scheduler Worker started...');

process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
