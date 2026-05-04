import React, { useState } from 'react';
import { 
  FiUser, FiMail, FiShield, FiBriefcase, FiClock, 
  FiActivity, FiSettings, FiCheckCircle, FiLock, FiGlobe
} from 'react-icons/fi';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { cn } from '../lib/utils';
import './Profile.css';

function Profile() {
  const [activeTab, setActiveTab] = useState('general');

  const user = {
    name: 'Harish M',
    email: 'harish.m@ltts.com',
    role: 'Administrator',
    roleDescription: 'Full Access · System Owner',
    department: 'Engineering R&D',
    joinDate: 'January 2024',
    location: 'Bangalore, India',
    timezone: 'IST (UTC+5:30)',
    lastLogin: '2 hours ago',
    avatar: null
  };

  const initials = user.name.split(' ').map(n => n[0]).join('');

  const activities = [
    { id: 1, action: 'Exported FFF Report', target: 'EE-SX4070', time: '10 mins ago', status: 'success' },
    { id: 2, action: 'Updated API Credentials', target: 'Octopart', time: '1 hour ago', status: 'info' },
    { id: 3, action: 'Looked up Part Spec', target: 'LM317', time: '2 hours ago', status: 'success' },
    { id: 4, action: 'Changed Priority Levels', target: 'Global Settings', time: 'Yesterday', status: 'warning' },
  ];

  return (
    <div className="account-root animate-in fade-in duration-500">
      {/* ── Page Header ── */}
      <div className="account-header">
        <div className="account-header-content">
          <div className="account-breadcrumb">
            <FiUser size={12} />
            <span>Account</span>
            <span className="account-breadcrumb-sep">/</span>
            <span className="account-breadcrumb-active">Profile Settings</span>
          </div>
          <h1 className="account-title">Account Settings</h1>
          <p className="account-subtitle">Manage your personal information, security preferences, and system activity.</p>
        </div>
      </div>

      <div className="account-layout">
        {/* ── Sidebar Nav ── */}
        <aside className="account-sidebar">
          <nav className="account-nav">
            {[
              { id: 'general', label: 'General Info', icon: FiUser },
              { id: 'security', label: 'Security', icon: FiLock },
              { id: 'activity', label: 'Recent Activity', icon: FiActivity },
              { id: 'preferences', label: 'Preferences', icon: FiSettings },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn('account-nav-item', activeTab === item.id && 'active')}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className="account-main">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="account-tab-content">
              <Card className="account-card profile-hero-new">
                <div className="profile-hero-cover" />
                <div className="profile-hero-content">
                  <div className="profile-hero-left">
                    <Avatar 
                      label={!user.avatar ? initials : null} 
                      image={user.avatar} 
                      size="xlarge" 
                      shape="circle" 
                      className="profile-avatar-new"
                    />
                    <div className="profile-basic-info">
                      <h2 className="profile-name-new">{user.name}</h2>
                      <div className="profile-badges">
                        <Tag value={user.role} severity="info" className="profile-tag-new" />
                        <span className="profile-role-sub">{user.roleDescription}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="profile-hero-stats">
                    <div className="profile-stat">
                      <FiClock className="stat-icon" />
                      <div className="stat-details">
                        <span className="stat-label">Member Since</span>
                        <span className="stat-value">{user.joinDate}</span>
                      </div>
                    </div>
                    <Divider layout="vertical" className="hidden md:block" />
                    <div className="profile-stat">
                      <FiActivity className="stat-icon" />
                      <div className="stat-details">
                        <span className="stat-label">Last Active</span>
                        <span className="stat-value">{user.lastLogin}</span>
                      </div>
                    </div>
                  </div>

                  <Button label="Edit Profile" icon="pi pi-pencil" className="p-button-rounded p-button-text p-button-plain edit-btn-top" />
                </div>
              </Card>

              <div className="profile-info-grid-modern">
                <Card className="account-card-modern" title="Personal Information">
                  <div className="info-modern-list">
                    <ModernInfoItem icon={FiMail} label="Email Address" value={user.email} />
                    <ModernInfoItem icon={FiBriefcase} label="Department" value={user.department} />
                    <ModernInfoItem icon={FiGlobe} label="Location" value={user.location} />
                    <ModernInfoItem icon={FiClock} label="Timezone" value={user.timezone} />
                  </div>
                </Card>

                <Card className="account-card-modern" title="System Permissions">
                  <div className="info-modern-list">
                    <ModernInfoItem icon={FiShield} label="Access Level" value={user.role + " (Full)"} />
                    <ModernInfoItem icon={FiCheckCircle} label="Account Status" value="Active / Verified" />
                    <ModernInfoItem icon={FiLock} label="Security Policy" value="Standard Enterprise" />
                    <ModernInfoItem icon={FiSettings} label="Config Access" value="Full Management" />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card className="account-card" title="System Activity Log">
              <div className="activity-list">
                {activities.map(item => (
                  <div key={item.id} className="activity-item">
                    <div className={cn('activity-dot', item.status)} />
                    <div className="activity-body">
                      <div className="activity-main">
                        <span className="activity-action">{item.action}</span>
                        <span className="activity-target">{item.target}</span>
                      </div>
                      <span className="activity-time">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Divider />
              <div className="flex justify-center">
                <Button label="View Full Log" text size="small" />
              </div>
            </Card>
          )}

          {/* Placeholder for other tabs */}
          {(activeTab === 'security' || activeTab === 'preferences') && (
            <div className="account-empty-state">
              <FiSettings size={48} className="opacity-10 mb-4" />
              <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</h3>
              <p>Advanced security and preference configurations are coming soon.</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="account-info-item">
      <div className="account-info-icon">
        <Icon size={18} />
      </div>
      <div className="account-info-body">
        <span className="account-info-label">{label}</span>
        <span className="account-info-value">{value}</span>
      </div>
    </div>
  );
}

function ModernInfoItem({ icon: Icon, label, value }) {
  return (
    <div className="info-modern-item">
      <div className="info-modern-icon">
        <Icon size={18} />
      </div>
      <div className="info-modern-body">
        <span className="info-modern-label">{label}</span>
        <span className="info-modern-value">{value}</span>
      </div>
    </div>
  );
}

export default Profile;
