import type { Metadata } from "next";
import { AdminRoomDetail } from "@/components/admin/admin-room-detail";

export const metadata: Metadata = {
  title: "Admin Room Detail",
  description: "Admin-only live room diagnostics and moderation detail.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminRoomDetailPage({
  params
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <AdminRoomDetail roomId={roomId} />;
}
