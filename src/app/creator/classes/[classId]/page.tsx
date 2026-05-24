import { TeacherClassWorkspace } from "@/components/classroom/creator-pages";

export default async function TeacherClassRoute({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <TeacherClassWorkspace classId={classId} />;
}
