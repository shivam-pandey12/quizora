import type { Metadata } from "next";
import { AdminRooms } from "@/components/admin/admin-rooms";

export const metadata: Metadata = {
  title: "Admin Rooms",
  description: "Quizora live-room operations monitor.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminRoomsPage() {
  return <AdminRooms />;
}
