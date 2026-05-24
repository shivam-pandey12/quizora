"use client";

import { AlertTriangle, Database, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Select } from "@/components/ui/select";
import { QuizCard } from "@/components/quizzes/quiz-card";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicCategories, listPublicQuizzes } from "@/lib/firestore/content";
import { sampleCategories, sampleQuizzes } from "@/data/sample-data";
import { titleCase } from "@/lib/utils";
import type { CategoryCardItem, QuizCardItem, QuizDifficulty } from "@/types/domain";

type PublicQuizItem = QuizCardItem & { categoryId?: string };

const difficultyOptions: Array<QuizDifficulty | "all"> = [
  "all",
  "easy",
  "medium",
  "hard",
  "expert"
];

export function FirestoreQuizExplorer() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const [quizzes, setQuizzes] = useState<PublicQuizItem[]>([]);
  const [categories, setCategories] = useState<CategoryCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [difficulty, setDifficulty] = useState<(typeof difficultyOptions)[number]>("all");
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    async function load() {
      if (!isFirebaseConfigured) {
        setSetupMode(true);
        setQuizzes(sampleQuizzes);
        setCategories(sampleCategories);
        setLoading(false);
        return;
      }

      try {
        const [nextQuizzes, nextCategories] = await Promise.all([
          listPublicQuizzes(),
          listPublicCategories()
        ]);
        setQuizzes(nextQuizzes);
        setCategories(nextCategories);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load published quizzes.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return quizzes
      .filter((quiz) => {
        const matchesQuery =
          !normalized ||
          quiz.title.toLowerCase().includes(normalized) ||
          quiz.description.toLowerCase().includes(normalized) ||
          quiz.tags?.some((tag) => tag.toLowerCase().includes(normalized));
        const matchesCategory =
          category === "all" ||
          quiz.categorySlug === category ||
          quiz.categoryId === category ||
          quiz.categoryName.toLowerCase() === category.toLowerCase() ||
          quiz.categoryName.toLowerCase().replace(/\s+/g, "-") === category;
        const matchesDifficulty = difficulty === "all" || quiz.difficulty === difficulty;
        return matchesQuery && matchesCategory && matchesDifficulty;
      })
      .sort((first, second) => {
        if (sort === "newest") return (second.id ?? "").localeCompare(first.id ?? "");
        if (sort === "title") return first.title.localeCompare(second.title);
        if (sort === "time") return first.estimatedMinutes - second.estimatedMinutes;
        return Number(second.isFeatured ?? false) - Number(first.isFeatured ?? false);
      });
  }, [category, difficulty, query, quizzes, sort]);

  if (loading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      {setupMode ? (
        <EmptyState
          icon={Database}
          title="Firebase is not configured yet"
          description={`${firebaseSetupMessage} Showing premium sample previews so the public page stays usable.`}
        />
      ) : null}

      {error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load published quizzes"
          description={error}
        />
      ) : null}

      <div className="glass-panel grid gap-3 rounded-3xl p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search published quizzes"
            value={query}
          />
        </label>
        <Select onChange={(event) => setCategory(event.target.value)} value={category}>
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.id ?? item.slug} value={item.id ?? item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select
          onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
          value={difficulty}
        >
          {difficultyOptions.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "All difficulties" : titleCase(item)}
            </option>
          ))}
        </Select>
        <Select onChange={(event) => setSort(event.target.value)} value={sort}>
          <option value="featured">Featured first</option>
          <option value="newest">Newest</option>
          <option value="title">Title</option>
          <option value="time">Shortest time</option>
        </Select>
      </div>

      {!error && filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((quiz) => (
            <QuizCard featured={quiz.isFeatured} key={quiz.id ?? quiz.slug} quiz={quiz} />
          ))}
        </div>
      ) : null}

      {!error && filtered.length === 0 ? (
        <EmptyState
          title="No published quiz matches yet"
          description="Published public quizzes from Firestore will appear here once admin content is ready."
          actionHref="/admin/quizzes"
          actionLabel="Open quiz studio"
        />
      ) : null}
    </div>
  );
}
