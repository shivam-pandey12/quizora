# Assignment Flow

## Teacher Flow

1. Open a class workspace.
2. Choose a published playable quiz.
3. Add title, instructions, due date, and result visibility.
4. Publish the assignment.

## Student Flow

1. Open `/classes`.
2. Open the assigned class.
3. Open an assignment.
4. Start the quiz through the existing play engine.
5. On submit, Quizora saves:
   - a normal attempt with `mode: "assignment"`;
   - `assignmentSubmissions/{assignmentId_userId}`;
   - a safe `classLeaderboardRows/{classId_userId}` summary.

## Result Visibility

If `showResultsImmediately` is false, students see a summary but not the detailed review link.

## Limitation

Attempt limits and late-submission enforcement are client-assisted in Phase 12. Server-authoritative enforcement is future work.
