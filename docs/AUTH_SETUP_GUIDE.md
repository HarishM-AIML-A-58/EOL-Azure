# Authentication System Setup Guide

This document provides complete instructions for setting up and testing the new authentication system for L&T-CORe.

## Overview

The authentication system has been successfully integrated with the following features:
- User registration with username/password
- Secure login with session cookies (HttpOnly)
- Session persistence across page refreshes
- Real logout with server-side session invalidation
- Per-user search history tracking
- Protected routes requiring authentication

## Architecture

### Backend (Python/FastAPI)
- **Database**: SQLite (`eol_core.db`)
- **Tables**: `users`, `sessions`, `search_history`
- **Authentication**: bcrypt password hashing + session cookies
- **Session Duration**: 24 hours (configurable)

### Frontend (React)
- **Auth Pages**: Login, Register
- **Session Management**: Cookie-based (automatic)
- **Protected Routes**: All application routes except login/register

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd "C:\Users\Harish M\Desktop\LTTS\EOL"
pip install -r requirements.txt
```

New dependencies added:
- `bcrypt==4.1.2` - Password hashing
- `sqlalchemy==2.0.25` - ORM for database

### 2. Initialize Database

The database will be automatically created when you start the backend server for the first time.

```bash
python app.py
```

This will:
- Create `eol_core.db` in the project root
- Create all required tables (users, sessions, search_history)
- Start the FastAPI server on `http://localhost:8001`

### 3. Start Frontend

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Testing the Authentication Flow

### Test 1: User Registration

1. Navigate to `http://localhost:5173`
2. You should be redirected to `/login`
3. Click "Register here" link
4. Fill in registration form:
   - Username: `testuser` (min 3 chars)
   - Password: `password123` (min 6 chars)
   - Confirm Password: `password123`
5. Click "Register"
6. Should show success alert and redirect to login page

**Expected Result**: User account created in database

### Test 2: User Login

1. On login page, enter credentials:
   - Username: `testuser`
   - Password: `password123`
2. Click "Login"
3. Should redirect to `/api-config` (first time) or `/dashboard` (if API already configured)

**Expected Result**:
- Session cookie `eol_session_id` set in browser
- User redirected to appropriate page

### Test 3: Session Persistence

1. After logging in, refresh the page (F5)
2. Should remain logged in (no redirect to login)
3. Navigate to different routes (/dashboard, /reports, etc.)
4. All should work without re-authentication

**Expected Result**: Session persists across refreshes

### Test 4: Search History Tracking

1. Go to Dashboard
2. Enter a part number (e.g., `LM317`)
3. Click "Lookup Specs"
4. Check the "Recent Searches" sidebar
5. Your search should appear in the list
6. Perform multiple searches
7. All searches should appear in history

**Expected Result**:
- Each search is logged in `search_history` table
- Recent searches displayed in sidebar
- Only current user's searches are shown

### Test 5: Logout

1. Click the "Logout" button in sidebar
2. Should redirect to `/login`
3. Try accessing `/dashboard` directly
4. Should redirect to `/login` (not authenticated)

**Expected Result**:
- Session invalidated in database
- Cookie cleared from browser
- User must log in again

### Test 6: Protected Routes

1. Without logging in, try accessing:
   - `http://localhost:5173/dashboard`
   - `http://localhost:5173/reports`
   - `http://localhost:5173/settings`
2. All should redirect to `/login`

**Expected Result**: All protected routes require authentication

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "username": "testuser",
    "created_at": "2025-01-01T00:00:00",
    "last_login": null
  }
}
```

#### POST `/api/auth/login`
Login and create session.

**Request:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "username": "testuser",
    "created_at": "2025-01-01T00:00:00",
    "last_login": "2025-01-01T00:00:00"
  }
}
```

Sets cookie: `eol_session_id=<uuid>; HttpOnly; SameSite=Lax; Max-Age=86400`

#### GET `/api/auth/session`
Check current session status.

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "username": "testuser",
    "created_at": "2025-01-01T00:00:00",
    "last_login": "2025-01-01T00:00:00"
  }
}
```

#### POST `/api/auth/logout`
Logout and invalidate session.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful",
  "user": null
}
```

#### GET `/api/auth/me`
Get current authenticated user info.

**Response:**
```json
{
  "id": "uuid",
  "username": "testuser",
  "created_at": "2025-01-01T00:00:00",
  "last_login": "2025-01-01T00:00:00"
}
```

### Protected Endpoints

These endpoints now require authentication (via session cookie):

#### GET `/api/v1/lookup_eol_specs/{part_number}`
Lookup part specifications (requires authentication).

