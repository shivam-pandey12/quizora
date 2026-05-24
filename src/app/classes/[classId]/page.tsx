import { StudentClassWorkspace } from "@/components/classroom/student-pages";

export default async function StudentClassRoute({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <StudentClassWorkspace classId={classId} />;
}
