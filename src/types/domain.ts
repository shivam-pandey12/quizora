export type QuizDifficulty = "easy" | "medium" | "hard" | "expert";
export type QuizStatus = "draft" | "published" | "archived";
export type QuizVisibility = "public" | "private";
export type CategoryStatus = "active" | "hidden";
export type QuestionType = "single-choice" | "multiple-choice" | "true-false" | "text";
export type QuestionStatus = "active" | "hidden";
export type UserRole = "user" | "admin";
export type CreatorStatus = "none" | "pending" | "approved" | "suspended";
export type AttemptStatus = "completed" | "abandoned";
export type AttemptMode = "solo" | "live-room" | "assignment";
export type AttemptSessionStatus = "active" | "submitted" | "expired" | "cancelled";
export type ScoringSource = "client" | "server";
export type ReviewStatus = "none" | "flagged" | "reviewed" | "cleared" | "hidden";
export type SecurityFlagSeverity = "low" | "medium" | "high";
export type LeaderboardScope = "global" | "quiz" | "category";
export type PeriodType = "all-time" | "daily" | "weekly" | "monthly";
export type BadgeRarity = "common" | "rare" | "epic" | "legendary";
export type PersonalBestStatus = "first" | "new-best" | "matched" | "below-best";
export type RoomStatus =
  | "waiting"
  | "starting"
  | "in-progress"
  | "question-review"
  | "completed"
  | "cancelled";
export type RoomVisibility = "private" | "public";
export type RoomScoringMode = "standard" | "speed-bonus";
export type RoomSource = "manual" | "quick-match" | "challenge" | "class-room";
export type RoomMatchmakingStatus = "open" | "filling" | "ready" | "started" | "closed";
export type RoomPlayerRole = "host" | "player";
export type RoomPlayerStatus =
  | "joined"
  | "ready"
  | "playing"
  | "submitted"
  | "left"
  | "disconnected";
export type RoomAnswerStatus = "idle" | "submitted" | "skipped" | "correct" | "wrong";
export type BotDifficulty = "easy" | "medium" | "hard";
export type MatchmakingQueueStatus = "searching" | "matched" | "cancelled" | "expired";
export type MatchmakingPlayerCount = 2 | 3 | 4 | "flexible";
export type ChallengeStatus = "active" | "joined" | "expired" | "cancelled";
export type AdminWorkflowStatus = "open" | "new" | "reviewing" | "resolved" | "done" | "dismissed";
export type AdminPriority = "low" | "medium" | "high";
export type ReportType = "question" | "quiz" | "user" | "room" | "attempt" | "bug" | "other";
export type FeedbackType = "bug" | "feature" | "general" | "ui" | "quiz-quality";
export type DailyChallengeStatus = "scheduled" | "active" | "completed";
export type CleanupIssueSeverity = "info" | "warning" | "danger";
export type ClassStatus = "active" | "archived";
export type ClassVisibility = "private" | "invite-only";
export type ClassMemberRole = "teacher" | "assistant" | "student";
export type ClassMemberStatus = "active" | "removed" | "pending";
export type ClassInviteStatus = "active" | "disabled" | "expired";
export type AssignmentStatus = "draft" | "published" | "closed";
export type AssignmentSubmissionStatus =
  | "not-started"
  | "in-progress"
  | "submitted"
  | "late"
  | "missing";
export type CreatorQuizOwnerType = "admin" | "creator";
export type QuizPublishScope = "global" | "class-only" | "private";
export type QuizReviewStatus = "draft" | "submitted" | "approved" | "rejected";
export type BillingPlanId = "free" | "plus" | "creator" | "classroom";
export type BillingType = "free" | "one-time" | "monthly-pass" | "annual-pass";
export type BillingMode = "test" | "live";
export type BillingSource = "razorpay" | "admin" | "promo" | "test";
export type EntitlementStatus = "active" | "expired" | "cancelled" | "revoked" | "pending";
export type BillingOrderStatus = "created" | "paid" | "failed" | "expired" | "cancelled";
export type PaymentStatus = "captured" | "failed" | "refunded" | "authorized" | "unknown";
export type RefundStatus = "requested" | "reviewing" | "processed" | "rejected";

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  description: string;
  bestFor: string;
  priceINR: number;
  billingType: BillingType;
  durationDays: number;
  currency: string;
  features: string[];
  limits: Record<string, number>;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Entitlement {
  id: string;
  userId: string;
  planId: BillingPlanId;
  planName: string;
  status: EntitlementStatus;
  source: BillingSource;
  startsAt: string | null;
  expiresAt: string | null;
  features: string[];
  limits: Record<string, number>;
  paymentId: string | null;
  orderId: string | null;
  mode: BillingMode;
  adminNote: string;
  createdAt: string | null;
  updatedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
}

