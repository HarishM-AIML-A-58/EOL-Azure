import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';

import Login from './src/components/Login';
import Register from './src/components/Register';
import Layout from './src/components/Layout';
import ProtectedRoute from './src/components/ProtectedRoute';
import LandingPage from './src/pages/LandingPage';

/* Product surfaces load on demand — the landing page is the common entry. */
const Dashboard = lazy(() => import('./src/pages/Dashboard'));
const Analysis = lazy(() => import('./src/pages/Analysis'));
const Reports = lazy(() => import('./src/pages/Reports'));
const History = lazy(() => import('./src/pages/History'));
const Settings = lazy(() => import('./src/pages/Settings'));
const Profile = lazy(() => import('./src/pages/Profile'));
const NotFound = lazy(() => import('./src/pages/NotFound'));

import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './index.css';

const PAGE_FALLBACK = (
  <div className="grid min-h-[60vh] place-items-center">
    <span className="spinner text-violet-mid" role="status" aria-label="Loading" />
  </div>
);

/** Wraps a product page in the shell and the auth gate. */
function AppPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>
        <Suspense fallback={PAGE_FALLBACK}>{children}</Suspense>
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <PrimeReactProvider value={{ ripple: false }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<AppPage><Dashboard /></AppPage>} />
          <Route path="/analysis" element={<AppPage><Analysis /></AppPage>} />
          <Route path="/reports" element={<AppPage><Reports /></AppPage>} />
          <Route path="/history" element={<AppPage><History /></AppPage>} />
          <Route path="/settings" element={<AppPage><Settings /></AppPage>} />
          <Route path="/profile" element={<AppPage><Profile /></AppPage>} />

          <Route
            path="*"
            element={
              <Suspense fallback={PAGE_FALLBACK}>
                <NotFound />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </PrimeReactProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
