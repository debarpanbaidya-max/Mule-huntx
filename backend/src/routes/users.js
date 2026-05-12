const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { getUserGraph } = require('../services/graphSync');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users — list all
router.get('/', authMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const search = req.query.search || '';
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, kyc_status, risk_score, account_status, created_at
       FROM users
       WHERE ($1 = '' OR email ILIKE '%' || $1 || '%' OR full_name ILIKE '%' || $1 || '%')
       ORDER BY risk_score DESC, created_at DESC
       LIMIT $2 OFFSET $3`,
      [search, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id — detail with transaction history
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [user, txHistory, riskHistory, graph] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]),

      pool.query(`
        SELECT t.id, t.amount, t.status, t.created_at,
               CASE WHEN t.from_user_id = $1 THEN 'sent' ELSE 'received' END AS direction,
               CASE WHEN t.from_user_id = $1 THEN tu.email ELSE fu.email END AS counterpart_email,
               CASE WHEN t.from_user_id = $1 THEN tu.full_name ELSE fu.full_name END AS counterpart_name,
               ra.risk_score, ra.decision, ra.triggered_rules
        FROM transactions t
        JOIN users fu ON fu.id = t.from_user_id
        JOIN users tu ON tu.id = t.to_user_id
        LEFT JOIN risk_assessments ra ON ra.transaction_id = t.id
        WHERE t.from_user_id = $1 OR t.to_user_id = $1
        ORDER BY t.created_at DESC
        LIMIT 30
      `, [req.params.id]),

      pool.query(`
        SELECT ra.risk_score, ra.decision, ra.triggered_rules, ra.created_at
        FROM risk_assessments ra
        JOIN transactions t ON t.id = ra.transaction_id
        WHERE t.from_user_id = $1
        ORDER BY ra.created_at DESC
        LIMIT 20
      `, [req.params.id]),

      getUserGraph(req.params.id).catch(() => null),
    ]);

    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });

    res.json({
      user:         user.rows[0],
      transactions: txHistory.rows,
      risk_history: riskHistory.rows,
      graph,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id/risk
router.get('/:id/risk', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT risk_score, kyc_status, account_status FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
