-- =============================================================================
-- Schéma PostgreSQL SAVAA (Client-Serveur : Site Web + Application Mobile)
-- =============================================================================

CREATE TABLE IF NOT EXISTS savaa_meta (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rev BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO savaa_meta (id, rev, updated_at)
VALUES (1, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- Comptes utilisateurs (identifiés par numéro à 10 chiffres)
CREATE TABLE IF NOT EXISTS savaa_accounts (
  phone VARCHAR(20) PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  town TEXT,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Annonces publiées et fiches de traçabilité SAV-TRACE
CREATE TABLE IF NOT EXISTS savaa_listings (
  id VARCHAR(64) PRIMARY KEY,
  owner_phone VARCHAR(20),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  pro_price INTEGER,
  status VARCHAR(24) NOT NULL DEFAULT 'review',
  place TEXT,
  trace_code VARCHAR(64),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savaa_listings_owner ON savaa_listings(owner_phone);
CREATE INDEX IF NOT EXISTS idx_savaa_listings_status ON savaa_listings(status);
CREATE INDEX IF NOT EXISTS idx_savaa_listings_trace ON savaa_listings(trace_code);

-- Alertes sanitaires (Éleveur → Vétérinaires)
CREATE TABLE IF NOT EXISTS savaa_alerts (
  id VARCHAR(64) PRIMARY KEY,
  animal_id VARCHAR(64) NOT NULL,
  from_phone VARCHAR(20),
  urgency VARCHAR(24) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savaa_alerts_status ON savaa_alerts(status);

-- Missions de transport (Acheteur → Transporteurs)
CREATE TABLE IF NOT EXISTS savaa_missions (
  id VARCHAR(64) PRIMARY KEY,
  order_ref VARCHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  courier_phone VARCHAR(20),
  fee INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savaa_missions_order ON savaa_missions(order_ref);
CREATE INDEX IF NOT EXISTS idx_savaa_missions_status ON savaa_missions(status);

-- Demandes de devis B2B (Restaurants / Éleveurs → Fournisseurs)
CREATE TABLE IF NOT EXISTS savaa_quotes (
  id VARCHAR(64) PRIMARY KEY,
  from_phone VARCHAR(20),
  product TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lignes de ventes reçues par les vendeurs
CREATE TABLE IF NOT EXISTS savaa_sales (
  id VARCHAR(64) PRIMARY KEY,
  order_ref VARCHAR(64) NOT NULL,
  listing_id VARCHAR(64) NOT NULL,
  seller_phone VARCHAR(20) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'new',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savaa_sales_seller ON savaa_sales(seller_phone);
CREATE INDEX IF NOT EXISTS idx_savaa_sales_order ON savaa_sales(order_ref);

-- Demandes de vérification vétérinaire de fiches animales
CREATE TABLE IF NOT EXISTS savaa_validations (
  id VARCHAR(64) PRIMARY KEY,
  animal_id VARCHAR(64) NOT NULL,
  from_phone VARCHAR(20),
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Factures B2B émises par les fournisseurs
CREATE TABLE IF NOT EXISTS savaa_invoices (
  id VARCHAR(64) PRIMARY KEY,
  ref VARCHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'due',
  amount INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Commandes récurrentes programmées
CREATE TABLE IF NOT EXISTS savaa_recurring (
  id VARCHAR(64) PRIMARY KEY,
  quote_id VARCHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  next_date VARCHAR(20),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visites vétérinaires sur exploitation
CREATE TABLE IF NOT EXISTS savaa_visits (
  id VARCHAR(64) PRIMARY KEY,
  from_phone VARCHAR(20),
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vérification des justificatifs professionnels (KYC Back-Office)
CREATE TABLE IF NOT EXISTS savaa_kyc (
  id VARCHAR(64) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'review',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savaa_kyc_phone ON savaa_kyc(phone);

-- Livreurs en service et zones de couverture
CREATE TABLE IF NOT EXISTS savaa_couriers (
  phone VARCHAR(20) PRIMARY KEY,
  name TEXT NOT NULL,
  vehicle VARCHAR(32) NOT NULL,
  base TEXT NOT NULL,
  radius INTEGER NOT NULL DEFAULT 15,
  online BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations de messagerie interne et offres négociées
CREATE TABLE IF NOT EXISTS savaa_threads (
  id VARCHAR(64) PRIMARY KEY,
  kind VARCHAR(24) NOT NULL,
  ref_id VARCHAR(64),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Avis clients sur les boutiques vendeurs
CREATE TABLE IF NOT EXISTS savaa_reviews (
  id VARCHAR(64) PRIMARY KEY,
  seller TEXT NOT NULL,
  rating SMALLINT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savaa_reviews_seller ON savaa_reviews(seller);

-- Dossiers investisseurs, catalogue de projets agricoles, propositions et CRM
CREATE TABLE IF NOT EXISTS savaa_kv (
  key VARCHAR(128) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
