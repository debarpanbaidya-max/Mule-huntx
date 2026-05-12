# 🛡️ MuleGuard — Real-Time Mule Account Detection System

A production-grade financial fraud detection platform with a dark aesthetic React frontend and a Node.js + PostgreSQL + Neo4j backend.

> **🤖 Built with AI:** This entire full-stack application, including the Neo4j graph algorithms, PostgreSQL schema, UI/UX design, and cloud deployment pipelines, was architected and built using advanced **Agentic AI** pair-programming. It serves as a testament to effective prompt engineering, architectural system design, and modern AI-driven development workflows.

---

## 🤖 AI-Assisted Development Highlights

- **Complex System Architecture:** Leveraged AI to seamlessly integrate and synchronize two distinct databases (PostgreSQL for relational transactional data and Neo4j for complex graph-based fraud ring detection).
- **Algorithmic Fraud Detection:** Utilized AI to write, optimize, and refine 10 complex heuristic rules (e.g., circular money flow, device sharing, rapid layering) operating in parallel in under 500ms.
- **Cloud Infrastructure & Deployment:** Directed AI to deploy a secure, multi-service architecture using Vercel (Frontend), Render (Backend API), Neon (Serverless Postgres), and AuraDB (Cloud Neo4j).
- **Production-Grade Security:** Implemented secure OAuth 2.0 (Google/GitHub) with JWT session management, perfectly configuring cross-origin cookies and CORS for separated frontend/backend domains.

---

## 🏗️ Architecture

```
React Frontend (Tailwind)
       │
       │ REST API + JWT
       ▼
Node.js / Express API  ──────────────────────────┐
       │                                          │
       ├── PostgreSQL (transactions, users)       │
       └── Neo4j (relationship graph)             │
                                                  │
                    Rule Engine (10 rules) ◄──────┘
                    ALLOW / REVIEW / BLOCK
```

---

## 🚀 Quick Start (Docker — Recommended)

```bash
# 1. Clone and enter project
cd mule-detection

# 2. Copy backend env
cp backend/.env.example backend/.env
# Edit backend/.env if needed (defaults work for Docker)

# 3. Start everything
docker-compose up --build

# 4. Setup database (first run only)
docker-compose exec backend node scripts/setup-db.js

# 5. Open app
open http://localhost:3000
```

---

## 🛠️ Manual Setup (Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Neo4j 5+ (Community Edition)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials

# Setup PostgreSQL schema + demo data
node scripts/setup-db.js

# Start dev server
npm run dev
# → http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
# Create .env.local
echo "REACT_APP_API_URL=http://localhost:3001" > .env.local

npm start
# → http://localhost:3000
```

### Neo4j Setup

```bash
# Via Docker (easiest):
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5-community

# Open Neo4j Browser: http://localhost:7474
# Run constraints from backend/src/config/neo4j.js
```

---

## 🔐 OAuth 2.0 Authentication

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add callback: `http://localhost:3001/api/auth/google/callback`
4. Set in `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. New OAuth App → Callback: `http://localhost:3001/api/auth/github/callback`
3. Set in `.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

### Demo Mode
Click **"Demo Access"** on the login page — no OAuth setup needed.

---

## 📐 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Start Google OAuth flow |
| GET | `/api/auth/github` | Start GitHub OAuth flow |
| POST | `/api/auth/demo` | Demo login (returns JWT) |
| GET | `/api/auth/me` | Verify JWT token |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transaction/validate` | Submit transaction for fraud check |
| GET | `/api/transaction/recent` | Recent transactions |
| GET | `/api/transaction/:id` | Transaction detail |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | User detail + transaction history |
| GET | `/api/users/:id/risk` | User risk score |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard KPIs |
| GET | `/api/analytics/mule-rings` | Detected mule rings (Neo4j) |
| GET | `/api/analytics/rules-breakdown` | Rule trigger frequency |

### Example: Validate Transaction

