"use client";

import { Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DocPage } from "@/lib/docs/content";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(page: DocPage, query: string) {
  if (!query) return true;
  const haystack = [
    page.title,
    page.description,
    page.category,
    page.readingTime,
    ...page.keywords,
    ...page.sections.map((section) => section.heading)
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function DocsSearch({ pages }: { pages: DocPage[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);
  const results = useMemo(
    () => pages.filter((page) => matchesQuery(page, normalizedQuery)),
    [normalizedQuery, pages]
  );

  return (
    <section aria-labelledby="docs-search-title" className="space-y-5">
      <div className="glass-panel rounded-[2rem] p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p
              className="flex items-center gap-2 text-sm font-semibold text-primary"
              id="docs-search-title"
            >
              <Sparkles className="size-4" />
              Search the product guide
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Find help for quiz play, scoring, live rooms, creators, classrooms, billing, and safety.
            </p>
          </div>
          <label className="relative block lg:min-w-[24rem]">
            <span className="sr-only">Search Quizora documentation</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-12 w-full rounded-full border border-border bg-surface/80 pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guides, features, or support topics"
              type="search"
              value={query}
            />
          </label>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((page) => (
          <Link className="group block focus-visible:outline-none" href={`/docs/${page.slug}`} key={page.slug}>
            <Card className="h-full p-5 transition group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-glow group-focus-visible:outline group-focus-visible:outline-[3px] group-focus-visible:outline-offset-2 group-focus-visible:outline-primary/30">
              <div className="flex items-start justify-between gap-3">
                <Badge className="text-primary">{page.category}</Badge>
                <span className="text-xs font-semibold text-muted-foreground">{page.readingTime}</span>
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-normal">{page.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{page.description}</p>
              <p className="mt-5 text-sm font-semibold text-primary">Read guide</p>
            </Card>
          </Link>
        ))}
      </div>
      {!results.length ? (
        <Card className="p-6 text-center">
          <h3 className="text-xl font-bold">No matching docs yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a broader term like scoring, billing, classroom, room, creator, or support.
          </p>
        </Card>
      ) : null}
    </section>
  );
}

