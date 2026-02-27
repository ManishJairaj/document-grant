import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, BookOpen, TrendingUp, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Learning",
    desc: "Get explanations tailored to your exact knowledge level and learning style.",
  },
  {
    icon: BookOpen,
    title: "Adaptive Quizzes",
    desc: "Quizzes that adjust difficulty based on your demonstrated performance.",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    desc: "Visual dashboards show your mastery growth across topics over time.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="container flex items-center justify-between py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">Solasta</span>
        </div>
        <Link to="/auth">
          <Button variant="outline">Get Started</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="container py-24 md:py-32 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> GenAI-powered adaptive learning
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground leading-tight mb-6">
            Learn anything, <br />
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              your way
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Solasta uses AI to create personalized explanations, quizzes, and recommendations that adapt to your unique learning journey.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gradient-primary text-primary-foreground text-base px-8 h-12">
              Start Learning Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container pb-24 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="bg-card rounded-2xl p-7 shadow-card border border-border"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-display font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          Built for GDG Hackathon Solasta 2026 — IIITDM Kurnool
        </div>
      </footer>
    </div>
  );
};

export default Index;
