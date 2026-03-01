import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Loader2, Star, CheckCircle2, XCircle, Sparkles } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface AIResponse {
  explanation: string;
  quiz: QuizQuestion[];
  recommendations: string[];
}

const Learn = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const startTimeRef = useRef(Date.now());
  const topicFromUrl = searchParams.get("topic") || "";

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [response]);

  const handleAsk = async () => {
    if (!query.trim() || !user) return;
    setLoading(true);
    setResponse(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setRating(0);
    setFeedbackSent(false);

    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke("generate-content", {
        body: {
          query: query.trim(),
          topic: topicFromUrl || "general",
          userId: user.id,
          experienceLevel: profile?.experience_level || "beginner",
          explanationStyle: profile?.explanation_style || "simple",
          preferredDomain: profile?.preferred_domain || "general",
        },
      });

      if (funcError) throw funcError;

      const aiResponse: AIResponse = funcData;
      setResponse(aiResponse);

      // Create session
      const { data: sess } = await supabase
        .from("user_sessions")
        .insert([{
          user_id: user.id,
          topic: topicFromUrl || "general",
          query: query.trim(),
          ai_response: JSON.stringify(aiResponse),
        }])
        .select()
        .single();

      if (sess) {
        setSessionId(sess.id);
        // Store generated content
        await supabase.from("generated_content").insert([{
          user_id: user.id,
          session_id: sess.id,
          topic: topicFromUrl || "general",
          explanation: aiResponse.explanation,
          quiz: aiResponse.quiz as any,
          recommendations: aiResponse.recommendations,
        }]);
      }

      // Track interaction
      await supabase.from("interaction_metrics").insert([{
        user_id: user.id,
        topic: topicFromUrl || "general",
        time_spent: Math.round((Date.now() - startTimeRef.current) / 1000),
      }]);
    } catch (err: any) {
      toast.error("Failed to generate content. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    if (!response) return;
    const correct = response.quiz.filter((q, i) => quizAnswers[i] === q.correctAnswer).length;
    const score = Math.round((correct / response.quiz.length) * 100);
    toast.success(`You scored ${score}% (${correct}/${response.quiz.length})`);
  };

  const handleFeedback = async () => {
    if (!user || !sessionId || rating === 0) return;
    const correct = response?.quiz.filter((q, i) => quizAnswers[i] === q.correctAnswer).length || 0;
    const score = response?.quiz.length ? Math.round((correct / response.quiz.length) * 100) : 0;

    await supabase.from("feedback").insert([{
      user_id: user.id,
      session_id: sessionId,
      rating,
      comprehension_score: score,
    }]);

    setFeedbackSent(true);
    toast.success("Thanks for your feedback!");
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          <Sparkles className="inline w-7 h-7 text-secondary mr-2" />
          Learn with AI
        </h1>
        <p className="text-muted-foreground mb-8">
          Ask anything — your AI tutor adapts explanations and quizzes to your level.
        </p>

        {/* Query input */}
        <div className="flex gap-3 mb-8">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={topicFromUrl ? `Ask about ${topicFromUrl.replace("-", " ")}...` : "What financial topic would you like to learn about?"}
            className="h-12 text-base"
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <Button
            onClick={handleAsk}
            disabled={loading || !query.trim()}
            className="gradient-primary text-primary-foreground h-12 px-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 text-muted-foreground mb-8"
            >
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Generating personalized content...</span>
            </motion.div>
          )}

          {response && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Explanation */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" /> Explanation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {response.explanation}
                  </div>
                </CardContent>
              </Card>

              {/* Quiz */}
              {response.quiz.length > 0 && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">🧠 Quick Quiz</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {response.quiz.map((q, qi) => (
                      <div key={qi}>
                        <p className="font-medium text-foreground mb-3">{qi + 1}. {q.question}</p>
                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const selected = quizAnswers[qi] === opt;
                            const isCorrect = quizSubmitted && opt === q.correctAnswer;
                            const isWrong = quizSubmitted && selected && opt !== q.correctAnswer;
                            return (
                              <button
                                key={opt}
                                onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [qi]: opt })}
                                disabled={quizSubmitted}
                                className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                  isCorrect
                                    ? "border-success bg-success/10"
                                    : isWrong
                                    ? "border-destructive bg-destructive/10"
                                    : selected
                                    ? "border-primary bg-accent"
                                    : "border-border hover:border-primary/30"
                                }`}
                              >
                                {quizSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                                {quizSubmitted && isWrong && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                                <span className="text-sm text-foreground">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {!quizSubmitted && (
                      <Button
                        onClick={handleQuizSubmit}
                        disabled={Object.keys(quizAnswers).length < response.quiz.length}
                        className="gradient-primary text-primary-foreground"
                      >
                        Submit Answers
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {response.recommendations.length > 0 && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">📚 Recommended Next</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {response.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Feedback */}
              {!feedbackSent && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Rate this response</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setRating(n)}>
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              n <= rating ? "text-secondary fill-secondary" : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Button onClick={handleFeedback} disabled={rating === 0} variant="outline">
                      Submit Feedback
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
};

export default Learn;
