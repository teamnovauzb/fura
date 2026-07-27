import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        subject: true,
        href: true,
        readAt: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
    prisma.notification.count({
      where: { recipientId: session.user.id, readAt: null },
    }),
  ]);

  return Response.json({ items, unread }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { id?: string };
  await prisma.notification.updateMany({
    where: {
      recipientId: session.user.id,
      readAt: null,
      ...(body.id ? { id: body.id } : {}),
    },
    data: { readAt: new Date() },
  });
  return Response.json({ ok: true });
}
