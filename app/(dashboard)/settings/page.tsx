'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import {
  Users,
  UserPlus,
  Plus,
  Trash2,
  Globe,
  Copy,
  Check,
  CreditCard,
  Building,
  CheckCircle2,
  Zap,
  AlertCircle,
  X,
  Mail,
  Link as LinkIcon
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'team' | 'sources' | 'billing' | 'org' | 'rag' | 'crm_sync'>('team');
  const [userRole, setUserRole] = useState<string>('Organization Owner');
  
  // Data States
  const [team, setTeam] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [crmConnectors, setCrmConnectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // RAG & CRM Modal States
  const [showRagModal, setShowRagModal] = useState(false);
  const [ragTitle, setRagTitle] = useState('');
  const [ragContent, setRagContent] = useState('');
  const [ragCategory, setRagCategory] = useState('Product Specification');
  const [uploadingRag, setUploadingRag] = useState(false);

  const [showCrmModal, setShowCrmModal] = useState(false);
  const [crmProvider, setCrmProvider] = useState<'HubSpot' | 'Salesforce' | 'Zoho' | 'Pipedrive' | 'GoHighLevel'>('HubSpot');
  const [crmName, setCrmName] = useState('');
  const [crmToken, setCrmToken] = useState('');
  const [crmEndpoint, setCrmEndpoint] = useState('');
  const [syncingCrmId, setSyncingCrmId] = useState<string | null>(null);

  // Modals & Inputs
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Sales Representative');
  const [inviteError, setInviteError] = useState('');
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('Website Form');

  const [orgName, setOrgName] = useState('');
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);

  const fetchSettingsData = async () => {
    try {
      const [resMe, resTeam, resSources, resSub, resOrg, resRag, resCrm] = await Promise.all([
        apiFetch('/api/v1/auth/me'),
        apiFetch('/api/v1/organizations/team'),
        apiFetch('/api/v1/lead-sources'),
        apiFetch('/api/v1/organizations/subscription'),
        apiFetch('/api/v1/organizations'),
        apiFetch('/api/v1/rag/knowledge'),
        apiFetch('/api/v1/crm-connectors')
      ]);

      if (resMe.ok) {
        const meJson = await resMe.json();
        const role = meJson.user?.role || 'Organization Owner';
        setUserRole(role);
        if (role === 'Marketing Manager') setActiveTab('sources');
        if (role === 'Sales Representative') setActiveTab('rag');
      }

      if (resTeam.ok) {
        const teamJson = await resTeam.json();
        setTeam(teamJson.team || []);
        setPendingInvites(teamJson.pending_invitations || []);
      }
      if (resSources.ok) setSources((await resSources.json()).sources || []);
      if (resSub.ok) setSubscription(await resSub.json());
      if (resOrg.ok) {
        const orgData = (await resOrg.json()).organization;
        setOrg(orgData);
        if (orgData) setOrgName(orgData.name);
      }
      if (resRag.ok) setRagDocs((await resRag.json()).knowledge_base || []);
      if (resCrm.ok) setCrmConnectors((await resCrm.json()).connectors || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setCreatedInviteUrl(null);

    try {
      const res = await apiFetch('/api/v1/organizations/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (data.invite_url) {
        setCreatedInviteUrl(data.invite_url);
      } else {
        setShowInviteModal(false);
      }

      setInviteEmail('');
      setInviteName('');
      fetchSettingsData();
    } catch (err: any) {
      setInviteError(err.message);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await apiFetch(`/api/v1/organizations/team?id=${userId}`, { method: 'DELETE' });
      if (res.ok) fetchSettingsData();
      else {
        const json = await res.json();
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/lead-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sourceName, type: sourceType })
      });
      if (res.ok) {
        setShowSourceModal(false);
        setSourceName('');
        fetchSettingsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'payoneer'>('stripe');
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleUpgradePlan = (plan: any) => {
    setPaymentPlan(plan);
  };

  const handleExecuteCheckout = async () => {
    if (!paymentPlan) return;
    setProcessingPayment(true);

    try {
      const res = await apiFetch('/api/v1/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: paymentPlan.id,
          payment_provider: selectedProvider
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (json.checkout_url) {
        window.location.href = json.checkout_url;
      } else {
        alert('Checkout URL not generated.');
      }
    } catch (err: any) {
      alert(`Payment Checkout Error: ${err.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName })
      });
      if (res.ok) {
        alert('Organization details updated.');
        fetchSettingsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyWebhook = (url: string, id: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedWebhookId(id);
    setTimeout(() => setCopiedWebhookId(null), 3000);
  };

  const copyInviteLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  const handleUploadRagDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingRag(true);
    try {
      const res = await apiFetch('/api/v1/rag/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ragTitle, content: ragContent, category: ragCategory })
      });
      if (res.ok) {
        setShowRagModal(false);
        setRagTitle('');
        setRagContent('');
        fetchSettingsData();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to upload document');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingRag(false);
    }
  };

  const handleDeleteRagDoc = async (id: string) => {
    if (!confirm('Remove this document chunk from RAG Knowledge Base?')) return;
    try {
      const res = await apiFetch(`/api/v1/rag/knowledge?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchSettingsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectCrm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/crm-connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: crmProvider,
          name: crmName || `${crmProvider} Account`,
          api_key_or_token: crmToken,
          api_endpoint: crmEndpoint
        })
      });
      const json = await res.json();
      if (res.ok) {
        setShowCrmModal(false);
        setCrmName('');
        setCrmToken('');
        setCrmEndpoint('');
        alert(json.message);
        fetchSettingsData();
      } else {
        alert(json.error || 'Failed to connect CRM');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncCrm = async (connectorId: string) => {
    setSyncingCrmId(connectorId);
    try {
      const res = await apiFetch('/api/v1/crm-connectors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: connectorId })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message);
        fetchSettingsData();
      } else {
        alert(json.error || 'Sync failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingCrmId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-xs font-semibold text-slate-400">Loading Organization Settings...</p>
      </div>
    );
  }

  const currentSubscription = subscription?.current_subscription || {};
  const currentPlan = {
    ...currentSubscription,
    current_user_count: currentSubscription.actual_users || team.length || 1,
    current_lead_count: currentSubscription.actual_leads || 0,
    user_limit: currentSubscription.user_limit || 5,
    lead_limit: currentSubscription.lead_limit || 1000,
    name: currentSubscription.plan_name || 'Standard'
  };
  const availablePlans = subscription?.available_plans || [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-y-auto">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Settings & Organization Control
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage team members, configure automated lead source webhooks, and upgrade subscription limits.
            </p>
          </div>

          {/* Navigation Tabs (Filtered by Role) */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
            {userRole === 'Organization Owner' && (
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'team'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                Team Management ({team.length})
              </button>
            )}

            {(userRole === 'Organization Owner' || userRole === 'Marketing Manager') && (
              <button
                onClick={() => setActiveTab('sources')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'sources'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                Lead Sources & Webhooks ({sources.length})
              </button>
            )}

            {userRole === 'Organization Owner' && (
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'billing'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                Subscription & Usage Limits
              </button>
            )}

            <button
              onClick={() => setActiveTab('rag')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'rag'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              RAG Knowledge Base ({ragDocs.length})
            </button>

            {(userRole === 'Organization Owner' || userRole === 'Marketing Manager') && (
              <button
                onClick={() => setActiveTab('crm_sync')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'crm_sync'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                External CRM Connectors ({crmConnectors.length})
              </button>
            )}

            {userRole === 'Organization Owner' && (
              <button
                onClick={() => setActiveTab('org')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'org'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                Organization Details
              </button>
            )}
          </div>

          {/* TAB 1: TEAM MANAGEMENT */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">Team Members & Access Control</h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Plan User Usage: <strong className="text-rose-400">{currentPlan.current_user_count} / {currentPlan.user_limit}</strong> seats filled
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCreatedInviteUrl(null);
                      setInviteError('');
                      setShowInviteModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" /> Invite Member
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Email Address</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {team.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-900/50">
                          <td className="py-3.5 px-4 font-bold text-white">{m.name}</td>
                          <td className="py-3.5 px-4 text-slate-300">{m.email}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800 text-slate-200 border border-slate-700">
                              {m.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleRemoveUser(m.id)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Invitations Section */}
              {pendingInvites.length > 0 && (
                <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Mail className="w-4 h-4 text-rose-400" /> Pending Invitations ({pendingInvites.length})
                  </h3>

                  <div className="space-y-2">
                    {pendingInvites.map((inv) => (
                      <div key={inv.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">{inv.name} ({inv.email})</p>
                          <span className="text-[10px] text-slate-400">Role: {inv.role} • Expires: {new Date(inv.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LEAD SOURCES & WEBHOOKS */}
          {activeTab === 'sources' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white">Lead Capture Sources & Webhook Endpoints</h2>
                  <p className="text-[11px] text-slate-400">
                    Incoming leads sent to these webhook URLs trigger automatic AI qualification & CRM insertion.
                  </p>
                </div>

                <button
                  onClick={() => setShowSourceModal(true)}
                  className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Lead Source
                </button>
              </div>

              <div className="space-y-3">
                {sources.map((src) => {
                  const webhookUrl = src.configuration?.webhook_url || `/api/v1/webhooks/lead-source/${src.id}`;
                  return (
                    <div key={src.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-rose-400" />
                          <h3 className="font-bold text-white text-sm">{src.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono border border-slate-700">
                            {src.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <div className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] truncate">
                          {typeof window !== 'undefined' ? window.location.origin : ''}{webhookUrl}
                        </div>
                        <button
                          onClick={() => copyWebhook(webhookUrl, src.id)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                        >
                          {copiedWebhookId === src.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                          {copiedWebhookId === src.id ? 'Copied!' : 'Copy Webhook URL'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTION & LIMITS */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Usage Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Lead Limit Usage</span>
                  <div className="flex items-center justify-between text-white font-extrabold text-lg">
                    <span>{currentPlan.current_lead_count} / {currentPlan.lead_limit} Leads</span>
                    <span className="text-xs font-mono text-rose-400">
                      {Math.round((currentPlan.current_lead_count / currentPlan.lead_limit) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full rescue-gradient"
                      style={{ width: `${Math.min(100, (currentPlan.current_lead_count / currentPlan.lead_limit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Seats Usage</span>
                  <div className="flex items-center justify-between text-white font-extrabold text-lg">
                    <span>{currentPlan.current_user_count} / {currentPlan.user_limit} Seats</span>
                    <span className="text-xs font-mono text-indigo-400">
                      {Math.round((currentPlan.current_user_count / currentPlan.user_limit) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${Math.min(100, (currentPlan.current_user_count / currentPlan.user_limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availablePlans.map((plan: any) => {
                  const isCurrent = plan.id === currentPlan.subscription_plan_id || plan.name === currentPlan.name;

                  return (
                    <div
                      key={plan.id}
                      className={`glass-panel p-6 rounded-3xl border space-y-4 flex flex-col justify-between ${
                        isCurrent ? 'border-rose-500/50 rescue-glow' : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-base text-white">{plan.name}</h3>
                          {isCurrent && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Current Plan
                            </span>
                          )}
                        </div>

                        <div className="text-2xl font-black text-white font-mono">
                          ${plan.monthly_price} <span className="text-xs font-normal text-slate-400">/ mo</span>
                        </div>

                        <p className="text-xs text-slate-400">{plan.description}</p>

                        <div className="space-y-1.5 pt-2 text-xs text-slate-300">
                          {plan.features.map((f: string) => (
                            <div key={f} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpgradePlan(plan)}
                        disabled={isCurrent}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all mt-4 ${
                          isCurrent
                            ? 'bg-slate-900 text-slate-500 cursor-default border border-slate-800'
                            : 'rescue-gradient rescue-glow text-white hover:opacity-95'
                        }`}
                      >
                        {isCurrent ? 'Current Plan' : 'Select Plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAYMENT GATEWAY SELECTION MODAL (STRIPE & PAYONEER) */}
          {paymentPlan && (
            <div className="fixed inset-0 z-50 glass-panel bg-black/70 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-white text-base">Subscribe to {paymentPlan.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">${paymentPlan.monthly_price} / month</p>
                  </div>
                  <button onClick={() => setPaymentPlan(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Select Payment Gateway</label>
                  
                  <div
                    onClick={() => setSelectedProvider('stripe')}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      selectedProvider === 'stripe'
                        ? 'bg-rose-950/30 border-rose-500 text-white rescue-glow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="font-bold text-sm text-white">Stripe Checkout</div>
                        <div className="text-[11px] text-slate-400">Credit / Debit Card, Apple Pay, Google Pay</div>
                      </div>
                    </div>
                    {selectedProvider === 'stripe' && <Check className="w-5 h-5 text-rose-400" />}
                  </div>

                  <div
                    onClick={() => setSelectedProvider('payoneer')}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      selectedProvider === 'payoneer'
                        ? 'bg-rose-950/30 border-rose-500 text-white rescue-glow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="font-bold text-sm text-white">Payoneer Billing</div>
                        <div className="text-[11px] text-slate-400">Payoneer Account Balance, Bank Transfer, Invoice</div>
                      </div>
                    </div>
                    {selectedProvider === 'payoneer' && <Check className="w-5 h-5 text-rose-400" />}
                  </div>
                </div>

                <button
                  onClick={handleExecuteCheckout}
                  disabled={processingPayment}
                  className="w-full py-3 rounded-xl rescue-gradient rescue-glow text-white text-xs font-extrabold tracking-wide uppercase disabled:opacity-50"
                >
                  {processingPayment ? 'Connecting Gateway...' : `Proceed to ${selectedProvider.toUpperCase()} Payment`}
                </button>
              </div>
            </div>
          )}

          {/* TAB: RAG COMPANY KNOWLEDGE BASE */}
          {activeTab === 'rag' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white">RAG Company Knowledge Base</h2>
                  <p className="text-[11px] text-slate-400">
                    Upload product FAQs, pricing guides, or company specifications. OpenRouter AI retrieves this context during qualification and follow-up generation.
                  </p>
                </div>

                <button
                  onClick={() => setShowRagModal(true)}
                  className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Knowledge Document
                </button>
              </div>

              <div className="space-y-3">
                {ragDocs.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
                    No knowledge documents uploaded yet. Add product specifications or FAQs to ground your AI assistant!
                  </div>
                ) : (
                  ragDocs.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-rose-400" />
                          <h3 className="font-bold text-white text-sm">{doc.title}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-rose-300 font-mono border border-slate-700">
                            {doc.category}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteRagDoc(doc.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs line-clamp-3 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
                        {doc.content_chunk}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: EXTERNAL CRM CONNECTORS */}
          {activeTab === 'crm_sync' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white">External CRM Data Connectors (HubSpot, Salesforce, Zoho, Pipedrive, GoHighLevel)</h2>
                  <p className="text-[11px] text-slate-400">
                    Extract customer leads automatically from third-party CRMs and sync pipeline stages in real time.
                  </p>
                </div>

                <button
                  onClick={() => setShowCrmModal(true)}
                  className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Connect External CRM
                </button>
              </div>

              <div className="space-y-3">
                {crmConnectors.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
                    No external CRMs connected yet. Connect HubSpot, Salesforce, Zoho, Pipedrive, or GoHighLevel to extract leads automatically!
                  </div>
                ) : (
                  crmConnectors.map((connector) => (
                    <div key={connector.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-rose-400" />
                          <h3 className="font-bold text-white text-sm">{connector.name} ({connector.provider})</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                            {connector.status}
                          </span>
                        </div>

                        <button
                          onClick={() => handleSyncCrm(connector.id)}
                          disabled={syncingCrmId === connector.id}
                          className="px-3 py-1.5 rounded-xl rescue-gradient text-white font-semibold text-xs disabled:opacity-50"
                        >
                          {syncingCrmId === connector.id ? 'Extracting Data...' : 'Sync & Extract Now'}
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800">
                        <span>Auto-Sync Frequency: Every {connector.sync_frequency_hours || 24} Hours</span>
                        <span>Last Synced: {connector.last_synced_at || 'Never'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ORG DETAILS */}
          {activeTab === 'org' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-md space-y-4">
              <h2 className="text-sm font-bold text-white">Organization Profile</h2>

              <form onSubmit={handleSaveOrg} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl rescue-gradient text-white font-semibold text-xs mt-2"
                >
                  Save Changes
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {inviteError}
              </div>
            )}

            {createdInviteUrl ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 space-y-2">
                  <p className="font-bold text-sm">🎉 Invitation Link Generated Successfully!</p>
                  <p className="text-[11px] text-slate-300">
                    Share this invitation URL directly with your team member:
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] break-all select-all">
                    {createdInviteUrl}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copyInviteLink(createdInviteUrl)}
                    className="flex-1 py-2.5 rounded-xl rescue-gradient rescue-glow text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    {copiedInvite ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedInvite ? 'Copied to Clipboard!' : 'Copy Invitation Link'}
                  </button>
                  <button
                    onClick={() => {
                      setCreatedInviteUrl(null);
                      setShowInviteModal(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteUser} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Sales Representative">Sales Representative</option>
                    <option value="Marketing Manager">Marketing Manager</option>
                    <option value="Organization Owner">Organization Owner</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-white font-semibold mt-4"
                >
                  Send Invitation Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RAG DOCUMENT MODAL */}
      {showRagModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add RAG Knowledge Base Document</h3>
              <button onClick={() => setShowRagModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadRagDocument} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={ragTitle}
                  onChange={(e) => setRagTitle(e.target.value)}
                  placeholder="e.g. Enterprise AI SaaS Pricing & Features Catalog"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Knowledge Category</label>
                <select
                  value={ragCategory}
                  onChange={(e) => setRagCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Product Specification">Product Specification</option>
                  <option value="Pricing & Plans">Pricing & Plans</option>
                  <option value="FAQ / Customer Objection Guide">FAQ / Customer Objection Guide</option>
                  <option value="General Knowledge">General Knowledge</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Document Text Content</label>
                <textarea
                  required
                  rows={6}
                  value={ragContent}
                  onChange={(e) => setRagContent(e.target.value)}
                  placeholder="Paste product features, pricing rules, FAQs, or specs here. The AI engine will chunk and index this context to ground AI qualification and follow-up messages..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={uploadingRag}
                className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-white font-semibold mt-4 disabled:opacity-50"
              >
                {uploadingRag ? 'Processing & Chunking Document...' : 'Upload & Index into RAG Knowledge Base'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EXTERNAL CRM MODAL */}
      {showCrmModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Connect External CRM</h3>
              <button onClick={() => setShowCrmModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectCrm} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Select CRM Provider</label>
                <select
                  value={crmProvider}
                  onChange={(e) => setCrmProvider(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="HubSpot">HubSpot CRM</option>
                  <option value="Salesforce">Salesforce CRM</option>
                  <option value="Zoho">Zoho CRM</option>
                  <option value="Pipedrive">Pipedrive CRM</option>
                  <option value="GoHighLevel">GoHighLevel (GHL)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Integration Connection Name</label>
                <input
                  type="text"
                  required
                  value={crmName}
                  onChange={(e) => setCrmName(e.target.value)}
                  placeholder={`e.g. Primary ${crmProvider} Account`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">API Key / Access Token</label>
                <input
                  type="password"
                  required
                  value={crmToken}
                  onChange={(e) => setCrmToken(e.target.value)}
                  placeholder="Paste API Access Token or Private Key"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Instance / API Domain URL (Optional)</label>
                <input
                  type="text"
                  value={crmEndpoint}
                  onChange={(e) => setCrmEndpoint(e.target.value)}
                  placeholder="e.g. https://yourinstance.salesforce.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500 font-mono text-[11px]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-white font-semibold mt-4"
              >
                Authenticate & Connect {crmProvider}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LEAD SOURCE MODAL */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add Lead Source</h3>
              <button onClick={() => setShowSourceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. Main Landing Page Form"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Source Type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Website Form">Website Form (Webhook)</option>
                  <option value="WhatsApp">WhatsApp Business API</option>
                  <option value="Facebook Leads">Facebook Lead Ads</option>
                  <option value="Manual">Manual / CSV Import</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-white font-semibold mt-4"
              >
                Generate Webhook Endpoint
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
