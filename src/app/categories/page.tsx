import type { Metadata } from "next";
import { FirestoreCategoryBrowser } from "@/components/categories/firestore-category-browser";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHeader } from "@/components/ui/page-header";
import { collectionSchema, publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Quiz Categories",
    description:
      "Explore active Quizora categories and discover published quizzes by subject, skill lane, and mastery focus.",
    path: "/categories"
  })
};

export default function CategoriesPage() {
  return (
    <>
      <JsonLd
        data={collectionSchema({
          title: "Quizora quiz categories",
          description:
            "Active Quizora categories for discovering public quizzes by subject and mastery lane.",
          path: "/categories"
        })}
      />
      <Breadcrumbs items={[{ label: "Categories" }]} />
      <PageHeader
        eyebrow="Categories"
        title="Choose a quiz mastery lane"
        description="Browse active Quizora categories, compare quiz counts, and jump into published quizzes that match your focus."
      />
      <section className="container-page pb-16">
        <FirestoreCategoryBrowser />
      </section>
    </>
  );
}
