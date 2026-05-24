import type {
  Attempt,
  BadgeDefinition,
  EarnedBadge,
  PersonalBestStatus,
  StreakResult,
  UserProfile
} from "@/types/domain";

export const badgeDefinitions: BadgeDefinition[] = [
  {
    id: "first-quiz",
    name: "First Quiz Completed",
    description: "Completed your first Quizora attempt.",
    icon: "Trophy",
    rarity: "common",
    category: "Milestone"
  },
  {
    id: "five-quizzes",
    name: "5 Quizzes Completed",
    description: "Submitted five completed quiz attempts.",
    icon: "Medal",
    rarity: "common",
    category: "Milestone"
  },
  {
    id: "ten-quizzes",
    name: "10 Quizzes Completed",
    description: "Built a ten-quiz practice trail.",
    icon: "Crown",
    rarity: "rare",
    category: "Milestone"
  },
  {
    id: "accuracy-80",
    name: "80% Accuracy Club",
    description: "Scored at least 80% accuracy on a completed attempt.",
    icon: "Target",
    rarity: "common",
    category: "Accuracy"
  },
  {
    id: "perfect-score",
    name: "Perfect Score",
    description: "Earned every available point in a quiz.",
    icon: "Sparkles",
    rarity: "epic",
    category: "Accuracy"
  },
  {
    id: "speed-runner",
    name: "Speed Runner",
    description: "Finished accurately under the Phase 4 speed target.",
    icon: "Timer",
    rarity: "rare",
    category: "Speed"
  },
  {
    id: "category-explorer",
    name: "Category Explorer",
    description: "Completed quizzes across three categories.",
    icon: "Compass",
    rarity: "rare",
    category: "Discovery"
  },
  {
    id: "leaderboard-debut",
    name: "Leaderboard Debut",
    description: "Posted your first leaderboard-eligible attempt.",
    icon: "BarChart3",
    rarity: "common",
    category: "Leaderboard"
  },
  {
    id: "streak-starter",
    name: "Streak Starter",
    description: "Started a daily quiz streak.",
    icon: "Flame",
    rarity: "common",
    category: "Streak"
  },
  {
    id: "three-day-streak",
    name: "3-Day Streak",
    description: "Kept your quiz streak alive for three days.",
    icon: "Flame",
    rarity: "rare",
    category: "Streak"
  },
  {
    id: "seven-day-streak",
    name: "7-Day Streak",
    description: "Built a full-week quiz rhythm.",
    icon: "Flame",
    rarity: "epic",
    category: "Streak"
  },
  {
    id: "science-starter",
    name: "Science Starter",
    description: "Completed a Science quiz.",
    icon: "Atom",
    rarity: "common",
    category: "Category"
  },
  {
    id: "math-sprinter",
    name: "Math Sprinter",
    description: "Completed a Mathematics quiz with steady pace.",
    icon: "Sigma",
    rarity: "rare",
    category: "Category"
  },
  {
    id: "live-room-debut",
    name: "Live Room Debut",
    description: "Completed a live room for the first time.",
    icon: "DoorOpen",
    rarity: "common",
    category: "Rooms"
  },
  {
    id: "quick-match-player",
    name: "Quick Match Player",
    description: "Played a quick match.",
    icon: "RadioTower",
    rarity: "common",
    category: "Matchmaking"
  },
  {
    id: "classroom-learner",
    name: "Classroom Learner",
    description: "Submitted a classroom assignment.",
    icon: "GraduationCap",
    rarity: "common",
    category: "Classroom"
  },
  {
    id: "challenge-accepted",
    name: "Challenge Accepted",
    description: "Opened or completed a daily challenge.",
    icon: "Sparkles",
    rarity: "common",
    category: "Challenge"
  },
  {
    id: "space-explorer",
    name: "Space Explorer",
    description: "Completed a Space and Astronomy quiz.",
    icon: "Orbit",
    rarity: "rare",
    category: "Category"
  },
  {
    id: "logic-warrior",
    name: "Logic Warrior",
    description: "Completed a Logical Reasoning quiz.",
    icon: "Brain",
    rarity: "rare",
    category: "Category"
  },
  {
    id: "vocabulary-builder",
    name: "Vocabulary Builder",
    description: "Completed an English and Vocabulary quiz.",
    icon: "BookOpenText",
    rarity: "common",
    category: "Category"
  },
  {
    id: "history-hunter",
    name: "History Hunter",
    description: "Completed a History quiz.",
    icon: "Landmark",
    rarity: "common",
    category: "Category"
  },
  {
    id: "eco-learner",
    name: "Eco Learner",
    description: "Completed an Environment quiz.",
    icon: "Leaf",
    rarity: "common",
    category: "Category"
  },
  {
    id: "premium-scholar",
    name: "Premium Scholar",
    description: "Unlocked a premium Quizora learning workflow.",
    icon: "Crown",
    rarity: "legendary",
    category: "Premium"
  },
  {
    id: "trusted-result",
    name: "Verified Result",
    description: "Completed a server-scored trusted quiz attempt.",
    icon: "ShieldCheck",
    rarity: "rare",
    category: "Trust"
  }
];

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function calculateStreakUpdate({
  lastPlayedDate,
  currentStreak,
  longestStreak,
  now = new Date()
}: {
  lastPlayedDate?: string | null;
  currentStreak: number;
  longestStreak: number;
  now?: Date;
}): StreakResult {
  const today = toLocalDateKey(now);
  const yesterday = toLocalDateKey(addDays(now, -1));

  if (lastPlayedDate === today) {
    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastPlayedDate: today,
      alreadyPlayedToday: true,
      streakChanged: false
    };
  }

  const nextStreak = lastPlayedDate === yesterday ? currentStreak + 1 : 1;

  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
    lastPlayedDate: today,
    alreadyPlayedToday: false,
    streakChanged: true
  };
}

