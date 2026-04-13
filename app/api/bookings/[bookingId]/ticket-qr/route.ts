import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { buildTicketQrSvg } from "@/lib/bookings/ticket-qr";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { bookingId } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      ticketRef: true,
      customerUserId: true,
      studio: { select: { ownerUserId: true } },
    },
  });

  if (!booking || !booking.ticketRef) {
    return new Response("Not found", { status: 404 });
  }

  const canView =
    booking.customerUserId === user.id ||
    booking.studio.ownerUserId === user.id ||
    isAdminRole(user.role);
  if (!canView) {
    return new Response("Forbidden", { status: 403 });
  }

  const svg = await buildTicketQrSvg(booking.ticketRef);
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
