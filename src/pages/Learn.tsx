import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Loader2, Star, CheckCircle2, XCircle, Sparkles, MessageSquarePlus, Clock, ChevronRight } from "lucide-react";

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

interface UserSession {
  id: string;
  topic: string;
  query: string;
  started_at: string;
  ai_response?: string;
}

const Learn = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [difficultyAdjustment, setDifficultyAdjustment] = useState<"easier" | "harder" | "none">("none");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const startTimeRef = useRef(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topicFromUrl = searchParams.get("topic") || "";

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });
    
    if (data) {
      setSessions(data);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setQuery("");
    setQuizAnswers({});
    setQuizSubmitted(false);
    setRating(0);
    setFeedbackSent(false);
    setDifficultyAdjustment("none");
  };

  const loadSession = (session: UserSession) => {
    if (session.id === sessionId) return;
    setSessionId(session.id);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setRating(0);
    setFeedbackSent(false);
    
    if (session.ai_response) {
      try {
        const parsedMessages = JSON.parse(session.ai_response);
        if (Array.isArray(parsedMessages)) {
          setMessages(parsedMessages);
        } else {
          // Fallback for older single-response sessions
          setMessages([
            { role: "user", content: session.query },
            { role: "assistant", content: parsedMessages.explanation, response: parsedMessages }
          ]);
        }
      } catch (e) {
        console.error("Failed to parse session messages", e);
        setMessages([]);
      }
    } else {
      setMessages([{ role: "user", content: session.query }]);
    }
  };

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
          difficultyAdjustment,
          history: historyPayload
        },
      });

      // Reset difficulty adjustment after sending it
      setDifficultyAdjustment("none");

      if (funcError) throw funcError;

      const aiResponse: AIResponse = funcData;
      setMessages([...updatedMessages, { role: "assistant", content: aiResponse.explanation, response: aiResponse }]);
      
      // Remove loading indicator immediately so user doesn't wait for database inserts
      setLoading(false);

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
          setSessions(prev => [sess, ...prev]);
        }
      }

      if (currentSessionId) {
        // Store generated content history
        await supabase.from("generated_content").insert([{
          user_id: user.id,
          session_id: currentSessionId,
          topic: topicFromUrl || "general",
          explanation: aiResponse.explanation,
          quiz: aiResponse.quiz as unknown as Json,
          recommendations: aiResponse.recommendations,
        }]);
      }

      // Track interaction
      await supabase.from("interaction_metrics").insert([{
        user_id: user.id,
        topic: topicFromUrl || "general",
        time_spent: Math.round((Date.now() - startTimeRef.current) / 1000),
      }]);

      // Update session with latest messages array stringified
      const finalMessages = [...updatedMessages, { role: "assistant", content: aiResponse.explanation, response: aiResponse }];
      if (currentSessionId) {
        await supabase
          .from("user_sessions")
          .update({ ai_response: JSON.stringify(finalMessages) })
          .eq("id", currentSessionId);
      }

    } catch (err: unknown) {
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
    
    if (score <= 50) {
      setDifficultyAdjustment("easier");
      toast.info("Don't worry! The difficulty level for your next question has been reduced.", { duration: 5000 });
    } else if (score === 100) {
      setDifficultyAdjustment("harder");
      toast.success("Great job! The difficulty level for your next question will be slightly increased.", { duration: 5000 });
    } else {
      setDifficultyAdjustment("none");
    }
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
      <div className="flex flex-col md:flex-row gap-6 w-full h-[calc(100vh-140px)]">
        
        {/* Sidebar for History */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
          <Button 
            onClick={startNewChat}
            variant="outline" 
            className="w-full flex items-center justify-start gap-2 h-12 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
          >
            <MessageSquarePlus className="w-5 h-5" />
            <span className="font-medium text-base">New Chat</span>
          </Button>

          <Card className="flex-1 shadow-card border border-border/50 bg-card/40 flex flex-col overflow-hidden">
            <CardHeader className="py-4 px-4 border-b border-border/50 bg-muted/10">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Recent Chats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col">
                {sessions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No recent chats. Start learning!
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session)}
                      className={`w-full text-left p-4 border-b border-border/30 transition-colors flex items-center justify-between group hover:bg-muted/30 ${
                        session.id === sessionId ? "bg-muted/50 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex flex-col gap-1 pr-4 overflow-hidden">
                        <span className="text-sm font-medium text-foreground truncate">{session.query}</span>
                        <span className="text-xs text-muted-foreground truncate">{new Date(session.started_at).toLocaleDateString()} • {session.topic}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${session.id === sessionId ? "opacity-100 translate-x-1 text-primary" : "opacity-0 group-hover:opacity-100"}`} />
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col bg-card/30 border border-border rounded-xl shadow-sm overflow-hidden"
        >
          <div className="p-6 pb-4 border-b border-border/50 bg-muted/10">
            <h1 className="text-2xl font-display font-bold text-foreground">
              <Sparkles className="inline w-6 h-6 text-secondary mr-2" />
              FinGenie Chat
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ask anything — your AI tutor adapts explanations and quizzes to your level.
            </p>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
            <AnimatePresence>
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                     <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-medium text-foreground text-lg mb-2">Ready to expand your financial knowledge?</p>
                  <p className="max-w-sm text-sm">Type a question below to start a new customized lesson plan.</p>
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
                          
                          {quizSubmitted && difficultyAdjustment === "easier" && index === messages.length - 1 && (
                            <div className="mt-4 p-3 bg-warning/20 border border-warning/50 rounded-md text-sm text-foreground flex items-center gap-2">
                              <Star className="w-4 h-4 text-warning" />
                              Don't worry, the difficulty for your next question has been reduced!
                            </div>
                          )}
                           {quizSubmitted && difficultyAdjustment === "harder" && index === messages.length - 1 && (
                            <div className="mt-4 p-3 bg-success/20 border border-success/50 rounded-md text-sm text-foreground flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-success" />
                              Perfect score! The difficulty for your next question will be increased.
                            </div>
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
          <div className="p-4 border-t border-border/50 bg-background">
            <div className="flex gap-3 relative max-w-4xl mx-auto">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={topicFromUrl ? `Ask about ${topicFromUrl.replace("-", " ")}...` : "What financial topic would you like to learn about?"}
                className="h-14 text-base pr-16 bg-muted/50 border-primary/20 focus-visible:ring-primary/50 shadow-inner"
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />
              <Button
                onClick={handleAsk}
                disabled={loading || !query.trim()}
                className="absolute right-2 top-2 h-10 w-10 p-0 rounded-md gradient-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Learn;
