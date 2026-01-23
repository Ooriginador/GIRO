import { CTASection } from "@/components/sections/CTASection";
import { FAQSection } from "@/components/sections/FAQSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { Footer } from "@/components/sections/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { MobileSection } from "@/components/sections/MobileSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { ShowcaseSection } from "@/components/sections/ShowcaseSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { Navbar } from "@/components/Navbar";
import { getLatestRelease, getLatestMobileRelease } from "@/lib/github";

export default async function Home() {
  const latestRelease = await getLatestRelease();
  const latestMobileRelease = await getLatestMobileRelease();

  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection latestRelease={latestRelease} />
      <FeaturesSection />
      <ShowcaseSection />
      <MobileSection latestMobileRelease={latestMobileRelease} />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection latestRelease={latestRelease} />
      <Footer />
    </main>
  );
}
