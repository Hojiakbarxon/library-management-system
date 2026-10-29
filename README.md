# 📚 Library Management System Backend API

A RESTful backend API for managing a library — built with **NestJS**, **TypeORM**, and **PostgreSQL**. Supports user registration with OTP verification, role-based access control, subscription-based book borrowing, and a full borrow/return request lifecycle.

---

## 🛠 Tech Stack

- **Framework:** NestJS (Node.js + TypeScript)
- **ORM:** TypeORM
- **Database:** PostgreSQL
- **Auth:** JWT (access token via cookies) + OTP email verification
- **File uploads:** Multer (book cover images)
- **Email:** Nodemailer
- **Scheduling:** @nestjs/schedule (OTP expiry cleanup)
- **Validation:** class-validator + class-transformer

---

## ⚙️ Setup & Installation

```bash
# 1. Clone the repository
git clone https://github.com/Hojiakbarxon/library-management-system.git
cd library-management-system

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in your values (see Environment Variables section)

# 4. Start the server
npm run start:dev
```

---

## 🗃️ Database Setup

After starting the server for the first time (TypeORM `synchronize: true` will auto-create all tables), you must run the SQL files in the `database/` folder manually to seed required data.

**Step 1 — Run the seed files in order:**

```bash
# Connect to your database
psql -U postgres -d library_db

# Then run each file inside the database/ folder
\i database/insert-into-table-roles.sql
\i database/insert-into-table-status.sql
# run any other .sql files present in that folder
```

Or paste the contents directly into psql shell / pgAdmin query tool.

**Step 2 — Create the SuperAdmin manually:**

After seeding, insert the SuperAdmin user directly into the database. First hash a password using bcrypt (rounds: 10), then run:

```sql
INSERT INTO "user" (full_name, email, login, password, "roleId")
VALUES (
  'Super Admin',
  'superadmin@example.com',
  'superadmin',
  '<bcrypt_hashed_password>',
  1  -- role id 1 = SUPERADMIN (check your roles table)
);
```

> ⚠️ Never create the SuperAdmin through the API — there is no public endpoint for it by design. All other admins are created by SuperAdmin via `POST /users/admin`.

---

## 🔑 Environment Variables

```env
DB_URL=postgres://user:password@localhost:5432/library_db
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_email_app_password
```

---

## 👥 Roles

| Role | Description |
|---|---|
| `SUPERADMIN` | Full access — manages admins, subscriptions, and all data |
| `ADMIN` | Manages books, authors, genres, and handles borrow requests |
| `USER` | Registers, buys subscriptions, requests and returns books |

> SuperAdmin accounts are created manually or seeded. Admins are created by SuperAdmin via `POST /users/admin`. Users register via `POST /auth/register`.

---

## 🔐 Authentication

All endpoints except auth routes require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <access_token>
```

### Auth Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new user — sends OTP to email | ❌ |
| POST | `/auth/confirm-otp` | Confirm OTP to activate account | ❌ |
| POST | `/auth/sign-in` | Login — returns JWT access token | ❌ |
| POST | `/auth/forgot-password` | Send OTP for password reset | ❌ |
| POST | `/auth/reset-password` | Reset password with OTP | ❌ |
| POST | `/auth/get-access-token` | Get new access token via refresh token cookie | 🍪 |

### Registration Flow

```
POST /auth/register → OTP sent to email
        ↓
POST /auth/confirm-otp → account activated
        ↓
POST /auth/sign-in → receive access token
```

---

## 👤 Users

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/users/admin` | Create a new admin | SUPERADMIN |
| GET | `/users` | Get all users | SUPERADMIN, ADMIN |
| GET | `/users/me` | Get my profile | ALL |
| GET | `/users/:id` | Get user by ID (own profile only) | Owner |
| PATCH | `/users/:id` | Update user (own profile only) | Owner |
| DELETE | `/users/:id` | Delete user (own profile only) | Owner |

---

## 📖 Books

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/books` | Create a book (with cover image upload) | ADMIN, SUPERADMIN |
| GET | `/books` | Get all books | ALL |
| GET | `/books/:id` | Get book by ID | ALL |
| PATCH | `/books/:id` | Update book | ADMIN, SUPERADMIN |
| DELETE | `/books/:id` | Delete book | ADMIN, SUPERADMIN |

> Book cover images are uploaded via `multipart/form-data` with field name `cover_image`.

---

## ✍️ Authors

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/authors` | Create an author | ADMIN, SUPERADMIN |
| GET | `/authors` | Get all authors | ALL |
| GET | `/authors/:id` | Get author by ID | ALL |
| PATCH | `/authors/:id` | Update author | ADMIN, SUPERADMIN |
| DELETE | `/authors/:id` | Delete author | ADMIN, SUPERADMIN |

---

