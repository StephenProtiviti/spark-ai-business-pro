
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Allow all select" ON public.ideas;
DROP POLICY IF EXISTS "Allow all insert" ON public.ideas;
DROP POLICY IF EXISTS "Allow all update" ON public.ideas;
DROP POLICY IF EXISTS "Allow all delete" ON public.ideas;

-- Recreate as truly PERMISSIVE (explicit)
CREATE POLICY "Public select" ON public.ideas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert" ON public.ideas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update" ON public.ideas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete" ON public.ideas FOR DELETE TO anon, authenticated USING (true);