export function normalizeBadges(value: unknown): EarnedBadge[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      id: typeof item?.id === "string" ? item.id : "",
      name: typeof item?.name === "string" ? item.name : "",
      description: typeof item?.description === "string" ? item.description : "",
      icon: typeof item?.icon === "string" ? item.icon : "Award",
      rarity:
        item?.rarity === "rare" ||
        item?.rarity === "epic" ||
        item?.rarity === "legendary"
          ? item.rarity
          : "common",
      category: typeof item?.category === "string" ? item.category : "General",
      unlockedAt: typeof item?.unlockedAt === "string" ? item.unlockedAt : new Date().toISOString()
    }))
    .filter((badge) => badge.id && badge.name);
}

export function evaluateBadgesForAttempt({
  attempt,
  profile,
  nextTotalPlayed,
  streakAfter,
  categoryIdsPlayed,
  personalBestStatus,
  now = new Date()
}: {
  attempt: Pick<
    Attempt,
    | "score"
    | "totalPoints"
    | "accuracy"
    | "timeTakenSeconds"
    | "totalQuestions"
  >;
  profile: UserProfile | null;
  nextTotalPlayed: number;
  streakAfter: number;
  categoryIdsPlayed: string[];
  personalBestStatus: PersonalBestStatus;
  now?: Date;
}) {
  const existing = profile?.earnedBadges ?? [];
  const existingIds = new Set(existing.map((badge) => badge.id));
  const unlockedAt = now.toISOString();
  const shouldEarn = new Set<string>();

  if (nextTotalPlayed >= 1) shouldEarn.add("first-quiz");
  if (nextTotalPlayed >= 5) shouldEarn.add("five-quizzes");
  if (nextTotalPlayed >= 10) shouldEarn.add("ten-quizzes");
  if (attempt.accuracy >= 80) shouldEarn.add("accuracy-80");
  if (attempt.totalPoints > 0 && attempt.score >= attempt.totalPoints) {
    shouldEarn.add("perfect-score");
  }
  if (
    attempt.totalQuestions > 0 &&
    attempt.timeTakenSeconds <= attempt.totalQuestions * 30 &&
    attempt.accuracy >= 70
  ) {
    shouldEarn.add("speed-runner");
  }
  if (categoryIdsPlayed.length >= 3) shouldEarn.add("category-explorer");
  if (personalBestStatus === "first" || personalBestStatus === "new-best") {
    shouldEarn.add("leaderboard-debut");
  }
  if (streakAfter >= 1) shouldEarn.add("streak-starter");
  if (streakAfter >= 3) shouldEarn.add("three-day-streak");
  if (streakAfter >= 7) shouldEarn.add("seven-day-streak");

  const newlyEarnedBadges = badgeDefinitions
    .filter((badge) => shouldEarn.has(badge.id) && !existingIds.has(badge.id))
    .map((badge) => ({ ...badge, unlockedAt }));

  return {
    newlyEarnedBadges,
    earnedBadges: [...existing, ...newlyEarnedBadges]
  };
}
