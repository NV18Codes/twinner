# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Name**: twinner
   - **Database Password**: (choose a strong password)
   - **Region**: Choose closest to South Africa
5. Click "Create new project"
6. Wait for project to be created (2-3 minutes)

## 2. Run SQL Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. Wait for all tables to be created

## 3. Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see these tables:
   - `users`
   - `sessions`
   - `organizations`
   - `spaces`
   - `space_types`
   - `assets`
   - `asset_types`
   - `properties`
   - `media`
   - `locations`
   - `annotations`

## 4. Get Your Supabase Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy:
   - **Project URL**: `https://ygdgseszosvavgvvcfkj.supabase.co` (already configured)
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (already configured)

## 5. Test Connection

The frontend is already configured with:
- Supabase URL: `https://ygdgseszosvavgvvcfkj.supabase.co`
- Anon Key: (in `supabase-config.js`)

## 6. Next Steps

1. **Update backend** to use Supabase instead of SQLite
2. **Test media uploads** - they should save to Supabase
3. **Test authentication** - can use Supabase Auth or keep current system
4. **Test annotations** - drawn shapes should save to Supabase

## Database Structure

### Main Tables:
- **media**: Stores uploaded images/videos with geotags
- **users**: User accounts
- **sessions**: Authentication sessions
- **organizations**: Organization hierarchy
- **spaces**: Physical spaces within organizations
- **assets**: Individual assets
- **asset_types**: Categories (Solar, Equipment, Building, etc.)
- **annotations**: Drawn shapes on map

### Relationships:
- Media → User (who uploaded)
- Media → Organization, Space, Asset Type, Property
- Annotations → User (who created)

## Row Level Security (RLS)

RLS is enabled on:
- `media` - Public read, users can only modify their own
- `annotations` - Public read, users can only modify their own

## Notes

- All coordinates are stored as `REAL` (floating point)
- File data is stored as Base64 TEXT (consider using Supabase Storage for large files)
- Timestamps use `TIMESTAMP WITH TIME ZONE`
- UUIDs are used for all primary keys

