import { AssignmentPage } from "@/components/classroom/student-pages";

export default async function AssignmentRoute({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <AssignmentPage assignmentId={assignmentId} />;
}