**Headers:**
- Cookie: `eol_session_id=<uuid>` (automatic)
- `X-Session-Id`: `<api-session-id>` (for API keys)

**Query Params:**
- `manufacturer` (optional)

**Response:** Same as before, plus search is logged to history

#### POST `/api/v1/download_report`
Generate Excel report (requires authentication).

**Headers:**
- Cookie: `eol_session_id=<uuid>` (automatic)
- `X-Session-Id`: `<api-session-id>` (for API keys)

**Response:** Excel file download

#### GET `/api/v1/search-history`
Get current user's search history.

**Query Params:**
- `limit` (optional, default: 50)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "history": [
    {
      "id": 1,
      "part_number": "LM317",
      "manufacturer": "Texas Instruments",
      "searched_at": "2025-01-01T00:00:00"
    }
  ]
}
```

## Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (UUID) | Primary key |
| username | VARCHAR (UNIQUE) | Username |
| password_hash | VARCHAR | Bcrypt hashed password |
| created_at | DATETIME | Account creation timestamp |
| last_login | DATETIME | Last login timestamp |

### sessions
| Column | Type | Description |
|--------|------|-------------|
| session_id | VARCHAR (UUID) | Primary key |
| user_id | VARCHAR | Foreign key to users.id |
| created_at | DATETIME | Session creation timestamp |
| expires_at | DATETIME | Session expiration timestamp |
| is_active | BOOLEAN | Session active status |

### search_history
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| user_id | VARCHAR | Foreign key to users.id |
| part_number | VARCHAR | Searched part number |
| manufacturer | VARCHAR | Manufacturer (nullable) |
| searched_at | DATETIME | Search timestamp |

## Security Features

1. **Password Hashing**: Bcrypt with automatic salt generation
2. **HttpOnly Cookies**: Session cookies not accessible via JavaScript
3. **SameSite Protection**: CSRF protection via SameSite=Lax
4. **Session Expiration**: 24-hour automatic expiration
5. **Server-side Sessions**: Session data stored in database, not client
6. **Password Validation**: Minimum 6 characters
7. **Username Validation**: Minimum 3 characters, alphanumeric + `_-.`

## File Changes Summary

### New Backend Files
- `database.py` - Database models and utilities
- `auth_utils.py` - Password hashing and validation
- `auth_middleware.py` - Authentication middleware and Pydantic models
- `auth_routes.py` - Authentication API endpoints

### Modified Backend Files
- `app.py` - Integrated auth routes, updated endpoints to require authentication
- `requirements.txt` - Added bcrypt and sqlalchemy

### New Frontend Files
- `src/components/Register.jsx` - User registration page
- `src/components/SearchHistory.jsx` - Search history sidebar widget
- `src/components/SearchHistory.css` - Search history styles

### Modified Frontend Files
- `src/components/Login.jsx` - Updated to use real authentication API
- `src/components/ProtectedRoute.jsx` - Updated to validate session with backend
- `src/components/Dashboard.jsx` - Added search history integration
- `src/components/Sidebar.jsx` - Updated logout to use real API
- `main.jsx` - Added /register route

## Troubleshooting

### Issue: Database not created
**Solution**: Run `python database.py` directly to initialize database

### Issue: Session not persisting
**Solution**: Ensure `credentials: 'include'` is set in all fetch calls

### Issue: CORS errors
**Solution**: Check that backend CORS allows credentials (`allow_credentials=True`)

### Issue: "Session expired" errors
**Solution**: Sessions expire after 24 hours. Log in again.

### Issue: bcrypt import error
**Solution**: Ensure bcrypt is installed: `pip install bcrypt==4.1.2`

## Production Considerations

For production deployment, consider:

1. **Database**: Migrate from SQLite to PostgreSQL for better concurrent access
2. **Session Storage**: Use Redis for session storage instead of database
3. **HTTPS**: Always use HTTPS in production for secure cookie transmission
4. **Session Duration**: Consider shorter session duration (e.g., 1 hour) with refresh tokens
5. **Rate Limiting**: Add rate limiting to login endpoint to prevent brute force
6. **Password Requirements**: Strengthen password requirements (uppercase, numbers, special chars)
7. **Email Verification**: Add email verification for new accounts
8. **Password Reset**: Implement password reset flow
9. **2FA**: Consider adding two-factor authentication for sensitive environments

## Notes

- The old fake login system has been completely replaced
- All routes now require real authentication
- API key configuration (`/api-config`) still uses the existing session-based approach
- Search history is now per-user and persistent
- Sessions are automatically cleaned up on expiration

## Support

For issues or questions, refer to the codebase comments or create a support ticket.
