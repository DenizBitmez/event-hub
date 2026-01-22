# EventHub 🎫

EventHub is a robust, high-performance backend API for event ticketing, designed to handle **high concurrency** and prevent **overselling** (Race Conditions) using strictly strongly-consistent locking mechanisms.

## 🚀 Key Features

### 1. Concurrency Control (Race Condition Proof)
- Uses **Pessimistic Locking** (`SELECT ... FOR UPDATE`) within PostgreSQL transactions.
- Guarantees that no two users can book the last ticket simultaneously.
- Verified with concurrent load tests (`verify-full-flow.js`).

### 2. Comprehensive Domain Models
- **Events**: Rich details including Price, Capacity, Location, Date, and Category.
- **Users**: Fully distinct `User` and `Admin` roles.
- **Tickets**: Linked to specific users with status tracking (`Confirmed`, `Cancelled`).

### 3. Security & Authentication
- **JWT Implementation**: Stateless authentication using JSON Web Tokens.
- **Role-Based Access Control (RBAC)**: 
  - `User`: Can search events and book tickets.
  - `Admin`: Can view sales reports and perform cancellations/refunds.

### 4. Admin & Reporting
- **Real-Time Stats**: View Revenue, Tickets Sold, and Occupancy Rates instantly.
- **Transactional Refunds**: Cancelling a ticket automatically and safely restores the event inventory inside a database transaction.

---

## 🛠 Tech Stack
- **Framework**: .NET 9 Web API
- **Database**: PostgreSQL 16 (Entity Framework Core)
- **Caching**: Redis (Prepared for future implementation)
- **Containerization**: Docker Compose

---

## ⚡ Getting Started

### Prerequisites
- Docker Desktop
- .NET 9 SDK
- Node.js (for verification scripts)

### 1. Start Infrastructure
Run the database and redis containers:
```bash
docker-compose up -d
```

### 2. Run the Application
The application will automatically apply migrations and seed initial data (including an Admin user) on startup.
```bash
dotnet run
```
*API will run at `http://localhost:5181`*

### 3. Verification & Testing
We have included scripts to simulate real-world scenarios:

**Test 1: Full Booking Flow (Load Test)**
Registers 50 users and makes them race for 10 tickets.
```bash
node verify-full-flow.js
```

**Test 2: Admin Reports & Refunds**
Tests the admin login, reporting endpoint, and ticket cancellation logic.
```bash
node verify-admin.js
```

---

## 📚 API Endpoints

### Auth
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Get JWT Token

### Events
- `GET /api/event` - List all active events
- `GET /api/event/{id}` - Get event details

### Booking
- `POST /api/booking` - Book a ticket (Requires Login)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "eventId": 1, "quantity": 1 }`

### Admin (Requires Admin Role)
- `GET /api/admin/reports/events` - View sales statistics
- `POST /api/admin/tickets/{id}/cancel` - Cancel ticket and restore inventory

---

## 👤 Default Credentials
**Admin User:**
- Email: `admin@eventhub.com`
- Password: `admin123`

**Test User:**
- Email: `test@example.com`
- Password: `hashed_secret`
