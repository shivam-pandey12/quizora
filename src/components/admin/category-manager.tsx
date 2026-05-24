"use client";

import { Layers3, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  createCategory,
  deleteCategorySafely,
  listAdminCategories,
  setCategoryStatus,
  updateCategory
} from "@/lib/firestore/content";
import { createSlug } from "@/lib/firestore/slug";
import { formatDate } from "@/lib/firestore/timestamps";
import { validateCategoryInput } from "@/lib/firestore/validation";
import type { Category, CategoryInput } from "@/types/domain";

const accentOptions = [
  "bg-primary/12 text-primary",
  "bg-blue/12 text-blue",
  "bg-success/12 text-success",
  "bg-warning/12 text-warning",
  "bg-danger/10 text-danger",
  "bg-foreground/10 text-foreground"
];

const emptyForm: CategoryInput = {
  name: "",
  slug: "",
  description: "",
  icon: "Sparkles",
  accent: accentOptions[0],
  featured: false,
  status: "active"
};

export function CategoryManager() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Category["status"]>("all");
  const [sort, setSort] = useState("name");
  const [form, setForm] = useState<CategoryInput>(emptyForm);
  const [editing, setEditing] = useState<Category | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmTarget, setConfirmTarget] = useState<Category | null>(null);

  async function loadCategories() {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setError(firebaseSetupMessage);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setCategories(await listAdminCategories());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return categories
      .filter((category) => {
        const matchesQuery =
          !normalized ||
          category.name.toLowerCase().includes(normalized) ||
          category.description.toLowerCase().includes(normalized) ||
          category.slug.toLowerCase().includes(normalized);
        const matchesStatus = status === "all" || category.status === status;
        return matchesQuery && matchesStatus;
      })
      .sort((first, second) => {
        if (sort === "created") return (second.createdAt ?? "").localeCompare(first.createdAt ?? "");
        if (sort === "quizCount") return second.quizCount - first.quizCount;
        return first.name.localeCompare(second.name);
      });
  }, [categories, query, sort, status]);

  function resetForm() {
    setForm(emptyForm);
    setEditing(null);
    setSlugTouched(false);
    setFieldErrors({});
  }

  function updateName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : createSlug(name)
    }));
  }

  function editCategory(category: Category) {
    setEditing(category);
    setSlugTouched(true);
    setFieldErrors({});
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      accent: category.accent,
      featured: category.featured,
      status: category.status
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCategoryInput(form);
    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, form);
        showToast({ tone: "success", title: "Category updated" });
      } else {
        await createCategory(form);
        showToast({ tone: "success", title: "Category created" });
      }
      resetForm();
      await loadCategories();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Category save failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(category: Category) {
    const nextStatus = category.status === "active" ? "hidden" : "active";
    try {
      await setCategoryStatus(category.id, nextStatus);
      showToast({ tone: "success", title: nextStatus === "active" ? "Category visible" : "Category hidden" });
      await loadCategories();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Status update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    }
  }

  async function confirmDelete() {
    if (!confirmTarget) return;
    setSaving(true);
    try {
      const result = await deleteCategorySafely(confirmTarget.id);
      showToast({
        tone: "success",
        title: result === "deleted" ? "Category deleted" : "Category hidden",
        description:
          result === "hidden"
            ? "This category is used by quizzes, so it was hidden instead of deleted."
            : undefined
      });
      setConfirmTarget(null);
      await loadCategories();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Delete failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Category manager</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold">Real category management</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Create active category lanes for public discovery, or hide categories until they are ready.
          </p>
        </div>
        <Button icon={<Plus className="size-4" />} onClick={resetForm} variant="secondary">
          New category
        </Button>
      </div>

      <Card className="p-5">
        <form className="grid gap-4" onSubmit={submitForm}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Name
              <Input
                disabled={saving}
                onChange={(event) => updateName(event.target.value)}
                placeholder="Science"
                value={form.name}
              />
              <FieldError message={fieldErrors.name} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Slug
              <Input
                disabled={saving}
                onChange={(event) => {
                  setSlugTouched(true);
                  setForm((current) => ({ ...current, slug: createSlug(event.target.value) }));
                }}
                placeholder="science"
                value={form.slug}
              />
              <FieldError message={fieldErrors.slug} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Description
            <Textarea
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Concept-first quizzes across physics, chemistry, biology, and space."
              value={form.description}
            />
            <FieldError message={fieldErrors.description} />
          </label>
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">
              Icon label
              <Input
                disabled={saving}
                onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
                placeholder="Sparkles"
                value={form.icon}
              />
              <FieldError message={fieldErrors.icon} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Accent
              <Select
                disabled={saving}
                onChange={(event) => setForm((current) => ({ ...current, accent: event.target.value }))}
                value={form.accent}
              >
                {accentOptions.map((accent) => (
                  <option key={accent} value={accent}>
                    {accent}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.accent} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Status
              <Select
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as Category["status"]
                  }))
                }
                value={form.status}
              >
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </Select>
            </label>
          </div>
          <Switch
            checked={form.featured}
            disabled={saving}
            label="Featured category"
            description="Featured categories are lifted first on public category surfaces."
            onCheckedChange={(checked) => setForm((current) => ({ ...current, featured: checked }))}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={saving} type="submit">
              {saving ? "Saving..." : editing ? "Update category" : "Create category"}
            </Button>
            {editing ? (
              <Button disabled={saving} onClick={resetForm} type="button" variant="secondary">
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="glass-panel grid gap-3 rounded-3xl p-4 lg:grid-cols-[1fr_12rem_12rem]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search categories"
            value={query}
          />
        </label>
        <Select onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </Select>
        <Select onChange={(event) => setSort(event.target.value)} value={sort}>
          <option value="name">Name</option>
          <option value="created">Newest</option>
          <option value="quizCount">Quiz count</option>
        </Select>
      </div>

      <AdminDataState
        empty={filtered.length === 0}
        emptyDescription="Create your first category to unlock Firestore-backed quiz organization."
        emptyTitle="No categories found"
        error={error}
        icon={Layers3}
        loading={loading}
      />

      {!loading && !error && filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((category) => (
            <Card className="p-5" key={category.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${category.accent} rounded-2xl px-3 py-1 text-xs font-semibold`}>
                      {category.icon}
                    </span>
                    <StatusBadge value={category.status} />
                    {category.featured ? <StatusBadge value="featured">Featured</StatusBadge> : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{category.name}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {category.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
                    <span>/{category.slug}</span>
                    <span>{category.quizCount} quizzes</span>
                    <span>Updated {formatDate(category.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    icon={<Pencil className="size-4" />}
                    onClick={() => editCategory(category)}
                    size="sm"
                    variant="secondary"
                  >
                    Edit
                  </Button>
                  <Button onClick={() => void toggleStatus(category)} size="sm" variant="secondary">
                    {category.status === "active" ? "Hide" : "Unhide"}
                  </Button>
                  <Button
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setConfirmTarget(category)}
                    size="sm"
                    variant="danger"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete or hide"
        description="If this category is used by quizzes, Quizora will hide it instead of deleting it."
        loading={saving}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => void confirmDelete()}
        open={Boolean(confirmTarget)}
        title="Remove this category?"
      />
    </div>
  );
}
