import { MovementsList } from "./movements-list";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ truckId?: string; status?: string }>;
}) {
  const { truckId, status } = await searchParams;
  return <MovementsList truckId={truckId} endedOnly={status === "ended"} />;
}
