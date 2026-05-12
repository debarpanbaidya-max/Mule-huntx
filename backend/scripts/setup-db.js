const pool = require('../src/config/database');

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up database schemas...');
    
    await client.query(`
      -- Auth users table (for OAuth2)
      CREATE TABLE IF NOT EXISTS auth_users (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        avatar VARCHAR(500),
        role VARCHAR(20) DEFAULT 'analyst',
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP DEFAULT NOW(),
        UNIQUE(provider, provider_id)
      );

      -- Users table (financial accounts)
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(15),
        full_name VARCHAR(255),
        kyc_status VARCHAR(20) DEFAULT 'pending',
        risk_score INTEGER DEFAULT 0,
        account_status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_risk ON users(risk_score);
      CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Devices table
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        fingerprint VARCHAR(255) UNIQUE NOT NULL,
        browser VARCHAR(100),
        os VARCHAR(100),
        device_type VARCHAR(50),
        first_seen TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(fingerprint);

      -- IPs table
      CREATE TABLE IF NOT EXISTS ips (
        id SERIAL PRIMARY KEY,
        address INET UNIQUE NOT NULL,
        country_code VARCHAR(2),
        is_proxy BOOLEAN DEFAULT FALSE,
        risk_level INTEGER DEFAULT 0,
        first_seen TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ips_address ON ips(address);

      -- Transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id),
        to_user_id INTEGER NOT NULL REFERENCES users(id),
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        device_id INTEGER REFERENCES devices(id),
        ip_id INTEGER REFERENCES ips(id),
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_txn_from_user_time ON transactions(from_user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_txn_to_user_time ON transactions(to_user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_txn_device ON transactions(device_id);
      CREATE INDEX IF NOT EXISTS idx_txn_ip ON transactions(ip_id);
      CREATE INDEX IF NOT EXISTS idx_txn_created ON transactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);

      -- Risk assessments table
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id),
        risk_score INTEGER NOT NULL,
        decision VARCHAR(10) NOT NULL,
        triggered_rules JSONB,
        processing_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_risk_transaction ON risk_assessments(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_risk_decision ON risk_assessments(decision);
      CREATE INDEX IF NOT EXISTS idx_risk_created ON risk_assessments(created_at DESC);
    `);

    console.log('✅ Database schemas created');

    // Seed demo data
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('🌱 Seeding demo data...');
      await seedDemoData(client);
      console.log('✅ Demo data seeded');
    }

  } finally {
    client.release();
    pool.end();
  }
}

async function seedDemoData(client) {
  // Insert demo users
  const users = [
    { email: 'alice@demo.com', name: 'Alice Chen', kyc: 'verified', risk: 15 },
    { email: 'bob@demo.com', name: 'Bob Kumar', kyc: 'verified', risk: 72 },
    { email: 'charlie@demo.com', name: 'Charlie Raj', kyc: 'pending', risk: 89 },
    { email: 'diana@demo.com', name: 'Diana Priya', kyc: 'verified', risk: 45 },
    { email: 'eve@demo.com', name: 'Eve Sharma', kyc: 'verified', risk: 12 },
    { email: 'frank@demo.com', name: 'Frank Patel', kyc: 'failed', risk: 95 },
    { email: 'grace@demo.com', name: 'Grace Singh', kyc: 'verified', risk: 33 },
    { email: 'henry@demo.com', name: 'Henry Das', kyc: 'pending', risk: 67 },
  ];

  const userIds = [];
  for (const u of users) {
    const r = await client.query(
      `INSERT INTO users (email, full_name, kyc_status, risk_score, created_at)
       VALUES ($1, $2, $3, $4, NOW() - interval '${Math.floor(Math.random()*180)} days')
       ON CONFLICT (email) DO UPDATE SET risk_score = EXCLUDED.risk_score
       RETURNING id`,
      [u.email, u.name, u.kyc, u.risk]
    );
    userIds.push(r.rows[0].id);
  }

  // Insert demo devices
  const deviceResult = await client.query(`
    INSERT INTO devices (fingerprint, browser, os, device_type) VALUES
    ('fp_abc123', 'Chrome', 'Windows', 'desktop'),
    ('fp_def456', 'Safari', 'macOS', 'desktop'),
    ('fp_ghi789', 'Chrome', 'Android', 'mobile'),
    ('fp_jkl012', 'Firefox', 'Linux', 'desktop'),
    ('fp_mno345', 'Chrome', 'iOS', 'mobile')
    ON CONFLICT (fingerprint) DO NOTHING
    RETURNING id
  `);

  // Insert demo IPs
  const ipResult = await client.query(`
    INSERT INTO ips (address, country_code, is_proxy, risk_level) VALUES
    ('192.168.1.100', 'IN', false, 0),
    ('10.0.0.1', 'IN', false, 10),
    ('172.16.0.1', 'US', true, 50),
    ('203.0.113.1', 'CN', true, 80),
    ('198.51.100.1', 'RU', false, 30)
    ON CONFLICT (address) DO NOTHING
    RETURNING id
  `);

  // Create some demo transactions
  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const fromIdx = Math.floor(Math.random() * userIds.length);
    let toIdx = Math.floor(Math.random() * userIds.length);
    while (toIdx === fromIdx) toIdx = Math.floor(Math.random() * userIds.length);
    
    const amount = Math.floor(Math.random() * 100000) + 1000;
    const statuses = ['allow', 'review', 'block'];
    const status = statuses[Math.floor(Math.random() * 3)];
    const daysAgo = Math.floor(Math.random() * 30);
    
    const txResult = await client.query(
      `INSERT INTO transactions (from_user_id, to_user_id, amount, status, device_id, ip_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - interval '${daysAgo} days')
       RETURNING id`,
      [userIds[fromIdx], userIds[toIdx], amount, status, 1, 1]
    );

    const riskScore = status === 'allow' ? Math.floor(Math.random() * 40) :
                      status === 'review' ? 40 + Math.floor(Math.random() * 30) :
                      71 + Math.floor(Math.random() * 29);

    await client.query(
      `INSERT INTO risk_assessments (transaction_id, risk_score, decision, triggered_rules, processing_time_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW() - interval '${daysAgo} days')`,
      [txResult.rows[0].id, riskScore, status.toUpperCase(), 
       JSON.stringify([]), Math.floor(Math.random() * 400) + 100]
    );
  }
}

setupDatabase().catch(console.error);
