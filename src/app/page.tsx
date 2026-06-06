import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks, Features, AgentsTeaser } from "@/components/landing/sections";
import { SampleReport, Pricing, CtaFooter } from "@/components/landing/showcase";
import { detectLocale, getDictionary } from "@/lib/i18n";

export default async function LandingPage() {
  const locale = await detectLocale();
  const t = getDictionary(locale);

  return (
    <main>
      <Navbar t={t} locale={locale} />
      <Hero t={t} />
      <HowItWorks t={t} />
      <Features t={t} />
      <SampleReport t={t} />
      <AgentsTeaser t={t} />
      <Pricing t={t} />
      <CtaFooter t={t} />
    </main>
  );
}
