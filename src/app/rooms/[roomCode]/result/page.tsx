import type { Metadata } from "next";
import { RoomResultView } from "@/components/rooms/room-result-view";

export const metadata: Metadata = {
  title: "Live Room Results",
  description: "Private Quizora live room result podium.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function RoomResultPage({
  params
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <RoomResultView roomCode={roomCode} />;
}
