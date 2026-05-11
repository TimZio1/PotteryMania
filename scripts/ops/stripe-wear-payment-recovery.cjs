#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Inspect and prepare recovery for an already-paid Stripe wear order.
 *
 * Defaults to read-only. Mutating flags never call Spreadconnect directly:
 * - --unlock-event clears the exact Stripe webhook dedup row so Stripe Dashboard
 *   "Resend" can run the patched webhook.
 * - --enqueue-fulfillment creates one guarded Spreadconnect submit job for an
 *   already-paid order that has not been submitted.
 */
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const Stripe = require("stripe");
const { PrismaClient } = require("@prisma/client");

const SUCCESS_EVENT_TYPES = ["checkout.session.async_payment_succeeded", "checkout.session.completed"];
const SUBMITTED_KIND = "wear_spreadconnect_submitted";
const JOB_KIND = "spreadconnect_submit";

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), name);
    if (fs.existsSync(full)) dotenv.config({ path: full, override: false, quiet: true });
  }
}

function parseArgs(argv) {
  const args = {
    paymentIntentId: "",
    wearOrderId: "",
    eventId: "",
    unlockEvent: false,
    enqueueFulfillment: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      i += 1;
      return value;
    };

    if (arg === "--payment-intent" || arg === "--pi") args.paymentIntentId = next();
    else if (arg === "--wear-order-id" || arg === "--order") args.wearOrderId = next();
    else if (arg === "--event-id" || arg === "--event") args.eventId = next();
    else if (arg === "--unlock-event") args.unlockEvent = true;
    else if (arg === "--enqueue-fulfillment") args.enqueueFulfillment = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.paymentIntentId) throw new Error("--payment-intent is required");
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/ops/stripe-wear-payment-recovery.cjs --payment-intent pi_...

Read-only by default. Optional guarded mutations:
  --unlock-event         Clear processedAt for the exact matching Stripe event so Dashboard resend can replay it.
  --enqueue-fulfillment Create a pending Spreadconnect submit job for an already-paid, not-yet-submitted order.

