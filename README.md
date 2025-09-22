# Temperature Dashboard

A real-time temperature monitoring dashboard built with Next.js, Supabase, and Python. Monitor temperature sensors across multiple sites with live data ingestion, alerts, and comprehensive analytics.

## 🚀 Features

- **Real-time Temperature Monitoring**: Live sensor data from multiple locations
- **Multi-tenant Architecture**: Support for multiple organizations and sites
- **Data Ingestion**: Python simulator for CSV data import with HMAC authentication
- **Role-based Access Control**: Master, Site Manager, Auditor, and Admin roles
- **Responsive Dashboard**: Modern UI with Tailwind CSS v4
- **Alert System**: Temperature threshold monitoring and notifications
- **API Integration**: RESTful API with rate limiting and authentication

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.5.3, React, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Data Ingestion**: Python with HMAC authentication
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Deployment**: Vercel-ready

### Database Schema
- **Multi-tenant** with tenant isolation via RLS
- **TimescaleDB hypertables** for readings with compression
- **Continuous aggregates** for hourly/daily data
- **Role-based permissions** with time-bound auditor access

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Python 3.8+ (for ingestion simulator)

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd temperature-dashboard
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
HMAC_SECRET=your_secure_hmac_secret
```

### 3. Database Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase (if not already done)
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Apply database migrations
supabase db push

# Load seed data
supabase db reset
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. Python Ingestion Simulator
```bash
cd simulator
pip install -r requirements.txt

# Run simulator with sample data
python ingest_simulator.py --csv ../supabase/sample.csv --speed 10
```

## 📊 Usage

### Authentication
- Navigate to `/login` to sign in
- Use seed data credentials from `supabase/seed.sql`
- Different roles have different access levels

### Dashboard Features
- **Overview Page**: Real-time KPIs, recent alerts, sensor health
- **Sites Management**: View and manage monitoring sites
- **Alerts System**: Monitor and manage temperature alerts
- **Settings**: User and system configuration

### API Endpoints
- `GET /api/health` - System health check
- `POST /api/ingest/readings` - HMAC-authenticated data ingestion
- `GET /api/overview` - Dashboard overview data
- `GET /api/sites` - Sites listing
- `GET /api/alerts` - Alerts management
- `POST /api/chart/query` - Chart data queries

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication via Supabase
- Role-based access control (RBAC)
- Time-bound auditor access with automatic expiry
- Row-Level Security (RLS) for multi-tenant data isolation

### Data Protection
- HMAC-SHA256 authentication for data ingestion
- Rate limiting (60 GET/min, 20 POST/min, 10 chart queries/min)
- Request validation with Zod schemas
- Sensitive data masking in logs

### API Security
- Idempotency support for ingestion
- Structured error responses with request IDs
- CORS protection
- Input sanitization and validation

## 📈 Performance

### Database Optimizations
- TimescaleDB hypertables for efficient time-series storage
- Continuous aggregates for pre-computed hourly/daily data
- Automatic data compression (7-day policy)
- Optimized indexes for common query patterns

### Frontend Performance
- SWR for efficient data fetching with caching
- Component-level loading states
- Responsive design with mobile optimization
- Lazy loading for charts and heavy components

## 🧪 Testing

### API Testing
```bash
# Run API tests
npm run test:api

# Test specific endpoints
npm run test -- --grep "health endpoint"
```

### Schema Validation Testing
```bash
# Test Zod schemas
npm run test:schemas
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Database Migration (Production)
```bash
supabase db push --linked
```

### Environment Variables (Production)
Ensure all environment variables are set in your deployment platform:
- Supabase credentials
- HMAC secret
- Feature flags

## 📋 Project Structure

```
temperature-dashboard/
├── src/
│   ├── app/
│   │   ├── api/              # REST API endpoints
│   │   │   ├── health/       # Health check
│   │   │   ├── overview/     # Dashboard data
│   │   │   ├── sites/        # Sites management
│   │   │   ├── alerts/       # Alerts system
│   │   │   ├── ingest/       # Data ingestion
│   │   │   └── chart/        # Chart queries
│   │   ├── login/            # Authentication page
│   │   ├── overview/         # Dashboard overview
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home with auth routing
│   ├── components/
│   │   ├── auth/             # RoleGuard, access control
│   │   ├── layout/           # DashboardLayout
│   │   ├── pages/            # Page components
│   │   ├── providers/        # Context providers
│   │   └── ui/               # Reusable UI components
│   ├── lib/                  # Supabase configuration
│   ├── stores/               # Zustand state management
│   ├── utils/                # Utilities (auth, validation, etc.)
│   └── types/                # TypeScript type definitions
├── supabase/
│   ├── migrations/           # Database schema migrations
│   ├── seed.sql             # Sample data
│   └── sample.csv           # Test data for simulator
├── simulator/               # Python ingestion simulator
└── tests/                   # Test files
```

## 🎯 Key Features Implemented

### ✅ Backend Infrastructure
- Complete REST API with 8+ endpoints
- HMAC-authenticated data ingestion
- Rate limiting and error handling
- Supabase integration with RLS
- TimescaleDB for time-series data

### ✅ Frontend Application
- Role-based authentication system
- Real-time dashboard with KPI tiles
- Responsive layout with sidebar navigation
- Professional UI components
- SWR for data fetching with caching

### ✅ Security & Performance
- Multi-tenant architecture with RLS
- JWT authentication with role checks
- Rate limiting per user/endpoint
- Input validation with Zod schemas
- Optimized database queries

### ✅ Developer Experience
- TypeScript throughout
- Comprehensive error handling
- Environment configuration
- Database migrations
- Python simulator for testing

## 🚨 Important Notes

### Environment Setup Required
Before running the application, you must:

1. **Create a Supabase project** and get your credentials
2. **Update `.env.local`** with your actual Supabase URLs and keys
3. **Run database migrations** to set up the schema
4. **Load seed data** for testing

### Demo Credentials
After setting up the database with seed data, you can use the demo accounts created in `supabase/seed.sql`.

### Production Deployment
For production deployment:
- Set up proper environment variables
- Configure Supabase for production
- Set up monitoring and logging
- Configure backup strategies

## 📞 Support

This is a complete, production-ready B2B Temperature Dashboard application with:
- ✅ Full backend API implementation
- ✅ Professional frontend interface
- ✅ Security and authentication
- ✅ Real-time data visualization
- ✅ Multi-tenant architecture
- ✅ Comprehensive documentation

The application is ready for immediate deployment and use once the Supabase environment is configured.
