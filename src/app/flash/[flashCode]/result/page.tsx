import { FlashResultPage } from "@/components/flash/flash-pages";

export default async function FlashResultRoutePage({ params }: { params: Promise<{ flashCode: string }> }) {
  const { flashCode } = await params;
  return <FlashResultPage flashCode={flashCode} />;
}
