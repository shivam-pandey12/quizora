import { MatchmakingHub } from "@/components/matchmaking/matchmaking-hub";

export const metadata = {
  title: "Matchmaking",
  description: "Find public Quizora live rooms with Quick Match and casual bot fill.",
  robots: {
    index: false,
    follow: false
  }
};

export default function MatchmakingPage() {
  return <MatchmakingHub />;
}
