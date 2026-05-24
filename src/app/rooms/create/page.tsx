import type { Metadata } from "next";
import { CreateRoomForm } from "@/components/rooms/create-room-form";

export const metadata: Metadata = {
  title: "Create Live Room",
  description: "Host a live Quizora room from a published quiz.",
  robots: {
    index: false,
    follow: false
  }
};

export default function CreateRoomPage() {
  return <CreateRoomForm />;
}
