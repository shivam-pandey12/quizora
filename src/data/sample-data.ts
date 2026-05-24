import type {
  AdminMetric,
  CategoryCardItem,
  DashboardMetric,
  SampleLeaderboardEntry,
  QuizCardItem
} from "@/types/domain";

export const sampleQuizzes: QuizCardItem[] = [
  {
    slug: "science-foundations",
    title: "Science Foundations",
    description:
      "Starter-preview science prompts covering cells, matter, energy, and careful observation.",
    shortDescription: "Starter-preview science concepts with clean explanations.",
    categoryName: "Science",
    categorySlug: "science",
    difficulty: "easy",
    questionCount: 10,
    estimatedMinutes: 5,
    totalPoints: 10,
    timeLimitSeconds: 250,
    playCount: 0,
    averageScore: 0,
    isFeatured: true,
    accent: "from-sky-200 via-stone-100 to-emerald-100"
  },
  {
    slug: "math-essentials",
    title: "Math Essentials",
    description:
      "Starter-preview number sense for percentages, ratios, primes, variables, and geometry.",
    shortDescription: "Number sense and math vocabulary for first exploration.",
    categoryName: "Mathematics",
    categorySlug: "mathematics",
    difficulty: "easy",
    questionCount: 10,
    estimatedMinutes: 5,
    totalPoints: 10,
    timeLimitSeconds: 250,
    playCount: 0,
    averageScore: 0,
    isFeatured: true,
    accent: "from-emerald-200 via-stone-100 to-amber-100"
  },
  {
    slug: "geography-map-sense",
    title: "Geography Map Sense",
    description:
      "Starter-preview geography language for maps, landforms, water, and climate.",
    shortDescription: "Map and landform concepts for setup preview mode.",
    categoryName: "Geography",
    categorySlug: "geography",
    difficulty: "easy",
    questionCount: 10,
    estimatedMinutes: 5,
    totalPoints: 10,
    timeLimitSeconds: 250,
    playCount: 0,
    averageScore: 0,
    isFeatured: true,
    accent: "from-lime-200 via-stone-100 to-sky-100"
  },
  {
    slug: "solar-system-basics",
    title: "Solar System Basics",
    description:
      "Starter-preview astronomy ideas for planets, stars, moons, galaxies, and orbit basics.",
    shortDescription: "Space concepts ready for seeded Firestore content.",
    categoryName: "Space & Astronomy",
    categorySlug: "space-astronomy",
    difficulty: "easy",
    questionCount: 10,
    estimatedMinutes: 5,
    totalPoints: 10,
    timeLimitSeconds: 250,
    playCount: 0,
    averageScore: 0,
    isFeatured: true,
    accent: "from-indigo-200 via-stone-100 to-sky-100"
  },
  {
    slug: "indian-knowledge-essentials",
    title: "Indian Knowledge Essentials",
    description:
      "Starter-preview India-focused civics, culture, geography, and knowledge traditions.",
    shortDescription: "India-focused starter concepts for public browsing.",
    categoryName: "Indian Knowledge",
    categorySlug: "indian-knowledge",
    difficulty: "easy",
    questionCount: 10,
    estimatedMinutes: 5,
    totalPoints: 10,
    timeLimitSeconds: 250,
    playCount: 0,
    averageScore: 0,
    isFeatured: true,
    accent: "from-orange-200 via-stone-100 to-emerald-100"
  },
  {
    slug: "mixed-brain-battle",
    title: "Mixed Brain Battle",
    description:
      "Starter-preview mixed knowledge across science, world knowledge, vocabulary, and reasoning.",
    shortDescription: "A balanced starter challenge for setup preview mode.",
    categoryName: "Mixed Challenge",
    categorySlug: "mixed-challenge",
    difficulty: "medium",
    questionCount: 10,
    estimatedMinutes: 7,
    totalPoints: 20,
    timeLimitSeconds: 400,
    playCount: 0,
    averageScore: 0,
    isFeatured: true,
    isDailyChallenge: true,
    accent: "from-amber-200 via-stone-100 to-sky-100"
  }
];

export const sampleCategories: CategoryCardItem[] = [
  {
    slug: "science",
    name: "Science",
    description: "Explore cells, forces, energy, ecosystems, and everyday scientific thinking.",
    quizCount: 3,
    accent: "bg-blue/12 text-blue",
    featured: true
  },
  {
    slug: "mathematics",
    name: "Mathematics",
    description: "Build number sense, ratios, probability, geometry, and reasoning confidence.",
    quizCount: 3,
    accent: "bg-success/12 text-success",
    featured: true
  },
  {
    slug: "history",
    name: "History",
    description: "Understand timelines, civilizations, evidence, reforms, and heritage.",
    quizCount: 3,
    accent: "bg-warning/12 text-warning",
    featured: true
  },
  {
    slug: "geography",
    name: "Geography",
    description: "Read maps, landforms, climate, regions, and human geography with confidence.",
    quizCount: 3,
    accent: "bg-primary/12 text-primary",
    featured: true
  },
  {
    slug: "space-astronomy",
    name: "Space & Astronomy",
    description: "Move from the solar system to galaxies with clear astronomy concepts.",
    quizCount: 3,
    accent: "bg-blue/12 text-blue",
    featured: true
  },
  {
    slug: "indian-knowledge",
    name: "Indian Knowledge",
    description: "Explore India-focused civics, culture, geography, and knowledge traditions.",
    quizCount: 3,
    accent: "bg-warning/12 text-warning",
    featured: true
  }
];

export const leaderboardEntries: SampleLeaderboardEntry[] = [];

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Quizzes played", value: "0", helper: "Ready for first attempt" },
  { label: "Average accuracy", value: "0%", helper: "Tracks after completed attempts" },
  { label: "XP level", value: "1", helper: "Foundation profile field" },
  { label: "Study streak", value: "0 days", helper: "Future activity signal" }
];

export const adminMetrics: AdminMetric[] = [
  { label: "Total quizzes", value: "0", helper: "Managed in admin studio" },
  { label: "Total users", value: "0", helper: "Profile docs ready" },
  { label: "Attempts today", value: "0", helper: "Real attempts save from play" },
  { label: "Active rooms", value: "0", helper: "Live rooms planned later" },
  { label: "Reports", value: "0", helper: "Moderation shell ready" },
  { label: "Featured quizzes", value: "0", helper: "Real counts load from Firestore" }
];

export function getQuizBySlug(slug: string) {
  return sampleQuizzes.find((quiz) => quiz.slug === slug);
}

export function getRelatedQuizzes(slug: string) {
  const quiz = getQuizBySlug(slug);
  if (!quiz) return sampleQuizzes.slice(0, 3);
  return sampleQuizzes
    .filter((candidate) => candidate.slug !== slug && candidate.categorySlug === quiz.categorySlug)
    .concat(sampleQuizzes.filter((candidate) => candidate.slug !== slug))
    .slice(0, 3);
}
