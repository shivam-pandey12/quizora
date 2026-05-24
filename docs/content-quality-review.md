# Content Quality Review

The Phase 11 question quality manager uses bounded samples from questions, recent attempts, and reports.

Signals include:

- Missing explanation.
- Too few options for non-text questions.
- Hidden status.
- Low sampled correct rate.
- High sampled skipped rate.
- User reports.

These metrics are directional, not full analytics. Long-term question analytics should move to scheduled aggregate documents such as `questionStats/{questionId}`.

Admins can jump to quiz question editing and hide/unhide questions from the quality page.
