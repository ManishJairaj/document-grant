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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  response?: AIResponse;
}

const Learn = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const startTimeRef = useRef(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topicFromUrl = searchParams.get("topic") || "";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [messages]);

  const handleAsk = async () => {
    if (!query.trim() || !user) return;
    const userMessage = query.trim();
    setQuery("");
    
    // Add user message to UI immediately
    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setRating(0);
    setFeedbackSent(false);

    try {
      // Map existing history for the API
      const historyPayload = messages.map(msg => ({
        role: msg.role,
        content: msg.role === 'assistant' && msg.response ? msg.response.explanation : msg.content
      }));

      const { data: funcData, error: funcError } = await supabase.functions.invoke("generate-content", {
        body: {
          query: userMessage,
          topic: topicFromUrl || "general",
          userId: user.id,
          experienceLevel: profile?.experience_level || "beginner",
          explanationStyle: profile?.explanation_style || "simple",
          preferredDomain: profile?.preferred_domain || "general",
          history: historyPayload
        },
      });

      if (funcError) throw funcError;

      const aiResponse: AIResponse = funcData;
      setMessages([...updatedMessages, { role: "assistant", content: aiResponse.explanation, response: aiResponse }]);

      // Create session if it doesn't exist
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const { data: sess } = await supabase
          .from("user_sessions")
          .insert([{
            user_id: user.id,
            topic: topicFromUrl || "general",
            query: userMessage,
            ai_response: JSON.stringify(aiResponse),
          }])
          .select()
          .single();
        if (sess) {
          currentSessionId = sess.id;
          setSessionId(currentSessionId);
        }
      }

      if (currentSessionId) {
        // Store generated content history
        await supabase.from("generated_content").insert([{
          user_id: user.id,
          session_id: currentSessionId,
          topic: topicFromUrl || "general",
          explanation: aiResponse.explanation,
          quiz: aiResponse.quiz as unknown as any,
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

  const handleQuizSubmit = (responseIndex: number) => {
    setQuizSubmitted(true);
    const msg = messages[responseIndex];
    if (!msg || !msg.response) return;
    const correct = msg.response.quiz.filter((q, i) => quizAnswers[i] === q.correctAnswer).length;
    const score = Math.round((correct / msg.response.quiz.length) * 100);
    toast.success(`You scored ${score}% (${correct}/${msg.response.quiz.length})`);
  };

  const handleFeedback = async (responseIndex: number) => {
    if (!user || !sessionId || rating === 0) return;
    const msg = messages[responseIndex];
    if (!msg || !msg.response) return;
    
    const correct = msg.response.quiz.filter((q, i) => quizAnswers[i] === q.correctAnswer).length || 0;
    const score = msg.response.quiz.length ? Math.round((correct / msg.response.quiz.length) * 100) : 0;

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
          FinGenie Chat
        </h1>
        <p className="text-muted-foreground mb-6">
          Ask anything — your AI tutor adapts explanations and quizzes to your level.
        </p>

        {/* Chat Interface */}
        <div className="flex flex-col gap-6 mb-8 max-h-[60vh] overflow-y-auto px-2 py-4 rounded-xl border border-border bg-card/30">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground p-8"
              >
                No messages yet. Ask a question below to start learning!
              </motion.div>
            )}

            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="bg-primary text-primary-foreground px-5 py-3 rounded-2xl max-w-[85%] shadow-sm">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="w-full max-w-[95%] space-y-6">
                    {/* Explanation */}
                    <Card className="shadow-card border-l-4 border-l-secondary">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display flex items-center gap-2 text-lg">
                          <Sparkles className="w-5 h-5 text-secondary" /> Explanation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                          {msg.response?.explanation || msg.content}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quiz */}
                    {msg.response?.quiz && msg.response.quiz.length > 0 && (
                      <Card className="shadow-card ml-8 border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <CardTitle className="font-display text-lg">🧠 Quick Quiz</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {msg.response.quiz.map((q: { question: string, options: string[], correctAnswer: string }, qi: number) => (
                            <div key={qi}>
                              <p className="font-medium text-foreground mb-3">{qi + 1}. {q.question}</p>
                              <div className="space-y-2">
                                {q.options.map((opt: string) => {
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
                              onClick={() => handleQuizSubmit(index)}
                              disabled={Object.keys(quizAnswers).length < (msg.response?.quiz.length || 0)}
                              className="gradient-primary text-primary-foreground"
                            >
                              Submit Answers
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {msg.response?.recommendations && msg.response.recommendations.length > 0 && (
                      <Card className="shadow-card ml-8 border-l-4 border-l-info">
                        <CardHeader className="pb-3">
                          <CardTitle className="font-display text-lg">📚 Recommended Next</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {msg.response.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                <span className="text-info mt-0.5">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Feedback - Only show on latest assistant message */}
                    {!feedbackSent && index === messages.length - 1 && (
                      <Card className="shadow-card ml-8 border-l-4 border-l-muted-foreground bg-muted/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="font-display text-sm">Rate this response</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} onClick={() => setRating(n)}>
                                <Star
                                  className={`w-5 h-5 transition-colors ${
                                    n <= rating ? "text-secondary fill-secondary" : "text-muted-foreground"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <Button onClick={() => handleFeedback(index)} disabled={rating === 0} variant="outline" size="sm">
                            Submit Feedback
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-muted-foreground my-4"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Generating personalized response...</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </AnimatePresence>
        </div>

        {/* Query input */}
        <div className="flex gap-3 position-sticky bottom-6">
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
      </motion.div>
    </DashboardLayout>
  );
};

export default Learn;
