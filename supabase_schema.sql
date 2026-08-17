-- -----------------------------------------------------------------------------
-- SUPABASE COMPLETE SYSTEM SCHEMA & DDL SETUP
-- -----------------------------------------------------------------------------
-- This script contains all structural DDL requirements and security policies
-- to run ErrandRunner completely out of Supabase.
-- Run this block directly inside your Supabase SQL editor.

-- Enable standard UUID extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES Table (User Storage Engine)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT,
    phone TEXT,
    role TEXT DEFAULT 'REQUESTER',
    is_runner BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    it_admin BOOLEAN DEFAULT false,
    backend_admin BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    suspension_reason TEXT,
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'light',
    is_online BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    rating NUMERIC DEFAULT 5.0,
    rating_count INTEGER DEFAULT 0,
    wallet_balance NUMERIC DEFAULT 0.0,
    balance NUMERIC DEFAULT 0.0,
    completed_errands INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    notification_settings JSONB DEFAULT '{"push": true, "email": true, "sms": true}'::jsonb,
    last_known_location JSONB,
    profile_photo TEXT,
    biography TEXT,
    extra_data JSONB DEFAULT '{}'::jsonb,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow public select of profiles" ON public.profiles;
CREATE POLICY "Allow public select of profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.profiles;
CREATE POLICY "Allow authenticated users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Allow full service command access" ON public.profiles;
CREATE POLICY "Allow full service command access" ON public.profiles FOR ALL USING (true);


-- 2. ERRANDS Table (Core Order & Job Tracking)
CREATE TABLE IF NOT EXISTS public.errands (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending',
    budget NUMERIC,
    requester_id UUID,
    requester_name TEXT,
    requester_phone TEXT,
    requester_is_verified BOOLEAN,
    runner_id UUID,
    runner_name TEXT,
    runner_phone TEXT,
    runner_is_verified BOOLEAN,
    pickup_location TEXT,
    pickup_coordinates JSONB,
    dropoff_location TEXT,
    dropoff_coordinates JSONB,
    deadline TEXT,
    location TEXT,
    dispute_reason TEXT,
    bids JSONB DEFAULT '[]'::jsonb,
    checklist JSONB DEFAULT '[]'::jsonb,
    accepted_price NUMERIC,
    receipt_url TEXT,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Errands
ALTER TABLE public.errands ENABLE ROW LEVEL SECURITY;

-- Errands Policies
DROP POLICY IF EXISTS "Allow public select of errands" ON public.errands;
CREATE POLICY "Allow public select of errands" ON public.errands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert errands" ON public.errands;
CREATE POLICY "Allow authenticated users to insert errands" ON public.errands FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update errands" ON public.errands;
CREATE POLICY "Allow authenticated users to update errands" ON public.errands FOR UPDATE USING (true);


-- 3. NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    errand_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
DROP POLICY IF EXISTS "Allow anyone to fetch notifications" ON public.notifications;
CREATE POLICY "Allow anyone to fetch notifications" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anyone to update/read status" ON public.notifications;
CREATE POLICY "Allow anyone to update/read status" ON public.notifications FOR ALL USING (true);


-- 4. ERRAND CHATS Table (Interactive Job Rooms)
CREATE TABLE IF NOT EXISTS public.errand_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    errand_id TEXT NOT NULL,
    sender_id UUID NOT NULL,
    sender_name TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Chats
ALTER TABLE public.errand_chats ENABLE ROW LEVEL SECURITY;

-- Chats Policies
DROP POLICY IF EXISTS "Allow any reader" ON public.errand_chats;
CREATE POLICY "Allow any reader" ON public.errand_chats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow any sender" ON public.errand_chats;
CREATE POLICY "Allow any sender" ON public.errand_chats FOR INSERT WITH CHECK (true);


-- 5. SUPPORT MESSAGES Table (Help & Resolution Rooms)
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Support messages
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Support Policies
DROP POLICY IF EXISTS "Allow all support listings select" ON public.support_messages;
CREATE POLICY "Allow all support listings select" ON public.support_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all support listings action" ON public.support_messages;
CREATE POLICY "Allow all support listings action" ON public.support_messages FOR ALL USING (true);


-- 6. RUNNER APPLICATIONS Table
CREATE TABLE IF NOT EXISTS public.runner_applications (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    reviewed_by_name TEXT,
    return_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Runner Applications
ALTER TABLE public.runner_applications ENABLE ROW LEVEL SECURITY;

-- Runner Applications Policies
DROP POLICY IF EXISTS "Allow anyone to submit onboarding applications" ON public.runner_applications;
CREATE POLICY "Allow anyone to submit onboarding applications" ON public.runner_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anyone to query onboarding status" ON public.runner_applications;
CREATE POLICY "Allow anyone to query onboarding status" ON public.runner_applications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow onboarding update operations" ON public.runner_applications;
CREATE POLICY "Allow onboarding update operations" ON public.runner_applications FOR ALL USING (true);


-- 7. SETTINGS Table (Flexible App Settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'app',
    primary_color TEXT DEFAULT '#2891e2',
    logo_url TEXT DEFAULT 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216350/a371z1ikclx5qbsgtgdv.png',
    icon_url TEXT DEFAULT 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216384/ox2qzeuultlhiccfh02z.png',
    dashboard_hero_url TEXT DEFAULT 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216072/yy5zthljky17lmq0nlsy.png',
    default_ui_scale NUMERIC DEFAULT 1.1,
    logo_scale NUMERIC DEFAULT 3,
    logo_variant TEXT DEFAULT 'original',
    saka_keja_base_fee NUMERIC DEFAULT 1200,
    saka_keja_percentage NUMERIC DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Settings Policies
DROP POLICY IF EXISTS "Allow anyone to view settings" ON public.settings;
CREATE POLICY "Allow anyone to view settings" ON public.settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow settings edit" ON public.settings;
CREATE POLICY "Allow settings edit" ON public.settings FOR ALL USING (true);

-- Insert Default Settings
INSERT INTO public.settings (id, primary_color, logo_url, icon_url, dashboard_hero_url, default_ui_scale, logo_scale, logo_variant, saka_keja_base_fee, saka_keja_percentage)
VALUES ('app', '#2891e2', 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216350/a371z1ikclx5qbsgtgdv.png', 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216384/ox2qzeuultlhiccfh02z.png', 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216072/yy5zthljky17lmq0nlsy.png', 1.1, 3, 'original', 1200, 8)
ON CONFLICT (id) DO NOTHING;