export interface BillingOrder {
  id: string;
  userId: string;
  userEmail: string;
  planId: BillingPlanId;
  planName: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  status: BillingOrderStatus;
  receipt: string;
  mode: BillingMode;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  planId: BillingPlanId;
  planName: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  email: string;
  contact: string;
  verified: boolean;
  webhookConfirmed: boolean;
  mode: BillingMode;
  supportNote: string;
  rawSafeSummary: Record<string, string | number | boolean | null>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WebhookEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  processed: boolean;
  mode: BillingMode;
  receivedAt: string | null;
  processedAt: string | null;
  error: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  adminNote: string;
  mode: BillingMode;
  createdAt: string | null;
  updatedAt: string | null;
  processedAt: string | null;
}

export interface UsageCounter {
  id: string;
  userId: string;
  periodKey: string;
  roomsCreated: number;
  quickMatches: number;
  exports: number;
  classesCreated: number;
  assignmentsCreated: number;
  creatorQuizzesCreated: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BillingAuditLog {
  id: string;
  userId: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  mode: BillingMode;
  createdAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  accent: string;
  quizCount: number;
  featured: boolean;
  status: CategoryStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Quiz {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  categoryName: string;
  difficulty: QuizDifficulty;
  status: QuizStatus;
  visibility: QuizVisibility;
  thumbnailUrl: string;
  tags: string[];
  estimatedMinutes: number;
  questionCount: number;
  totalPoints: number;
  timeLimitSeconds: number;
  isFeatured: boolean;
  isDailyChallenge: boolean;
  playCount: number;
  averageScore: number;
  createdBy: string;
  ownerId: string;
  ownerName: string;
  ownerType: CreatorQuizOwnerType;
  publishScope: QuizPublishScope;
  reviewStatus: QuizReviewStatus;
  allowedClassIds: string[];
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
}

export interface Question {
  id: string;
  quizId: string;
  type: QuestionType;
  questionText: string;
  options: QuestionOption[];
  correctAnswer: string;
  correctAnswers: string[];
  explanation: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  order: number;
  status: QuestionStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PlayQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  questionText: string;
  options: QuestionOption[];
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  order: number;
}

export interface QuizAnswerState {
  selectedAnswer: string;
  selectedAnswers: string[];
  textAnswer: string;
  timeSpentSeconds: number;
}

export interface QuizPlayState {
  quizId: string;
  userId: string;
  attemptSessionId?: string;
  sessionToken?: string;
  safeQuestions?: PlayQuestion[];
  currentIndex: number;
  startedAtMs: number;
  deadlineMs: number | null;
  answers: Record<string, QuizAnswerState>;
  questionTime: Record<string, number>;
}

export interface SecurityFlag {
  code: string;
  severity: SecurityFlagSeverity;
  message: string;
  createdAt: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AttemptSession {
  id: string;
  userId: string;
  quizId: string;
  quizSlug: string;
  quizTitle: string;
  status: AttemptSessionStatus;
  mode: AttemptMode;
  assignmentId: string | null;
  classId: string | null;
  roomId: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  attemptId: string | null;
  questionIds: string[];
  questionOrder: string[];
  questionCount: number;
  totalPoints: number;
  timeLimitSeconds: number;
  nonce: string;
  clientFingerprint: string;
  ipHash: string;
  userAgentHash: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AttemptAnswer {
  questionId: string;
  questionTextSnapshot: string;
  type: QuestionType;
  selectedAnswer: string;
  selectedAnswers: string[];
  correctAnswer: string;
  correctAnswers: string[];
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  timeSpentSeconds: number;
  explanationSnapshot: string;
  optionsSnapshot: QuestionOption[];
}

export interface Attempt {
  id: string;
  mode: AttemptMode;
  roomId: string | null;
  roomCode: string | null;
  classId: string | null;
  className: string | null;
  assignmentId: string | null;
  assignmentTitle: string | null;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  quizId: string;
  quizSlug: string;
  quizTitle: string;
  categoryId: string;
  categoryName: string;
  difficulty: QuizDifficulty;
  status: AttemptStatus;
  score: number;
  totalPoints: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalQuestions: number;
  accuracy: number;
  timeTakenSeconds: number;
  startedAt: string | null;
  completedAt: string | null;
  answers: AttemptAnswer[];
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  streakAfter: number;
  badgeUnlocks: EarnedBadge[];
  personalBestStatus: PersonalBestStatus;
  personalBestDelta: number;
  leaderboardUpdated: boolean;
  scoringSource: ScoringSource;
  trusted: boolean;
  attemptSessionId: string | null;
  securityFlags: SecurityFlag[];
  suspiciousScore: number;
  reviewStatus: ReviewStatus;
  hiddenFromLeaderboard: boolean;
  serverScoredAt: string | null;
  clientReportedTime: number | null;
  serverCalculatedTime: number;
  timingDrift: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RoomSettings {
  questionTimerSeconds: number;
  showCorrectAfterEachQuestion: boolean;
  allowLateJoin: boolean;
  requireReady: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  autoAdvance: boolean;
  autoAdvanceDelaySeconds: number;
  scoringMode: RoomScoringMode;
  visibility: RoomVisibility;
  maxPlayers: number;
}

export interface BotProfile {
  botId: string;
  displayName: string;
  photoURL: string | null;
  difficulty: BotDifficulty;
  personality: string;
}

export interface RoomQuestionStat {
  questionId: string;
  questionIndex: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  averageTimeSeconds: number;
}

export interface RoomAnalytics {
  totalJoined: number;
  peakPlayers: number;
  startedPlayerCount: number;
  completedPlayerCount: number;
  averageScore: number;
  averageAccuracy: number;
  averageTimePerQuestion: number;
  abandonCount: number;
  durationSeconds: number;
  questionStats: RoomQuestionStat[];
}

export interface RoomAntiAbuse {
  duplicateSubmissionBlocked: boolean;
  clientScored: boolean;
  duplicateAnswerAttempts: number;
  fastAdvanceCount: number;
  answerAfterEndCount: number;
  joinLeaveCount: number;
  flags: string[];
}

export interface Room {
  id: string;
  roomCode: string;
  source: RoomSource;
  roomTitle: string;
  roomDescription: string;
  quizId: string;
  quizSlug: string;
  quizTitle: string;
  categoryId: string;
  categoryName: string;
  difficulty: QuizDifficulty;
  hostId: string;
  hostName: string;
  hostPhotoURL: string | null;
  status: RoomStatus;
  visibility: RoomVisibility;
  maxPlayers: number;
  playerCount: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  totalPoints: number;
  questionOrder: string[];
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  locked: boolean;
  rematchRoomId: string | null;
  matchmakingEnabled: boolean;
  preferredPlayerCount: number;
  minPlayersToStart: number;
  allowBotFill: boolean;
  botFillAt: string | null;
  botFillDelaySeconds: number;
  botFillUsed: boolean;
  matchmakingStatus: RoomMatchmakingStatus;
  queueCreatedBy: string;
  challengeId: string | null;
  classId: string | null;
  className: string | null;
  allowedMemberOnly: boolean;
  settings: RoomSettings;
  analytics: RoomAnalytics;
  antiAbuse: RoomAntiAbuse;
  leaderboardMode: "casual" | "trusted";
}

export interface RoomPlayer {
  id: string;
  roomId: string;
  roomCode: string;
  userId: string;
  displayName: string;
  photoURL: string | null;
  role: RoomPlayerRole;
  isBot: boolean;
  botId: string | null;
  botDifficulty: BotDifficulty | null;
  botPersonality: string;
  status: RoomPlayerStatus;
  score: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  currentAnswerStatus: RoomAnswerStatus;
  joinedAt: string | null;
  lastSeenAt: string | null;
  completedAt: string | null;
}

export interface RoomAnswer {
  id: string;
  roomId: string;
  roomCode: string;
  userId: string;
  isBot: boolean;
  questionId: string;
  questionIndex: number;
  questionTextSnapshot: string;
  type: QuestionType;
  selectedAnswer: string;
  selectedAnswers: string[];
  correctAnswer: string;
  correctAnswers: string[];
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  timeTakenSeconds: number;
  explanationSnapshot: string;
  optionsSnapshot: QuestionOption[];
  trusted: boolean;
  scoringSource: ScoringSource;
  securityFlags: SecurityFlag[];
  answeredAt: string | null;
}

export interface RoomResult {
  id: string;
  roomId: string;
  roomCode: string;
  userId: string;
  displayName: string;
  photoURL: string | null;
  isBot: boolean;
  botDifficulty: BotDifficulty | null;
  score: number;
  totalPoints: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  rank: number;
  xpEarned: number;
  attemptId: string | null;
  trusted: boolean;
  scoringSource: ScoringSource;
  securityFlags: SecurityFlag[];
  reviewStatus: ReviewStatus;
  completedAt: string | null;
}

export interface RoomInput {
  source?: RoomSource;
  roomTitle: string;
  roomDescription: string;
  quizId: string;
  visibility: RoomVisibility;
  locked: boolean;
  maxPlayers: number;
  questionTimerSeconds: number;
  showCorrectAfterEachQuestion: boolean;
  allowLateJoin: boolean;
  requireReady: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  autoAdvance: boolean;
  autoAdvanceDelaySeconds: number;
  scoringMode: RoomScoringMode;
  matchmakingEnabled?: boolean;
  preferredPlayerCount?: number;
  minPlayersToStart?: number;
  allowBotFill?: boolean;
  botFillDelaySeconds?: number;
  matchmakingStatus?: RoomMatchmakingStatus;
  queueCreatedBy?: string;
  challengeId?: string | null;
  classId?: string | null;
  className?: string | null;
  allowedMemberOnly?: boolean;
}

export interface QuickMatchPreferences {
  preferredQuizId: string;
  preferredCategoryId: string;
  preferredDifficulty: QuizDifficulty | "any";
  preferredPlayerCount: MatchmakingPlayerCount;
  allowBotFill: boolean;
  questionTimerSeconds: number;
  scoringMode: RoomScoringMode;
}

export interface MatchmakingAntiAbuse {
  cancelCount: number;
  retryCount: number;
  flags: string[];
}

export interface MatchmakingQueueEntry {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string | null;
  status: MatchmakingQueueStatus;
  preferredQuizId: string;
  preferredCategoryId: string;
  preferredDifficulty: QuizDifficulty | "any";
  preferredPlayerCount: MatchmakingPlayerCount;
  allowBotFill: boolean;
  questionTimerSeconds: number;
  scoringMode: RoomScoringMode;
  createdAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
  matchedRoomId: string | null;
  matchedRoomCode: string | null;
  region: string;
  ratingBand: string;
  antiAbuse: MatchmakingAntiAbuse;
}

export interface Challenge {
  id: string;
  createdBy: string;
  createdByName: string;
  quizId: string;
  quizTitle: string;
  roomId: string;
  roomCode: string;
  status: ChallengeStatus;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  acceptedBy: string | null;
}

export interface Report {
  id: string;
  type: ReportType;
  targetId: string;
  targetLabel: string;
  targetUrl: string;
  reportedBy: string;
  reportedByName: string;
  reason: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  priority: AdminPriority;
  adminNote: string;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface Feedback {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  type: FeedbackType;
  message: string;
  pageUrl: string;
  status: "new" | "reviewing" | "done" | "dismissed";
  priority: AdminPriority;
  adminNote: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  details: string;
  createdAt: string | null;
}

export interface DailyChallenge {
  id: string;
  dateKey: string;
  quizId: string;
  quizTitle: string;
  categoryId: string;
  difficulty: QuizDifficulty;
  status: DailyChallengeStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FeaturedConfig {
  id: string;
  public: boolean;
  featuredQuizIds: string[];
  featuredCategoryIds: string[];
  heroQuizId: string;
  liveRoomCtaEnabled: boolean;
  updatedAt: string | null;
}

export interface SiteSettings {
  id: string;
  public: boolean;
  supportEmail: string;
  appAnnouncement: string;
  maintenanceMode: boolean;
  allowPublicRooms: boolean;
  allowQuickMatch: boolean;
  allowChallengeLinks: boolean;
  leaderboardEnabled: boolean;
  dailyChallengeEnabled: boolean;
  defaultQuestionTimer: number;
  defaultRoomMaxPlayers: number;
  defaultBotFillDelay: number;
  featuredQuizLimit: number;
  updatedAt: string | null;
}

export interface TeacherProfile {
  displayTitle: string;
  organizationName: string;
  bio: string;
  subjectFocus: string;
  verified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ClassroomStats {
  completedAssignments: number;
  averageAccuracy: number;
  totalScore: number;
  bestRank: number;
  liveRoomsPlayed: number;
}

export interface ClassroomClass {
  id: string;
  name: string;
  slug: string;
  description: string;
  subject: string;
  gradeLevel: string;
  coverAccent: string;
  ownerId: string;
  ownerName: string;
  organizationName: string;
  status: ClassStatus;
  visibility: ClassVisibility;
  inviteCode: string;
  memberCount: number;
  assignmentCount: number;
  roomCount: number;
  averageAccuracy: number;
  createdAt: string | null;
  updatedAt: string | null;
  archivedAt: string | null;
}

export interface ClassMember {
  id: string;
  classId: string;
  userId: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: ClassMemberRole;
  status: ClassMemberStatus;
  joinedAt: string | null;
  lastActiveAt: string | null;
  stats: ClassroomStats;
}

export interface ClassInvite {
  id: string;
  classId: string;
  inviteCode: string;
  createdBy: string;
  status: ClassInviteStatus;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Assignment {
  id: string;
  classId: string;
  className: string;
  quizId: string;
  quizSlug: string;
  quizTitle: string;
  categoryId: string;
  categoryName: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  status: AssignmentStatus;
  allowLateSubmission: boolean;
  attemptLimit: number;
  showResultsImmediately: boolean;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  classId: string;
  quizId: string;
  userId: string;
  userDisplayName: string;
  attemptId: string | null;
  status: AssignmentSubmissionStatus;
  score: number;
  totalPoints: number;
  accuracy: number;
  timeTakenSeconds: number;
  submittedAt: string | null;
  dueAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ClassLeaderboardRow {
  userId: string;
  displayName: string;
  photoURL: string | null;
  rank: number;
  completedAssignments: number;
  totalScore: number;
  averageAccuracy: number;
}

export interface ClassAnalyticsSnapshot {
  classId: string;
  totalStudents: number;
  activeStudents: number;
  activeAssignments: number;
  completionRate: number;
  averageAccuracy: number;
  recentSubmissions: AssignmentSubmission[];
  leaderboard: ClassLeaderboardRow[];
}

export interface QuestionQualityRow {
  question: Question;
  quizTitle: string;
  categoryName: string;
  difficulty: QuizDifficulty;
  timesAnswered: number;
  correctRate: number;
  wrongRate: number;
  skippedRate: number;
  averageTimeSeconds: number;
  reportCount: number;
  signals: string[];
  reviewNeeded: boolean;
}

export interface DataCleanupIssue {
  id: string;
  title: string;
  description: string;
  severity: CleanupIssueSeverity;
  targetType: string;
  targetId: string;
  targetHref: string;
  actionLabel: string;
}

export interface ScoreResult {
  answers: AttemptAnswer[];
  score: number;
  totalPoints: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalQuestions: number;
  accuracy: number;
}

export interface XPResult {
  xpEarned: number;
  nextTotalXp: number;
  nextLevel: number;
  levelBefore: number;
  levelAfter: number;
  xpToNextLevel: number;
  levelProgressPercent: number;
  breakdown: {
    completion: number;
    score: number;
    accuracy: number;
    speed: number;
    streak: number;
    personalBest: number;
  };
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string;
  alreadyPlayedToday: boolean;
  streakChanged: boolean;
}

export interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: string;
  unlockedAt: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: string;
}

export interface GamificationResult {
  xp: XPResult;
  streak: StreakResult;
  newlyEarnedBadges: EarnedBadge[];
  earnedBadges: EarnedBadge[];
}

export interface LeaderboardEntry {
  id: string;
  scope: LeaderboardScope;
  scopeId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  quizId: string;
  quizSlug: string;
  quizTitle: string;
  categoryId: string;
  categoryName: string;
  difficulty: QuizDifficulty;
  score: number;
  totalPoints: number;
  accuracy: number;
  timeTakenSeconds: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  attemptId: string;
  periodType: PeriodType;
  periodKey: string;
  rankScore: number;
  aggregateAttempts: number;
  hidden: boolean;
  hiddenReason: string;
  suspicious: boolean;
  reviewed: boolean;
  trusted: boolean;
  sourceAttemptId: string;
  scoringSource: ScoringSource;
  updatedBy: "client" | "server" | "admin";
  botEntry: boolean;
  reviewStatus: ReviewStatus;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  rank?: number;
}

export interface LeaderboardQuery {
  scope: LeaderboardScope;
  scopeId?: string;
  periodType: PeriodType;
  periodKey?: string;
  limit?: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  periodKey: string;
}

export type CategoryInput = Omit<Category, "id" | "createdAt" | "updatedAt" | "quizCount">;

export type QuizInput = Omit<
  Quiz,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "publishedAt"
  | "questionCount"
  | "totalPoints"
  | "playCount"
  | "averageScore"
>;

export type QuestionInput = Omit<Question, "id" | "createdAt" | "updatedAt">;

export interface QuizCardItem {
  id?: string;
  slug: string;
  title: string;
  description: string;
  shortDescription?: string;
  categoryName: string;
  categorySlug?: string;
  difficulty: QuizDifficulty;
  questionCount: number;
  estimatedMinutes: number;
  totalPoints?: number;
  timeLimitSeconds?: number;
  playCount: number;
  averageScore?: number;
  isFeatured?: boolean;
  isDailyChallenge?: boolean;
  tags?: string[];
  accent?: string;
}

export interface CategoryCardItem {
  id?: string;
  slug: string;
  name: string;
  description: string;
  quizCount: number;
  icon?: string;
  accent: string;
  featured?: boolean;
}

export interface SampleLeaderboardEntry {
  rank: number;
  name: string;
  category: string;
  score: number;
  accuracy: number;
  streak: number;
}

export interface DashboardMetric {
  label: string;
  value: string;
  helper: string;
}

export interface AdminMetric {
  label: string;
  value: string;
  helper: string;
}

export interface AdminCounts {
  totalQuizzes: number;
  publishedQuizzes: number;
  draftQuizzes: number;
  totalCategories: number;
  totalUsers: number;
  totalQuestions: number;
  featuredQuizzes: number;
  dailyChallengeQuizzes: number;
  totalAttempts: number;
  attemptsToday: number;
  averageAccuracy: number;
  totalRooms: number;
  activeRooms: number;
  completedRoomsToday: number;
  quickMatchesToday: number;
  pendingReports: number;
  pendingFeedback: number;
  activeQueues: number;
  totalClasses: number;
  activeClasses: number;
  approvedCreators: number;
}

export interface AdminAnalyticsSnapshot {
  counts: AdminCounts;
  recentAttempts: Attempt[];
  recentRooms: Room[];
  recentQueues: MatchmakingQueueEntry[];
  reports: Report[];
  feedback: Feedback[];
  dailyChallenge: DailyChallenge | null;
  contentIssues: DataCleanupIssue[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: UserRole;
  xp: number;
  level: number;
  totalQuizzesPlayed: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  streakUpdatedAt: string | null;
  earnedBadges: EarnedBadge[];
  lastBadgeUnlocks: EarnedBadge[];
  categoryIdsPlayed: string[];
  creatorStatus: CreatorStatus;
  teacherProfile: TeacherProfile;
  createdClassCount: number;
  joinedClassCount: number;
  creatorQuizCount: number;
  assignmentsCompleted: number;
  assignmentAverageAccuracy: number;
  bestClassRank: number;
  lastCreatorActivityAt: string | null;
  quickMatchesPlayed: number;
  quickMatchesWon: number;
  quickMatchBestRank: number;
  quickMatchAverageAccuracy: number;
  botMatchesPlayed: number;
  challengeMatchesPlayed: number;
  createdAt: string | null;
  updatedAt: string | null;
  lastActiveAt: string | null;
}
