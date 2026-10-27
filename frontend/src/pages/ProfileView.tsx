import React, { useState } from 'react';
import {
  User, Lock, Download, Trash2, Shield, AlertTriangle,
  CheckCircle, Key, HardDrive, Phone, Mail, HelpCircle, ExternalLink
} from 'lucide-react';
import { api } from '../api';
import { toast } from '../components/Toast';

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
      toast.success('Pilot profile credentials and emergency contact synchronized.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
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
      toast.success('Cockpit security password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Password update failed.');
      toast.error(err.message || 'Password update failed.');
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
      toast.success('Machine-readable telemetry archive exported.');
    } catch (err: any) {
      toast.error(err.message || 'Export failed.');
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
        toast.info('Your AeroVision account and linked telemetry records have been purged.');
        onLogout();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete account.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full max-w-full overflow-hidden">
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
                className="input-titanium opacity-60 cursor-not-allowed text-xs font-mono"
              />
              {/* Clickable Email (Item 19) */}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Verified pilot email</span>
                <a
                  href={`mailto:${user.email}`}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-mono"
                  title="Compose email to this address"
                >
                  <Mail className="w-3 h-3" />
                  <span>Send Mail →</span>
                </a>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Vikramaditya Sharma"
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
                className="input-titanium text-sm font-mono"
              />
              {/* Clickable Phone Number (Item 18) */}
              {phone && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Direct dialing enabled</span>
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-mono"
                    title="Dial this phone number"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call Pilot ({phone}) →</span>
                  </a>
                </div>
              )}
            </div>

            <button type="submit" disabled={profileSaving} className="btn-primary text-xs py-2 px-4">
              {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
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

      {/* Quick Emergency Helplines Card (Item 18 & 19) */}
      <div className="titanium-panel p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-heading font-bold text-base">
          <Phone className="w-5 h-5 text-red-400" />
          <span>Indian Road Safety & Emergency Assistance</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Statutory direct links to national road safety hotlines, highway rescue dispatch, and traffic grievance departments.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <a
            href="tel:112"
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all flex flex-col gap-1 group"
          >
            <span className="text-[10px] text-red-300 uppercase font-mono font-bold">National Police/Ambulance</span>
            <span className="text-lg font-mono font-black text-white group-hover:text-red-300 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-red-400" /> 112
            </span>
          </a>

          <a
            href="tel:1033"
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex flex-col gap-1 group"
          >
            <span className="text-[10px] text-amber-300 uppercase font-mono font-bold">NHAI Highway Roadside</span>
            <span className="text-lg font-mono font-black text-white group-hover:text-amber-300 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-amber-400" /> 1033
            </span>
          </a>

          <a
            href="tel:1095"
            className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex flex-col gap-1 group"
          >
            <span className="text-[10px] text-blue-300 uppercase font-mono font-bold">Traffic Police Desk</span>
            <span className="text-lg font-mono font-black text-white group-hover:text-blue-300 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-blue-400" /> 1095
            </span>
          </a>

          <a
            href="tel:+9118002081033"
            className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex flex-col gap-1 group"
          >
            <span className="text-[10px] text-cyan-300 uppercase font-mono font-bold">AeroVision Cockpit Desk</span>
            <span className="text-sm font-mono font-black text-white group-hover:text-cyan-300 flex items-center gap-1.5 truncate">
              <Phone className="w-4 h-4 text-cyan-400 shrink-0" /> 1800-208-1033
            </span>
          </a>
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
