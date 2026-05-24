import type { Metadata } from "next";
import { RoomsHub } from "@/components/rooms/rooms-hub";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { collectionSchema, publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Live Quiz Rooms",
    description:
      "Create or join premium Quizora live quiz rooms with room codes, lobbies, synced questions, scoreboards, and final podiums.",
    path: "/rooms"
  })
};

export default function RoomsPage() {
  return (
    <>
      <JsonLd
        data={collectionSchema({
          title: "Quizora live quiz rooms",
          description:
            "Public hub for creating and joining live Quizora rooms with friends or casual competitors.",
          path: "/rooms"
        })}
      />
      <Breadcrumbs items={[{ label: "Rooms" }]} />
      <RoomsHub />
    </>
  );
}
