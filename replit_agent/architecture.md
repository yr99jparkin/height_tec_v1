# Architecture Documentation

## Overview

This application is a wind monitoring platform designed to track and analyze wind data from remote devices. The system collects real-time wind speed data from field devices via UDP, processes this data to detect alert conditions, and provides a web interface for users to monitor their devices.

The architecture follows a full-stack JavaScript/TypeScript approach with a React frontend and Node.js backend. The application is structured as a monorepo with client and server directories, sharing common types and schemas.

## System Architecture

The application follows a client-server architecture with the following high-level components:

1. **Frontend**: React-based single-page application using modern React patterns and libraries
2. **Backend**: Express.js server handling API requests, authentication, and data processing
3. **Database**: PostgreSQL database accessed via Drizzle ORM
4. **Real-time Data Collection**: UDP listener for receiving device data packets
5. **Data Processing**: Aggregation job for processing and archiving wind data

### Architectural Diagram

```
┌─────────────┐     ┌───────────────────────────────────┐     ┌──────────────┐
│             │     │                                   │     │              │
│ Field       │     │  Backend Server                   │     │  PostgreSQL  │
│ Devices     │◄───►│  - Express API                    │◄───►│  Database    │
│ (Wind       │     │  - UDP Listener                   │     │              │
│  Sensors)   │     │  - Authentication                 │     │              │
│             │     │  - Data Aggregation               │     │              │
└─────────────┘     └───────────────┬───────────────────┘     └──────────────┘
                                    │
                                    │
                                    ▼
                    ┌───────────────────────────────────┐     
                    │                                   │     
                    │  Frontend                         │     
                    │  - React SPA                      │     
                    │  - Device Monitoring              │     
                    │  - Map Integration                │     
                    │  - Alerts & Notifications         │     
                    │                                   │     
                    └───────────────────────────────────┘     
```

## Key Components

### Frontend (client/)

The frontend is built with React and organized with modern patterns:

1. **Component Structure**:
   - `/components/ui`: Reusable UI components (using shadcn/ui pattern)
   - `/components/layout`: Layout components like Header and Sidebar
   - `/components/modals`: Modal components for user interactions

2. **State Management**:
   - React Query for server state
   - React contexts for global state (auth, maps)

3. **Routing**:
   - Uses Wouter for lightweight routing
   - Protected routes for authenticated sections

4. **UI Framework**:
   - TailwindCSS for styling
   - Radix UI for accessible primitives
   - Custom design system with themeable components

### Backend (server/)

The backend is an Express.js application with several key components:

1. **API Layer**:
   - RESTful API endpoints for device and user management
   - Session-based authentication
   
2. **Real-time Data Collection**:
   - UDP server for receiving device data packets
   - Geocoding integration for location lookup

3. **Data Processing**:
   - Scheduled aggregation job for wind data
   - Alert detection based on thresholds

4. **Authentication**:
   - Passport.js for authentication
   - Secure password hashing with scrypt
   - Session management with PostgreSQL store

### Shared Code (shared/)

1. **Database Schema Definitions**:
   - Drizzle ORM schema for PostgreSQL
   - Relations between tables

2. **TypeScript Types**:
   - Shared types for cross-boundary communication
   - Zod schemas for validation

## Data Model

The application uses a PostgreSQL database with the following main entities:

1. **Users**:
   - Manages user accounts and authentication
   - Related to devices (one-to-many)

2. **Devices**:
   - Represents physical wind monitoring devices
   - Tracks device metadata (location, status)

3. **Device Stock**:
   - Manages inventory of devices
   - Tracks allocation status

4. **Wind Data**:
   - Stores raw wind speed measurements
   - Recent data (last 3 hours)

5. **Wind Data Historical**:
   - Aggregated wind data in 10-minute intervals
   - Long-term storage for reporting

6. **Wind Alert Thresholds**:
   - Configurable thresholds for alerts
   - Per-device settings

7. **Notification Contacts**:
   - Contact information for alerts
   - Associated with devices

## Data Flow

### Device Data Ingestion Flow

1. Field devices send UDP packets with wind speed data
2. UDP listener receives and validates the data
3. If GPS coordinates are provided, optional geocoding is performed
4. Data is stored in the `wind_data` table
5. Alert conditions are checked against thresholds
6. Notification triggers are activated if thresholds are exceeded

### Data Aggregation Flow

1. Scheduled job runs every 10 minutes
2. Raw wind data is aggregated into 10-minute intervals
3. Statistical calculations (avg, max, std deviation)
4. Aggregated data is stored in `wind_data_historical`
5. Processed records are marked in `wind_data`
6. Old data (>3 hours) is purged from `wind_data`

### User Interaction Flow

1. Users authenticate through the login page
2. After authentication, users can view their authorized devices
3. Device data is displayed in real-time and on maps
4. Users can configure alert thresholds and notification settings
5. Reports can be generated from historical data

## External Dependencies

### Frontend Dependencies

1. **UI Framework**:
   - TailwindCSS
   - Radix UI primitives
   - shadcn/ui component patterns

2. **Data Fetching**:
   - TanStack Query (React Query)
   - Axios for HTTP requests

3. **Mapping**:
   - Google Maps integration

### Backend Dependencies

1. **Database**:
   - PostgreSQL
   - Drizzle ORM
   - Neon Serverless Postgres client

2. **Authentication**:
   - Passport.js
   - Express-session
   - Connect-pg-simple (PostgreSQL session store)

3. **Validation**:
   - Zod for schema validation
   - Drizzle Zod integration

4. **External Services**:
   - Google Maps Geocoding API

## Deployment Strategy

The application is configured for deployment on Replit with the following strategy:

1. **Development Mode**:
   - Uses Vite's development server
   - Server runs with tsx for TypeScript execution

2. **Production Build**:
   - Client built with Vite
   - Server bundled with esbuild
   - Output in dist/ directory

3. **Runtime Environment**:
   - Node.js 20
   - PostgreSQL 16
   - Environment variables for configuration

4. **Deployment Targets**:
   - Configured for GCE deployment
   - Database connection via DATABASE_URL environment variable

## Security Considerations

1. **Authentication**:
   - Secure password hashing with scrypt
   - Session-based authentication
   - Force password change on first login

2. **Data Protection**:
   - Input validation with Zod
   - User access controls for device data

3. **API Security**:
   - Authentication middleware for protected routes
   - CSRF protection via SameSite cookies

## Development Workflow

1. **Local Development**:
   - `npm run dev` starts both client and server
   - Hot module replacement for React
   - Tailwind JIT compilation

2. **Database Operations**:
   - Schema defined in `shared/schema.ts`
   - Database migrations via Drizzle Kit
   - `npm run db:push` to update schema

3. **Production Build**:
   - `npm run build` creates production assets
   - `npm run start` runs the production server