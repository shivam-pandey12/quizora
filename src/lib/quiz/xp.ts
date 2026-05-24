import type { PersonalBestStatus, XPResult } from "@/types/domain";

const LEVEL_SIZE = 500;

export function calculateLevelFromXP(xp: number) {
  return Math.floor(Math.max(0, xp) / 500) + 1;
}

export const levelFromXp = calculateLevelFromXP;

export function getNextLevelXP(level: number) {
  return Math.max(1, level) * LEVEL_SIZE;
}

export function getLevelProgress(xp: number) {
  const safeXp = Math.max(0, xp);
  const currentLevel = calculateLevelFromXP(safeXp);
  const currentLevelBase = (currentLevel - 1) * LEVEL_SIZE;
  const nextLevelXp = getNextLevelXP(currentLevel);
  const progressXp = safeXp - currentLevelBase;
  const neededXp = nextLevelXp - currentLevelBase;

  return {
    currentLevel,
    nextLevelXp,
    xpIntoLevel: progressXp,
    xpToNextLevel: Math.max(0, nextLevelXp - safeXp),
    levelProgressPercent: neededXp ? Math.round((progressXp / neededXp) * 100) : 100
  };
}

export function calculateXPForAttempt({
  score,
  accuracy,
  currentXp,
  timeTakenSeconds = 0,
  totalQuestions = 0,
  streakAfter = 0,
  personalBestStatus = "matched"
}: {
  score: number;
  accuracy: number;
  currentXp: number;
  timeTakenSeconds?: number;
  totalQuestions?: number;
  streakAfter?: number;
  personalBestStatus?: PersonalBestStatus;
}): XPResult {
  const levelBefore = calculateLevelFromXP(currentXp);
  const completionBonus = 25;
  const scoreXp = Math.max(0, Math.round(score));
  const accuracyBonus = accuracy >= 95 ? 45 : accuracy >= 80 ? 25 : accuracy >= 60 ? 10 : 0;
  const speedTarget = totalQuestions ? totalQuestions * 30 : 0;
  const speedBonus =
    speedTarget > 0 && timeTakenSeconds > 0 && timeTakenSeconds <= speedTarget && accuracy >= 70
      ? 15
      : 0;
  const streakBonus = streakAfter >= 7 ? 25 : streakAfter >= 3 ? 15 : streakAfter >= 2 ? 8 : 0;
  const personalBestBonus = personalBestStatus === "new-best" ? 20 : personalBestStatus === "first" ? 10 : 0;
  const xpEarned = Math.max(
    0,
    Math.round(scoreXp + completionBonus + accuracyBonus + speedBonus + streakBonus + personalBestBonus)
  );
  const nextTotalXp = Math.max(0, currentXp) + xpEarned;
  const progress = getLevelProgress(nextTotalXp);

  return {
    xpEarned,
    nextTotalXp,
    nextLevel: progress.currentLevel,
    levelBefore,
    levelAfter: progress.currentLevel,
    xpToNextLevel: progress.xpToNextLevel,
    levelProgressPercent: progress.levelProgressPercent,
    breakdown: {
      completion: completionBonus,
      score: scoreXp,
      accuracy: accuracyBonus,
      speed: speedBonus,
      streak: streakBonus,
      personalBest: personalBestBonus
    }
  };
}

export function calculateXp(input: {
  score: number;
  accuracy: number;
  currentXp: number;
}) {
  return calculateXPForAttempt(input);
}
