import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { FirestoreQuizDetail } from "@/components/quizzes/firestore-quiz-detail";
import {
  getSeoPublicCategoryById,
  getSeoPublicQuizBySlug,
  isSeoFirebaseConfigured,
  listSeoPublicQuizzesByCategory
} from "@/lib/firestore/seo-content";
import {
  breadcrumbSchema,
  publicMetadata,
  quizPageSchema,
  unavailableMetadata
} from "@/lib/seo";

interface QuizDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: QuizDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isSeoFirebaseConfigured) {
    return publicMetadata({
      title: "Quiz Detail",
      description:
        "View a published Quizora quiz detail page with safe metadata, rules, leaderboard preview, and start actions.",
      path: `/quizzes/${slug}`
    });
  }

  try {
    const quiz = await getSeoPublicQuizBySlug(slug);
    if (!quiz) {
      return unavailableMetadata(
        "Quiz Not Available",
        "This Quizora quiz is missing, private, archived, or not published."
      );
    }

    return publicMetadata({
      title: quiz.title,
      description:
        quiz.shortDescription ||
        quiz.description ||
        `${quiz.categoryName} quiz on Quizora with ${quiz.questionCount} questions.`,
      path: `/quizzes/${quiz.slug}`,
      image: quiz.coverImageUrl || quiz.thumbnailUrl
    });
  } catch {
    return unavailableMetadata(
      "Quiz Metadata Unavailable",
      "Quizora could not load public metadata for this quiz."
    );
  }
}

export default async function QuizDetailPage({ params }: QuizDetailPageProps) {
  const { slug } = await params;
  if (!isSeoFirebaseConfigured) return <FirestoreQuizDetail slug={slug} />;

  const quiz = await getSeoPublicQuizBySlug(slug).catch(() => null);
  if (!quiz) notFound();

  try {
    const [category, related] = await Promise.all([
      getSeoPublicCategoryById(quiz.categoryId),
      listSeoPublicQuizzesByCategory(quiz.categoryId)
    ]);
    const categoryCrumb = category
      ? { label: category.name, href: `/categories/${category.slug}` }
      : { label: quiz.categoryName, href: "/categories" };
    const breadcrumbItems = [
      { label: "Quizzes", href: "/quizzes" },
      categoryCrumb,
      { label: quiz.title }
    ];

    return (
      <>
        <JsonLd data={quizPageSchema(quiz)} />
        <JsonLd
          data={breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Quizzes", path: "/quizzes" },
            {
              name: categoryCrumb.label,
              path: categoryCrumb.href ?? "/categories"
            },
            { name: quiz.title, path: `/quizzes/${quiz.slug}` }
          ])}
        />
        <Breadcrumbs items={breadcrumbItems} />
        <FirestoreQuizDetail
          initialQuiz={quiz}
          initialRelated={related.filter((item) => item.slug !== slug).slice(0, 3)}
          slug={slug}
        />
      </>
    );
  } catch {
    return <FirestoreQuizDetail initialQuiz={quiz} slug={slug} />;
  }
}
