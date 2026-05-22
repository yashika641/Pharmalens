-- ============================================================
--  PharmaLens — Supabase Database Schema
--  Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. STORAGE BUCKET
-- ────────────────────────────────────────────────────────────
-- Create the storage bucket for medicine & prescription images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmalens', 'pharmalens', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pharmalens');

-- Allow public read of images (needed for OCR URL access)
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pharmalens');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pharmalens' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ────────────────────────────────────────────────────────────
-- 2. USER PROFILE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profile (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email        TEXT,
    username     TEXT,
    age          INTEGER,
    phone        TEXT,
    allergies    TEXT DEFAULT '',
    conditions   TEXT DEFAULT '',
    medications  TEXT DEFAULT '',
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
ON public.user_profile FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profile FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profile FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_profile_updated_at
BEFORE UPDATE ON public.user_profile
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ────────────────────────────────────────────────────────────
-- 3. IMAGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.images (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url    TEXT NOT NULL,
    image_type   TEXT NOT NULL CHECK (image_type IN ('medicine', 'prescription')),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own images"
ON public.images FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
ON public.images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all images"
ON public.images FOR ALL
TO service_role
USING (true);


-- ────────────────────────────────────────────────────────────
-- 4. MEDICINE OCR DATA
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medicine_ocr_data (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id       UUID REFERENCES public.images(id) ON DELETE SET NULL,
    medicine_name  TEXT,
    dosage         TEXT,
    composition    TEXT,
    expiry_date    DATE,
    mfg_date       TEXT,
    precautions    TEXT,
    medicine_type  TEXT,
    raw_text       TEXT,
    confidence     FLOAT DEFAULT 0.0,
    ocr_engine     TEXT,
    fallback_used  BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.medicine_ocr_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to medicine_ocr_data"
ON public.medicine_ocr_data FOR ALL
TO service_role
USING (true);

CREATE POLICY "Authenticated users can read medicine_ocr_data"
ON public.medicine_ocr_data FOR SELECT
TO authenticated
USING (true);


-- ────────────────────────────────────────────────────────────
-- 5. PRESCRIPTION OCR DATA
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescription_ocr_data (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id            UUID REFERENCES public.images(id) ON DELETE SET NULL,
    doctor_name         TEXT,
    prescription_date   TEXT,
    diagnosis           TEXT,
    medicines           JSONB,        -- array of prescribed medicine objects
    routes              TEXT,         -- dosage instructions / administration routes
    raw_text            TEXT,
    confidence          FLOAT DEFAULT 0.0,
    ocr_engine          TEXT,
    fallback_used       BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prescription_ocr_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to prescription_ocr_data"
ON public.prescription_ocr_data FOR ALL
TO service_role
USING (true);

CREATE POLICY "Authenticated users can read prescription_ocr_data"
ON public.prescription_ocr_data FOR SELECT
TO authenticated
USING (true);


-- ────────────────────────────────────────────────────────────
-- 6. USER HISTORY  (scan index — links user ↔ OCR records)
-- ────────────────────────────────────────────────────────────
-- Stores compact JSON arrays: [{"id": "<uuid>", "name": "<display>"}]
-- One row per user, updated via array append on each new scan.
CREATE TABLE IF NOT EXISTS public.user_history (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    medicine_scan_ids   JSONB DEFAULT '[]'::jsonb,
    prescription_ids    JSONB DEFAULT '[]'::jsonb,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own history"
ON public.user_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_history"
ON public.user_history FOR ALL
TO service_role
USING (true);


-- ────────────────────────────────────────────────────────────
-- 7. CHATBOT HISTORY
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chatbot_history (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query      TEXT NOT NULL,
    response   TEXT NOT NULL,
    timestamp  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chatbot_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own chat history"
ON public.chatbot_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to chatbot_history"
ON public.chatbot_history FOR ALL
TO service_role
USING (true);


-- ────────────────────────────────────────────────────────────
-- 8. INDEXES  (performance)
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id      ON public.user_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id            ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_medicine_ocr_image_id     ON public.medicine_ocr_data(image_id);
CREATE INDEX IF NOT EXISTS idx_prescription_ocr_image_id ON public.prescription_ocr_data(image_id);
CREATE INDEX IF NOT EXISTS idx_user_history_user_id      ON public.user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_history_user_id   ON public.chatbot_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_history_timestamp ON public.chatbot_history(timestamp DESC);
