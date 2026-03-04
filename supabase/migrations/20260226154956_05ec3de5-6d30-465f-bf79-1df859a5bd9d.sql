
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  assigned_name TEXT NOT NULL,
  assigned_role TEXT NOT NULL,
  assigned_avatar TEXT NOT NULL,
  teams_channel TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  wireframe_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (no auth)
CREATE POLICY "Anyone can read ideas" ON public.ideas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ideas" ON public.ideas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete ideas" ON public.ideas FOR DELETE USING (true);
