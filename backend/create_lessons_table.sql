-- Create the lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    lesson_id VARCHAR(255) NOT NULL UNIQUE,
    user_profile_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Lesson content
    text TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    positive BOOLEAN DEFAULT TRUE,
    confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    requires_context BOOLEAN DEFAULT FALSE,
    context TEXT,
    
    -- Usage tracking
    helpful_count INTEGER DEFAULT 0,
    harmful_count INTEGER DEFAULT 0,
    times_applied INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Source tracking
    source_plan_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one lesson_id per user_profile
    CONSTRAINT unique_lesson_per_user UNIQUE (lesson_id, user_profile_id)
);

-- Enable Row Level Security
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own lessons
CREATE POLICY "Users can read their own lessons"
    ON lessons
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = lessons.user_profile_id
            AND user_profiles.user_id::text = auth.uid()::text
        )
    );

-- Policy: Users can insert their own lessons
CREATE POLICY "Users can insert their own lessons"
    ON lessons
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = lessons.user_profile_id
            AND user_profiles.user_id::text = auth.uid()::text
        )
    );

-- Policy: Users can update their own lessons
CREATE POLICY "Users can update their own lessons"
    ON lessons
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = lessons.user_profile_id
            AND user_profiles.user_id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = lessons.user_profile_id
            AND user_profiles.user_id::text = auth.uid()::text
        )
    );

-- Policy: Users can delete their own lessons
CREATE POLICY "Users can delete their own lessons"
    ON lessons
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = lessons.user_profile_id
            AND user_profiles.user_id::text = auth.uid()::text
        )
    );

-- Create indexes for common queries
CREATE INDEX idx_lessons_user_profile_id ON lessons(user_profile_id);
CREATE INDEX idx_lessons_lesson_id ON lessons(lesson_id);
CREATE INDEX idx_lessons_tags ON lessons USING GIN(tags);
CREATE INDEX idx_lessons_confidence ON lessons(confidence);
CREATE INDEX idx_lessons_created_at ON lessons(created_at);
CREATE INDEX idx_lessons_last_used_at ON lessons(last_used_at);
CREATE INDEX idx_lessons_positive ON lessons(positive);
CREATE INDEX idx_lessons_source_plan_id ON lessons(source_plan_id);

-- Full-text search index on lesson text
CREATE INDEX idx_lessons_text_search ON lessons USING GIN(to_tsvector('english', text));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lessons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_lessons_updated_at();
