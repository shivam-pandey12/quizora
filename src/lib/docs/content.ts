export type DocVisibility = "public" | "admin";

export interface DocLink {
  label: string;
  href: string;
}

export interface DocFaq {
  question: string;
  answer: string;
}

export interface DocSection {
  id: string;
  heading: string;
  body: string[];
  steps?: string[];
  tips?: string[];
  warnings?: string[];
  links?: DocLink[];
}

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  updatedAt: string;
  visibility: DocVisibility;
  keywords: string[];
  sections: DocSection[];
  faqs?: DocFaq[];
  relatedDocs: string[];
}

export const docsNavGroups = [
  {
    label: "Start Here",
    slugs: ["getting-started", "faq", "contact-support"]
  },
  {
    label: "Playing Quizzes",
    slugs: ["quizzes", "flash-quizzes", "scoring"]
  },
  {
    label: "Competing",
    slugs: ["leaderboards", "live-rooms", "matchmaking"]
  },
  {
    label: "Creator Tools",
    slugs: ["creator-guide"]
  },
  {
    label: "Classroom Tools",
    slugs: ["classroom"]
  },
  {
    label: "Billing",
    slugs: ["billing"]
  },
  {
    label: "Safety & Support",
    slugs: ["safety"]
  }
] as const;

export const docPages: DocPage[] = [
  {
    slug: "getting-started",
    title: "Getting started with Quizora",
    description:
      "Learn what Quizora is, how accounts work, how to browse quizzes, and how your progress is saved.",
    category: "Start Here",
    readingTime: "4 min read",
    updatedAt: "2026-05-25",
    visibility: "public",
    keywords: ["account", "dashboard", "start quiz", "browse", "progress"],
    relatedDocs: ["quizzes", "scoring", "faq"],
    sections: [
      {
        id: "what-is-quizora",
        heading: "What Quizora is",
        body: [
          "Quizora is a learning-first quiz platform for public quizzes, solo practice, live quiz rooms, quick matches, classrooms, and creator-led learning.",
          "You can browse published quizzes without turning the platform into a high-stakes contest. Quizora is designed for study, practice, classroom review, and friendly competition."
        ],
        links: [
          { label: "Browse quizzes", href: "/quizzes" },
          { label: "Explore categories", href: "/categories" }
        ]
      },
      {
        id: "create-account",
        heading: "Create your account",
        body: [
          "An account lets Quizora save your attempts, dashboard progress, result reviews, XP, streaks, badges, class memberships, and billing access if you upgrade later.",
          "If Firebase Auth is not configured in an environment, Quizora shows setup states instead of crashing."
        ],
        steps: [
          "Open the register page.",
          "Create an account using the enabled sign-in provider.",
          "Finish your first quiz so the dashboard has real progress to show."
        ],
        links: [{ label: "Create an account", href: "/register" }]
      },
      {
        id: "browse-and-play",
        heading: "Browse and play",
        body: [
          "Use the quiz library to search, filter by category, compare difficulty, and choose a quiz that matches your focus.",
          "When you start a quiz, Quizora opens the play engine, tracks your answers, and saves a result after submission."
        ],
        tips: [
          "Begin with an easy or medium quiz if you want a clean baseline.",
          "Use categories when you want subject practice instead of a mixed challenge."
        ],
        links: [
          { label: "Quiz library", href: "/quizzes" },
          { label: "Leaderboard", href: "/leaderboard" }
        ]
      },
      {
        id: "dashboard",
        heading: "Dashboard and profile",
        body: [
          "The dashboard summarizes recent attempts, XP, streaks, badges, and suggested next actions.",
          "Your profile is private to your signed-in account except for safe public surfaces such as leaderboard display names and avatars where applicable."
        ],
        links: [
          { label: "Open dashboard", href: "/dashboard" },
          { label: "View profile", href: "/profile" }
        ]
      }
    ]
  },
  {
    slug: "quizzes",
    title: "Quizzes, categories, and daily challenges",
    description:
      "Understand quiz listings, categories, difficulty, timers, question types, explanations, retries, and daily challenges.",
    category: "Playing Quizzes",
    readingTime: "5 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["quiz listing", "categories", "difficulty", "timed", "daily challenge"],
    relatedDocs: ["getting-started", "scoring", "creator-guide"],
    sections: [
      {
        id: "quiz-library",
        heading: "Quiz library",
        body: [
          "The quiz library shows published public quizzes only. Drafts, private class quizzes, and archived content do not appear in the public library.",
          "Quiz cards show subject, difficulty, estimated time, points, and key tags so you can decide what to play before starting."
        ],
        links: [{ label: "Open quiz library", href: "/quizzes" }]
      },
      {
        id: "categories",
        heading: "Categories and difficulty",
        body: [
          "Categories group quizzes by subject or learning lane, such as science, mathematics, reasoning, geography, technology, and mixed challenge.",
          "Difficulty helps set expectations. Easy quizzes focus on basics, medium quizzes mix recall with understanding, and hard or expert quizzes may require deeper reasoning."
        ],
        links: [{ label: "Browse categories", href: "/categories" }]
      },
      {
        id: "question-types",
        heading: "Question types and explanations",
        body: [
          "Most quizzes use single-choice questions. Some quizzes may include true-false or multiple-choice questions when the play engine supports them safely.",
          "Explanations are shown after a saved result so you can review what went right and what needs practice."
        ],
        tips: [
          "Read explanations even when you answer correctly. They often explain why the other options are not right.",
          "Report a question if it seems ambiguous, outdated, or incorrect."
        ]
      },
      {
        id: "daily-challenge",
        heading: "Daily challenge",
        body: [
          "Daily challenge content highlights one published public quiz for focused practice.",
          "Admins can update featured and daily content from the content controls. Only playable published quizzes should be selected."
        ],
        links: [{ label: "Start browsing", href: "/quizzes" }]
      }
    ]
  },
  {
    slug: "scoring",
    title: "Scoring, XP, streaks, and badges",
    description:
      "Learn how points, accuracy, time, XP, levels, streaks, badges, and trusted scoring work in Quizora.",
    category: "Playing Quizzes",
    readingTime: "5 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["score", "accuracy", "xp", "badges", "trusted scoring", "streak"],
    relatedDocs: ["quizzes", "leaderboards", "safety"],
    sections: [
      {
        id: "score-basics",
        heading: "Score basics",
        body: [
          "Each question has a point value. Your score is the total points earned from correct answers.",
          "Quizora also records correct, wrong, skipped, accuracy, and time taken so your result review is more useful than a single number."
        ]
      },
      {
        id: "xp-and-streaks",
        heading: "XP, levels, and streaks",
        body: [
          "XP and levels reward consistent practice. Streaks encourage returning to learning without promising outcomes or rankings that are not earned.",
          "Badges recognize milestones such as first completions, strong accuracy, category exploration, live room participation, and classroom progress."
        ],
        tips: [
          "Streaks are a motivation tool, not a measure of intelligence.",
          "Use result review to guide your next quiz instead of chasing XP alone."
        ]
      },
      {
        id: "trusted-scoring",
        heading: "Trusted scoring",
        body: [
          "New Quizora solo and assignment attempts use trusted scoring routes when server configuration is available.",
          "The play page receives safe question data. Correct answers are fetched and scored on the server after submission, then the result is saved."
        ],
        warnings: [
          "Trusted scoring improves score integrity, but it is not the same as webcam proctoring or a prize-grade competition system."
        ]
      },
      {
        id: "result-review",
        heading: "Result review",
        body: [
          "The result page shows your score, accuracy, time, answer review, and subtle trust status where available.",
          "Older attempts may show legacy scoring. They remain readable so your history is not lost."
        ]
      }
    ]
  },
  {
    slug: "flash-quizzes",
    title: "Flash Quizzes",
    description:
      "Create temporary code-based quizzes for friends, classes, events, and practice without entering the permanent public catalog.",
    category: "Playing Quizzes",
    readingTime: "5 min read",
    updatedAt: "2026-05-25",
    visibility: "public",
    keywords: ["flash quiz", "temporary quiz", "host dashboard", "quiz code", "self-paced"],
    relatedDocs: ["quizzes", "live-rooms", "creator-guide"],
    sections: [
      {
        id: "what-flash-quizzes-are",
        heading: "What Flash Quizzes are",
        body: [
          "Flash Quizzes are temporary Quizora quizzes created by signed-in users and shared through a Flash Code or link.",
          "They are useful for friends, classmates, live practice, small events, and quick revision. They are not permanent public quiz catalog pages."
        ],
        links: [{ label: "Open Flash Quizzes", href: "/flash" }]
      },
      {
        id: "catalog-separation",
        heading: "How they differ from public quizzes",
        body: [
          "Permanent public quizzes are created by admins or approved creators, reviewed for quality, and can appear in the public catalog and sitemap.",
          "Flash Quizzes are link-only, noindex, temporary, and do not appear in /quizzes, /categories, public search, sitemap, SEO metadata, permanent leaderboards, XP, streaks, badges, or saved public attempts."
        ],
        warnings: [
          "Do not use Flash Quizzes to publish spam, copied exam content, unsafe content, or public SEO pages."
        ]
      },
      {
        id: "modes",
        heading: "Live and self-paced modes",
        body: [
          "Live host mode lets a host start the quiz, advance questions, watch submitted counts, review answer distribution, and follow a live leaderboard.",
          "Self-paced mode lets players finish through the link before expiry. Results go to a temporary Flash leaderboard only."
        ],
        steps: [
          "Create a Flash Quiz while signed in.",
          "Add at least three original questions with correct answers and explanations.",
          "Share the Flash Code or link.",
          "Host live mode from the host dashboard or let players complete self-paced mode before expiry."
        ]
      },
      {
        id: "limits",
        heading: "Expiry and plan limits",
        body: [
          "Free users can create Flash Quizzes up to 7 hours, 10 questions, 10 players, and 2 active Flash Quizzes.",
          "Paid plans can raise expiry, question, player, export, extension, and convert-to-draft limits where those entitlements are active."
        ],
        tips: [
          "Use a shorter expiry for quick practice and a longer paid-plan expiry for classroom review windows.",
          "Flash Quizzes require login in this version for creation, joining, play, reports, exports, and conversion."
        ]
      },
      {
        id: "host-tools",
        heading: "Host dashboard",
        body: [
          "The host dashboard shows the Flash Code, expiry, player list, current question, timer context, submitted count, answer distribution, live fluctuating leaderboard, and final results.",
          "Premium host actions such as exports, expiry extension, and conversion to creator draft show upgrade cards when locked."
        ]
      },
      {
        id: "convert",
        heading: "Convert to creator draft",
        body: [
          "Creator and Classroom workflows can convert a temporary Flash Quiz into a private creator draft when the account has the required entitlement or creator access.",
          "Conversion copies quiz text and questions only. It does not copy players, answers, results, or publish the quiz publicly. Public publishing still requires admin review."
        ]
      }
    ]
  },
  {
    slug: "leaderboards",
    title: "Leaderboards and verified scores",
    description:
      "Understand global, quiz, and category leaderboards, tie-breakers, trusted rows, and moderation.",
    category: "Competing",
    readingTime: "4 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["leaderboard", "rank", "verified score", "hidden score", "moderation"],
    relatedDocs: ["scoring", "live-rooms", "safety"],
    sections: [
      {
        id: "leaderboard-types",
        heading: "Leaderboard types",
        body: [
          "Quizora can show global, quiz-specific, and category leaderboards across supported time windows.",
          "Leaderboards are meant for friendly comparison and motivation. They do not represent prize eligibility or cash winnings."
        ],
        links: [{ label: "Open leaderboard", href: "/leaderboard" }]
      },
      {
        id: "tie-breakers",
        heading: "Tie-breakers",
        body: [
          "Ranking can consider score, total points, accuracy, and time. A higher score usually matters first, with speed and accuracy helping separate close results.",
          "Exact ranking behavior can evolve as Quizora hardens server authority and moderation tools."
        ]
      },
      {
        id: "verified-scores",
        heading: "Verified scores",
        body: [
          "New trusted attempts can produce leaderboard rows marked as trusted. Public leaderboards prefer trusted, non-hidden, real-user rows.",
          "Bot entries and suspicious or hidden rows should not appear as normal public competition results."
        ]
      },
      {
        id: "hidden-review",
        heading: "Why a score may be hidden",
        body: [
          "Admins may hide or review leaderboard rows that appear broken, duplicated, suspicious, or attached to legacy client-scored data.",
          "Quizora should avoid public accusations. Review labels are used to keep rankings fair and clean."
        ]
      }
    ]
  },
  {
    slug: "live-rooms",
    title: "Live quiz rooms",
    description:
      "Create rooms, join by code, manage host controls, play synced questions, and review the final podium.",
    category: "Live Rooms",
    readingTime: "5 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["live room", "room code", "host", "podium", "room history"],
    relatedDocs: ["matchmaking", "leaderboards", "safety"],
    sections: [
      {
        id: "create-room",
        heading: "Create a room",
        body: [
          "A host can create a live room from a published quiz. Room settings control visibility, player limits, timer behavior, late joins, and bot fill where available.",
          "Public rooms can appear in discovery. Private rooms are shared by code or invite link."
        ],
        links: [{ label: "Create a room", href: "/rooms/create" }]
      },
      {
        id: "join-room",
        heading: "Join by code",
        body: [
          "Players can join a live room with a room code. Signed-in profiles are used for display name, avatar, and saved room history.",
          "Class-only rooms require membership in the linked class."
        ],
        links: [{ label: "Join a room", href: "/rooms/join" }]
      },
      {
        id: "host-controls",
        heading: "Host controls and ready system",
        body: [
          "The host starts the room, advances questions, manages lobby readiness, and can control finalization paths where supported.",
          "Quizora keeps the Firestore real-time room UX while moving sensitive answer scoring through trusted server routes where practical."
        ]
      },
      {
        id: "podium-history",
        heading: "Final podium and room history",
        body: [
          "At the end of a room, players see a podium and result summary. Room history lets signed-in users revisit completed multiplayer sessions.",
          "Bot results are marked and should not count as real-user public leaderboard performance."
        ],
        links: [{ label: "Room history", href: "/rooms/history" }]
      }
    ]
  },
  {
    slug: "matchmaking",
    title: "Matchmaking, bots, and challenge links",
    description:
      "Use Quick Match, public matchmaking, bot fill, and challenge links for casual live competition.",
    category: "Competing",
    readingTime: "4 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["matchmaking", "quick match", "bot fill", "challenge link", "queue"],
    relatedDocs: ["live-rooms", "leaderboards", "safety"],
    sections: [
      {
        id: "quick-match",
        heading: "Quick Match",
        body: [
          "Quick Match helps you find or create a casual room based on available matchmaking settings.",
          "It is designed for friendly play and fast practice, not prize competitions."
        ],
        links: [{ label: "Open matchmaking", href: "/matchmaking" }]
      },
      {
        id: "bot-fill",
        heading: "Bot fill",
        body: [
          "Bot fill can keep a room moving when there are not enough real players. Bots should be clearly marked in room results.",
          "Bot entries do not represent real users and should not appear as real-user leaderboard rows."
        ]
      },
      {
        id: "challenge-links",
        heading: "Challenge links",
        body: [
          "Challenge links let a player invite someone into a specific room flow.",
          "Challenge links require sign-in so Quizora can use real profile identity and avoid anonymous score confusion."
        ]
      },
      {
        id: "casual-note",
        heading: "Casual matchmaking note",
        body: [
          "Matchmaking is useful for discovery and practice. Queue timing and room orchestration are still designed for small to medium casual use.",
          "If live rooms grow into high-scale events, a dedicated server room engine would be the next architecture step."
        ]
      }
    ]
  },
  {
    slug: "creator-guide",
    title: "Creator guide",
    description:
      "Learn creator access, draft quiz creation, question quality, review flow, private quizzes, and public publishing.",
    category: "Creator Tools",
    readingTime: "6 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["creator", "teacher", "quiz draft", "review", "publish", "content quality"],
    relatedDocs: ["classroom", "quizzes", "safety"],
    sections: [
      {
        id: "who-can-create",
        heading: "Who can create quizzes",
        body: [
          "Normal users can play quizzes, join rooms, track progress, and report issues.",
          "Approved creators and teachers can create quiz drafts, add questions, preview content, use private or class-only quizzes, and submit public content for review."
        ],
        links: [
          { label: "Request creator access", href: "/creator/request-access" },
          { label: "Open creator quizzes", href: "/creator/quizzes" }
        ]
      },
      {
        id: "draft-workflow",
        heading: "Draft to published workflow",
        body: [
          "Creator quiz publishing follows a controlled flow: Draft, Submitted for Review, Approved, Published.",
          "Admins review submitted quizzes before global public publishing. This keeps the public library safer, cleaner, and more useful for students."
        ],
        steps: [
          "Create a creator quiz draft.",
          "Add clear questions, plausible options, correct answers, and short explanations.",
          "Preview the quiz from Creator Studio without creating real attempts.",
          "Submit it for admin review when it is ready.",
          "Admin approves and publishes safe public quizzes, or rejects with a note so the creator can edit and resubmit."
        ],
        links: [{ label: "Create a quiz draft", href: "/creator/quizzes/new" }]
      },
      {
        id: "why-review",
        heading: "Why direct public publishing is restricted",
        body: [
          "Review is not meant to slow creators down. It protects quality, prevents spam, reduces wrong-answer risk, avoids copyrighted material, protects student safety, and keeps SEO pages trustworthy.",
          "Private and class-only drafts can support teaching workflows without immediately entering the public quiz library."
        ],
        warnings: [
          "Do not copy questions from books, paid courses, exam papers, websites, or coaching material unless you have the rights to use them."
        ]
      },
      {
        id: "creator-dashboard",
        heading: "Creator Studio routes",
        body: [
          "Approved creators manage drafts from My quiz drafts, edit quiz metadata, add questions, preview answers and explanations, and submit only public-review quizzes for admin approval.",
          "Draft, submitted, rejected, private, class-only, and approved statuses are shown in the creator dashboard so creators know exactly what can be edited."
        ],
        links: [
          { label: "My creator quizzes", href: "/creator/quizzes" },
          { label: "Request access", href: "/creator/request-access" }
        ]
      },
      {
        id: "quality-rules",
        heading: "Content quality rules",
        body: [
          "Good Quizora questions are original, clear, student-safe, stable over time, and backed by a short explanation.",
          "Avoid ambiguous phrasing, current facts that may change soon, adult content, copied exam material, and options that make a question unfair."
        ],
        links: [{ label: "Contact support about content", href: "/contact" }]
      }
    ]
  },
  {
    slug: "classroom",
    title: "Classroom guide for teachers and students",
    description:
      "Create classes, invite students, assign quizzes, review submissions, run class rooms, and protect classroom data.",
    category: "Classroom Tools",
    readingTime: "6 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["classroom", "teacher", "student", "assignments", "class leaderboard", "invite code"],
    relatedDocs: ["creator-guide", "scoring", "safety"],
    sections: [
      {
        id: "teacher-dashboard",
        heading: "Teacher dashboard",
        body: [
          "Approved teachers and creators can open the creator workspace to manage private classroom groups, assignments, members, analytics, and class-only rooms.",
          "Classroom tools are private and require sign-in."
        ],
        links: [{ label: "Open creator workspace", href: "/creator" }]
      },
      {
        id: "classes-invites",
        heading: "Classes and invite codes",
        body: [
          "Teachers create invite-only classes. Students join with a class code or invite link after signing in.",
          "Class membership controls access to class dashboards, assignments, and class-only live rooms."
        ],
        steps: [
          "Teacher creates a class.",
          "Teacher shares the invite code or link.",
          "Student opens the join page and enters the code.",
          "Quizora creates a class membership record for that student."
        ],
        links: [{ label: "Join a class", href: "/classes/join" }]
      },
      {
        id: "assignments",
        heading: "Assignments and submissions",
        body: [
          "Teachers can assign published or class-use quizzes to a class. Students see assignment status, due information, and result visibility based on the assignment settings.",
          "Assignment attempts use the same trusted scoring foundation where configured, then save a submission for teacher review."
        ]
      },
      {
        id: "class-leaderboards",
        heading: "Class leaderboards, rooms, and exports",
        body: [
          "Class leaderboards are scoped to a private class and should not expose detailed student submissions to other students.",
          "Teachers can create class-only live rooms and export class results where the feature is enabled."
        ],
        warnings: [
          "Classroom data is private. Do not share invite codes publicly unless the class is meant for a broad group."
        ]
      }
    ]
  },
  {
    slug: "billing",
    title: "Billing, plans, and Razorpay payments",
    description:
      "Understand Free, Plus, Creator, and Classroom plans, Razorpay checkout, entitlements, billing history, and refund support.",
    category: "Billing",
    readingTime: "5 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["pricing", "billing", "Razorpay", "payment", "entitlement", "refund"],
    relatedDocs: ["faq", "contact-support", "safety"],
    sections: [
      {
        id: "plans",
        heading: "Plans",
        body: [
          "Quizora keeps core browsing and basic play useful on the Free plan. Paid plans add larger limits, premium analytics, creator tools, classroom scale, exports, and live-room upgrades.",
          "Plans are digital access passes for app features. They do not include cash prizes, wallets, payouts, betting, or gambling-like mechanics."
        ],
        links: [{ label: "View pricing", href: "/pricing" }]
      },
      {
        id: "checkout",
        heading: "Razorpay checkout",
        body: [
          "Paid checkout uses Razorpay. Quizora creates orders on the server, verifies payment signatures on the server, and reconciles final status with webhooks.",
          "The checkout success screen is helpful, but billing history and entitlement status are the source of truth inside your account."
        ]
      },
      {
        id: "entitlements",
        heading: "Entitlements and billing history",
        body: [
          "An entitlement is the access record that unlocks a plan for your account while it is active.",
          "Your billing page shows current access, expiry, payment history, pending confirmation states, and support links."
        ],
        links: [{ label: "Open billing", href: "/billing" }]
      },
      {
        id: "refunds",
        heading: "Refund and cancellation support",
        body: [
          "Refund and cancellation support depends on the payment status, plan type, support review, and final policy review before live scale.",
          "Contact support with your Quizora account email and Razorpay payment ID if you need billing help."
        ],
        links: [
          { label: "Refund notes", href: "/refund" },
          { label: "Contact support", href: "/contact" }
        ]
      }
    ]
  },
  {
    slug: "safety",
    title: "Safety, fair play, and privacy",
    description:
      "Learn fair play expectations, trusted scoring basics, content safety, classroom privacy, reports, and moderation.",
    category: "Safety & Support",
    readingTime: "5 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["safety", "fair play", "privacy", "report", "trusted scoring", "copyright"],
    relatedDocs: ["scoring", "leaderboards", "contact-support"],
    sections: [
      {
        id: "fair-play",
        heading: "Fair play",
        body: [
          "Use Quizora to learn, practice, and compete respectfully. Do not cheat, spam rooms, impersonate others, or try to manipulate score or leaderboard systems.",
          "Trusted scoring and moderation tools help protect the experience, but Quizora does not publicly accuse users."
        ]
      },
      {
        id: "content-safety",
        heading: "Content safety",
        body: [
          "Creators should write original, student-safe questions. Do not upload copyrighted exam material, copied book questions, adult content, hate content, or unsafe prompts.",
          "Report wrong or questionable content so admins can review it."
        ],
        links: [{ label: "Contact support", href: "/contact" }]
      },
      {
        id: "privacy",
        heading: "Privacy basics",
        body: [
          "Private attempts, billing records, classroom membership, and assignment submissions are protected account data.",
          "Public surfaces such as published quizzes, active categories, and safe leaderboard rows may be visible to other users."
        ],
        links: [
          { label: "Privacy notes", href: "/privacy" },
          { label: "Terms", href: "/terms" }
        ]
      },
      {
        id: "admin-review",
        heading: "Admin review",
        body: [
          "Admins can review suspicious attempts, hidden leaderboard rows, reports, feedback, creator submissions, and billing support records.",
          "Moderation exists to keep Quizora useful and safe, not to shame normal users."
        ]
      }
    ]
  },
  {
    slug: "faq",
    title: "Frequently asked questions",
    description:
      "Answers to common questions about accounts, quizzes, live rooms, creators, classrooms, billing, privacy, and support.",
    category: "Start Here",
    readingTime: "7 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["faq", "help", "questions", "support"],
    relatedDocs: ["getting-started", "billing", "contact-support"],
    sections: [
      {
        id: "faq-list",
        heading: "Common questions",
        body: [
          "These answers cover the most common Quizora workflows. If something still feels unclear, contact support with the page URL and a short description."
        ]
      }
    ],
    faqs: [
      {
        question: "Is Quizora free?",
        answer: "Yes. The Free plan supports useful browsing and basic play. Paid plans unlock higher limits and premium workflows."
      },
      {
        question: "Do I need an account to play?",
        answer: "You need an account for saved attempts, dashboard progress, rooms, classrooms, billing, and private results."
      },
      {
        question: "Can I create quizzes?",
        answer: "Yes. Any signed-in user can create temporary Flash Quizzes by code or link. Permanent public quizzes still require approved creator or admin review."
      },
      {
        question: "Why can creators not publish directly?",
        answer: "Review protects quality, prevents spam, reduces wrong-answer risk, avoids copyright issues, and keeps student-facing content safe."
      },
      {
        question: "How do live rooms work?",
        answer: "A host creates a room from a published quiz, shares a code, starts the lobby, advances questions, and players see a final podium."
      },
      {
        question: "What are bots?",
        answer: "Bots are clearly marked computer players used for casual room fill. They should not appear as real-user leaderboard entries."
      },
      {
        question: "What is trusted scoring?",
        answer: "Trusted scoring sends safe questions to the client and calculates the score on the server after submission."
      },
      {
        question: "Why was my payment pending?",
        answer: "Checkout confirmation can take a moment while server verification and Razorpay webhooks reconcile payment status."
      },
      {
        question: "Can teachers use Quizora?",
        answer: "Yes. Approved teachers can create classes, invite students, assign quizzes, review submissions, and run private class rooms."
      },
      {
        question: "Can students join by code?",
        answer: "Yes. Students can join private classes with an invite code or link after signing in."
      },
      {
        question: "Are results private?",
        answer: "Your detailed attempts are private to you and admins. Safe leaderboard summaries may be public when eligible."
      },
      {
        question: "Why was a leaderboard score hidden?",
        answer: "A score may be hidden if it is suspicious, duplicated, legacy, bot-related, or under admin review."
      },
      {
        question: "Can I report a wrong question?",
        answer: "Yes. Use the contact/support flow or available report controls with the quiz name and question context."
      },
      {
        question: "Does Quizora include cash prizes?",
        answer: "No. Quizora has no wallets, payouts, betting, prize pools, or gambling-like mechanics."
      },
      {
        question: "Can I use copied exam questions?",
        answer: "No. Create original questions or use only content you have the rights to publish."
      },
      {
        question: "How do I contact support?",
        answer: "Open the contact page and include your account email, page URL, and a short description of the issue."
      },
      {
        question: "Can I retry a quiz?",
        answer: "Yes, when the quiz remains published and available. Your history can keep multiple attempts."
      },
      {
        question: "Where do I see billing history?",
        answer: "Open the Billing page while signed in to see plan access, expiry, and safe payment summaries."
      }
    ]
  },
  {
    slug: "contact-support",
    title: "Contact support",
    description:
      "Learn what to include when reporting bugs, wrong questions, billing issues, classroom problems, or safety concerns.",
    category: "Safety & Support",
    readingTime: "3 min read",
    updatedAt: "2026-05-24",
    visibility: "public",
    keywords: ["support", "contact", "bug", "billing support", "wrong question"],
    relatedDocs: ["faq", "safety", "billing"],
    sections: [
      {
        id: "where-to-go",
        heading: "Where to get help",
        body: [
          "Use the contact page for product questions, bug reports, wrong-question reports, billing support, classroom issues, and safety concerns.",
          "If your issue is about billing, include your Quizora account email and Razorpay payment ID if you have it."
        ],
        links: [{ label: "Open contact page", href: "/contact" }]
      },
      {
        id: "what-to-include",
        heading: "What to include",
        body: [
          "A useful support message includes the page URL, what you expected, what happened, and any safe context such as quiz title, room code, assignment title, or payment reference.",
          "Do not send passwords, private keys, full card details, or sensitive student information."
        ],
        steps: [
          "Choose the closest issue type.",
          "Write a short summary.",
          "Include the route or page where it happened.",
          "Submit the message while signed in when possible."
        ]
      },
      {
        id: "support-areas",
        heading: "Support areas",
        body: [
          "Quizora support can triage bugs, content concerns, account access issues, billing questions, classroom problems, and safety reports.",
          "Response timing may depend on launch stage, severity, and available support capacity."
        ]
      }
    ]
  }
];

export const publicDocPages = docPages.filter((page) => page.visibility === "public");

export const docPageSlugs = publicDocPages.map((page) => page.slug);

export function getDocBySlug(slug: string) {
  return publicDocPages.find((page) => page.slug === slug) ?? null;
}

export function getDocsByCategory(category: string) {
  return publicDocPages.filter((page) => page.category === category);
}

export function getRelatedDocs(page: DocPage) {
  return page.relatedDocs
    .map((slug) => getDocBySlug(slug))
    .filter((item): item is DocPage => Boolean(item));
}

export function getAdjacentDocs(page: DocPage) {
  const index = publicDocPages.findIndex((item) => item.slug === page.slug);
  return {
    previous: index > 0 ? publicDocPages[index - 1] : null,
    next: index >= 0 && index < publicDocPages.length - 1 ? publicDocPages[index + 1] : null
  };
}
