-- Migration 008: Create activity_logs table in Supabase if not exists

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    staff_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_store ON public.activity_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_staff ON public.activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to insert & select logs for their store
CREATE POLICY "Allow authenticated store access to activity_logs"
    ON public.activity_logs
    FOR ALL
    TO authenticated
    USING (store_id = (SELECT public.get_auth_store_id()))
    WITH CHECK (store_id = (SELECT public.get_auth_store_id()));