## 🏷️ Genres

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/genres` | Create a genre | ADMIN, SUPERADMIN |
| GET | `/genres` | Get all genres | ALL |
| GET | `/genres/:id` | Get genre by ID | ALL |
| PATCH | `/genres/:id` | Update genre | ADMIN, SUPERADMIN |
| DELETE | `/genres/:id` | Delete genre | ADMIN, SUPERADMIN |

---

## 💳 Subscriptions (Plans)

Subscription plans are created by SuperAdmin. Users purchase them to gain borrowing access.

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/subscriptions` | Create a subscription plan | SUPERADMIN |
| GET | `/subscriptions` | Get all plans | ALL |
| GET | `/subscriptions/:id` | Get plan by ID | ALL |
| PATCH | `/subscriptions/:id` | Update plan | SUPERADMIN |
| DELETE | `/subscriptions/:id` | Delete plan | SUPERADMIN |

---

## 🧾 User Subscriptions

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/user-subscriptions/buy-subscription` | Purchase a subscription plan | USER |
| GET | `/user-subscriptions/my-history` | View my subscription history | USER |

> Buying a new subscription while one is active extends from the current end date, not from today.

---

## 📬 Requests

The core borrowing workflow. Each request is tied to one book.

### Request Statuses

| ID | Name |
|---|---|
| 1 | PENDING |
| 2 | APPROVED |
| 3 | REJECTED |

### Request Purposes

| Value | Meaning |
|---|---|
| `BORROW` | User wants to borrow a book |
| `RETURN` | User wants to return a borrowed book |

### Endpoints

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/requests/buy` | Submit borrow request(s) for book IDs | USER |
| POST | `/requests/return-request/:userBookId` | Submit a return request | USER |
| POST | `/requests/reject-my-request/:id` | Cancel my own pending request | USER |
| GET | `/requests/my-requests` | View my full request history | USER |
| GET | `/requests/my-active-requests` | View my pending requests | USER |
| GET | `/requests` | View all requests | ADMIN, SUPERADMIN |
| GET | `/requests/:id` | View single request | ADMIN, SUPERADMIN |
| POST | `/requests/accept-request/:id` | Accept a pending request | ADMIN, SUPERADMIN |
| POST | `/requests/reject-request/:id` | Reject a pending request | ADMIN, SUPERADMIN |

### Borrow Flow

```
User: POST /requests/buy  { books_ids: [1, 2] }
         → status: PENDING, purpose: BORROW, book quantity decremented

Admin: POST /requests/accept-request/:id
         → status: APPROVED, user_book record created

         OR

Admin: POST /requests/reject-request/:id
         → status: REJECTED, book quantity restored
```

### Return Flow

```
User: POST /requests/return-request/:userBookId
         → new Request with status: PENDING, purpose: RETURN

Admin: POST /requests/accept-request/:id
         → status: APPROVED, user_book closed, book quantity restored

         OR

Admin: POST /requests/reject-request/:id
         → status: REJECTED (user keeps the book)
```

---

## 📦 User Books

Tracks which books are currently borrowed by which users. Records are created internally when a borrow request is approved — not directly by the frontend.

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/user-books` | View all borrow records | ADMIN, SUPERADMIN |
| GET | `/user-books/my-books` | View my borrowed books (active + returned) | USER |

> The `is_active` field indicates whether the book is still borrowed (`true`) or returned (`false`). The `returned_at` timestamp is filled when returned.

---

## 🗄️ Data Model Overview

```
User ──< UserSubscription >── Subscription
User ──< Request >── Status
User ──< UserBook
Book ──< Request
Book ──< UserBook
Request ──── UserBook  (OneToOne — one borrow request → one user_book record)
UserBook ──< Request   (OneToMany — a user_book can have multiple return requests)
```

---


## 📁 Project Structure

```
src/
├── auth/               # Registration, OTP, sign-in, password reset
├── users/              # User CRUD + profile
├── books/              # Book CRUD + image upload
├── authors/            # Author CRUD
├── genres/             # Genre CRUD
├── subscriptions/      # Subscription plan CRUD
├── user_subscriptions/ # User purchases subscription
├── requests/           # Borrow & return request lifecycle
├── user-books/         # Active borrow records
├── roles/              # Role entity
├── statuses/           # Status entity (PENDING/APPROVED/REJECTED)
├── config/             # Enums (Role, Purpose), env config, image path
├── Decorators/         # @Roles() decorator
├── interface/          # ISuccess response interface
├── ownership/          # OwnershipGuard (user can only edit own data)
├── role/               # RoleGuard
└── utils/              # Conflicts helper, Crypto, Token, Cache, OTP, Mail
└── config/              # getting infos from .env, ENUMS
└── database/              # .sql codes to run from the db side
└── interface/              # Response interface
```

---

## Owner
```
Hojiakbarxon Olimxo'jayev
```