const neo4jDriver = require('../config/neo4j');

async function syncTransactionToGraph(transaction) {
  const session = neo4jDriver.session();
  try {
    await session.run(`
      MERGE (fromUser:User {id: $fromUserId})
      ON CREATE SET fromUser.email = $fromEmail, fromUser.created_at = datetime($timestamp)

      MERGE (toUser:User {id: $toUserId})
      ON CREATE SET toUser.email = $toEmail, toUser.created_at = datetime($timestamp)

      MERGE (device:Device {id: $deviceId})
      ON CREATE SET device.fingerprint = $deviceFingerprint

      MERGE (ip:IP {id: $ipId})
      ON CREATE SET ip.address = $ipAddress

      MERGE (fromUser)-[:SENT {
        amount: $amount,
        transaction_id: $txId,
        timestamp: datetime($timestamp)
      }]->(toUser)

      MERGE (fromUser)-[:USED_DEVICE {
        timestamp: datetime($timestamp),
        transaction_id: $txId
      }]->(device)

      MERGE (fromUser)-[:USED_IP {
        timestamp: datetime($timestamp),
        transaction_id: $txId
      }]->(ip)
    `, {
      fromUserId: String(transaction.from_user_id),
      toUserId:   String(transaction.to_user_id),
      deviceId:   String(transaction.device_id),
      ipId:       String(transaction.ip_id),
      amount:     transaction.amount,
      txId:       String(transaction.id),
      timestamp:  new Date(transaction.created_at).toISOString(),
      fromEmail:  transaction.from_email   || '',
      toEmail:    transaction.to_email     || '',
      deviceFingerprint: transaction.device_fingerprint || '',
      ipAddress:  transaction.ip_address   || '',
    });
  } finally {
    await session.close();
  }
}

async function getMuleRings(limit = 10) {
  const session = neo4jDriver.session();
  try {
    const result = await session.run(`
      MATCH path = (u:User)-[:SENT*2..4]->(u)
      WHERE ALL(r IN relationships(path)
        WHERE r.timestamp > datetime() - duration({days: 30}))
      RETURN
        [node IN nodes(path) | node.id]   AS ring_nodes,
        [r IN relationships(path) | r.amount] AS amounts,
        length(path) AS hops
      LIMIT $limit
    `, { limit });

    return result.records.map(r => ({
      nodes:   r.get('ring_nodes'),
      amounts: r.get('amounts').map(a => a?.toNumber?.() ?? a),
      hops:    r.get('hops').toNumber(),
    }));
  } finally {
    await session.close();
  }
}

async function getUserGraph(userId) {
  const session = neo4jDriver.session();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $userId})-[r:SENT]-(other:User)
      OPTIONAL MATCH (u)-[:USED_DEVICE]->(d:Device)
      OPTIONAL MATCH (u)-[:USED_IP]->(ip:IP)
      RETURN
        collect(DISTINCT { id: other.id, email: other.email }) AS connected_users,
        collect(DISTINCT { amount: r.amount, timestamp: toString(r.timestamp) }) AS transactions,
        collect(DISTINCT d.fingerprint) AS devices,
        collect(DISTINCT ip.address) AS ips
    `, { userId: String(userId) });

    const rec = result.records[0];
    if (!rec) return null;
    return {
      connected_users:   rec.get('connected_users'),
      transactions:      rec.get('transactions'),
      devices:           rec.get('devices'),
      ips:               rec.get('ips'),
    };
  } finally {
    await session.close();
  }
}

module.exports = { syncTransactionToGraph, getMuleRings, getUserGraph };
