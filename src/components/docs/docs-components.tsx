import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Info,
  LifeBuoy,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocsSearch } from "@/components/docs/docs-search";
import {
  docsNavGroups,
  getAdjacentDocs,
  getDocBySlug,
  getRelatedDocs,
  publicDocPages,
  type DocLink,
  type DocPage,
  type DocSection
} from "@/lib/docs/content";
import { cn } from "@/lib/utils";

function sectionNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

function GuideCard({
  title,
  description,
  href,
  label
}: {
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link className="group block focus-visible:outline-none" href={href}>
      <Card className="h-full p-5 transition group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-glow group-focus-visible:outline group-focus-visible:outline-[3px] group-focus-visible:outline-offset-2 group-focus-visible:outline-primary/30">
        <Badge className="text-primary">{label}</Badge>
        <h3 className="mt-5 text-xl font-bold tracking-normal">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Open guide <ArrowRight className="size-4" />
        </p>
      </Card>
    </Link>
  );
}

export function DocsLanding() {
  const quickStart = [
    getDocBySlug("getting-started"),
    getDocBySlug("quizzes"),
    getDocBySlug("scoring")
  ].filter((page): page is DocPage => Boolean(page));

  const featured = [
    getDocBySlug("live-rooms"),
    getDocBySlug("creator-guide"),
    getDocBySlug("classroom"),
    getDocBySlug("billing"),
    getDocBySlug("safety"),
    getDocBySlug("faq")
  ].filter((page): page is DocPage => Boolean(page));

  return (
    <>
      <Breadcrumbs items={[{ label: "Docs" }]} />
      <section className="container-page py-10 sm:py-14">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(199,143,47,0.2),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.9),rgba(245,232,205,0.72))] p-6 shadow-soft dark:bg-[radial-gradient(circle_at_top_left,rgba(199,143,47,0.22),transparent_35%),linear-gradient(135deg,rgba(18,24,38,0.96),rgba(40,32,21,0.72))] sm:p-10">
          <div className="max-w-3xl">
            <Badge className="mb-5 text-primary">Quizora Help Center</Badge>
            <h1 className="text-balance text-4xl font-black tracking-normal text-foreground sm:text-6xl">
              Learn Quizora without guessing where things are
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Guides for players, creators, teachers, classroom teams, billing support, and fair-play review. Built to explain the real product, not hide it behind vague help text.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/docs/getting-started" icon={<BookOpen className="size-4" />}>
                Start here
              </Button>
              <Button href="/docs/contact-support" icon={<LifeBuoy className="size-4" />} variant="secondary">
                Contact support
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <ListChecks className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-primary">Quick start</p>
                <h2 className="text-2xl font-bold">The shortest path to confident play</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {quickStart.map((page) => (
                <Link
                  className="rounded-3xl border border-border bg-surface/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10"
                  href={`/docs/${page.slug}`}
                  key={page.slug}
                >
                  <p className="font-semibold">{page.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
                </Link>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-blue/10 text-blue">
                <Search className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-blue">Find answers</p>
                <h2 className="text-2xl font-bold">Search every public guide</h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Search works locally across guide titles, descriptions, headings, categories, and keywords.
            </p>
          </Card>
        </div>

        <div className="mt-8">
          <DocsSearch pages={publicDocPages} />
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((page) => (
            <GuideCard
              description={page.description}
              href={`/docs/${page.slug}`}
              key={page.slug}
              label={page.category}
              title={page.title}
            />
          ))}
        </div>

        <Card className="mt-12 overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge className="mb-4 text-primary">Still need help?</Badge>
              <h2 className="text-3xl font-black tracking-normal">Tell support what happened</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                For bugs, wrong questions, billing concerns, classroom issues, or safety reports, include the page URL and a short explanation. Avoid passwords, private keys, and full payment details.
              </p>
            </div>
            <Button href="/contact" icon={<LifeBuoy className="size-4" />} size="lg">
              Contact support
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}

function DocsNavLink({ page, activeSlug }: { page: DocPage; activeSlug?: string }) {
  const active = page.slug === activeSlug;
  return (
    <Link
      className={cn(
        "block rounded-2xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
        active && "bg-primary/10 text-primary"
      )}
      href={`/docs/${page.slug}`}
    >
      {page.title}
    </Link>
  );
}

function DocsSidebar({ activeSlug }: { activeSlug?: string }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-5">
        <Card className="p-4">
          <p className="mb-3 text-sm font-bold text-foreground">Product guide</p>
          <nav aria-label="Documentation sidebar" className="space-y-4">
            {docsNavGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="mt-2 space-y-1">
                  {group.slugs.map((slug) => {
                    const page = getDocBySlug(slug);
                    return page ? <DocsNavLink activeSlug={activeSlug} key={slug} page={page} /> : null;
                  })}
                </div>
              </div>
            ))}
          </nav>
        </Card>
      </div>
    </aside>
  );
}

