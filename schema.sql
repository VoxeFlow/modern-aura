-- Schema Inicial O MONSTRO

DROP TABLE IF EXISTS products;
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  owner_id TEXT, -- Email do dono do produto (NULL = Global/Admin)
  name TEXT NOT NULL,
  price REAL NOT NULL,
  description_detailed TEXT, -- RAG: Descrição completa para IA
  rag_files TEXT, -- JSON Array: Arquivos {name, type, content/url}
  benefits_list TEXT, -- JSON Array: Lista de benefícios
  faq_list TEXT, -- JSON Array: Perguntas frequentes
  image_url TEXT, -- URL da imagem principal
  features TEXT, -- JSON string (Legacy)
  not_features TEXT, -- JSON string (Legacy)
  highlight BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at INTEGER DEFAULT (unixepoch())

);

DROP TABLE IF EXISTS brains;
CREATE TABLE IF NOT EXISTS brains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT UNIQUE NOT NULL, -- One brain per user
  persona TEXT, -- Who is the AI?
  business_name TEXT,
  business_description TEXT, -- What do we sell?
  tone TEXT DEFAULT 'neutro', -- friendly, aggressive, professional
  rag_files TEXT, -- JSON Array of file objects
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index
CREATE INDEX IF NOT EXISTS idx_brains_owner ON brains(owner_id);

DROP TABLE IF EXISTS crm_stages;
CREATE TABLE IF NOT EXISTS crm_stages (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#86868b',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crm_stages_owner ON crm_stages(owner_id);

DROP TABLE IF EXISTS leads;
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT, -- Link to User (Affiliate)
  phone TEXT NOT NULL, -- WhatsApp ID
  name TEXT, -- Lead Name (from WA profile)
  status TEXT DEFAULT 'new', -- new, contacting, negotiation, closed, lost
  ai_active BOOLEAN DEFAULT TRUE, -- AI Control Toggle
  last_message TEXT,
  last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

DROP TABLE IF EXISTS config;
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);

DROP TABLE IF EXISTS instances;
CREATE TABLE IF NOT EXISTS instances (
  instance_name TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  api_key TEXT, -- Chave da Evolution (se usuario fornecer)
  created_at INTEGER DEFAULT (unixepoch())
);

DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'client', -- admin, client
  approved BOOLEAN DEFAULT FALSE, -- Requires Cloudflare D1 doesn't support BOOLEAN literals nicely sometimes, but updates work. 0/1 is safer if issues arise, but let's stick to standard SQL first.
  subscription_status TEXT DEFAULT 'free', -- free, active, past_due, canceled
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Admin User (Senha: admin123 - Hash mock for now or implement real hash in API)
-- For MVP without bcrypt lib in Edge easily, we might use crypto.subtle or just simple matching for now if libs complicate. 
-- Let's assume the API handles hashing. We won't insert a user manually here to avoid hash mismatch.
-- But the user needs an initial admin. I will handle the first user creation as Admin in the signup code or providing a rigorous seed later.
-- Actually, let's insert a seed Admin if generic.
-- INSERT OR IGNORE INTO users (id, email, password_hash, role, approved) VALUES ('admin-seed', 'admin@monstro.com', 'admin_hash_placeholder', 'admin', TRUE);

-- Seed Data
INSERT INTO products (id, name, price, features, not_features, highlight, link) VALUES 
('basic', 'INICIANTE', 97, '["Protocolo de Treino", "Dieta Flexível"]', '["Suporte Premium", "Acesso ao Grupo VIP"]', 0, 'https://pay.kiwify.com.br/EXEMPLO-BASIC'),
('monstro', 'O MONSTRO', 197, '["Treino Periodizado", "Dieta Personalizada (IA)", "Suporte WhatsApp 24h", "Acesso Vitalício"]', '[]', 1, 'https://pay.kiwify.com.br/EXEMPLO-MONSTRO'),
('mentoring', 'MENTORIA', 497, '["Tudo do MONSTRO", "Acompanhamento Individual", "Chamadas Quinzenais", "Ajustes Semanais"]', '[]', 0, 'https://pay.kiwify.com.br/EXEMPLO-MENTORIA');

INSERT INTO config (key, value) VALUES 
('whatsapp_number', '5511999999999'),
('bot_name', 'O MONSTRO');
