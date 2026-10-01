import type { projectType } from "../projects/types/project";

// Seed data for the guest sandbox. Ids are namespaced far above the real database's
// range so a demo id can never be confused with a real project id.
//
// `completion` and feature `status` are deliberately left as seeded values rather
// than computed here: `deriveProject` recomputes both from the task rows on every
// read, exactly as it does for real API responses, so the fixture only needs to get
// the task statuses right. Demo data is a constant shape, so the ids are literals
// rather than generated.

function feature(id: number, title: string, tasks: [string, boolean][]) {
  return {
    id,
    title,
    status: false,
    tasks: tasks.map(([taskTitle, status], index) => ({
      id: id * 1000 + index,
      title: taskTitle,
      status,
    })),
  };
}

export function createDemoProjects(): projectType[] {
  return [
    {
      id: 900001,
      name: "Neon Storefront",
      domain: "storefront.dev",
      summary:
        "A headless storefront for a small electronics brand. Product catalogue with variant-aware pricing, a cart that survives a refresh, and a Stripe checkout that reserves stock before taking payment.",
      techStack: [
        { id: 900101, name: "Next.js", project_id: 900001 },
        { id: 900102, name: "PostgreSQL", project_id: 900001 },
        { id: 900103, name: "Stripe", project_id: 900001 },
        { id: 900104, name: "Tailwind CSS", project_id: 900001 },
      ],
      completion: 0,
      features: [
        feature(9101, "Product catalogue", [
          ["Model product and variant schema", true],
          ["Paginated catalogue grid", true],
          ["Variant picker with price deltas", true],
          ["Out-of-stock badge on sold-out variants", true],
        ]),
        feature(9102, "Cart", [
          ["Persist cart to localStorage", true],
          ["Add, update and remove line items", true],
          ["Show cart subtotal in the navbar", true],
          ["Merge cart on sign-in", false],
        ]),
        feature(9103, "Checkout", [
          ["Reserve stock before taking payment", false],
          ["Stripe PaymentIntent integration", false],
          ["Order confirmation page", false],
        ]),
        feature(9104, "Admin", [
          ["CSV import for the catalogue", false],
          ["Bulk price adjustment", false],
          ["Refund from the order detail page", false],
        ]),
      ],
    },
    {
      id: 900002,
      name: "Habit Tracker",
      domain: "streakly.app",
      summary:
        "A habit tracker built around streaks rather than guilt. Daily check-ins, a forgiving streak model that lets you freeze one day a week, and weekly reports you can actually read.",
      techStack: [
        { id: 900201, name: "React", project_id: 900002 },
        { id: 900202, name: "tRPC", project_id: 900002 },
        { id: 900203, name: "Drizzle", project_id: 900002 },
      ],
      completion: 0,
      features: [
        feature(9201, "Check-ins", [
          ["Create a habit with a colour and icon", true],
          ["Toggle today's check-in", true],
          ["Edit or archive an existing habit", true],
        ]),
        feature(9202, "Streaks", [
          ["Current and longest streak counters", true],
          ["Weekly freeze tokens", false],
          ["Streak recovery after a missed week", false],
        ]),
        feature(9203, "Reports", [
          ["Weekly completion rate chart", false],
          ["Export a habit as CSV", false],
        ]),
      ],
    },
    {
      id: 900003,
      name: "Podcast Dashboard",
      domain: "podlane.fm",
      summary:
        "An internal dashboard for a podcast network. Episode pipeline from recording to published, sponsor read tracking per episode, and download analytics rolled up per show.",
      techStack: [
        { id: 900301, name: "React", project_id: 900003 },
        { id: 900302, name: "Express", project_id: 900003 },
        { id: 900303, name: "PostgreSQL", project_id: 900003 },
        { id: 900304, name: "Chart.js", project_id: 900003 },
        { id: 900305, name: "AWS S3", project_id: 900003 },
      ],
      completion: 0,
      features: [
        feature(9301, "Episode pipeline", [
          ["Kanban board of episodes by stage", true],
          ["Drag an episode to advance its stage", true],
          ["Upload audio to S3 and store the key", true],
          ["Schedule publishing with a queue worker", false],
        ]),
        feature(9302, "Sponsor reads", [
          ["Attach sponsors to an episode", true],
          ["Mark a read as recorded", false],
          ["Per-episode sponsor revenue rollup", false],
        ]),
        feature(9303, "Analytics", [
          ["Downloads per episode", true],
          ["Retention curve at 25/50/75 percent", false],
          ["Compare episodes within a show", false],
        ]),
      ],
    },
    {
      id: 900004,
      name: "AI Resume Builder",
      domain: "roleloop.ai",
      summary:
        "A resume builder that turns a job description into a tailored draft. Bullet points get rewritten for keyword coverage, every change is diffable against the original, and nothing is sent anywhere without an explicit click.",
      techStack: [
        { id: 900401, name: "Vite", project_id: 900004 },
        { id: 900402, name: "Neon", project_id: 900004 },
        { id: 900403, name: "Claude API", project_id: 900004 },
      ],
      completion: 0,
      features: [
        feature(9401, "Editor", [
          ["Multi-section resume editor", true],
          ["Autosave with a visible saved state", true],
          ["Import an existing resume from a PDF", false],
        ]),
        feature(9402, "Tailoring", [
          ["Paste a job description to target", false],
          ["Keyword coverage report", false],
          ["Rewrite a bullet and diff the result", false],
        ]),
        feature(9403, "Export", [
          ["Export to PDF with a print stylesheet", false],
          ["Plain text export for ATS forms", false],
        ]),
      ],
    },
  ];
}