Optional narrowing:
  --wear-order-id <uuid> Require Stripe metadata and DB order to match this wear order.
  --event-id evt_...     Require a specific Stripe event.`);
}

function toIso(epochSeconds) {
  return epochSeconds ? new Date(epochSeconds * 1000).toISOString() : null;
}

function sessionPaymentIntentId(session) {
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
}

function compactSession(session) {
  return {
    id: session.id,
    livemode: session.livemode,
    status: session.status,
    paymentStatus: session.payment_status,
    mode: session.mode,
    amountTotal: session.amount_total,
    currency: session.currency,
    createdAt: toIso(session.created),
    paymentIntentId: sessionPaymentIntentId(session),
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    customerName: session.customer_details?.name ?? null,
    metadata: session.metadata ?? {},
    hasCollectedShipping: Boolean(session.collected_information?.shipping_details?.address),
    hasCustomerAddress: Boolean(session.customer_details?.address?.line1),
  };
}

function compactPaymentIntent(pi) {
  return {
    id: pi.id,
    livemode: pi.livemode,
    status: pi.status,
    amount: pi.amount,
    amountReceived: pi.amount_received,
    currency: pi.currency,
    createdAt: toIso(pi.created),
    paymentMethodTypes: pi.payment_method_types,
    latestChargeId: typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null,
    customerId: typeof pi.customer === "string" ? pi.customer : pi.customer?.id ?? null,
    receiptEmail: pi.receipt_email ?? null,
    metadata: pi.metadata ?? {},
  };
}

function eventMatches(event, sessionIds, paymentIntentId) {
  const obj = event.data?.object;
  if (!obj) return false;
  const objPaymentIntentId =
    typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id ?? null;
  return obj.id === paymentIntentId || objPaymentIntentId === paymentIntentId || sessionIds.includes(obj.id);
}

async function findCheckoutSessions(stripe, paymentIntentId) {
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 10,
    expand: ["data.shipping_cost.shipping_rate"],
  });
  return sessions.data;
}

async function findMatchingEvents(stripe, paymentIntent, sessionIds) {
  const created = paymentIntent.created || Math.floor(Date.now() / 1000);
  const events = [];
  for (const type of SUCCESS_EVENT_TYPES) {
    const listed = await stripe.events.list({
      type,
      created: {
        gte: created - 7 * 24 * 60 * 60,
        lte: created + 14 * 24 * 60 * 60,
      },
      limit: 100,
    });
    for (const event of listed.data) {
      if (eventMatches(event, sessionIds, paymentIntent.id)) events.push(event);
    }
  }
  return events.sort((a, b) => a.created - b.created);
}

function chooseSession(sessions, args) {
  const wearSessions = sessions.filter((session) => {
    const metadata = session.metadata ?? {};
    if (metadata.type !== "wear_order") return false;
    if (args.wearOrderId && metadata.wearOrderId !== args.wearOrderId) return false;
    return true;
  });
  if (wearSessions.length !== 1) {
    throw new Error(`Expected exactly one wear Checkout Session, found ${wearSessions.length}`);
  }
  return wearSessions[0];
}

function chooseEvent(events, session, args) {
  const filtered = events.filter((event) => {
    if (args.eventId && event.id !== args.eventId) return false;
    if (event.type === "checkout.session.completed") {
      return event.data?.object?.id === session.id && event.data?.object?.payment_status === "paid";
    }
    return event.type === "checkout.session.async_payment_succeeded" && event.data?.object?.id === session.id;
  });
  const asyncEvent = filtered.find((event) => event.type === "checkout.session.async_payment_succeeded");
  return asyncEvent ?? filtered[0] ?? null;
}

async function loadLocalState(prisma, session, paymentIntentId, args) {
  const metadataWearOrderId = session.metadata?.wearOrderId;
  const orderWhere = [
    { stripePaymentIntentId: paymentIntentId },
    { stripeCheckoutSessionId: session.id },
    ...(metadataWearOrderId ? [{ id: metadataWearOrderId }] : []),
    ...(args.wearOrderId ? [{ id: args.wearOrderId }] : []),
  ];

  const orders = await prisma.wearOrder.findMany({
    where: { OR: orderWhere },
    include: {
      items: {
        include: {
          wearProduct: { select: { slug: true, externalFulfillmentId: true } },
          wearProductVariant: { select: { label: true, sku: true } },
        },
      },
      fulfillmentJobs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (orders.length !== 1) throw new Error(`Expected exactly one local wear order, found ${orders.length}`);
  const order = orders[0];

  const [analytics, orderEvents, webhookEvents] = await Promise.all([
    prisma.wearAnalyticsEvent.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.wearOrderEvent.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.stripeWebhookEvent.findMany({
      where: { eventType: { in: SUCCESS_EVENT_TYPES } },
      include: { tasks: true },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
  ]);

  return { order, analytics, orderEvents, webhookEvents };
}

function summarizeLocalState(state) {
  const order = state.order;
  return {
    order: {
      id: order.id,
      status: order.status,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      amountTotalCents: order.amountTotalCents,
      currency: order.currency,
      paidAt: order.paidAt?.toISOString() ?? null,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
      externalFulfillmentRef: order.externalFulfillmentRef,
      fulfillmentProvider: order.fulfillmentProvider,
      fulfillmentStatusDetail: order.fulfillmentStatusDetail,
      fulfillmentLastError: order.fulfillmentLastError,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productNameSnapshot,
        variantLabel: item.variantLabelSnapshot ?? item.wearProductVariant?.label ?? null,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        productSlug: item.wearProduct.slug,
        variantSku: item.wearProductVariant?.sku ?? null,
        productExternalFulfillmentId: item.wearProduct.externalFulfillmentId,
      })),
      fulfillmentJobs: order.fulfillmentJobs.map((job) => ({
        id: job.id,
        status: job.status,
        jobKind: job.jobKind,
        runAfter: job.runAfter.toISOString(),
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
        lastError: job.lastError,
      })),
    },
    analytics: state.analytics.map((event) => ({
      id: event.id,
      kind: event.kind,
      createdAt: event.createdAt.toISOString(),
      payload: event.payload,
    })),
    orderEvents: state.orderEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      eventSource: event.eventSource,
      message: event.message,
      createdAt: event.createdAt.toISOString(),
      payload: event.payload,
    })),
  };
}

function assertStrictMatch({ paymentIntent, session, event, localState, args }) {
  const order = localState.order;
  const metadata = session.metadata ?? {};
  if (paymentIntent.status !== "succeeded") throw new Error(`PaymentIntent is not succeeded: ${paymentIntent.status}`);
  if (session.payment_status !== "paid") throw new Error(`Checkout Session payment_status is not paid: ${session.payment_status}`);
  if (metadata.type !== "wear_order") throw new Error(`Checkout Session metadata.type is not wear_order`);
  if (!metadata.wearOrderId) throw new Error("Checkout Session metadata.wearOrderId is missing");
  if (args.wearOrderId && metadata.wearOrderId !== args.wearOrderId) {
    throw new Error(`Metadata wearOrderId ${metadata.wearOrderId} does not match ${args.wearOrderId}`);
  }
  if (order.id !== metadata.wearOrderId) {
    throw new Error(`Local order ${order.id} does not match Stripe metadata wearOrderId ${metadata.wearOrderId}`);
  }
  if (order.stripeCheckoutSessionId && order.stripeCheckoutSessionId !== session.id) {
    throw new Error(`Local order has different Checkout Session ${order.stripeCheckoutSessionId}`);
  }
  if (order.stripePaymentIntentId && order.stripePaymentIntentId !== paymentIntent.id) {
    throw new Error(`Local order has different PaymentIntent ${order.stripePaymentIntentId}`);
  }
  if (!event) throw new Error("No matching paid Checkout Session event found in Stripe Events");
}

function hasSubmitted(localState) {
  return Boolean(
    localState.order.externalFulfillmentRef?.startsWith("sc:") ||
      localState.analytics.some((event) => event.kind === SUBMITTED_KIND),
  );
}

function hasActiveFulfillmentJob(localState) {
  return localState.order.fulfillmentJobs.some((job) => job.status === "pending" || job.status === "processing");
}

async function unlockWebhookEvent(prisma, event, localState) {
  if (localState.order.status !== "pending") {
    throw new Error(`--unlock-event requires a pending order; current status is ${localState.order.status}`);
  }
  if (hasSubmitted(localState)) throw new Error("--unlock-event refused: order already has Spreadconnect submitted signal");

  const row = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (!row) return { changed: false, reason: "no local webhook dedup row exists; replay can be sent directly" };
  if (row.eventType !== event.type) throw new Error(`Local webhook row type ${row.eventType} does not match Stripe event ${event.type}`);
  if (!row.processedAt) return { changed: false, reason: "webhook row is already unprocessed" };

  await prisma.stripeWebhookEvent.update({
    where: { id: event.id },
    data: { processedAt: null, failedAt: null },
  });
  return { changed: true, reason: "processedAt cleared; resend the event from Stripe Dashboard" };
}

async function enqueueFulfillment(prisma, localState) {
  const order = localState.order;
  if (order.status !== "paid") throw new Error(`--enqueue-fulfillment requires a paid order; current status is ${order.status}`);
  if (!order.stripeCheckoutSessionId) throw new Error("--enqueue-fulfillment requires stripeCheckoutSessionId on the order");
  if (hasSubmitted(localState)) throw new Error("--enqueue-fulfillment refused: order already has Spreadconnect submitted signal");
  if (hasActiveFulfillmentJob(localState)) throw new Error("--enqueue-fulfillment refused: active fulfillment job already exists");

  const job = await prisma.wearFulfillmentJob.create({
    data: {
      wearOrderId: order.id,
      jobKind: JOB_KIND,
      status: "pending",
      runAfter: new Date(),
      payload: { source: "ops_stripe_wear_payment_recovery" },
    },
  });
  await prisma.wearOrderEvent.create({
    data: {
      orderId: order.id,
      eventType: "spreadconnect_deferred",
      eventSource: "ops_recovery",
      message: "Fulfillment job created by guarded Stripe wear payment recovery script.",
      payload: { jobId: job.id },
    },
  });
  return { jobId: job.id };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });
  const prisma = new PrismaClient({ log: ["error"] });

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(args.paymentIntentId, {
      expand: ["latest_charge", "customer"],
    });
    const sessions = await findCheckoutSessions(stripe, args.paymentIntentId);
    const session = chooseSession(sessions, args);
    const events = await findMatchingEvents(stripe, paymentIntent, sessions.map((candidate) => candidate.id));
    const event = chooseEvent(events, session, args);
    const localState = await loadLocalState(prisma, session, paymentIntent.id, args);
    assertStrictMatch({ paymentIntent, session, event, localState, args });

    const matchingWebhookRows = await prisma.stripeWebhookEvent.findMany({
      where: { id: { in: events.map((candidate) => candidate.id) } },
      include: { tasks: true },
      orderBy: { receivedAt: "desc" },
    });

    const result = {
      mode: args.unlockEvent || args.enqueueFulfillment ? "mutating" : "dry_run",
      stripe: {
        paymentIntent: compactPaymentIntent(paymentIntent),
        selectedCheckoutSession: compactSession(session),
        selectedEvent: event
          ? {
              id: event.id,
              type: event.type,
              livemode: event.livemode,
              createdAt: toIso(event.created),
              pendingWebhooks: event.pending_webhooks,
            }
          : null,
        matchingEvents: events.map((candidate) => ({
          id: candidate.id,
          type: candidate.type,
          livemode: candidate.livemode,
          createdAt: toIso(candidate.created),
          pendingWebhooks: candidate.pending_webhooks,
        })),
      },
      local: {
        ...summarizeLocalState(localState),
        matchingWebhookRows: matchingWebhookRows.map((row) => ({
          id: row.id,
          eventType: row.eventType,
          receivedAt: row.receivedAt.toISOString(),
          processedAt: row.processedAt?.toISOString() ?? null,
          failedAt: row.failedAt?.toISOString() ?? null,
          retryCount: row.retryCount,
          tasks: row.tasks.map((task) => ({
            id: task.id,
            concern: task.concern,
            failedAt: task.failedAt?.toISOString() ?? null,
            resolvedAt: task.resolvedAt?.toISOString() ?? null,
            failureReason: task.failureReason,
          })),
        })),
      },
      actions: {},
      recommendation:
        localState.order.status === "pending"
          ? "Deploy the patched webhook, ensure the selected event can replay, then resend it from Stripe Dashboard."
          : localState.order.status === "paid" && !hasSubmitted(localState)
            ? "Order is paid but not submitted; create/verify a fulfillment job before running the fulfillment cron."
            : "No automatic recovery action recommended by this script; inspect the report.",
    };

    if (args.unlockEvent) result.actions.unlockEvent = await unlockWebhookEvent(prisma, event, localState);
    if (args.enqueueFulfillment) result.actions.enqueueFulfillment = await enqueueFulfillment(prisma, localState);

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
});
