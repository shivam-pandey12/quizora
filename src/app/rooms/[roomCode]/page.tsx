import type { Metadata } from "next";
import { RoomLobby } from "@/components/rooms/room-lobby";

export const metadata: Metadata = {
  title: "Live Room Lobby",
  description: "Quizora live room lobby.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function RoomLobbyPage({
  params
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <RoomLobby roomCode={roomCode} />;
}
