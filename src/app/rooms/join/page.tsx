import type { Metadata } from "next";
import { JoinRoomForm } from "@/components/rooms/join-room-form";

export const metadata: Metadata = {
  title: "Join Live Room",
  description: "Join a Quizora live room using a room code.",
  robots: {
    index: false,
    follow: false
  }
};

export default function JoinRoomPage() {
  return <JoinRoomForm />;
}
