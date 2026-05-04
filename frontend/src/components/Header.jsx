import { API_BASE_URL } from '../config';
import React, { useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Menu, X, Bell, Search, Command, LogOut, ChevronDown, Shield, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';

function Header({ onMenuClick, sidebarOpen }) {
  const navigate = useNavigate();
  const op = useRef(null);
  
  const username = useMemo(() => {
    const defaultName = 'Harish M';
    const storedName = localStorage.getItem('username');
    if (!storedName) {
      localStorage.setItem('username', defaultName);
      return defaultName;
    }
    return storedName;
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('username');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('apiConfigured');
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-8">
        <div className="flex items-center gap-4 flex-1">
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 lg:hidden"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-50 text-slate-400 max-w-sm w-full cursor-pointer hover:bg-slate-100 transition-colors">
            <Search className="h-4 w-4" />
            <span className="text-sm flex-1 text-slate-500">Quick Search...</span>
            <div className="flex items-center gap-1 bg-white border px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center flex-1 lg:hidden">
           <img src="/LT.png" alt="L&T" className="h-6 w-auto brightness-0" />
        </div>

        <div className="flex items-center justify-end flex-1 gap-2 md:gap-4">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 w-9 relative text-slate-600">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border-2 border-background"></span>
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

          <button 
            onClick={(e) => op.current.toggle(e)}
            className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-lg transition-colors group"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700 leading-none">{username}</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-tighter mt-1">Administrator</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all overflow-hidden border border-primary/20 shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          <OverlayPanel ref={op} className="user-menu-overlay">
            <div className="flex flex-col w-56 p-1">
              <div className="px-3 py-2 mb-1 border-b">
                <p className="text-sm font-bold text-slate-900">{username}</p>
                <p className="text-xs text-slate-500">harish.m@ltts.com</p>
              </div>
              
              <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
              
              <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
                <Settings className="h-4 w-4" />
                <span>Account Settings</span>
              </Link>
              
              <div className="h-px bg-slate-100 my-1" />
              
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-semibold">Sign Out</span>
              </button>
            </div>
          </OverlayPanel>
        </div>
      </div>
    </header>
  );
}

export default Header;
