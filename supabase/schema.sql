-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mess_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messes table
CREATE TABLE messes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meals table
CREATE TABLE meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mess_id UUID REFERENCES messes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count DECIMAL(5,2) NOT NULL,
  meal_type CHAR(1) CHECK (meal_type IN ('D', 'N')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mess_id UUID REFERENCES messes(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mess_id UUID REFERENCES messes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mess_id UUID REFERENCES messes(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view their mess" ON messes FOR SELECT USING (id IN (SELECT mess_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage meals in their mess" ON meals FOR ALL USING (mess_id IN (SELECT mess_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage expenses in their mess" ON expenses FOR ALL USING (mess_id IN (SELECT mess_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage messages in their mess" ON messages FOR ALL USING (mess_id IN (SELECT mess_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view logs in their mess" ON activity_logs FOR SELECT USING (mess_id IN (SELECT mess_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert logs" ON activity_logs FOR INSERT WITH CHECK (true);


-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert into messes
CREATE POLICY "Anyone can insert messes" ON messes
  FOR INSERT WITH CHECK (true);

-- Allow users to select messes they belong to
CREATE POLICY "Users can view messes they belong to" ON messes
  FOR SELECT USING (id IN (SELECT mess_id FROM profiles WHERE id = auth.uid()));