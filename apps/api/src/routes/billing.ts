// ============================================================
// LexAI India — Billing & Subscription Routes
// POST /v1/billing/razorpay/order   — create Razorpay order
// POST /v1/billing/razorpay/verify  — verify payment + activate
// POST /v1/billing/razorpay/webhook — Razorpay webhook handler
// GET  /v1/billing/status           — get subscription status
// POST /v1/billing/signup           — new tenant signup + 5-day trial
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

const PLAN_PRICE_PAISE = 299900; // ₹2,999/month in paise

export const billingRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /v1/billing/signup — called after Supabase auth to create tenant + trial
  fastify.post('/signup', async (request, reply) => {
    const { supabase_user_id, full_name, email, firm_name, location, phone } = request.body as any;

    if (!supabase_user_id || !email) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'supabase_user_id and email required' } });
    }

    // Check if user already exists
    const existing = await fastify.prisma.user.findUnique({ where: { id: supabase_user_id } });
    if (existing) {
      // Already signed up — just return token
      return reply.send({ data: { already_exists: true } });
    }

    // Create tenant (firm)
    const slug = (firm_name || email.split('@')[0])
      .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)
      + '-' + Math.random().toString(36).slice(2, 6);

    const tenant = await fastify.prisma.tenant.create({
      data: {
        name: firm_name || `${full_name}'s Chambers`,
        slug,
        plan: 'starter',
        active: true,
      },
    });

    // Create user as managing_partner
    await fastify.prisma.user.create({
      data: {
        id: supabase_user_id,
        tenant_id: tenant.id,
        email,
        full_name: full_name || email.split('@')[0],
        role: 'managing_partner',
        phone: phone || null,
        is_active: true,
      },
    });

    // Create 5-day trial subscription
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    await fastify.prisma.subscription.create({
      data: {
        tenant_id: tenant.id,
        plan: 'starter',
        status: 'trialing',
        trial_ends_at: trialEnd,
        current_period_start: now,
        current_period_end: trialEnd,
      },
    });

    fastify.log.info(`[Billing] New signup: ${email} — tenant ${tenant.id} — trial until ${trialEnd.toISOString()}`);
    return reply.status(201).send({ data: { tenant_id: tenant.id, trial_ends_at: trialEnd } });
  });

  // GET /v1/billing/status — subscription status for current tenant
  fastify.get('/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;

    const sub = await fastify.prisma.subscription.findFirst({ where: { tenant_id } });
    if (!sub) {
      return reply.send({ data: { status: 'no_subscription', is_pro: false, trial_days_left: 0 } });
    }

    const now = new Date();
    const isTrialing = sub.status === 'trialing';
    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
    const trialDaysLeft = trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))
      : 0;
    const trialExpired = isTrialing && trialDaysLeft === 0;
    const isPro = sub.status === 'active';

    // Auto-expire trial
    if (trialExpired && sub.status === 'trialing') {
      await fastify.prisma.subscription.update({
        where: { tenant_id },
        data: { status: 'past_due' },
      }).catch(() => {});
    }

    return reply.send({
      data: {
        status: trialExpired ? 'expired' : sub.status,
        plan: sub.plan,
        is_pro: isPro,
        is_trialing: isTrialing && !trialExpired,
        trial_days_left: trialDaysLeft,
        trial_ends_at: sub.trial_ends_at,
        razorpay_subscription_id: sub.razorpay_subscription_id,
      },
    });
  });

  // POST /v1/billing/razorpay/order — create a Razorpay order for one-time or subscription
  fastify.post('/razorpay/order', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return reply.status(503).send({ error: { code: 'RAZORPAY_NOT_CONFIGURED', message: 'Payment not configured' } });
    }

    // Create Razorpay order via REST API
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: PLAN_PRICE_PAISE,
        currency: 'INR',
        receipt: `lexai_${tenant_id.slice(0, 8)}_${Date.now()}`,
        notes: { tenant_id, product: 'LexAI Pro Monthly' },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      fastify.log.error('[Billing] Razorpay order error: ' + err);
      return reply.status(502).send({ error: { code: 'ORDER_FAILED', message: 'Failed to create payment order' } });
    }

    const order = await orderRes.json() as any;
    return reply.send({
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: keyId,
      },
    });
  });

  // POST /v1/billing/razorpay/verify — verify payment signature + activate subscription
  fastify.post('/razorpay/verify', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body as any;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return reply.status(503).send({ error: { code: 'RAZORPAY_NOT_CONFIGURED' } });
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return reply.status(400).send({ error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' } });
    }

    // Activate subscription for 30 days
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await fastify.prisma.subscription.upsert({
      where: { tenant_id },
      create: {
        tenant_id,
        plan: 'professional',
        status: 'active',
        current_period_start: now,
        current_period_end: periodEnd,
      },
      update: {
        plan: 'professional',
        status: 'active',
        razorpay_subscription_id: razorpay_payment_id,
        current_period_start: now,
        current_period_end: periodEnd,
      },
    });

    // Update tenant plan
    await fastify.prisma.tenant.update({
      where: { id: tenant_id },
      data: { plan: 'professional' },
    });

    fastify.log.info(`[Billing] ✅ Payment verified — tenant ${tenant_id} activated as professional`);
    return reply.send({ data: { status: 'active', plan: 'professional', period_end: periodEnd } });
  });

  // POST /v1/billing/razorpay/webhook — Razorpay webhook for subscription events
  fastify.post('/razorpay/webhook', async (request, reply) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return reply.status(200).send({ ok: true });

    const signature = (request.headers['x-razorpay-signature'] as string) || '';
    const body = JSON.stringify(request.body);
    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

    if (signature !== expectedSig) {
      return reply.status(400).send({ error: 'Invalid webhook signature' });
    }

    const event = request.body as any;
    fastify.log.info(`[Billing] Webhook: ${event.event}`);

    if (event.event === 'payment.captured') {
      const notes = event.payload?.payment?.entity?.notes || {};
      const tenantId = notes.tenant_id;
      if (tenantId) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await fastify.prisma.subscription.upsert({
          where: { tenant_id: tenantId },
          create: { tenant_id: tenantId, plan: 'professional', status: 'active', current_period_start: now, current_period_end: periodEnd },
          update: { plan: 'professional', status: 'active', current_period_start: now, current_period_end: periodEnd },
        }).catch(() => {});
        await fastify.prisma.tenant.update({ where: { id: tenantId }, data: { plan: 'professional' } }).catch(() => {});
      }
    }

    return reply.status(200).send({ ok: true });
  });
};
