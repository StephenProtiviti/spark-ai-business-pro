
-- Drop the broken restrictive policies
DROP POLICY IF EXISTS "Anyone can delete ideas" ON public.ideas;
DROP POLICY IF EXISTS "Anyone can insert ideas" ON public.ideas;
DROP POLICY IF EXISTS "Anyone can read ideas" ON public.ideas;
DROP POLICY IF EXISTS "Anyone can update ideas" ON public.ideas;

-- Recreate as PERMISSIVE (the default)
CREATE POLICY "Anyone can read ideas" ON public.ideas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ideas" ON public.ideas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ideas" ON public.ideas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete ideas" ON public.ideas FOR DELETE USING (true);
