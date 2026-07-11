# VERIDEX Backend API

Node.js + Express + MongoDB Atlas backend for the VERIDEX deepfake detection platform.

---

## Project Structure

```
veridex-backend/
├── server.js                 ← Entry point
├── package.json
├── .env.example              ← Copy to .env and fill in values
├── .gitignore
│
├── config/
│   └── db.js                 ← MongoDB Atlas connection
│
├── models/
│   ├── User.js               ← User schema (auth + weights + stats)
│   └── Scan.js               ← Scan history schema
│
├── controllers/
│   ├── authController.js     ← Register, login, verify, reset
│   ├── scanController.js     ← Save scan, history, feedback, stats
│   └── adminController.js    ← Admin panel endpoints
│
├── routes/
│   ├── auth.js               ← /api/auth/*
│   ├── scans.js              ← /api/scans/*
│   └── admin.js              ← /api/admin/*
│
├── middleware/
│   ├── auth.js               ← JWT protect + adminOnly
│   ├── rateLimiter.js        ← Express rate limiting
│   └── validate.js           ← Input validation rules
│
└── utils/
    └── email.js              ← Nodemailer (Gmail SMTP)
```

---

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Create account |
| POST | `/login` | No | Login + get token |
| GET | `/me` | Yes | Get current user |
| GET | `/verify/:token` | No | Verify email |
| POST | `/forgot-password` | No | Send reset email |
| POST | `/reset-password/:token` | No | Reset password |
| PUT | `/weights` | Yes | Update signal weights |

### Scans — `/api/scans`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Yes | Save scan result |
| GET | `/` | Yes | Get scan history |
| GET | `/stats` | Yes | Get user stats |
| GET | `/:id` | Yes | Get single scan |
| POST | `/:id/feedback` | Yes | Submit feedback |
| DELETE | `/:id` | Yes | Delete scan |

### Admin — `/api/admin`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/overview` | Admin | Platform overview |
| GET | `/users` | Admin | All users |
| GET | `/scans` | Admin | All scans |
| GET | `/trend` | Admin | Scan trend data |
| POST | `/digest` | Admin | Send weekly email digest |
| PUT | `/users/:id/role` | Admin | Update user role |
| DELETE | `/users/:id` | Admin | Delete user + scans |

---

## Local Setup

```bash
# 1. Clone and install
git clone https://github.com/Guna669-coder/veridex-backend
cd veridex-backend
npm install

# 2. Set up environment
cp .env.example .env
# Fill in all values in .env

# 3. Run in development
npm run dev

# Server starts at http://localhost:5000
```

---

## MongoDB Atlas Setup

1. Go to **https://cloud.mongodb.com**
2. Create a free account → New Project → Free Cluster (M0)
3. Click **"Connect"** → **"Drivers"** → copy the connection string
4. Replace `<password>` with your DB user password
5. Add it to `.env` as `MONGODB_URI`
6. In **Network Access** → Add IP → **Allow from anywhere** (`0.0.0.0/0`)

---

## Gmail SMTP Setup

1. Go to your Google Account → **Security**
2. Enable **2-Step Verification**
3. Search for **"App Passwords"** → Generate one for "Mail"
4. Copy the 16-character password into `.env` as `EMAIL_PASS`

---

## Deploy to Railway

1. Go to **https://railway.app** → New Project
2. Click **"Deploy from GitHub repo"**
3. Select your `veridex-backend` repo
4. Go to **Variables** tab → add all values from `.env`
5. Railway auto-detects `npm start` and deploys
6. Copy your Railway URL (e.g. `https://veridex-backend.up.railway.app`)
7. Update `FRONTEND_URL` in Railway variables
8. Update `BASE_URL` in frontend `js/api.js` to your Railway URL

---

## Make First Admin

After deploying, register normally, then run this in MongoDB Atlas shell:

```js
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin", isVerified: true } }
)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcryptjs |
| Email | Nodemailer (Gmail SMTP) |
| Security | Helmet + CORS + Rate Limiting |
| Validation | express-validator |
| Deploy | Railway |
