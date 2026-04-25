-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================
-- PROVIDERS (MAIN TABLE)
-- ===============================
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id SERIAL UNIQUE,

    name VARCHAR(120) NOT NULL,
    profile_title VARCHAR(180),

    city VARCHAR(80) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'Massage Therapist',

    price INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT false,

    age INTEGER,
    nationality VARCHAR(80),
    hair VARCHAR(50),
    eyes VARCHAR(50),
    height VARCHAR(50),

    phone VARCHAR(30),

    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    telegram_enabled BOOLEAN NOT NULL DEFAULT false,

    service_mode VARCHAR(20) NOT NULL DEFAULT 'in_call',

    bio TEXT,

    email VARCHAR(255) UNIQUE,
    password_hash TEXT,

    plan_id VARCHAR(50) DEFAULT 'essential',
    plan_duration VARCHAR(20) DEFAULT '7d',

    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_service_mode CHECK (service_mode IN ('in_call', 'out_call', 'both'))
);

-- ===============================
-- LOCATIONS (MULTIPLE AREAS)
-- ===============================
CREATE TABLE provider_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    area_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===============================
-- LOCATION TYPES (Studio / Mobile)
-- ===============================
CREATE TABLE provider_location_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    location_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_location_type CHECK (location_type IN ('Studio', 'Mobile'))
);

-- ===============================
-- SERVICES
-- ===============================
CREATE TABLE provider_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_name VARCHAR(120) NOT NULL,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===============================
-- RATES
-- ===============================
CREATE TABLE provider_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    rate_label VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===============================
-- MEDIA (IMAGES + VIDEOS)
-- ===============================
CREATE TABLE provider_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    media_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    poster_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_media_type CHECK (media_type IN ('image', 'video'))
);

-- ===============================
-- BADGES (TRUST / STATUS)
-- ===============================
CREATE TABLE provider_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    badge_label VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===============================
-- INDEXES (PERFORMANCE)
-- ===============================
CREATE INDEX idx_providers_city ON providers(city);
CREATE INDEX idx_providers_verified ON providers(verified);

CREATE INDEX idx_provider_locations_provider_id ON provider_locations(provider_id);
CREATE INDEX idx_provider_location_types_provider_id ON provider_location_types(provider_id);
CREATE INDEX idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX idx_provider_rates_provider_id ON provider_rates(provider_id);
CREATE INDEX idx_provider_media_provider_id ON provider_media(provider_id);
CREATE INDEX idx_provider_badges_provider_id ON provider_badges(provider_id);