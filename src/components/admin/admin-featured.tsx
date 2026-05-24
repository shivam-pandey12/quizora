"use client";

import { Save, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  getFeaturedConfig,
  saveFeaturedConfig,
  setCategoryFeatured,
  setQuizFeatured
} from "@/lib/firestore/admin-content-controls";
import { writeAdminLogBestEffort } from "@/lib/firestore/admin-logs";
import { listAdminCategories, listAdminQuizzes } from "@/lib/firestore/content";
import type { Category, FeaturedConfig, Quiz } from "@/types/domain";

export function AdminFeatured() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<FeaturedConfig | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"quizzes" | "categories">("quizzes");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextQuizzes, nextCategories, nextConfig] = await Promise.all([
        listAdminQuizzes(),
        listAdminCategories(),
        getFeaturedConfig()
      ]);
      setQuizzes(nextQuizzes);
      setCategories(nextCategories);
      setConfig(nextConfig);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load featured controls.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredQuizzes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return quizzes.filter((quiz) =>
      !normalized || [quiz.title, quiz.categoryName, quiz.slug].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query, quizzes]);

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return categories.filter((category) =>
      !normalized || [category.name, category.slug].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [categories, query]);

  async function toggleQuiz(quiz: Quiz) {
    setWorking(true);
    try {
      await setQuizFeatured(quiz, !quiz.isFeatured);
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: quiz.isFeatured ? "quiz_unfeatured" : "quiz_featured",
        targetType: "quiz",
        targetId: quiz.id,
        targetLabel: quiz.title,
        details: "Homepage feature flag changed."
      });
      showToast({ tone: "success", title: quiz.isFeatured ? "Quiz unfeatured" : "Quiz featured" });
      await load();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Feature update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function toggleCategory(category: Category) {
    setWorking(true);
    try {
      await setCategoryFeatured(category, !category.featured);
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: category.featured ? "category_unfeatured" : "category_featured",
        targetType: "category",
        targetId: category.id,
        targetLabel: category.name,
        details: "Homepage category feature flag changed."
      });
      showToast({ tone: "success", title: category.featured ? "Category unfeatured" : "Category featured" });
      await load();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Category feature update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function saveConfig() {
    if (!config) return;
    setWorking(true);
    try {
      await saveFeaturedConfig(config);
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: "featured_config_saved",
        targetType: "siteSettings",
        targetId: config.id,
        targetLabel: "Homepage featured config",
        details: "Featured ordering document updated."
      });
      showToast({ tone: "success", title: "Featured config saved" });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Config save failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  const featuredQuizzes = quizzes.filter((quiz) => quiz.isFeatured).length;
  const featuredCategories = categories.filter((category) => category.featured).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Featured</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Featured content control</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Curate public homepage highlights using existing quiz/category flags plus a simple public settings document.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Star className="size-5" />} label="Featured quizzes" value={String(featuredQuizzes)} helper="Existing quiz flags" />
        <StatCard label="Featured categories" value={String(featuredCategories)} helper="Existing category flags" />
        <StatCard label="Live CTA" value={config?.liveRoomCtaEnabled ? "On" : "Off"} helper="Homepage setting" />
      </div>

      <AdminDataState empty={false} emptyDescription="" emptyTitle="" error={error} loading={loading} />

      {!loading && !error ? (
        <>
          {config ? (
            <Card className="p-5">
              <SectionHeader className="mb-4" title="Homepage ordering" />
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className="grid gap-2 text-sm font-semibold">
                  Hero quiz
                  <Select onChange={(event) => setConfig((current) => current ? { ...current, heroQuizId: event.target.value } : current)} value={config.heroQuizId}>
                    <option value="">No hero quiz</option>
                    {quizzes.filter((quiz) => quiz.status === "published" && quiz.visibility === "public").map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                    ))}
                  </Select>
                </label>
                <Switch
                  checked={config.liveRoomCtaEnabled}
                  label="Live room CTA"
                  description="Show the public rooms call-to-action in featured areas."
                  onCheckedChange={(checked) => setConfig((current) => current ? { ...current, liveRoomCtaEnabled: checked } : current)}
                />
                <Button disabled={working} icon={<Save className="size-4" />} onClick={() => void saveConfig()}>
                  Save config
                </Button>
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <SectionHeader className="mb-4" title="Feature flags" />
            <div className="grid gap-3 lg:grid-cols-[1fr_12rem]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Search content" value={query} />
              </label>
              <Select onChange={(event) => setKind(event.target.value as typeof kind)} value={kind}>
                <option value="quizzes">Quizzes</option>
                <option value="categories">Categories</option>
              </Select>
            </div>
          </Card>

          <div className="grid gap-3">
            {kind === "quizzes"
              ? filteredQuizzes.map((quiz) => (
                  <Card className="p-4" key={quiz.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{quiz.status}</Badge>
                          <Badge>{quiz.visibility}</Badge>
                          {quiz.isFeatured ? <Badge className="text-primary">Featured</Badge> : null}
                        </div>
                        <h2 className="mt-2 text-xl font-semibold">{quiz.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{quiz.categoryName}</p>
                      </div>
                      <Button disabled={working} onClick={() => void toggleQuiz(quiz)} size="sm" variant={quiz.isFeatured ? "danger" : "secondary"}>
                        {quiz.isFeatured ? "Unfeature" : "Feature"}
                      </Button>
                    </div>
                  </Card>
                ))
              : filteredCategories.map((category) => (
                  <Card className="p-4" key={category.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{category.status}</Badge>
                          {category.featured ? <Badge className="text-primary">Featured</Badge> : null}
                        </div>
                        <h2 className="mt-2 text-xl font-semibold">{category.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{category.quizCount} quizzes</p>
                      </div>
                      <Button disabled={working} onClick={() => void toggleCategory(category)} size="sm" variant={category.featured ? "danger" : "secondary"}>
                        {category.featured ? "Unfeature" : "Feature"}
                      </Button>
                    </div>
                  </Card>
                ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
