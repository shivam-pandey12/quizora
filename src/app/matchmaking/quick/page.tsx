import { QuickMatchPage } from "@/components/matchmaking/quick-match-page";

export const metadata = {
  title: "Quick Match",
  description: "Configure a casual Quizora matchmaking search.",
  robots: {
    index: false,
    follow: false
  }
};

export default function QuickMatchRoute() {
  return <QuickMatchPage />;
}
