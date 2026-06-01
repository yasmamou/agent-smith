import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { runAudit } from "../src/lib/audit/engine";
import { AGENT_PROFILES } from "../src/lib/agents/profiles";

// Seed uses fake demo URLs — always use the deterministic mock engine.
process.env.AUDIT_ENGINE = "mock";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@agentsmith.dev";
const DEMO_PASSWORD = "demo1234";

async function main() {
  console.log("🌱 Seeding Agent Smith…");

  // Demo user
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo Founder", passwordHash, plan: "pro" },
  });
  console.log(`  ✔ user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  // Agent profiles
  for (const a of AGENT_PROFILES) {
    await prisma.agentProfile.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        tagline: a.tagline,
        specialty: a.specialty,
        testingStyle: a.testingStyle,
        price: a.price,
        priceNote: a.priceNote,
        rating: a.rating,
        reviews: a.reviews,
        accent: a.accent,
        avatar: a.avatar,
        premium: a.premium,
        focus: JSON.stringify(a.focus),
      },
      create: {
        slug: a.slug,
        name: a.name,
        tagline: a.tagline,
        specialty: a.specialty,
        testingStyle: a.testingStyle,
        price: a.price,
        priceNote: a.priceNote,
        rating: a.rating,
        reviews: a.reviews,
        accent: a.accent,
        avatar: a.avatar,
        premium: a.premium,
        focus: JSON.stringify(a.focus),
      },
    });
  }
  console.log(`  ✔ ${AGENT_PROFILES.length} agent profiles`);

  // Demo audits (mock engine — deterministic)
  const samples = [
    { url: "https://my-saas-app.vercel.app", mode: "standard" as const },
    { url: "https://acme-dashboard.lovable.app", mode: "deep" as const },
  ];

  // wipe previous demo audits so re-seeding is idempotent
  await prisma.audit.deleteMany({ where: { userId: user.id } });

  for (const s of samples) {
    const config = {
      targetUrl: s.url,
      mode: s.mode,
      agentsCount: 5,
      durationMinutes: 15,
    };
    const report = await runAudit(config);
    const audit = await prisma.audit.create({
      data: {
        userId: user.id,
        targetUrl: s.url,
        mode: s.mode,
        agentsCount: 5,
        durationMin: 15,
        status: "completed",
        engine: report.engine,
        scores: JSON.stringify(report.scores),
        pagesVisited: JSON.stringify(report.pagesVisited),
        timeline: JSON.stringify(report.timeline),
        uxSuggestions: JSON.stringify(report.uxSuggestions),
        summary: report.summary,
        reportMarkdown: report.reportMarkdown,
        fixPrompt: report.fixPrompt,
        startedAt: new Date(),
        completedAt: new Date(),
        findings: {
          create: report.findings.map((f) => ({
            title: f.title,
            severity: f.severity,
            category: f.category,
            description: f.description,
            evidence: f.evidence,
            reproductionSteps: JSON.stringify(f.reproductionSteps),
            probableCause: f.probableCause,
            recommendedFix: f.recommendedFix,
            fixPromptBlock: f.fixPromptBlock,
            agent: f.agent,
          })),
        },
        screenshots: {
          create: report.screenshots.map((sc) => ({
            label: sc.label,
            page: sc.page,
            src: sc.src,
            caption: sc.caption || null,
          })),
        },
      },
    });
    console.log(`  ✔ demo audit ${audit.id} → ${s.url} (${report.scores.overall}/100)`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
