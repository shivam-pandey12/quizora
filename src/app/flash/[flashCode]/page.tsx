import { FlashLandingPage } from "@/components/flash/flash-pages";

export default async function FlashLandingRoutePage({ params }: { params: Promise<{ flashCode: string }> }) {
  const { flashCode } = await params;
  return <FlashLandingPage flashCode={flashCode} />;
}
