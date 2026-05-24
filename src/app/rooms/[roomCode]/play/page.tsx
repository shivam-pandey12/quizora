import type { Metadata } from "next";
import { LiveRoomPlayer } from "@/components/rooms/live-room-player";

export const metadata: Metadata = {
  title: "Live Room Play",
  description: "Private real-time Quizora room play.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function LiveRoomPlayPage({
  params
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <LiveRoomPlayer roomCode={roomCode} />;
}
