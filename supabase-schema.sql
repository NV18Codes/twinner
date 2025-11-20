-- TWINNIR Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (for authentication)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Space Types table
CREATE TABLE IF NOT EXISTS space_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset Types table
CREATE TABLE IF NOT EXISTS asset_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    color TEXT, -- Hex color code for visualization
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media table (main table for uploaded images/videos)
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_data TEXT NOT NULL, -- Base64 encoded file data
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    
    -- Category fields (stored as JSON or separate columns)
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
    space_type_id UUID REFERENCES space_types(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    asset_type_id UUID REFERENCES asset_types(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Legacy category field (for backward compatibility)
    category TEXT, -- 'solar', 'equipment', 'building', 'infrastructure', 'other'
    
    description TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    file_size INTEGER, -- Size in bytes
    mime_type TEXT,
    
    CONSTRAINT valid_coordinates CHECK (
        latitude >= -90 AND latitude <= 90 AND
        longitude >= -180 AND longitude <= 180
    )
);

-- Locations table (grouped locations for map markers)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    category TEXT, -- Legacy field
    asset_type_id UUID REFERENCES asset_types(id) ON DELETE SET NULL,
    media_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_location_coordinates CHECK (
        latitude >= -90 AND latitude <= 90 AND
        longitude >= -180 AND longitude <= 180
    ),
    
    UNIQUE(latitude, longitude, asset_type_id)
);

-- Annotations table (for drawn shapes on map)
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    annotation_type TEXT NOT NULL CHECK (annotation_type IN ('marker', 'polyline', 'polygon', 'rectangle', 'circle')),
    geometry JSONB NOT NULL, -- GeoJSON geometry
    properties JSONB, -- Additional properties
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_location ON media(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_media_asset_type ON media(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_media_organization ON media(organization_id);
CREATE INDEX IF NOT EXISTS idx_media_space ON media(space_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_annotations_user ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(annotation_type);

-- Insert default data
INSERT INTO organizations (name, description) VALUES 
    ('Busby Sawmills', 'Main industrial facility'),
    ('Organization 1', 'Secondary organization'),
    ('Organization 2', 'Tertiary organization')
ON CONFLICT DO NOTHING;

INSERT INTO space_types (name, description) VALUES 
    ('Industrial', 'Industrial spaces'),
    ('Office', 'Office spaces'),
    ('Warehouse', 'Warehouse spaces')
ON CONFLICT (name) DO NOTHING;

INSERT INTO asset_types (name, color, description) VALUES 
    ('Solar Panels', '#ff9800', 'Solar panel installations'),
    ('Equipment', '#9c27b0', 'Industrial equipment'),
    ('Buildings', '#2196f3', 'Building structures'),
    ('Infrastructure', '#4caf50', 'Infrastructure assets'),
    ('Other', '#607d8b', 'Other asset types')
ON CONFLICT (name) DO NOTHING;

INSERT INTO properties (name, description) VALUES 
    ('Active', 'Active assets'),
    ('Inactive', 'Inactive assets'),
    ('Maintenance', 'Assets under maintenance')
ON CONFLICT (name) DO NOTHING;

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all media (public view)
CREATE POLICY "Public media read" ON media
    FOR SELECT
    USING (true);

-- Policy: Users can insert their own media
CREATE POLICY "Users can insert own media" ON media
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own media
CREATE POLICY "Users can update own media" ON media
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own media
CREATE POLICY "Users can delete own media" ON media
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Users can read all annotations
CREATE POLICY "Public annotations read" ON annotations
    FOR SELECT
    USING (true);

-- Policy: Users can insert their own annotations
CREATE POLICY "Users can insert own annotations" ON annotations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own annotations
CREATE POLICY "Users can update own annotations" ON annotations
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own annotations
CREATE POLICY "Users can delete own annotations" ON annotations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update location count when media is inserted
CREATE OR REPLACE FUNCTION update_location_count()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO locations (latitude, longitude, asset_type_id, media_count)
    VALUES (NEW.latitude, NEW.longitude, NEW.asset_type_id, 1)
    ON CONFLICT (latitude, longitude, asset_type_id)
    DO UPDATE SET media_count = locations.media_count + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_location_on_media_insert
    AFTER INSERT ON media
    FOR EACH ROW
    EXECUTE FUNCTION update_location_count();

