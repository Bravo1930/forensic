import { motion } from 'framer-motion';
import { GlassCard } from '@/components/MotionComponents/GlassCard';
import { FloatingButton } from '@/components/MotionComponents/FloatingButton';
import { StaggerContainer } from '@/components/MotionComponents/StaggerContainer';
import { HeadMeta } from '@/components/SEO/HeadMeta';
import { Link } from 'wouter';

const features = [
  {
    title: 'AI-Powered Analysis',
    description: 'Advanced algorithms for forensic evidence examination',
    icon: '🔬',
  },
  {
    title: 'Secure Evidence Management',
    description: 'GDPR-compliant digital evidence handling',
    icon: '🔐',
  },
  {
    title: 'Real-Time Collaboration',
    description: 'Team-based case investigation and analysis',
    icon: '👥',
  },
];

export default function Home() {
  return (
    <>
      <HeadMeta
        title="Digital Forensics Platform"
        description="AI-powered digital forensics and evidence analysis platform for legal professionals. Secure, GDPR-compliant case management."
        keywords={[
          'forensic analysis',
          'digital evidence',
          'legal tech',
          'case management',
          'AI analysis',
        ]}
        canonical="https://forensic-analyzer.com"
      />

      <div className="min-h-screen bg-gradient-to-br from-[#0F2942] via-[#0A1118] to-[#0F2942]">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-32 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="text-5xl font-bold text-white sm:text-6xl">
              Transform Case Investigation with{' '}
              <span className="bg-gradient-to-r from-[#D4AF37] to-[#6B4AA3] bg-clip-text text-transparent">
                Intelligent Forensic Analysis
              </span>
            </h1>
            <p className="mt-6 text-xl text-[#E8E8E8]/80">
              Uncover truth faster with AI-powered evidence analysis, secure collaboration, and enterprise-grade case management.
            </p>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/login">
                <FloatingButton variant="primary" size="lg">
                  Start Free Trial
                </FloatingButton>
              </Link>
              <FloatingButton variant="secondary" size="lg">
                Watch Demo
              </FloatingButton>
            </div>
          </motion.div>

          {/* Animated background elements */}
          <motion.div
            className="absolute top-20 right-20 h-72 w-72 rounded-full bg-[#6B4AA3]/10 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 left-20 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </section>

        {/* Features Section */}
        <section className="px-4 py-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="mb-16 text-center text-4xl font-bold text-white"
            >
              Enterprise-Grade Features
            </motion.h2>

            <StaggerContainer staggerDelay={0.2}>
              {features.map((feature, index) => (
                <GlassCard key={index} delay={index * 0.1} hoverEffect="lift">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-[#D4AF37]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[#E8E8E8]/70">{feature.description}</p>
                </GlassCard>
              ))}
            </StaggerContainer>
          </div>
        </section>
      </div>
    </>
  );
}
