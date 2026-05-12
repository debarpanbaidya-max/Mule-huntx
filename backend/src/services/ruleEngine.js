const pool = require('../config/database');
const neo4jDriver = require('../config/neo4j');

const FRAUD_RULES = [
  // ── PostgreSQL Rules ──────────────────────────────────────────────────────
  {
    id: 'R1',
    name: 'velocity_check',
    weight: 20,
    source: 'postgresql',
    description: 'More than 10 transactions in 10 minutes',
    check: async (ctx) => {
      const result = await pool.query(
        `SELECT COUNT(*) AS tx_count FROM transactions
         WHERE from_user_id = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
        [ctx.userId]
      );
      return parseInt(result.rows[0].tx_count) > 10;
    },
  },

  {
    id: 'R7',
    name: 'dormant_reactivation',
    weight: 30,
    source: 'postgresql',
    description: 'Account inactive for 90+ days suddenly active',
    check: async (ctx) => {
      const result = await pool.query(
        `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))/86400 AS days_dormant
         FROM transactions WHERE from_user_id = $1 OR to_user_id = $1`,
        [ctx.userId]
      );
      const days = parseFloat(result.rows[0]?.days_dormant) || 0;
      return days >= 90;
    },
  },

  {
    id: 'R8',
    name: 'unusual_time_pattern',
    weight: 15,
    source: 'postgresql',
    description: 'Transaction 8+ hours outside typical pattern',
    check: async (ctx) => {
      const currentHour = new Date().getHours();
      const result = await pool.query(
        `SELECT EXTRACT(HOUR FROM created_at) AS hour
         FROM transactions WHERE from_user_id = $1
         GROUP BY EXTRACT(HOUR FROM created_at)
         ORDER BY COUNT(*) DESC LIMIT 1`,
        [ctx.userId]
      );
      if (!result.rows[0]) return false;
      const typicalHour = parseInt(result.rows[0].hour);
      return Math.abs(currentHour - typicalHour) > 8;
    },
  },

  {
    id: 'R10',
    name: 'amount_anomaly',
    weight: 20,
    source: 'postgresql',
    description: 'Amount 3+ std deviations from user average',
    check: async (ctx) => {
      const result = await pool.query(
        `SELECT AVG(amount) AS avg_amount, STDDEV(amount) AS stddev_amount
         FROM transactions
         WHERE from_user_id = $1 AND created_at > NOW() - INTERVAL '90 days' AND amount > 0`,
        [ctx.userId]
      );
      const avg = parseFloat(result.rows[0]?.avg_amount) || 0;
      const std = parseFloat(result.rows[0]?.stddev_amount) || 0;
      if (avg === 0 || std === 0) return false;
      return Math.abs((ctx.amount - avg) / std) >= 3;
    },
  },

  // ── Neo4j Rules ───────────────────────────────────────────────────────────
  {
    id: 'R2',
    name: 'circular_flow',
    weight: 40,
    source: 'neo4j',
    description: 'Money cycles back to origin in 2-4 hops',
    check: async (ctx) => {
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          `MATCH path = (u:User {id: $userId})-[:SENT*2..4]->(u)
           WHERE ALL(r IN relationships(path)
             WHERE r.timestamp > datetime() - duration({days: 7}))
           RETURN count(path) AS cycles`,
          { userId: String(ctx.userId) }
        );
        return (result.records[0]?.get('cycles').toNumber() || 0) > 0;
      } finally {
        await session.close();
      }
    },
  },

  {
    id: 'R3',
    name: 'device_sharing',
    weight: 30,
    source: 'neo4j',
    description: 'Device used by 5+ different accounts',
    check: async (ctx) => {
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          `MATCH (d:Device {id: $deviceId})<-[:USED_DEVICE]-(u:User)
           WHERE u.created_at > datetime() - duration({days: 30})
           RETURN count(DISTINCT u) AS user_count`,
          { deviceId: String(ctx.deviceId) }
        );
        return (result.records[0]?.get('user_count').toNumber() || 0) >= 5;
      } finally {
        await session.close();
      }
    },
  },

  {
    id: 'R4',
    name: 'rapid_layering',
    weight: 35,
    source: 'neo4j',
    description: 'Money received and forwarded within 1 hour',
    check: async (ctx) => {
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          `MATCH (u:User {id: $userId})-[r1:SENT]->(mid:User)-[r2:SENT]->()
           WHERE duration.between(r1.timestamp, r2.timestamp).minutes < 60
             AND r2.amount >= r1.amount * 0.8
           RETURN count(*) AS layering_count`,
          { userId: String(ctx.userId) }
        );
        return (result.records[0]?.get('layering_count').toNumber() || 0) > 0;
      } finally {
        await session.close();
      }
    },
  },

  {
    id: 'R5',
    name: 'ip_clustering',
    weight: 25,
    source: 'neo4j',
    description: 'IP used to create 3+ accounts in 7 days',
    check: async (ctx) => {
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          `MATCH (ip:IP {id: $ipId})<-[:USED_IP]-(u:User)
           WHERE u.created_at > datetime() - duration({days: 7})
           RETURN count(DISTINCT u) AS new_accounts`,
          { ipId: String(ctx.ipId) }
        );
        return (result.records[0]?.get('new_accounts').toNumber() || 0) >= 3;
      } finally {
        await session.close();
      }
    },
  },

  {
    id: 'R9',
    name: 'suspicious_recipient_network',
    weight: 35,
    source: 'neo4j',
    description: 'Account receives from 10+ different senders',
    check: async (ctx) => {
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          `MATCH (sender:User)-[:SENT]->(recipient:User {id: $toUserId})
           WHERE sender.created_at > datetime() - duration({days: 30})
           RETURN count(DISTINCT sender) AS unique_senders`,
          { toUserId: String(ctx.toUserId) }
        );
        return (result.records[0]?.get('unique_senders').toNumber() || 0) >= 10;
      } finally {
        await session.close();
      }
    },
  },

  // ── Mixed Rules ───────────────────────────────────────────────────────────
  {
    id: 'R6',
    name: 'new_ip_high_amount',
    weight: 25,
    source: 'mixed',
    description: 'First-time IP + transaction > ₹50,000',
    check: async (ctx) => {
      if (ctx.amount <= 50000) return false;
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          `MATCH (u:User {id: $userId})-[r:USED_IP]->(ip:IP {id: $ipId})
           RETURN count(r) AS usage_count`,
          { userId: String(ctx.userId), ipId: String(ctx.ipId) }
        );
        return (result.records[0]?.get('usage_count').toNumber() || 0) === 0;
      } finally {
        await session.close();
      }
    },
  },
];

async function evaluateRules(context) {
  const results = await Promise.all(
    FRAUD_RULES.map(async (rule) => {
      try {
        const triggered = await rule.check(context);
        return { rule, triggered };
      } catch (err) {
        console.error(`Rule ${rule.id} failed:`, err.message);
        return { rule, triggered: false };
      }
    })
  );

  const triggeredRules = [];
  let score = 0;

  for (const { rule, triggered } of results) {
    if (triggered) {
      triggeredRules.push({
        id: rule.id,
        name: rule.name,
        weight: rule.weight,
        description: rule.description,
        source: rule.source,
      });
      score += rule.weight;
    }
  }

  return { score, triggeredRules };
}

module.exports = { FRAUD_RULES, evaluateRules };
