import type { BillingPlan, BillingPlanId } from "@/types/domain";

export const billingFeatureLabels: Record<string, string> = {
  "solo.unlimitedAttempts": "Unlimited solo attempts",
  "rooms.create": "Create live rooms",
  "rooms.largerRooms": "Larger live rooms",
  "rooms.botFill": "Bot fill controls",
  "matchmaking.quickMatch": "More quick matches",
  "analytics.advancedProgress": "Advanced progress insights",
  "creator.createQuizzes": "Creator quiz drafts",
  "creator.privateQuizzes": "Private class-use quizzes",
  "creator.analytics": "Creator analytics",
  "classroom.createClasses": "Private classrooms",
  "classroom.assignments": "Class assignments",
  "classroom.exports": "Class result exports",
  "classroom.analytics": "Classroom analytics",
  "profile.premiumThemes": "Premium profile themes"
};

export const billingLimitLabels: Record<string, string> = {
  maxCreatedRooms: "Created rooms / month",
  maxQuickMatchesPerDay: "Quick matches / day",
  maxClasses: "Classes",
  maxStudentsPerClass: "Students / class",
  maxAssignments: "Assignments / month",
  maxCreatorQuizzes: "Creator quiz drafts",
  maxExportsPerMonth: "Exports / month"
};

const now = null;

export const planCatalog: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "A generous starter plan for browsing, basic quiz play, leaderboards, and limited live rooms.",
    bestFor: "Players exploring Quizora",
    priceINR: 0,
    billingType: "free",
    durationDays: 0,
    currency: "INR",
    features: ["rooms.create", "matchmaking.quickMatch"],
    limits: {
      maxCreatedRooms: 3,
      maxQuickMatchesPerDay: 5,
      maxClasses: 1,
      maxStudentsPerClass: 15,
      maxAssignments: 4,
      maxCreatorQuizzes: 3,
      maxExportsPerMonth: 0
    },
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "plus",
    name: "Plus",
    description: "Unlock richer solo progress, more live-room play, quick matches, and premium profile touches.",
    bestFor: "Active quiz players",
    priceINR: 199,
    billingType: "monthly-pass",
    durationDays: 30,
    currency: "INR",
    features: [
      "solo.unlimitedAttempts",
      "rooms.create",
      "rooms.largerRooms",
      "rooms.botFill",
      "matchmaking.quickMatch",
      "analytics.advancedProgress",
      "profile.premiumThemes"
    ],
    limits: {
      maxCreatedRooms: 40,
      maxQuickMatchesPerDay: 50,
      maxClasses: 1,
      maxStudentsPerClass: 15,
      maxAssignments: 4,
      maxCreatorQuizzes: 3,
      maxExportsPerMonth: 2
    },
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "creator",
    name: "Creator",
    description: "Create class-use quiz drafts, manage private learning content, and review creator analytics.",
    bestFor: "Quiz creators and tutors",
    priceINR: 499,
    billingType: "monthly-pass",
    durationDays: 30,
    currency: "INR",
    features: [
      "solo.unlimitedAttempts",
      "rooms.create",
      "rooms.largerRooms",
      "creator.createQuizzes",
      "creator.privateQuizzes",
      "creator.analytics",
      "analytics.advancedProgress",
      "classroom.exports"
    ],
    limits: {
      maxCreatedRooms: 80,
      maxQuickMatchesPerDay: 80,
      maxClasses: 5,
      maxStudentsPerClass: 40,
      maxAssignments: 40,
      maxCreatorQuizzes: 40,
      maxExportsPerMonth: 20
    },
    isActive: true,
    isFeatured: false,
    sortOrder: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "classroom",
    name: "Classroom",
    description: "Expand teacher workflows with larger classes, more assignments, analytics, exports, and class rooms.",
    bestFor: "Teachers and learning cohorts",
    priceINR: 999,
    billingType: "monthly-pass",
    durationDays: 30,
    currency: "INR",
    features: [
      "solo.unlimitedAttempts",
      "rooms.create",
      "rooms.largerRooms",
      "rooms.botFill",
      "creator.createQuizzes",
      "creator.privateQuizzes",
      "creator.analytics",
      "classroom.createClasses",
      "classroom.assignments",
      "classroom.exports",
      "classroom.analytics",
      "analytics.advancedProgress"
    ],
    limits: {
      maxCreatedRooms: 160,
      maxQuickMatchesPerDay: 100,
      maxClasses: 20,
      maxStudentsPerClass: 120,
      maxAssignments: 200,
      maxCreatorQuizzes: 100,
      maxExportsPerMonth: 100
    },
    isActive: true,
    isFeatured: false,
    sortOrder: 3,
    createdAt: now,
    updatedAt: now
  }
];

export const planPriority: Record<BillingPlanId, number> = {
  free: 0,
  plus: 1,
  creator: 2,
  classroom: 3
};

export function getPlan(planId: string | null | undefined) {
  return planCatalog.find((plan) => plan.id === planId);
}

export function getActivePlans() {
  return planCatalog.filter((plan) => plan.isActive).sort((first, second) => first.sortOrder - second.sortOrder);
}

export function getFreePlan() {
  return planCatalog[0];
}

export function getAdminUnlockedPlan(): BillingPlan {
  const classroom = getPlan("classroom") ?? planCatalog[planCatalog.length - 1];
  const featureSet = new Set(planCatalog.flatMap((plan) => plan.features));
  const limits = Object.fromEntries(
    Object.keys(billingLimitLabels).map((key) => [key, 1_000_000])
  );

  return {
    ...classroom,
    id: "classroom",
    name: "Admin unlocked",
    description: "Admin profile access with every Quizora premium feature unlocked.",
    bestFor: "Quizora admin",
    priceINR: 0,
    billingType: "free",
    durationDays: 0,
    features: [...featureSet],
    limits,
    isFeatured: false,
    sortOrder: 99
  };
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function hasPlanFeature(plan: BillingPlan, featureKey: string) {
  return plan.features.includes(featureKey);
}

export function getPlanLimit(plan: BillingPlan, limitKey: string) {
  return plan.limits[limitKey] ?? 0;
}
