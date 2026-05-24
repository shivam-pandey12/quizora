import { ChallengeView } from "@/components/rooms/challenge-view";

export const metadata = {
  title: "Quiz Challenge",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ChallengePage({
  params
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  return <ChallengeView challengeId={challengeId} />;
}
