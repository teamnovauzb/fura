import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readLedgerImage } from "@/lib/ledger-images";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { entryId } = await params;
  const entry = await prisma.ledgerEntry.findUnique({
    where: { id: entryId },
    select: { imagePath: true, imageName: true, imageMime: true },
  });
  if (!entry?.imagePath || !entry.imageMime) return new Response("Not found", { status: 404 });

  try {
    const image = await readLedgerImage(entry.imagePath);
    const filename = encodeURIComponent(entry.imageName ?? "receipt");
    return new Response(Uint8Array.from(image).buffer, {
      headers: {
        "Content-Type": entry.imageMime,
        "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
