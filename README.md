# RentShare — Peer-to-Peer Item Rental Marketplace

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue?logo=react)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-02042B?logo=razorpay)](https://razorpay.com/)

---

##  Table of Contents

- [About the Project](#about-the-project)
- [The Problem We Solve](#the-problem-we-solve)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Models](#database-models)
- [User Flows](#user-flows)
- [Security](#security)
- [Payment Flow](#payment-flow)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Deployment](#deployment)

---

##  About the Project

**RentShare** is a full-stack peer-to-peer item rental marketplace where people can list their unused items for rent and others can rent them — without having to buy.

Think of it like Airbnb, but instead of homes, you're renting DSLRs, power tools, gaming consoles, camping gear, and more.

---

##  The Problem We Solve

Most people own expensive items that sit idle 90% of the time:

- 📷 DSLR cameras bought for one vacation
- 🔧 Power tools used once for a home project
- 🎮 Gaming consoles played occasionally
- ⛺ Camping equipment for a one-time trip

**RentShare** bridges this gap:

| For Owners | For Renters | For Everyone |
|---|---|---|
| Earn extra income from idle items | Use expensive items without buying | Reduces unnecessary production |
| Full control over pricing & dates | Pay only for the time you need | Promotes a sharing economy |
| Damage protection via deposit system | Access a wide variety of categories | Better for the environment 🌍 |

---

##  Features

### 🔐 Authentication & Accounts
- Email OTP verification on registration
- JWT-based stateless auth (30-day expiry)
- HttpOnly secure cookies (XSS protected)
- Forgot password via OTP
- Role-based access control (USER / ADMIN)

### 📦 Item Listings
- Upload up to 4 images per item (via Cloudinary)
- Category-based deposit rules (e.g., Electronics: 3x, Tools: 2x)
- Maximum price cap of ₹20,000
- Duplicate item detection per owner
- Flexible item attributes via JSON field

### 📅 Rental System
- Date conflict checking (blocks overlapping bookings)
- 15-minute payment window for PENDING rentals
- Automated cron job for status transitions:
  - `PENDING` → `EXPIRED` (if unpaid after 15 min)
  - `ACTIVE` → `RETURNING` (on end date)
  - Late return charge calculation

### 🤝 Pickup OTP System
- 4-digit OTP generated after payment
- Renter shows OTP to owner in-person
- Owner verifies OTP → rental marked active
- Acts as **proof of handover** 

### 💳 Payments (Razorpay)
- Full Razorpay checkout integration
- HMAC-SHA256 payment signature verification
- Server-side amount validation
- Automatic refund via Razorpay Refund API
- Double-payment prevention

### 🔍 KYC Verification
- Aadhaar & PAN number submission
- AES-256-CBC encryption for stored documents
- Document image upload
- Admin approval workflow

### ⚠️ Damage Management
- Owner reports damage on item return
- Minor damage: partial deposit deduction
- Major damage: full deposit retained
- Mandatory photo proof for damage claims
- Admin reviews and approves/rejects
- Refund automatically processed via Razorpay

### 🗺️ Location Privacy
- Only city & area shown publicly in listings
- Exact GPS coordinates shared only during ACTIVE rental
- Google Maps link auto-generated for active rentals

### ⭐ Reviews
- One review per completed rental
- 1–5 star rating system
- Comment support

---

## 🛠️ Tech Stack

### Frontend
| Technology | Reason |
|---|---|
| **React.js** | Component-based architecture for reusable UI |
| **Tailwind CSS** | Rapid UI development without custom CSS |

### Backend
| Technology | Reason |
|---|---|
| **Node.js** | JavaScript across the full stack |
| **Express.js** | Event-driven architecture for concurrent requests |

### Database
| Technology | Reason |
|---|---|
| **PostgreSQL** | ACID transactions, relational data, enums & constraints |
| **Prisma ORM** | Type-safe queries, easy migrations, auto-generated client |

### Services
| Service | Purpose |
|---|---|
| **Razorpay** | Indian payment gateway — UPI, Card, Netbanking, Refunds |
| **Cloudinary** | Image storage, CDN, auto-optimization (25GB free) |
| **Resend API** | Transactional emails (3000 free/month) |
| **JWT + Cookies** | Stateless authentication with CSRF protection |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Client                           │
│              React.js + Tailwind CSS                    │
│                   (Vercel CDN)                          │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Backend: Node.js + Express.js               │
│                    (Railway)                            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Auth   │  │  Items   │  │ Rentals  │             │
│  │  Router  │  │  Router  │  │  Router  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Payments  │  │   KYC    │  │  Admin   │             │
│  │  Router  │  │  Router  │  │  Router  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│              ┌──────────────────┐                       │
│              │  Cron Job (15m)  │                       │
│              │ Rental Expiry &  │                       │
│              │ Status Updates   │                       │
│              └──────────────────┘                       │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌──────────┐ ┌──────────┐
   │ PostgreSQL │ │Cloudinary│ │ Razorpay │
   │ (Neon DB)  │ │ (Images) │ │(Payments)│
   └────────────┘ └──────────┘ └──────────┘
```

---

##  Database Models

### User
```
id, name, email, password (bcrypt)
role: USER | ADMIN
upiId, city, area, lat, lng
kycStatus: PENDING | VERIFIED | REJECTED
```

### Item
```
id, ownerId (→ User)
title, description, category
images: String[] (Cloudinary URLs)
pricePerDay, depositAmount
isAvailable, attributes (JSON)
```

### Rental
```
id, renterId (→ User), itemId (→ Item)
startDate, endDate
status: PENDING | ACTIVE | RETURNING |
        PENDING_REVIEW | COMPLETED | EXPIRED
totalAmount, depositAmount, extraCharge
pickupOtp, damageInfo, damagePhoto
```

### Transaction
```
id, rentalId (→ Rental)
razorpayPaymentId, razorpayOrderId
type: PAYMENT | REFUND
status: PENDING | SUCCESS | FAILED
amount
```

### KYC
```
id, userId (→ User)
documentType: AADHAAR | PAN
documentNumber (AES-256 encrypted)
documentImages: String[]
status: PENDING | VERIFIED | REJECTED
```

### Review
```
id, rentalId (→ Rental) [unique]
reviewerId (→ User)
rating: 1–5
comment
```

### Cart
```
id, userId (→ User)
items: Item[] (many-to-many)
```

---

##  User Flows

### Owner Journey
```
Register → OTP Verify → Login
    ↓
Submit KYC → Admin Verifies
    ↓
Complete Profile (UPI ID + GPS)
    ↓
List Item (Images + Price + Category)
    ↓
Rental Request Received → Payment Confirmed
    ↓
Verify Pickup OTP → Hand Over Item
    ↓
End Date → RETURNING notification
    ↓
Complete / Report Damage
    ↓
Admin Approves → Deposit Refunded to Renter
    ↓
Rental Amount Credited to Owner 
```

### Renter Journey
```
Register → OTP Verify → Login
    ↓
Browse Items (Filter: City / Category)
    ↓
View Item Details (Owner: City/Area shown)
    ↓
Select Dates → View Price Breakdown
    ↓
Razorpay Payment
    ↓
Receive Pickup OTP
    ↓
Show OTP to Owner → Collect Item
    ↓
Use Item
    ↓
Return Item → Status: RETURNING
    ↓
Deposit Refunded (if no damage)
    ↓
Leave Review 
```

---

##  Security

### Multi-Layer Security Architecture

| Layer | Implementation |
|---|---|
| **Input Validation** | Joi — type checking, length limits, PAN format, SQL injection prevention |
| **Authentication** | JWT (30-day expiry) in HttpOnly cookies |
| **Cookie Security** | `sameSite: none`, `secure: true`, CSRF protection |
| **Authorization** | Role-based (USER/ADMIN) + resource ownership checks |
| **Payment Security** | HMAC-SHA256 Razorpay signature verification + server-side amount check |
| **HTTP Headers** | Helmet.js — XSS, HSTS, Content-Security-Policy |
| **Rate Limiting** | express-rate-limit on all API routes |
| **CORS** | Configured for specific origins only |
| **Password Storage** | bcrypt hashed |
| **KYC Encryption** | AES-256-CBC with random IV (Node.js `crypto` module) |
| **Error Handling** | Stack traces hidden in production |
| **Proxy Trust** | Configured for Railway deployment |

### KYC Encryption Details
```
Algorithm  : AES-256-CBC
Key        : 32-character secret (stored in ENV)
IV         : Random per encryption (stored with ciphertext)
Storage    : Encrypted ciphertext in DB — plaintext never persisted
Result     : Same Aadhaar number → different ciphertext each time
```

---

## Payment Flow

```
1. User selects dates → backend calculates amount
         ↓
2. POST /api/payments/create-order
   → Razorpay Order created (server-side)
         ↓
3. Frontend opens Razorpay Checkout
         ↓
4. User pays (UPI / Card / Netbanking)
         ↓
5. POST /api/payments/verify
   → HMAC-SHA256 signature verified
   → Server-side amount re-validated
         ↓
6. Rental status → ACTIVE
   Item availability → false
   Transaction record → created
   Pickup OTP → generated & sent to renter
         ↓
7. On return: Razorpay Refund API called automatically
```

---

##  Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rentshare.git
cd rentshare

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

### Running Locally

```bash
# Start backend (from /backend)
npm run dev

# Start frontend (from /frontend)
npm run dev
```

Backend runs at `http://localhost:8007`
Frontend runs at `http://localhost:5173`


##  Environment Variables

### Backend `.env`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rentshare

# JWT
JWT_SECRET=your_jwt_secret_key

# AES Encryption (exactly 32 characters)
ENCRYPTION_KEY=your_32_character_encryption_key_

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# App
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```


##  API Overview

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register + send OTP | Public |
| POST | `/api/auth/verify-otp` | Verify email OTP | Public |
| POST | `/api/auth/login` | Login | Public |
| POST | `/api/auth/forgot-password` | Send reset OTP | Public |
| GET | `/api/items` | Browse listings | Public |
| GET | `/api/items/:id` | Item details | Public |
| POST | `/api/items` | Create listing | USER |
| POST | `/api/rentals` | Create rental request | USER |
| POST | `/api/payments/create-order` | Razorpay order | USER |
| POST | `/api/payments/verify` | Verify payment | USER |
| POST | `/api/rentals/:id/verify-otp` | Pickup OTP verify | USER (Owner) |
| PATCH | `/api/rentals/:id/damage` | Report damage | USER (Owner) |
| POST | `/api/kyc` | Submit KYC | USER |
| GET | `/api/admin/kyc` | View KYC queue | ADMIN |
| PATCH | `/api/admin/kyc/:id` | Approve/Reject KYC | ADMIN |
| PATCH | `/api/admin/damage/:id` | Handle damage claim | ADMIN |

---

##  Deployment

| Service | Platform | Notes |
|---|---|---|
| **Frontend** | Vercel | CDN globally distributed, auto-deploy from GitHub |
| **Backend** | Railway | Auto-deploy from GitHub, cron job support |
| **Database** |  Supabase | Managed PostgreSQL hosting |
| **Images** | Cloudinary | Free CDN, 25GB storage |



##  Author

Built with ❤️ by Himanshu Kumawat
