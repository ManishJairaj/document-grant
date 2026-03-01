import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, GraduationCap, Lightbulb, Rocket, BookOpen, Code, Palette, FileText, User } from "lucide-react";

const steps = [
  { title: "What's your name?", subtitle: "Let's personalize your experience" },
  { title: "Your experience level", subtitle: "We'll tailor content to match your knowledge" },
  { title: "How do you learn best?", subtitle: "Choose your preferred explanation style" },
  { title: "Pick your financial focus", subtitle: "What area of finance do you want to master first?" },
];

const levels = [
  { value: "beginner", label: "Beginner", icon: GraduationCap, desc: "Just getting started" },
  { value: "intermediate", label: "Intermediate", icon: Lightbulb, desc: "Some experience" },
  { value: "advanced", label: "Advanced", icon: Rocket, desc: "Deep expertise" },
];

const styles = [
  { value: "simple", label: "Simple & Clear", icon: BookOpen, desc: "Straightforward explanations" },
  { value: "detailed", label: "In-depth", icon: FileText, desc: "Comprehensive breakdowns" },
  { value: "visual", label: "Visual", icon: Palette, desc: "Diagrams & visual aids" },
  { value: "examples", label: "Examples-first", icon: Code, desc: "Learn by practical examples" },
];

const domains = [
  { value: "budgeting", label: "Budgeting & Saving", emoji: "💰" },
  { value: "investing", label: "Investing 101", emoji: "📈" },
  { value: "credit-debt", label: "Debt & Credit", emoji: "💳" },
  { value: "taxes", label: "Taxes & Planning", emoji: "📝" },
  { value: "behavioral", label: "Behavioral Finance", emoji: "🧠" },
  { value: "crypto", label: "Crypto & Web3", emoji: "🪙" },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("beginner");
  const [style, setStyle] = useState("simple");
  const [domain, setDomain] = useState("budgeting");
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();

  const handleComplete = async () => {
    try {
      await updateProfile.mutateAsync({
        name,
        experience_level: level,
        explanation_style: style,
        preferred_domain: domain,
        onboarding_completed: true,
      });
      toast.success("Welcome aboard! Let's start learning.");
      navigate("/dashboard");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'An error occurred');
    }
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "gradient-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">{steps[step].title}</h2>
            <p className="text-muted-foreground mb-8">{steps[step].subtitle}</p>

            {step === 0 && (
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="pl-10 h-12 text-lg"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                {levels.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      level === l.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      level === l.value ? "gradient-primary" : "bg-muted"
                    }`}>
                      <l.icon className={`w-6 h-6 ${level === l.value ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-display font-semibold text-foreground">{l.label}</p>
                      <p className="text-sm text-muted-foreground">{l.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-3">
                {styles.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      style === s.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      style === s.value ? "gradient-primary" : "bg-muted"
                    }`}>
                      <s.icon className={`w-6 h-6 ${style === s.value ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div className="text-center">
                      <p className="font-display font-semibold text-foreground text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-2 gap-3">
                {domains.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDomain(d.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      domain === d.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl">{d.emoji}</span>
                    <span className="font-display font-semibold text-foreground text-sm">{d.label}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="gradient-primary text-primary-foreground"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={updateProfile.isPending}
              className="gradient-primary text-primary-foreground"
            >
              {updateProfile.isPending ? "Saving..." : "Start Learning"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