function DocsMobileNav({ activeSlug }: { activeSlug?: string }) {
  return (
    <div className="lg:hidden">
      <Card className="p-3">
        <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Docs menu
        </p>
        <nav aria-label="Documentation mobile navigation" className="flex gap-2 overflow-x-auto pb-1">
          {publicDocPages.map((page) => (
            <Link
              className={cn(
                "shrink-0 rounded-full border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-foreground",
                page.slug === activeSlug && "border-primary/40 bg-primary/10 text-primary"
              )}
              href={`/docs/${page.slug}`}
              key={page.slug}
            >
              {page.title}
            </Link>
          ))}
        </nav>
      </Card>
    </div>
  );
}

function ArticleToc({ page }: { page: DocPage }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-bold">On this page</p>
      <nav aria-label="Table of contents" className="mt-3 space-y-1">
        {page.sections.map((section) => (
          <a
            className="block rounded-2xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
            href={`#${section.id}`}
            key={section.id}
          >
            {section.heading}
          </a>
        ))}
        {page.faqs?.length ? (
          <a
            className="block rounded-2xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
            href="#faq-answers"
          >
            FAQ answers
          </a>
        ) : null}
      </nav>
    </Card>
  );
}

function LinkList({ links }: { links?: DocLink[] }) {
  if (!links?.length) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {links.map((link) => (
        <Button href={link.href} key={`${link.href}-${link.label}`} size="sm" variant="secondary">
          {link.label}
        </Button>
      ))}
    </div>
  );
}

