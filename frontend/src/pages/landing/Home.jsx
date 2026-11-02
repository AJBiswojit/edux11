import { Hero } from '@/components/landing/hero'
import { LogoCloud } from '@/components/landing/logo-cloud'
import { Features } from '@/components/landing/features'
import { ProductDemo } from '@/components/landing/product-demo'
import { AIOverview } from '@/components/landing/ai-overview'
import { Journeys } from '@/components/landing/journeys'
import { AnalyticsSection } from '@/components/landing/analytics-section'
import { Metrics, AIFeatures } from '@/components/landing/metrics'
import { Testimonials, CaseStudies } from '@/components/landing/social-proof'
import { Pricing } from '@/components/landing/pricing'
import { FAQ, BlogPreview, Newsletter } from '@/components/landing/faq-blog'

function Home() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <Features />
      <ProductDemo />
      <AIOverview />
      <Journeys />
      <AnalyticsSection />
      <AIFeatures />
      <Metrics />
      <CaseStudies />
      <Testimonials />
      <Pricing />
      <FAQ />
      <BlogPreview />
      <Newsletter />
    </>
  )
}

export { Home }
export default Home
