import { FlashHostPage } from "@/components/flash/flash-pages";

export default async function FlashHostRoutePage({ params }: { params: Promise<{ flashCode: string }> }) {
  const { flashCode } = await params;
  return <FlashHostPage flashCode={flashCode} />;
}
