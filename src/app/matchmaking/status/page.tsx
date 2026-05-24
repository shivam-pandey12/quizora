import { MatchmakingStatusView } from "@/components/matchmaking/matchmaking-status-view";

export const metadata = {
  title: "Matchmaking Status",
  robots: {
    index: false,
    follow: false
  }
};

export default async function MatchmakingStatusPage({
  searchParams
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const params = await searchParams;
  return <MatchmakingStatusView matchedRoomCode={params.room} />;
}