function StepList({ steps }: { steps?: string[] }) {
  if (!steps?.length) return null;
  return (
    <ol className="mt-5 grid gap-3">
      {steps.map((step, index) => (
        <li className="flex gap-3 rounded-3xl border border-border bg-surface/70 p-4" key={step}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
            {index + 1}
          </span>
          <span className="pt-1 text-sm leading-6 text-muted-foreground">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function CalloutList({
  title,
  items,
  tone
}: {
  title: string;
  items?: string[];
  tone: "tip" | "warning";
}) {
  if (!items?.length) return null;
  const Icon = tone === "warning" ? AlertTriangle : CheckCircle2;
  return (
    <div
      className={cn(
        "mt-5 rounded-3xl border p-4",
        tone === "warning"
          ? "border-danger/25 bg-danger/10 text-danger"
          : "border-primary/25 bg-primary/10 text-primary"
      )}
    >
      <div className="flex items-center gap-2 font-bold">
        <Icon className="size-4" />
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ArticleSection({ section, index }: { section: DocSection; index: number }) {
  return (
    <section className="scroll-mt-28 border-t border-border/70 py-8 first:border-t-0 first:pt-0" id={section.id}>
      <div className="flex items-start gap-4">
        <span className="mt-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
          {sectionNumber(index)}
        </span>
        <div>
          <h2 className="text-2xl font-black tracking-normal">{section.heading}</h2>
          <div className="mt-4 space-y-4">
            {section.body.map((paragraph) => (
              <p className="text-base leading-8 text-muted-foreground" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
          <StepList steps={section.steps} />
          <CalloutList items={section.tips} title="Good to know" tone="tip" />
          <CalloutList items={section.warnings} title="Use with care" tone="warning" />
          <LinkList links={section.links} />
        </div>
      </div>
    </section>
  );
}

function FaqAccordion({ page }: { page: DocPage }) {
  if (!page.faqs?.length) return null;
  return (
    <section className="scroll-mt-28 border-t border-border/70 py-8" id="faq-answers">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-blue/10 text-blue">
          <HelpCircle className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-blue">FAQ</p>
          <h2 className="text-2xl font-black tracking-normal">Answers</h2>
        </div>
      </div>
      <div className="grid gap-3">
        {page.faqs.map((item) => (
          <details className="group rounded-3xl border border-border bg-surface/70 p-4" key={item.question}>
            <summary className="cursor-pointer list-none text-base font-bold marker:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.question}
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary group-open:hidden">
                  Open
                </span>
                <span className="hidden rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary group-open:inline">
                  Close
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function RelatedDocs({ page }: { page: DocPage }) {
  const related = getRelatedDocs(page);
  if (!related.length) return null;
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-lg font-bold">Related guides</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {related.map((item) => (
          <Link
            className="rounded-3xl border border-border bg-surface/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10"
            href={`/docs/${item.slug}`}
            key={item.slug}
          >
            <p className="text-sm font-bold">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PreviousNext({ page }: { page: DocPage }) {
  const { previous, next } = getAdjacentDocs(page);
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {previous ? (
        <Link
          className="rounded-3xl border border-border bg-surface/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10"
          href={`/docs/${previous.slug}`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ArrowLeft className="size-4" /> Previous
          </p>
          <p className="mt-2 font-bold">{previous.title}</p>
        </Link>
      ) : <div />}
      {next ? (
        <Link
          className="rounded-3xl border border-border bg-surface/70 p-4 text-right transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10"
          href={`/docs/${next.slug}`}
        >
          <p className="flex items-center justify-end gap-2 text-sm font-semibold text-muted-foreground">
            Next <ArrowRight className="size-4" />
          </p>
          <p className="mt-2 font-bold">{next.title}</p>
        </Link>
      ) : null}
    </div>
  );
}

export function DocsArticle({ page }: { page: DocPage }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Docs", href: "/docs" }, { label: page.title }]} />
      <section className="container-page py-8 sm:py-12">
        <DocsMobileNav activeSlug={page.slug} />
        <div className="mt-5 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)_15rem] lg:items-start">
          <DocsSidebar activeSlug={page.slug} />
          <article>
            <Card className="overflow-hidden p-6 sm:p-8">
              <div className="mb-8">
                <Badge className="mb-4 text-primary">{page.category}</Badge>
                <h1 className="text-balance text-4xl font-black tracking-normal sm:text-5xl">
                  {page.title}
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                  {page.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="rounded-full border border-border bg-surface/70 px-3 py-1">
                    {page.readingTime}
                  </span>
                  <span className="rounded-full border border-border bg-surface/70 px-3 py-1">
                    Updated {page.updatedAt}
                  </span>
                </div>
              </div>
              {page.sections.map((section, index) => (
                <ArticleSection index={index} key={section.id} section={section} />
              ))}
              <FaqAccordion page={page} />
              <div className="mt-8 rounded-3xl border border-primary/25 bg-primary/10 p-5 text-primary">
                <div className="flex gap-3">
                  <Info className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-bold">Still need help?</p>
                    <p className="mt-1 text-sm leading-6">
                      Send support the page URL, your account email if relevant, and a short description of what happened.
                    </p>
                    <div className="mt-4">
                      <Button href="/contact" size="sm" variant="secondary">
                        Contact support
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            <RelatedDocs page={page} />
            <PreviousNext page={page} />
          </article>
          <div className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <ArticleToc page={page} />
              <Card className="p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-primary" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    Public docs are indexable. Admin-only operational notes stay outside this help center.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

