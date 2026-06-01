import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks, Features, AgentsTeaser } from "@/components/landing/sections";
import { SampleReport, Pricing, CtaFooter } from "@/components/landing/showcase";

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <SampleReport />
      <AgentsTeaser />
      <Pricing />
      <CtaFooter />
    </main>
  );
}
