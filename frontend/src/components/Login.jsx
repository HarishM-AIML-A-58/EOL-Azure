import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, [navigate]);

  const checkSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          localStorage.setItem('username', data.user.username);
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  const handleDemoAccess = async () => {
    setDemoLoading(true);
    setError('');
    try {
      // 1. Try to register the universal user (ignore if already exists)
      await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'hr_demo_user', password: 'DemoPassword123!' }),
      });

      // 2. Login as the universal user
      const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: 'hr_demo_user', password: 'DemoPassword123!' }),
      });
      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.success) {
        localStorage.setItem('username', 'hr_demo_user');
        localStorage.setItem('apiConfigured', 'true');
        navigate('/dashboard');
      } else {
        setError('Failed to initialize platform access. Please try again.');
      }
    } catch (err) {
      console.error(err);
      // Fallback
      localStorage.setItem('username', 'hr_guest');
      localStorage.setItem('apiConfigured', 'true');
      navigate('/dashboard');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('apiConfigured', 'true');
        navigate('/dashboard');
      } else {
        setError(data.detail || 'Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-split-container">
        
        {/* Left Marketing / Demo Panel */}
        <div className="login-marketing-panel">
          <div className="marketing-content">
            <div className="marketing-badge">Enterprise Edition</div>
            <h1 className="marketing-title">Intelligent Component Resilience</h1>
            <p className="marketing-subtitle">
              Automate End-of-Life (EOL) part replacement with AI-driven Form, Fit, and Function (FFF) analysis.
            </p>
            
            <div className="demo-highlight-box">
              <h3>Exploring for a role?</h3>
              <p>Experience the platform instantly without creating an account. Includes pre-configured data for HR and recruiters.</p>
              <Button
                type="button"
                className="demo-access-btn"
                onClick={handleDemoAccess}
                loading={demoLoading}
                icon="pi pi-bolt"
                label={demoLoading ? "Initializing Environment..." : "Instant Demo Access"}
              />
            </div>
            
            <div className="marketing-features">
              <div className="feature-item">
                <i className="pi pi-check-circle"></i>
                <span>Real-time API integrations (Octopart, Mouser, DigiKey)</span>
              </div>
              <div className="feature-item">
                <i className="pi pi-check-circle"></i>
                <span>Azure OpenAI powered specification comparison</span>
              </div>
              <div className="feature-item">
                <i className="pi pi-check-circle"></i>
                <span>Automated Excel report generation with color coding</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Panel */}
        <div className="login-form-panel">
          <div className="login-form-container">
            <div className="login-header">
              <div className="logo-container">
                <img src="/LT.png" alt="L&T Logo" className="logo-image" />
              </div>
              <h2>Welcome Back</h2>
              <p>Log in to your L&T-CORe dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <span className="p-input-icon-left w-full">
                  <i className="pi pi-user" />
                  <InputText
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full custom-input"
                    disabled={demoLoading || loading}
                  />
                </span>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <Password
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full"
                  inputClassName="w-full custom-input"
                  feedback={false}
                  toggleMask
                  disabled={demoLoading || loading}
                />
              </div>

              {error && (
                <Message severity="error" text={error} className="w-full justify-start error-msg" />
              )}

              <Button
                type="submit"
                label={loading ? 'Authenticating...' : 'Sign In'}
                className="login-submit-btn"
                loading={loading}
                disabled={demoLoading}
              />

              <div className="register-link-container">
                Don't have an account? <Link to="/register" className="register-link">Register here</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
