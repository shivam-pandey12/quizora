export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-danger">{message}</p>;
}
