-- ============================================================
-- TAP-TAP-NFC : PostgreSQL Database Schema (Option A)
-- Compatible with Neon, Supabase, Vercel Postgres, AWS RDS
-- ============================================================

-- 1. Table Utilisateurs (Admins & Clients) avec mots de passe bcrypt
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Format $2a$ / $2b$ (bcrypt)
    role VARCHAR(50) NOT NULL DEFAULT 'client', -- 'admin', 'client'
    name VARCHAR(255),
    badge VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));

-- 2. Table Commandes
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    code_client VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    entreprise VARCHAR(255) NOT NULL,
    nom_client VARCHAR(255) NOT NULL,
    telephone VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    adresse TEXT,
    lien_google TEXT,
    formule VARCHAR(100) DEFAULT 'Pack 2 cartes NFC',
    prix NUMERIC(10, 2) DEFAULT 70.00,
    statut VARCHAR(50) DEFAULT 'Nouvelle',
    etape VARCHAR(100) DEFAULT '1. Prise en charge',
    notes_configuration TEXT,
    date_livraison_prevue VARCHAR(100),
    reception_client BOOLEAN DEFAULT FALSE,
    message_client TEXT,
    derniere_modif_par VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code_client);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(LOWER(email));

-- 3. Table Incidents & SAV
CREATE TABLE IF NOT EXISTS sav_tickets (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    code_commande VARCHAR(50) NOT NULL,
    client_nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(50),
    entreprise VARCHAR(255),
    probleme VARCHAR(255) NOT NULL,
    description TEXT,
    localisation VARCHAR(100),
    statut VARCHAR(50) DEFAULT 'Nouveau ticket',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sav_code ON sav_tickets(code_commande);
CREATE INDEX IF NOT EXISTS idx_sav_email ON sav_tickets(LOWER(email));
