const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { syncTransactionToGraph } = require('../services/graphSync');
const { evaluateRules } = require('../services/ruleEngine');
const { authMiddleware } = require('../middleware/auth');

async function getOrCreateDevice(fingerprint, browser, os) {
  const result = await pool.query(
    `INSERT INTO devices (fingerprint, browser, os)
     VALUES ($1, $2, $3)
     ON CONFLICT (fingerprint) DO UPDATE SET last_seen = NOW()
     RETURNING id`,
    [fingerprint, browser || 'Unknown', os || 'Unknown']
  );
  return result.rows[0].id;
}

async function getOrCreateIP(address, countryCode, isProxy) {
  const safeAddress = (address && address.trim()) ? address.trim() : '0.0.0.0';
  const result = await pool.query(
    `INSERT INTO ips (address, country_code, is_proxy)
     VALUES ($1, $2, $3)
     ON CONFLICT (address) DO UPDATE SET last_seen = NOW()
     RETURNING id`,
    [safeAddress, countryCode || 'XX', isProxy || false]
  );
  return result.rows[0].id;
}

// POST /api/transaction/validate
router.post('/validate', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  const {
    from_user_id, to_user_id, amount,
    from_email, to_email,
    device_fingerprint = 'unknown', device_browser, device_os,
    ip_address = '0.0.0.0', ip_country, ip_is_proxy,
    note,
  } = req.body;

  if (!from_user_id || !to_user_id || !amount) {
    return res.status(400).json({ error: 'from_user_id, to_user_id, and amount are required' });
  }

  try {
    // Auto-create users if they don't exist
    await pool.query(
      `INSERT INTO users (id, email, full_name, kyc_status)
       VALUES ($1, $2, $3, 'verified')
       ON CONFLICT (id) DO NOTHING`,
      [from_user_id, from_email || `user${from_user_id}@auto.com`, `User ${from_user_id}`]
    );
    await pool.query(
      `INSERT INTO users (id, email, full_name, kyc_status)
       VALUES ($1, $2, $3, 'verified')
       ON CONFLICT (id) DO NOTHING`,
      [to_user_id, to_email || `user${to_user_id}@auto.com`, `User ${to_user_id}`]
    );

    const deviceId = await getOrCreateDevice(device_fingerprint, device_browser, device_os);
    const ipId = await getOrCreateIP(ip_address, ip_country, ip_is_proxy);

    const txResult = await pool.query(
      `INSERT INTO transactions (from_user_id, to_user_id, amount, device_id, ip_id, status, note)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6) RETURNING *`,
      [from_user_id, to_user_id, amount, deviceId, ipId, note || null]
    );
    const transaction = txResult.rows[0];

    // Sync to Neo4j (non-blocking)
    syncTransactionToGraph({ ...transaction, device_fingerprint, ip_address }).catch(e =>
      console.warn('Graph sync failed:', e.message)
    );

    const riskResult = await evaluateRules({
      userId:        from_user_id,
      toUserId:      to_user_id,
      amount:        parseFloat(amount),
      deviceId,
      ipId,
      transactionId: transaction.id,
    });

    // Cap score at 100
    const finalScore = Math.min(riskResult.score, 100);

    let decision;
    if (finalScore > 70)      decision = 'BLOCK';
    else if (finalScore > 40) decision = 'REVIEW';
    else                      decision = 'ALLOW';

    await pool.query(
      `UPDATE transactions SET status = $1 WHERE id = $2`,
      [decision.toLowerCase(), transaction.id]
    );

    const processingTime = Date.now() - startTime;

    await pool.query(
      `INSERT INTO risk_assessments
         (transaction_id, risk_score, decision, triggered_rules, processing_time_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [transaction.id, finalScore, decision,
       JSON.stringify(riskResult.triggeredRules), processingTime]
    );

    // Update user risk score — capped at 100 in DB too
    await pool.query(
      `UPDATE users
       SET risk_score = LEAST(GREATEST(risk_score, $1), 100),
           updated_at = NOW()
       WHERE id = $2`,
      [finalScore, from_user_id]
    );

    res.json({
      transaction_id:     transaction.id,
      decision,
      risk_score:         finalScore,
      triggered_rules:    riskResult.triggeredRules,
      processing_time_ms: processingTime,
    });

  } catch (err) {
    console.error('Transaction validation error:', err);
    res.status(500).json({ error: 'Processing failed', message: err.message });
  }
});

// GET /api/transaction/recent
router.get('/recent', authMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const result = await pool.query(`
      SELECT
        t.id, t.amount, t.status, t.created_at,
        t.from_user_id, t.to_user_id,
        fu.email AS from_email, fu.full_name AS from_name, fu.risk_score AS from_risk,
        tu.email AS to_email,   tu.full_name AS to_name,   tu.risk_score AS to_risk,
        ra.risk_score, ra.decision, ra.triggered_rules, ra.processing_time_ms,
        d.browser, d.os,
        i.address AS ip_address, i.country_code, i.is_proxy
      FROM transactions t
      JOIN users fu ON fu.id = t.from_user_id
      JOIN users tu ON tu.id = t.to_user_id
      LEFT JOIN risk_assessments ra ON ra.transaction_id = t.id
      LEFT JOIN devices d ON d.id = t.device_id
      LEFT JOIN ips i ON i.id = t.ip_id
      ORDER BY t.created_at DESC
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transaction/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.*, ra.risk_score, ra.decision, ra.triggered_rules, ra.processing_time_ms,
        fu.email AS from_email, fu.full_name AS from_name,
        tu.email AS to_email,   tu.full_name AS to_name,
        d.fingerprint, d.browser, d.os,
        i.address AS ip_address, i.country_code, i.is_proxy
      FROM transactions t
      JOIN users fu ON fu.id = t.from_user_id
      JOIN users tu ON tu.id = t.to_user_id
      LEFT JOIN risk_assessments ra ON ra.transaction_id = t.id
      LEFT JOIN devices d ON d.id = t.device_id
      LEFT JOIN ips i ON i.id = t.ip_id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Transaction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;