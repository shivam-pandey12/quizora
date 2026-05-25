import { FlashPlayPage } from "@/components/flash/flash-pages";

export default async function FlashPlayRoutePage({ params }: { params: Promise<{ flashCode: string }> }) {
  const { flashCode } = await params;
  return <FlashPlayPage flashCode={flashCode} />;
}
