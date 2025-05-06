This project is a wind speed monitoring system built with a TypeScript-based stack:

Frontend: React/TypeScript with Vite, shadcn/ui components, TailwindCSS, and React Query for state management.

Backend: Express.js server with PostgreSQL database using Drizzle ORM. Includes a UDP listener for receiving real-time wind data from IoT devices.

Key features:
- Real-time wind monitoring with configurable alert thresholds
- Google Maps integration for device location visualization
- Historical data aggregation and reporting
- Device management system with user authentication

The architecture follows a clean separation between frontend (client/), backend (server/), and shared types/schema definitions (shared/)