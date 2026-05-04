import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiKey, FiChevronRight, FiAlertCircle, FiInfo, FiCpu, FiCloud } from 'react-icons/fi';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';

// Use relative path to leverage Vite proxy

function ApiConfig() {
  const [apiKeys, setApiKeys] = useState({
    octopartClientId: '',
    octopartClientSecret: '',
    azureOpenaiKey: '',
    azureOpenaiEndpoint: '',
    azureOpenaiDeployment: '',
    digikeyClientId: '',
    digikeyClientSecret: '',
    mouserApiKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }

    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        setApiKeys(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load saved API keys');
      }
    }
  }, [navigate]);

  const handleInputChange = (field, value) => {
    setApiKeys(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const validateAndSaveApiKeys = async () => {
    setValidating(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/configure_api_keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          octopart_client_id: apiKeys.octopartClientId.trim(),
          octopart_client_secret: apiKeys.octopartClientSecret.trim(),
          azure_openai_key: apiKeys.azureOpenaiKey.trim() || null,
          azure_openai_endpoint: apiKeys.azureOpenaiEndpoint.trim() || null,
          azure_openai_deployment: apiKeys.azureOpenaiDeployment.trim() || null,
          digikey_client_id: apiKeys.digikeyClientId.trim() || null,
          digikey_client_secret: apiKeys.digikeyClientSecret.trim() || null,
          mouser_api_key: apiKeys.mouserApiKey.trim() || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to configure API keys');
      }

      localStorage.setItem('sessionId', data.session_id);
      localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
      localStorage.setItem('apiConfigured', 'true');
      localStorage.setItem('configuredApis', JSON.stringify(data.configured_apis));

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to validate API keys');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    validateAndSaveApiKeys();
  };

  const handleSkip = () => {
    localStorage.setItem('apiConfigured', 'false');
    navigate('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6 lg:p-10">
      <Card className="w-full max-w-4xl shadow-2xl border-none">
        <div className="flex flex-col items-center gap-4 mb-10 border-b pb-6">
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <FiKey size={40} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-slate-900">API Configuration</h1>
            <p className="text-slate-500 mt-1">Configure your credentials to enable component intelligence</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
            {/* Required Section */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Octopart/Nexar API
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">Default Available</span>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="octopartClientId" className="text-sm font-medium">Client ID</label>
                  <InputText
                    id="octopartClientId"
                    value={apiKeys.octopartClientId}
                    onChange={(e) => handleInputChange('octopartClientId', e.target.value)}
                    placeholder="Enter Client ID"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="octopartClientSecret" className="text-sm font-medium">Client Secret</label>
                  <Password
                    id="octopartClientSecret"
                    value={apiKeys.octopartClientSecret}
                    onChange={(e) => handleInputChange('octopartClientSecret', e.target.value)}
                    placeholder="Enter Client Secret"
                    feedback={false}
                    toggleMask
                  />
                </div>
              </div>
            </div>

            {/* AI Section */}
            <div className="flex flex-col gap-6 p-6 bg-blue-50/30 rounded-2xl border border-blue-100 shadow-sm shadow-blue-500/5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                  <FiCloud className="text-blue-600" />
                  Azure OpenAI
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">Optional</span>
              </div>
              <p className="text-xs text-blue-600/80 leading-relaxed">
                Enables enterprise-grade FFF analysis and comparison commentary.
              </p>
              <div className="flex flex-col gap-3 mt-auto">
                <div className="flex flex-col gap-1">
                  <label htmlFor="azureOpenaiKey" className="text-[11px] font-bold uppercase text-blue-800/60">API Key</label>
                  <Password
                    id="azureOpenaiKey"
                    value={apiKeys.azureOpenaiKey}
                    onChange={(e) => handleInputChange('azureOpenaiKey', e.target.value)}
                    placeholder="Azure API Key"
                    feedback={false}
                    toggleMask
                    className="w-full"
                    inputClassName="w-full py-2"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="azureOpenaiEndpoint" className="text-[11px] font-bold uppercase text-blue-800/60">Endpoint URL</label>
                  <InputText
                    id="azureOpenaiEndpoint"
                    value={apiKeys.azureOpenaiEndpoint}
                    onChange={(e) => handleInputChange('azureOpenaiEndpoint', e.target.value)}
                    placeholder="https://your-resource.openai.azure.com/"
                    className="w-full py-2"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="azureOpenaiDeployment" className="text-[11px] font-bold uppercase text-blue-800/60">Deployment Name</label>
                  <InputText
                    id="azureOpenaiDeployment"
                    value={apiKeys.azureOpenaiDeployment}
                    onChange={(e) => handleInputChange('azureOpenaiDeployment', e.target.value)}
                    placeholder="e.g. gpt-4o-mini"
                    className="w-full py-2"
                  />
                </div>
              </div>
            </div>

            {/* Digi-Key Section */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Digi-Key API
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">Optional</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="digikeyClientId" className="text-sm font-medium">Client ID</label>
                  <InputText
                    id="digikeyClientId"
                    value={apiKeys.digikeyClientId}
                    onChange={(e) => handleInputChange('digikeyClientId', e.target.value)}
                    placeholder="Client ID"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="digikeyClientSecret" className="text-sm font-medium">Client Secret</label>
                  <Password
                    id="digikeyClientSecret"
                    value={apiKeys.digikeyClientSecret}
                    onChange={(e) => handleInputChange('digikeyClientSecret', e.target.value)}
                    placeholder="Secret"
                    feedback={false}
                    toggleMask
                  />
                </div>
              </div>
            </div>

            {/* Mouser Section */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Mouser API
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">Optional</span>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="mouserApiKey" className="text-sm font-medium">API Key</label>
                <Password
                  id="mouserApiKey"
                  value={apiKeys.mouserApiKey}
                  onChange={(e) => handleInputChange('mouserApiKey', e.target.value)}
                  placeholder="Enter Mouser Key"
                  feedback={false}
                  toggleMask
                />
              </div>
            </div>
          </div>

          <Divider />

          {error && (
            <Message severity="error" text={error} className="w-full justify-start p-3" />
          )}

          <div className="flex flex-col md:flex-row items-center gap-4">
            <Button
              type="button"
              label="Skip for Now"
              onClick={handleSkip}
              disabled={validating}
              className="p-button-text p-button-secondary w-full md:w-auto px-8"
            />
            <Button
              type="submit"
              label={validating ? 'Validating...' : 'Continue to Dashboard'}
              icon="pi pi-chevron-right"
              iconPos="right"
              disabled={validating}
              className="w-full md:flex-1 py-4 font-bold text-lg"
              loading={validating}
            />
          </div>

          <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <FiInfo />
            <span>Credentials are securely handled in your session and never stored on our servers.</span>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ApiConfig;
