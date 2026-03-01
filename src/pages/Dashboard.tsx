import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import ProgressRing from "@/components/ProgressRing";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Star, TrendingUp, ArrowRight, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const topics = [
  { id: "budgeting-basics", label: "Budgeting Basics", emoji: "💰", color: "from-primary to-info" },
  { id: "building-credit", label: "Building Credit", emoji: "💳", color: "from-primary to-success" },
  { id: "investing", label: "Investing Fundamentals", emoji: "📈", color: "from-secondary to-warning" },
  { id: "managing-debt", label: "Managing Debt", emoji: "📉", color: "from-info to-primary" },
  { id: "savings-goals", label: "Savings Goals", emoji: "🎯", color: "from-success to-primary" },
  { id: "taxes-planning", label: "Taxes & Planning", emoji: "📝", color: "from-warning to-secondary" },
];

const Dashboard = () => {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const [stats, setStats] = useState({ sessions: 0, avgRating: 0, totalTime: 0 });
  const [chartData, setChartData] = useState<{ name: string; sessions: number }[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [sessionsRes, feedbackRes, metricsRes] = await Promise.all([
        supabase.from("user_sessions").select("*", { count: "exact" }).eq("user_id", user.id),
        supabase.from("feedback").select("rating").eq("user_id", user.id),
        supabase.from("interaction_metrics").select("topic, time_spent").eq("user_id", user.id),
      ]);

      const sessionCount = sessionsRes.count || 0;
      const ratings = feedbackRes.data || [];
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, f) => sum + (f.rating || 0), 0) / ratings.length
        : 0;
      const metrics = metricsRes.data || [];
      const totalTime = metrics.reduce((sum, m) => sum + (m.time_spent || 0), 0);

      setStats({ sessions: sessionCount, avgRating, totalTime });

      // Build chart data from metrics
      const topicMap: Record<string, number> = {};
      metrics.forEach((m) => {
        topicMap[m.topic] = (topicMap[m.topic] || 0) + 1;
      });
      setChartData(
        Object.entries(topicMap).map(([name, sessions]) => ({ name, sessions }))
      );
    };

    fetchStats();
  }, [user]);

  const greeting = profile?.name ? `Welcome back, ${profile.name}` : "Welcome back";
  const completionPercent = Math.min((stats.sessions / 20) * 100, 100);

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{greeting} 👋</h1>
            <p className="text-muted-foreground mt-1">
              Keep going — every session strengthens your financial health score.
            </p>
          </div>
          <Link to="/learn">
            <Button className="gradient-primary text-primary-foreground">
              <Zap className="w-4 h-4 mr-2" /> Start Learning
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Sessions", value: stats.sessions, icon: BookOpen, iconColor: "text-primary" },
            { label: "Avg Rating", value: stats.avgRating.toFixed(1), icon: Star, iconColor: "text-secondary" },
            { label: "Time (min)", value: Math.round(stats.totalTime / 60), icon: Clock, iconColor: "text-info" },
            { label: "Level", value: profile?.experience_level || "—", icon: TrendingUp, iconColor: "text-success" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground capitalize">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Progress */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Your Progress</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              <ProgressRing progress={completionPercent} label="mastery" />
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {stats.sessions} of 20 sessions completed towards mastery
              </p>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="md:col-span-2 shadow-card">
            <CardHeader><CardTitle className="font-display">Activity by Topic</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  Complete some sessions to see your activity chart
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Topics */}
        <h2 className="text-xl font-display font-bold text-foreground mt-10 mb-4">Explore Topics</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {topics.map((topic, i) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <Link to={`/learn?topic=${topic.id}`}>
                <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer group">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{topic.emoji}</span>
                      <span className="font-display font-semibold text-foreground">{topic.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Dashboard;
