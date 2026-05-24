"use client";

import { ArrowRight, Shapes } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { CategoryCardItem } from "@/types/domain";
import { cn } from "@/lib/utils";

export function CategoryCard({ category }: { category: CategoryCardItem }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Link href={`/categories/${category.slug}`}>
        <Card className="group h-full p-5 hover:-translate-y-1 hover:shadow-glow">
          <div className="flex items-start justify-between gap-4">
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl",
                category.accent
              )}
            >
              <Shapes className="size-6" />
            </span>
            <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <h3 className="mt-5 text-2xl font-semibold">{category.name}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {category.description}
          </p>
          <p className="mt-5 text-sm font-semibold text-primary">
            {category.quizCount} quizzes ready
          </p>
        </Card>
      </Link>
    </motion.article>
  );
}
