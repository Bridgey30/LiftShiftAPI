# Development Setup Guide

This guide will help you set up LiftShift for local development.

## Prerequisites

- Node.js v18+ ([download](https://nodejs.org/))
- npm v9+ (comes with Node.js)

## Initial Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/Bridgey30/LiftShiftAPI.git
cd LiftShiftAPI
```

Install **both** frontend and backend dependencies:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

Create `.env` files for both frontend and backend:

**Frontend `.env` (in root directory):**
```bash
cp .env.example .env
```

The frontend `.env` should contain:
```
VITE_BACKEND_URL=

# Note: Leave empty for development mode - Vite will proxy requests to the backend
```

**Backend `.env` (in `backend/` directory):**
```bash
cp backend/.env.example backend/.env
```

The backend `.env` should contain:
```
HEVY_X_API_KEY=klean_kanteen_insulated
PORT=5000
HEVY_BASE_URL=https://api.hevyapp.com
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://liftshift.app
```

### 3. Build the Backend

The backend needs to be compiled from TypeScript before it can run:

```bash
cd backend
npm run build
cd ..
```

## Running in Development Mode

You need to run **both** the frontend and backend servers:

### Option 1: Two Terminal Windows

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev:serve
```

The backend will start on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

### Option 2: Background Process (Linux/Mac)

```bash
# Start backend in background
cd backend && npm run dev:serve &

# Start frontend
cd .. && npm run dev
```

## Common Issues

### Error: "Missing VITE_BACKEND_URL (backend API)"

**Cause:** This error occurs when:
- The `.env` file doesn't exist in the root directory, OR
- You're running a production build (`npm run preview`) without setting `VITE_BACKEND_URL`

**Solution:**
1. Create `.env` file in the root directory (copy from `.env.example`)
2. For development, leave `VITE_BACKEND_URL` empty
3. Run `npm run dev` (not `npm run preview` or `npm run build`)

### Backend not starting

**Cause:** Backend dependencies not installed or backend not compiled

**Solution:**
```bash
cd backend
npm install
npm run build
npm run dev:serve
```

### Port already in use

If port 3000 or 5000 is already in use:

```bash
# Frontend - use different port
npm run dev -- --port 3001

# Backend - change PORT in backend/.env
# Edit backend/.env and change PORT=5000 to PORT=5001
```

## Development Workflow

1. **Make changes** to files in `frontend/` or `backend/src/`
2. **Frontend changes** hot-reload automatically
3. **Backend changes** require rebuild:
   ```bash
   cd backend
   npm run build
   ```
4. Test your changes at `http://localhost:3000`

## Testing Production Build

To test a production build locally:

```bash
# Make sure backend is running
cd backend && npm start &

# Build and preview frontend
cd ..
npm run build
npm run preview
```

**Note:** For production builds, you MUST set `VITE_BACKEND_URL` to your backend URL:
```
VITE_BACKEND_URL=http://localhost:5000
```

## Project Structure

```
LiftShiftAPI/
├── frontend/           # React frontend source
├── backend/           # Node.js/Express backend
│   ├── src/          # TypeScript source
│   └── dist/         # Compiled JavaScript (generated)
├── .env              # Frontend environment variables
├── backend/.env      # Backend environment variables
└── vite.config.ts    # Vite configuration
```

## Next Steps

- See [QUICKSTART.md](./QUICKSTART.md) for usage instructions
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment to production
- See [README.md](./README.md) for full documentation

## Need Help?

If you encounter any issues:

1. Make sure both `.env` files exist
2. Verify both frontend and backend dependencies are installed
3. Ensure the backend is built and running
4. Check [Troubleshooting](#common-issues) section above
5. Open a [GitHub Issue](https://github.com/Bridgey30/LiftShiftAPI/issues)
