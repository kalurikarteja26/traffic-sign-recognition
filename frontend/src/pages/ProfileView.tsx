import React, { useState } from 'react';
import {
  User, Lock, Download, Trash2, Shield, AlertTriangle,
  CheckCircle, Key, HardDrive
} from 'lucide-react';
import { api } from '../api';

interface ProfileViewProps {
  user: any;
  onUserUpdated: (u: any) => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUserUpdated, onLogout }) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await api.updateProfile({ full_name: fullName, phone });
      onUserUpdated(updated);
      setProfileMsg('Profile updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSaving(true);
    setPwdMsg(null);
    setPwdError(null);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPwdMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Password update failed.');
    } finally {
      setPwdSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aerovision_userdata_${user.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete your AeroVision account? This will permanently delete your vehicles, challans, and dashcam videos.')) {
      return;
    }
    const doubleCheck = window.prompt("Type 'DELETE' to confirm permanent removal:");
    if (doubleCheck === 'DELETE') {
      try {
        await api.deleteAccount();
        alert('Your account has been deleted.');
        onLogout();
      } catch (err: any) {
        alert(err.message || 'Failed to delete account.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="titanium-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-telemetry text-blue-400 uppercase tracking-widest mb-1">
            <span className="pulse-online"></span> ACCOUNT IDENTITY & SECURITY
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-white">
            User Profile & Privacy Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your credentials, vehicle owner profile, data retention, and account security.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-telemetry font-bold shrink-0">
          ROLE: {user.role?.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="titanium-panel p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-heading font-bold text-base mb-2">
            <User className="w-5 h-5 text-blue-400" />
            <span>Personal Details</span>
          </div>

          {profileMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{profileMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="input-titanium opacity-60 cursor-not-allowed text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">Email is verified and cannot be changed.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-titanium text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="input-titanium text-sm"
              />
            </div>

            <button type="submit" disabled={profileSaving} className="btn-primary text-xs py-2 px-4">
              {profileSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="titanium-panel p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-heading font-bold text-base mb-2">
            <Lock className="w-5 h-5 text-purple-400" />
            <span>Security & Password</span>
          </div>

          {pwdMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{pwdMsg}</span>
            </div>
          )}

          {pwdError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{pwdError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="input-titanium text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="input-titanium text-sm"
              />
            </div>

            <button type="submit" disabled={pwdSaving} className="btn-secondary text-xs py-2 px-4">
              {pwdSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Privacy, Data Export, and Account Deletion */}
      <div className="titanium-panel p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-heading font-bold text-base">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span>Data Governance & Privacy Controls</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          In compliance with user data sovereignty standards, you may download a complete machine-readable copy of your profile, registered vehicles, challan records, and safety quiz history, or permanently purge your account from the system.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-sm font-bold text-white">Export Personal Data Archive</div>
            <div className="text-xs text-slate-400">Download all your records in JSON format.</div>
          </div>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="btn-secondary text-xs py-2 px-4"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>{exporting ? 'Generating Archive...' : 'Download JSON Export'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-sm font-bold text-red-400">Permanently Delete Account</div>
            <div className="text-xs text-slate-400">Purge your vehicles, challans, videos, and profile permanently.</div>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="btn-danger text-xs py-2 px-4"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
