-- AutoIQ Supabase Database Setup
-- Run this in the Supabase SQL Editor at https://supabase.com/dashboard

CREATE TABLE IF NOT EXISTS autoiq_vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text,
  year int,
  make text,
  model text,
  current_mileage int DEFAULT 0,
  color text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autoiq_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES autoiq_vehicles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  service_date date,
  mileage_at_service int,
  next_due_mileage int,
  next_due_date date,
  cost numeric(8,2),
  shop_name text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autoiq_diagnoses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES autoiq_vehicles(id),
  symptom text,
  photo_url text,
  problem text,
  severity text,
  cost_estimate text,
  is_urgent boolean DEFAULT false,
  mechanic_tip text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autoiq_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE autoiq_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoiq_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoiq_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoiq_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_vehicles" ON autoiq_vehicles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_services" ON autoiq_services FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_diagnoses" ON autoiq_diagnoses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_profile" ON autoiq_profiles FOR ALL USING (auth.uid() = id);
