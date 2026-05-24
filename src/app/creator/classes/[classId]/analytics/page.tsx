import { TeacherClassWorkspace } from "@/components/classroom/creator-pages";

export default async function TeacherClassAnalyticsRoute({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <TeacherClassWorkspace classId={classId} tab="analytics" />;
}
