"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { QuizCard } from "@/components/quizzes/quiz-card";
import type { CategoryCardItem, QuizCardItem, QuizDifficulty } from "@/types/domain";

const difficultyOptions: Array<QuizDifficulty | "All"> = [
  "All",
  "easy",
  "medium",
  "hard",
  "expert"
];

export function QuizExplorer({
  quizzes,
  categories
}: {
  quizzes: QuizCardItem[];
  categories: CategoryCardItem[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState<(typeof difficultyOptions)[number]>("All");
  const [sort, setSort] = useState("featured");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return quizzes
      .filter((quiz) => {
        const matchesQuery =
          !normalized ||
          quiz.title.toLowerCase().includes(normalized) ||
          quiz.description.toLowerCase().includes(normalized);
        const matchesCategory = category === "all" || quiz.categorySlug === category;
        const matchesDifficulty = difficulty === "All" || quiz.difficulty === difficulty;
        return matchesQuery && matchesCategory && matchesDifficulty;
      })
      .sort((first, second) => {
        if (sort === "plays") return second.playCount - first.playCount;
        if (sort === "rating") return (second.averageScore ?? 0) - (first.averageScore ?? 0);
        if (sort === "time") return first.estimatedMinutes - second.estimatedMinutes;
        return Number(second.isFeatured ?? false) - Number(first.isFeatured ?? false);
      });
  }, [category, difficulty, query, quizzes, sort]);

  return (
    <div className="space-y-8">
      <div className="glass-panel grid gap-3 rounded-3xl p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search quiz previews"
            value={query}
          />
        </label>
        <Select onChange={(event) => setCategory(event.target.value)} value={category}>
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select
          onChange={(event) =>
            setDifficulty(event.target.value as (typeof difficultyOptions)[number])
          }
          value={difficulty}
        >
          {difficultyOptions.map((item) => (
            <option key={item} value={item}>
              {item === "All" ? "All difficulties" : item}
            </option>
          ))}
        </Select>
        <Select onChange={(event) => setSort(event.target.value)} value={sort}>
          <option value="featured">Featured first</option>
          <option value="plays">Most played</option>
          <option value="rating">Highest rated</option>
          <option value="time">Shortest time</option>
        </Select>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((quiz) => (
          <QuizCard featured={quiz.isFeatured} key={quiz.slug} quiz={quiz} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No quiz preview matches yet"
          description="Try a different category, difficulty, or search term to uncover another Quizora arena."
          actionHref="/quizzes"
          actionLabel="Reset exploration"
        />
      ) : null}
    </div>
  );
}
