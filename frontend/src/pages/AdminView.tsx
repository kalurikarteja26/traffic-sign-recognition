import React, { useEffect, useState } from 'react';
import {
  Shield, Users, HardDrive, Activity, AlertTriangle,
  CheckCircle, Database, Cpu, Clock, RefreshCw
} from 'lucide-react';
import { api } from '../api';

export const AdminView: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'audit' | 'health'>('users');

  useEffect(() => {
    fetchAdminData();
  }, [activeSubTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [m, u, a, h] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminUsers(),
        api.getAdminAuditLogs(),
        api.getAdminSystemHealth(),
      ]);
      setMetrics(m);
      setUsers(u);
      setAuditLogs(a);
      setSystemHealth(h);
    } catch (err: any) {
      console.error('Failed to load admin operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="titanium-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-telemetry text-purple-400 uppercase tracking-widest mb-1">
            <span className="pulse-online"></span> ROLE: PLATFORM ADMINISTRATOR
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-white">
            Administration & Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Platform governance, user account directory, system health diagnostics, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchAdminData} className="btn-secondary text-xs py-2 px-3">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Admin KPI Ribbon */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="titanium-card p-4">
            <div className="text-[11px] font-telemetry uppercase tracking-wider text-slate-400 font-semibold">Total Platform Users</div>
            <div className="font-telemetry text-3xl font-extrabold text-blue-400 mt-1">{metrics.total_users}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active Registered Accounts</div>
          </div>
          <div className="titanium-card p-4">
            <div className="text-[11px] font-telemetry uppercase tracking-wider text-slate-400 font-semibold">Registered Vehicles</div>
            <div className="font-telemetry text-3xl font-extrabold text-amber-400 mt-1">{metrics.total_vehicles}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Under Garage Management</div>
          </div>
          <div className="titanium-card p-4">
            <div className="text-[11px] font-telemetry uppercase tracking-wider text-slate-400 font-semibold">Dashcam Clips Stored</div>
            <div className="font-telemetry text-3xl font-extrabold text-purple-400 mt-1">{metrics.total_dashcam_videos}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{metrics.total_user_storage_mb} MB Vault Storage</div>
          </div>
          <div className="titanium-card p-4">
            <div className="text-[11px] font-telemetry uppercase tracking-wider text-slate-400 font-semibold">Challans Recorded</div>
            <div className="font-telemetry text-3xl font-extrabold text-emerald-400 mt-1">{metrics.total_challans}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Compliance Notices</div>
          </div>
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="titanium-panel p-4 flex items-center gap-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          User Accounts Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Security Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('health')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'health' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          System Health Telemetry
        </button>
      </div>

      {/* ── Sub-Tab 1: Users Directory ── */}
      {activeSubTab === 'users' && (
        <div className="titanium-panel p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-telemetry uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Safety Score</th>
                  <th className="py-3 px-4">Storage Used</th>
                  <th className="py-3 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-telemetry font-bold text-slate-400">#{u.id.toString().padStart(4, '0')}</td>
                    <td className="py-3 px-4 font-semibold text-white">{u.full_name}</td>
                    <td className="py-3 px-4 text-slate-300 font-telemetry">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-telemetry font-bold uppercase ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-telemetry font-bold text-emerald-400">{u.safety_score}/100</td>
                    <td className="py-3 px-4 font-telemetry text-slate-300">
                      {(u.storage_used_bytes / (1024 * 1024)).toFixed(1)} MB
                    </td>
                    <td className="py-3 px-4 font-telemetry text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sub-Tab 2: Audit Logs ── */}
      {activeSubTab === 'audit' && (
        <div className="titanium-panel p-6 space-y-3">
          <h3 className="font-heading font-bold text-base text-white mb-2">Immutable Security Audit Trail</h3>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg bg-slate-900 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-telemetry font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10">
                    {log.action}
                  </span>
                  <span className="text-slate-200">{log.details_json || 'System operation executed.'}</span>
                </div>
                <div className="text-[11px] font-telemetry text-slate-500 shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-Tab 3: System Health ── */}
      {activeSubTab === 'health' && systemHealth && (
        <div className="titanium-panel p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="font-heading font-bold text-lg text-white">System Diagnostics & Node Health</h3>
              <p className="text-xs text-slate-400">Core server runtime, PyTorch engine, and storage adapters</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-telemetry font-bold">
              <span className="pulse-online"></span> ALL SERVICES NOMINAL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
              <span className="text-xs font-telemetry text-slate-400 uppercase font-semibold">Neural Vision Pipeline</span>
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>PyTorch Version:</span>
                <span className="font-telemetry text-blue-400">{systemHealth.pytorch_version}</span>
              </div>
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>Execution Device:</span>
                <span className="font-telemetry text-emerald-400">{systemHealth.cuda_device}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
              <span className="text-xs font-telemetry text-slate-400 uppercase font-semibold">Active Subsystem Status</span>
              {systemHealth.active_services?.map((s: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                  <span>{s.service}</span>
                  <span className="text-emerald-400 font-telemetry font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> UP
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
