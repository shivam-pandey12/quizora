import type { Metadata } from "next";
import { RoomHistory } from "@/components/rooms/room-history";

export const metadata: Metadata = {
  title: "Live Room History",
  description: "Your Quizora live room history and completed multiplayer results.",
  robots: {
    index: false,
    follow: false
  }
};

export default function RoomHistoryPage() {
  return <RoomHistory />;
}
