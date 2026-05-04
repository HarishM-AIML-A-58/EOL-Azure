import React, { useState, useEffect } from 'react';
import { FiSave, FiKey, FiSettings, FiBell, FiCpu } from 'react-icons/fi';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import { Password } from 'primereact/password';
import './Settings.css';


function Settings() {
  const [settings, setSettings] = useState({
    apiKeys: {
      octopartId: '',
      octopartSecret: '',
      mouserKey: '',
      digikeyId: '',
      digikeySecret: '',
      azureOpenaiKey: '',
      azureOpenaiEndpoint: '',
      azureOpenaiDeployment: ''
    },
    preferences: {
      defaultPriority: '2',
      autoDownload: false,
      emailNotifications: false
    },
    notifications: {
      analysisComplete: true,
      errors: true,
      weeklyReport: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings');
      }
    }
  }, []);

  const handleInputChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setTimeout(() => {
      setSaving(false);
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    }, 1000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings?')) {
      setSettings({
        apiKeys: {
          octopartId: '',
          octopartSecret: '',
          mouserKey: '',
          digikeyId: '',
          digikeySecret: '',
          azureOpenaiKey: '',
          azureOpenaiEndpoint: '',
          azureOpenaiDeployment: ''
        },
        preferences: {
          defaultPriority: '2',
          autoDownload: false,
          emailNotifications: false
        },
        notifications: {
          analysisComplete: true,
          errors: true,
          weeklyReport: false
        }
      });
      localStorage.removeItem('appSettings');
      setSaveMessage({ type: 'info', text: 'Settings reset to defaults' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const priorityOptions = [
    { label: 'Priority 1: Must Match', value: '1' },
    { label: 'Priority 2: Can Differ', value: '2' },
    { label: 'Priority 3: Cosmetic', value: '3' }
  ];

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="settings-header-section">
        <div className="settings-breadcrumb">
          <FiSettings size={12} />
          <span>Account</span>
          <span className="settings-breadcrumb-sep">/</span>
          <span className="settings-breadcrumb-active">Application Settings</span>
        </div>
        <h1 className="settings-main-title">Settings</h1>
        <p className="settings-main-subtitle">Configure your application settings, API credentials, and notification preferences.</p>
      </div>

      {saveMessage && (
        <Message 
          severity={saveMessage.type} 
          text={saveMessage.text} 
          className="w-full justify-start p-3"
        />
      )}

        <div className="settings-grid">
          {/* API Credentials */}
          <Card className="settings-card">
            <div className="settings-section-header">
              <div className="settings-section-icon api">
                <FiKey />
              </div>
              <div>
                <h3 className="settings-section-title">API Credentials</h3>
                <p className="settings-section-subtitle">Configure your API keys for external services. Keys are stored securely.</p>
              </div>
            </div>
            
            <div className="settings-form-grid">
              <div className="settings-field">
                <label>Octopart Client ID</label>
                <span className="p-input-icon-left">
                  <i className="pi pi-id-card" />
                  <InputText
                    value={settings.apiKeys.octopartId}
                    onChange={(e) => handleInputChange('apiKeys', 'octopartId', e.target.value)}
                    placeholder=""
                    className="w-full"
                  />
                </span>
              </div>

              <div className="settings-field">
                <label>Octopart Client Secret</label>
                <Password
                  value={settings.apiKeys.octopartSecret}
                  onChange={(e) => handleInputChange('apiKeys', 'octopartSecret', e.target.value)}
                  placeholder=""
                  feedback={false}
                  toggleMask
                  className="w-full"
                  inputClassName="w-full"
                />
              </div>

              <div className="settings-field">
                <label>Mouser API Key</label>
                <Password
                  value={settings.apiKeys.mouserKey}
                  onChange={(e) => handleInputChange('apiKeys', 'mouserKey', e.target.value)}
                  placeholder=""
                  feedback={false}
                  toggleMask
                  className="w-full"
                  inputClassName="w-full"
                />
              </div>

              <div className="settings-field">
                <label>Digi-Key Client ID</label>
                <span className="p-input-icon-left">
                  <i className="pi pi-id-card" />
                  <InputText
                    value={settings.apiKeys.digikeyId}
                    onChange={(e) => handleInputChange('apiKeys', 'digikeyId', e.target.value)}
                    placeholder=""
                    className="w-full"
                  />
                </span>
              </div>

              <div className="settings-field">
                <label>Digi-Key Client Secret</label>
                <Password
                  value={settings.apiKeys.digikeySecret}
                  onChange={(e) => handleInputChange('apiKeys', 'digikeySecret', e.target.value)}
                  placeholder=""
                  feedback={false}
                  toggleMask
                  className="w-full"
                  inputClassName="w-full"
                />
              </div>

              <div className="settings-field">
                <label>Azure OpenAI API Key</label>
                <Password
                  value={settings.apiKeys.azureOpenaiKey}
                  onChange={(e) => handleInputChange('apiKeys', 'azureOpenaiKey', e.target.value)}
                  placeholder=""
                  feedback={false}
                  toggleMask
                  className="w-full"
                  inputClassName="w-full"
                />
              </div>

              <div className="settings-field">
                <label>Azure Endpoint URL</label>
                <InputText
                  value={settings.apiKeys.azureOpenaiEndpoint}
                  onChange={(e) => handleInputChange('apiKeys', 'azureOpenaiEndpoint', e.target.value)}
                  placeholder=""
                  className="w-full"
                />
              </div>

              <div className="settings-field">
                <label>Azure Deployment Name</label>
                <InputText
                  value={settings.apiKeys.azureOpenaiDeployment}
                  onChange={(e) => handleInputChange('apiKeys', 'azureOpenaiDeployment', e.target.value)}
                  placeholder=""
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          {/* Preferences & Notifications Row */}
          <div className="settings-row">
            <Card className="settings-card flex-1">
              <div className="settings-section-header">
                <div className="settings-section-icon pref">
                  <FiSettings />
                </div>
                <div>
                  <h3 className="settings-section-title">Preferences</h3>
                  <p className="settings-section-subtitle">Default analysis and reporting settings.</p>
                </div>
              </div>
              
              <div className="settings-content-stack">
                <div className="settings-field">
                  <label>Default Priority Level</label>
                  <Dropdown
                    value={settings.preferences.defaultPriority}
                    options={priorityOptions}
                    onChange={(e) => handleInputChange('preferences', 'defaultPriority', e.value)}
                    className="w-full"
                  />
                </div>

                <div className="settings-switch-list">
                  <div className="settings-switch-item">
                    <div className="settings-switch-info">
                      <label htmlFor="autoDownload">Auto-download reports</label>
                      <p>Automatically download PDF reports after analysis completes.</p>
                    </div>
                    <InputSwitch
                      inputId="autoDownload"
                      checked={settings.preferences.autoDownload}
                      onChange={(e) => handleInputChange('preferences', 'autoDownload', e.value)}
                    />
                  </div>

                  <div className="settings-switch-item">
                    <div className="settings-switch-info">
                      <label htmlFor="emailNotifications">Email Notifications</label>
                      <p>Receive email alerts for critical system events.</p>
                    </div>
                    <InputSwitch
                      inputId="emailNotifications"
                      checked={settings.preferences.emailNotifications}
                      onChange={(e) => handleInputChange('preferences', 'emailNotifications', e.value)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="settings-card flex-1">
              <div className="settings-section-header">
                <div className="settings-section-icon bell">
                  <FiBell />
                </div>
                <div>
                  <h3 className="settings-section-title">Notifications</h3>
                  <p className="settings-section-subtitle">Manage how you receive alerts.</p>
                </div>
              </div>
              
              <div className="settings-switch-list">
                <div className="settings-switch-item">
                  <div className="settings-switch-info">
                    <label htmlFor="analysisComplete">Analysis Completion</label>
                    <p>Notify when a background analysis task finishes.</p>
                  </div>
                  <InputSwitch
                    inputId="analysisComplete"
                    checked={settings.notifications.analysisComplete}
                    onChange={(e) => handleInputChange('notifications', 'analysisComplete', e.value)}
                  />
                </div>

                <div className="settings-switch-item">
                  <div className="settings-switch-info">
                    <label htmlFor="errorsNotify">System Errors</label>
                    <p>Alert me immediately if an API or engine error occurs.</p>
                  </div>
                  <InputSwitch
                    inputId="errorsNotify"
                    checked={settings.notifications.errors}
                    onChange={(e) => handleInputChange('notifications', 'errors', e.value)}
                  />
                </div>

                <div className="settings-switch-item">
                  <div className="settings-switch-info">
                    <label htmlFor="weeklyReport">Weekly Summary</label>
                    <p>Send a weekly rollup of all activities and exports.</p>
                  </div>
                  <InputSwitch
                    inputId="weeklyReport"
                    checked={settings.notifications.weeklyReport}
                    onChange={(e) => handleInputChange('notifications', 'weeklyReport', e.value)}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex gap-4 pt-6 border-t">
          <Button 
            label={saving ? 'Saving...' : 'Save Settings'}
            icon={<FiSave className="mr-2" />}
            onClick={handleSave}
            disabled={saving}
            className="p-button-primary px-8"
          />
          <Button 
            label="Reset to Defaults"
            onClick={handleReset}
            className="p-button-text p-button-secondary"
          />
        </div>
    </div>
  );
}

export default Settings;
