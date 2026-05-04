# Quick Start Guide - Authentication System

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies (One-time)

```bash
cd "C:\Users\Harish M\Desktop\LTTS\EOL"
pip install bcrypt==4.1.2 sqlalchemy==2.0.25
```

### Step 2: Start Backend

```bash
python app.py
```

The first time you run this, it will automatically create the database (`eol_core.db`).

**Backend running on:** http://localhost:8001

### Step 3: Start Frontend

```bash
npm run dev
```

**Frontend running on:** http://localhost:5173

---

## 📝 First Time Setup

1. Open browser: http://localhost:5173
2. Click "Register here"
3. Create your account:
   - Username: (minimum 3 characters)
   - Password: (minimum 6 characters)
4. Click "Register"
5. Login with your credentials
6. Configure API keys (first time only)
7. Start using the app!

---

## 🔐 Login

- **URL**: http://localhost:5173/login
- Enter your username and password
- Session lasts 24 hours
- Stay logged in across page refreshes

---

## 📊 Features You'll See

### After Login:
- ✅ Dashboard with part lookup
- ✅ Search history in sidebar (your recent searches)
- ✅ Click any search to re-populate fields
- ✅ All your data is private (per-user)

### Search History:
- Automatically tracks every part lookup
- Shows last 10 searches in sidebar
- Click to quickly re-search parts
- Persists across sessions

---

## 🛠️ Troubleshooting

### "Module not found: bcrypt"
```bash
pip install bcrypt==4.1.2
```

### "Module not found: sqlalchemy"
```bash
pip install sqlalchemy==2.0.25
```

### Database not created
```bash
python database.py
```

### Port already in use
- Backend (8001): Close other FastAPI instances
- Frontend (5173): Close other Vite instances

---

## 🔧 Important URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs
- **Login**: http://localhost:5173/login
- **Register**: http://localhost:5173/register

---

## 📖 For More Details

- **Full Setup Guide**: See `AUTH_SETUP_GUIDE.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **API Documentation**: Visit http://localhost:8001/docs

---

## 🆘 Need Help?

### Check these files:
1. `AUTH_SETUP_GUIDE.md` - Complete setup and testing instructions
2. `IMPLEMENTATION_SUMMARY.md` - Technical implementation details

### Common Issues:

**"Invalid username or password"**
- Check your credentials
- Username and password are case-sensitive

**"Session expired"**
- Sessions last 24 hours
- Just log in again

**"API not configured"**
- Go to Settings → Configure API Keys
- OR use the `/api-config` route

---

## ✅ That's It!

You're ready to use the L&T-CORe application with real authentication.

Happy component searching! 🎉