```bash
curl -X POST http://localhost:3001/api/transaction/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "from_user_id": 1,
    "to_user_id": 2,
    "amount": 75000,
    "device_fingerprint": "fp_test123",
    "device_browser": "Chrome",
    "device_os": "Windows",
    "ip_address": "192.168.1.100",
    "ip_country": "IN",
    "ip_is_proxy": false
  }'
```

**Response:**
```json
{
  "transaction_id": 42,
  "decision": "REVIEW",
  "risk_score": 55,
  "triggered_rules": [
    { "id": "R6", "name": "new_ip_high_amount", "weight": 25, "description": "First-time IP + transaction > ₹50,000" },
    { "id": "R8", "name": "unusual_time_pattern", "weight": 15, "description": "Transaction 8+ hours outside typical pattern" }
  ],
  "processing_time_ms": 287
}
```

---

## 🧠 Fraud Detection Rules

| ID | Rule | Points | Source | Trigger |
|----|------|--------|--------|---------|
| R1 | Velocity Check | +20 | PostgreSQL | >10 txns in 10 min |
| R2 | Circular Flow | +40 | Neo4j | Money cycles back in 2-4 hops |
| R3 | Device Sharing | +30 | Neo4j | Device used by 5+ accounts |
| R4 | Rapid Layering | +35 | Neo4j | Forwarded within 1 hour |
| R5 | IP Clustering | +25 | Neo4j | IP used for 3+ accounts in 7 days |
| R6 | New IP + High Amount | +25 | Mixed | First IP + >₹50,000 |
| R7 | Dormant Reactivation | +30 | PostgreSQL | 90+ days inactive |
| R8 | Unusual Time | +15 | PostgreSQL | 8+ hrs outside pattern |
| R9 | Suspicious Recipient | +35 | Neo4j | Receives from 10+ senders |
| R10 | Amount Anomaly | +20 | PostgreSQL | 3+ std deviations |

**Decision thresholds:**
- Score > 70 → **BLOCK**
- Score 40–70 → **REVIEW**
- Score < 40 → **ALLOW**

---

## 🖥️ Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | KPIs, charts, recent alerts, high-risk accounts |
| Accounts | `/users` | All users, risk filters, search |
| Account Detail | `/users/:id` | Risk gauge, transaction history, "why flagged" |
| Alerts | `/alerts` | Live flagged transactions, expandable details |
| Graph | `/graph` | Force-directed transaction network visualization |
| Simulate | `/simulate` | Live fraud detection demo with presets |

---

## 📁 Project Structure

```
mule-detection/
├── backend/
│   ├── src/
│   │   ├── config/        # DB connections + Passport OAuth
│   │   ├── routes/        # auth, transaction, analytics, users
│   │   ├── services/      # ruleEngine.js, graphSync.js
│   │   └── middleware/    # JWT auth middleware
│   ├── scripts/
│   │   └── setup-db.js    # Schema + seed data
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard, Accounts, AccountDetail, Alerts, Graph, Simulate
│   │   ├── components/    # Layout, Sidebar
│   │   ├── hooks/         # useAuth (AuthContext)
│   │   └── utils/         # api.js (Axios + interceptors)
│   └── Dockerfile
└── docker-compose.yml
```

---

## 🎯 Interview Talking Points

1. **AI-Driven Engineering**: Built from scratch using advanced AI collaboration, demonstrating the ability to prompt, direct, and review AI-generated code for complex microservice architectures.
2. **Explainability**: Every decision shows exact rules triggered with weights — not a black box
2. **Dual-database**: PostgreSQL for transactional data, Neo4j for relationship graphs
3. **Performance**: Rules run in parallel (`Promise.all`), avg <500ms
4. **Graph Power**: Circular flow detection, device sharing, IP clustering — impossible without Neo4j
5. **Live Demo**: Use the Simulate page to show risk score increase in real-time
6. **OAuth 2.0**: Production-grade auth with Google/GitHub + JWT

