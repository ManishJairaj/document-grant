
-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  experience_level TEXT NOT NULL DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  explanation_style TEXT NOT NULL DEFAULT 'simple' CHECK (explanation_style IN ('simple', 'detailed', 'visual', 'examples')),
  preferred_domain TEXT DEFAULT 'general',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User Sessions table
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  query TEXT,
  ai_response TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.user_sessions(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comprehension_score INTEGER CHECK (comprehension_score >= 0 AND comprehension_score <= 100),
  preference_change TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Interaction Metrics table
CREATE TABLE public.interaction_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  time_spent INTEGER NOT NULL DEFAULT 0,
  repeated_queries INTEGER NOT NULL DEFAULT 0,
  navigation_path TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interaction_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics" ON public.interaction_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics" ON public.interaction_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.interaction_metrics FOR UPDATE USING (auth.uid() = user_id);

-- Generated Content table
CREATE TABLE public.generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.user_sessions(id),
  topic TEXT NOT NULL,
  explanation TEXT,
  quiz JSONB DEFAULT '[]',
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content" ON public.generated_content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content" ON public.generated_content FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
