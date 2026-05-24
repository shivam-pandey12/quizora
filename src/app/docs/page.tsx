import type { Metadata } from "next";
import { DocsLanding } from "@/components/docs/docs-components";
import { JsonLd } from "@/components/seo/json-ld";
import { publicDocPages } from "@/lib/docs/content";
import { collectionSchema, publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Quizora Help Center",
    description:
      "Read Quizora product guides for quizzes, scoring, leaderboards, live rooms, matchmaking, creators, classrooms, billing, safety, and support.",
    path: "/docs"
  })
};

export default function DocsPage() {
  return (
    <>
      <JsonLd
        data={collectionSchema({
          title: "Quizora Help Center",
          description:
            "Public Quizora documentation for players, creators, teachers, billing, and support.",
          path: "/docs",
          items: publicDocPages.map((page) => ({
            name: page.title,
            path: `/docs/${page.slug}`
          }))
        })}
      />
      <DocsLanding />
    </>
  );
}

