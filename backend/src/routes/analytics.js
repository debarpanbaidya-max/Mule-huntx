const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { getMuleRings } = require('../services/graphSync');
const { authMiddleware } = require('../middleware/auth');

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT
        COUNT(*)::int                                              AS total_transactions,
        COALESCE(SUM(amount), 0)                                  AS total_volume,
        COUNT(*) FILTER (WHERE status = 'block')::int             AS blocked_count,
        COUNT(*) FILTER (WHERE status = 'review')::int            AS review_count,
        COUNT(*) FILTER (WHERE status = 'allow')::int             AS allow_count,
        COALESCE(AVG(ra.processing_time_ms), 0)                   AS avg_processing_ms
      FROM transactions t
      LEFT JOIN risk_assessments ra ON ra.transaction_id = t.id
      WHERE t.created_at > NOW() - INTERVAL '30 days'
    `);

    const riskDist = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE risk_score < 40)::int             AS low_risk,
        COUNT(*) FILTER (WHERE risk_score BETWEEN 40 AND 70)::int AS medium_risk,
        COUNT(*) FILTER (WHERE risk_score > 70)::int             AS high_risk
      FROM risk_assessments
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const recentAlerts = await pool.query(`
      SELECT t.id, t.amount, t.created_at, t.from_user_id,
             ra.risk_score, ra.decision, ra.triggered_rules,
             fu.email AS from_email, fu.full_name AS from_name,
             tu.email AS to_email,   tu.full_name AS to_name
      FROM transactions t
      JOIN risk_assessments ra ON ra.transaction_id = t.id
      JOIN users fu ON fu.id = t.from_user_id
      JOIN users tu ON tu.id = t.to_user_id
      WHERE ra.decision IN ('BLOCK', 'REVIEW')
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    const dailyVolume = await pool.query(`
      SELECT
        DATE(created_at)                                    AS date,
        COUNT(*)::int                                       AS tx_count,
        COALESCE(SUM(amount), 0)                            AS volume,
        COUNT(*) FILTER (WHERE status = 'block')::int       AS blocked
      FROM transactions
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const suspiciousUsers = await pool.query(`
      SELECT id, email, full_name, risk_score, kyc_status, account_status, created_at
      FROM users
      WHERE risk_score > 40
      ORDER BY risk_score DESC
      LIMIT 8
    `);

    res.json({
      summary:           summary.rows[0],
      risk_distribution: riskDist.rows[0],
      recent_alerts:     recentAlerts.rows,
      daily_volume:      dailyVolume.rows,
      suspicious_users:  suspiciousUsers.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/mule-rings', authMiddleware, async (req, res) => {
  try {
    const rings = await getMuleRings(20);
    res.json({ rings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rules-breakdown', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT triggered_rules FROM risk_assessments
      WHERE created_at > NOW() - INTERVAL '30 days'
        AND triggered_rules IS NOT NULL
    `);
    const counts = {};
    for (const row of result.rows) {
      for (const r of (row.triggered_rules || [])) {
        const key = r.name || r.id;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    res.json(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;