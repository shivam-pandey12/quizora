"use client";

import { AlertTriangle, Database, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryCard } from "@/components/quizzes/category-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicCategories } from "@/lib/firestore/content";
import { sampleCategories } from "@/data/sample-data";
import type { CategoryCardItem } from "@/types/domain";

export function FirestoreCategoryBrowser() {
  const [categories, setCategories] = useState<CategoryCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      if (!isFirebaseConfigured) {
        setSetupMode(true);
        setCategories(sampleCategories);
        setLoading(false);
        return;
      }

      try {
        setCategories(await listPublicCategories());
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load categories.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return categories.filter(
      (category) =>
        !normalized ||
        category.name.toLowerCase().includes(normalized) ||
        category.description.toLowerCase().includes(normalized) ||
        category.slug.toLowerCase().includes(normalized)
    );
  }, [categories, query]);

  if (loading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      {setupMode ? (
        <EmptyState
          icon={Database}
          title="Firebase is not configured yet"
          description={`${firebaseSetupMessage} Showing sample category cards for review.`}
        />
      ) : null}
      {error ? (
        <EmptyState icon={AlertTriangle} title="Could not load categories" description={error} />
      ) : null}
      <div className="glass-panel rounded-3xl p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search active categories"
            value={query}
          />
        </label>
      </div>
      {!error && filtered.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((category) => (
            <CategoryCard category={category} key={category.id ?? category.slug} />
          ))}
        </div>
      ) : null}
      {!error && filtered.length === 0 ? (
        <EmptyState
          title="No active categories yet"
          description="Active Firestore categories will appear here once an admin creates them."
          actionHref="/admin/categories"
          actionLabel="Open category studio"
        />
      ) : null}
    </div>
  );
}
