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
  Link as LinkIcon,
  Edit2,
  Play,
  BookOpen,
  Send,
  Activity,
  ExternalLink,
  Code2,
  ShieldCheck,
  CheckCircle
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

  // Webhook Testing, Integration Guide & Edit States
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [selectedGuideSource, setSelectedGuideSource] = useState<any | null>(null);
  const [guideTab, setGuideTab] = useState<'curl' | 'json' | 'html' | 'platforms'>('curl');
  const [editingSource, setEditingSource] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('Website Form');
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const copySnippet = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const [orgName, setOrgName] = useState('');
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);

  const fetchSettingsData = async () => {
    try {
      // 1. Fetch user session first to set role and unblock UI loading state fast
      const meRes = await apiFetch('/api/v1/auth/me').catch(() => null);
      if (meRes?.ok) {
        const meJson = await meRes.json().catch(() => null);
        const role = meJson?.user?.role || 'Organization Owner';
        setUserRole(role);
        if (role === 'Marketing Manager') setActiveTab('sources');
        if (role === 'Sales Representative') setActiveTab('rag');
      }

      setLoading(false); // Unblock full-screen loading immediately!

      // 2. Fetch remaining settings data concurrently with Promise.allSettled
      const [resTeam, resSources, resSub, resOrg, resRag, resCrm] = await Promise.allSettled([
        apiFetch('/api/v1/organizations/team'),
        apiFetch('/api/v1/lead-sources'),
        apiFetch('/api/v1/organizations/subscription'),
        apiFetch('/api/v1/organizations'),
        apiFetch('/api/v1/rag/knowledge'),
        apiFetch('/api/v1/crm-connectors')
      ]);

      if (resTeam.status === 'fulfilled' && resTeam.value.ok) {
        const teamJson = await resTeam.value.json().catch(() => null);
        if (teamJson) {
          setTeam(teamJson.team || []);
          setPendingInvites(teamJson.pending_invitations || []);
        }
      }

      if (resSources.status === 'fulfilled' && resSources.value.ok) {
        const json = await resSources.value.json().catch(() => null);
        if (json) setSources(json.sources || []);
      }

      if (resSub.status === 'fulfilled' && resSub.value.ok) {
        const json = await resSub.value.json().catch(() => null);
        if (json) setSubscription(json);
      }

      if (resOrg.status === 'fulfilled' && resOrg.value.ok) {
        const json = await resOrg.value.json().catch(() => null);
        if (json?.organization) {
          setOrg(json.organization);
          setOrgName(json.organization.name);
        }
      }

      if (resRag.status === 'fulfilled' && resRag.value.ok) {
        const json = await resRag.value.json().catch(() => null);
        if (json) setRagDocs(json.knowledge_base || []);
      }

      if (resCrm.status === 'fulfilled' && resCrm.value.ok) {
        const json = await resCrm.value.json().catch(() => null);
        if (json) setCrmConnectors(json.connectors || []);
      }
    } catch (err) {
      console.error('[fetchSettingsData error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'billing' || tabParam === 'subscription') {
        setActiveTab('billing');
      } else if (tabParam === 'team') {
        setActiveTab('team');
      } else if (tabParam === 'sources') {
        setActiveTab('sources');
      } else if (tabParam === 'org') {
        setActiveTab('org');
      }
    }
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
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://leadrescueai.xilxil.com';
        const cleanUrl = data.invite_url.replace(/^https?:\/\/[^\/]+/, currentOrigin);
        setCreatedInviteUrl(cleanUrl);
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

  const getCanonicalWebhookUrl = (src: any) => {
    if (!src || src.type === 'Manual') return null;
    const cfgUrl = src.configuration?.webhook_url;
    if (cfgUrl && (cfgUrl.startsWith('http://') || cfgUrl.startsWith('https://'))) {
      return cfgUrl;
    }
    const backendBase = process.env.NEXT_PUBLIC_API_URL || 'https://lead-rescue-ai-backend.onrender.com';
    return `${backendBase.replace(/\/$/, '')}/api/v1/webhooks/lead-source/${src.id}`;
  };

  const copyWebhook = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhookId(id);
    setTimeout(() => setCopiedWebhookId(null), 3000);
  };

  const copySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecretId(id);
    setTimeout(() => setCopiedSecretId(null), 3000);
  };

  const handleTestWebhook = async (src: any) => {
    setTestingSourceId(src.id);
    setTestSuccessMessage(null);
    try {
      const res = await apiFetch(`/api/v1/lead-sources/${src.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Verified Test Lead (${src.name})`,
          email: `test.${Date.now().toString().slice(-4)}@example.com`,
          phone: '+1 (555) 019-2834',
          company: 'Webhook Verification Corp',
          deal_value: 3500,
          product_interest: `Live verified inbound submission via ${src.name} webhook endpoint.`
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestSuccessMessage(`Successfully dispatched test lead to ${src.name}! Lead ID: ${data.lead_id}. AI qualification queued.`);
        fetchSettingsData();
        setTimeout(() => setTestSuccessMessage(null), 8000);
      } else {
        alert(data.error || 'Failed to trigger test webhook');
      }
    } catch (err: any) {
      alert(`Webhook Test Error: ${err.message}`);
    } finally {
      setTestingSourceId(null);
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
      const data = await res.json();
      if (res.ok) {
        setShowSourceModal(false);
        setSourceName('');
        setSourceType('Website Form');
        setTestSuccessMessage(`Lead source "${sourceName}" created successfully with dedicated webhook endpoint!`);
        fetchSettingsData();
        setTimeout(() => setTestSuccessMessage(null), 8000);
      } else {
        alert(data.error || 'Failed to create lead source');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;
    try {
      const res = await apiFetch(`/api/v1/lead-sources/${editingSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, type: editType })
      });
      if (res.ok) {
        setEditingSource(null);
        fetchSettingsData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update lead source');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to remove this lead capture source?')) return;
    try {
      const res = await apiFetch(`/api/v1/lead-sources/${sourceId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSettingsData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete lead source');
      }
    } catch (err: any) {
      alert(err.message);
    }
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

  const defaultFallbackPlans = [
    {
      id: 'plan_starter',
      name: 'Starter Plan',
      monthly_price: 49,
      description: 'Perfect for small sales teams recovering cold leads.',
      lead_limit: 1000,
      user_limit: 5,
      features: [
        'Up to 1,000 Rescued Leads/mo',
        '5 Team Member Seats',
        'Autonomous AI Lead Qualification',
        'Webhooks & Lead Capture',
        'Standard Follow-Up Templates'
      ]
    },
    {
      id: 'plan_growth',
      name: 'Growth Plan',
      monthly_price: 149,
      description: 'For growing companies scaling multi-channel lead recovery.',
      lead_limit: 5000,
      user_limit: 15,
      features: [
        'Up to 5,000 Rescued Leads/mo',
        '15 Team Member Seats',
        'Multi-Channel (Email, SMS, WhatsApp)',
        'Custom RAG Knowledge Base Sync',
        'External CRM Pipeline Connectors'
      ]
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise Plan',
      monthly_price: 499,
      description: 'Maximum pipeline velocity and dedicated AI model tuning.',
      lead_limit: 50000,
      user_limit: 100,
      features: [
        'Unlimited Rescued Leads & Seats',
        'Dedicated Custom AI Fine-Tuning',
        '24/7 SLA & Priority Support',
        'Custom Webhook & API Connectors',
        'Dedicated Account Strategist'
      ]
    }
  ];

  const availablePlans = (subscription?.available_plans && subscription.available_plans.length > 0)
    ? subscription.available_plans
    : defaultFallbackPlans;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1 min-w-0">
        <Sidebar />

        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Settings & Organization Control
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage team members, configure automated lead source webhooks, and upgrade subscription limits.
            </p>
          </div>

          {/* Navigation Tabs (Filtered by Role) */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold whitespace-nowrap scroll-smooth no-scrollbar">
            {userRole === 'Organization Owner' && (
              <button
                onClick={() => setActiveTab('team')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all flex-shrink-0 touch-target flex items-center justify-center ${
                  activeTab === 'team'
                    ? 'rescue-gradient text-slate-950 font-black rescue-glow shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                Team Management ({team.length})
              </button>
            )}

            {(userRole === 'Organization Owner' || userRole === 'Marketing Manager') && (
              <button
                onClick={() => setActiveTab('sources')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all flex-shrink-0 touch-target flex items-center justify-center ${
                  activeTab === 'sources'
                    ? 'rescue-gradient text-slate-950 font-black rescue-glow shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                Lead Sources &amp; Webhooks ({sources.length})
              </button>
            )}

            {userRole === 'Organization Owner' && (
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all flex-shrink-0 touch-target flex items-center justify-center ${
                  activeTab === 'billing'
                    ? 'rescue-gradient text-slate-950 font-black rescue-glow shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                Subscription &amp; Usage Limits
              </button>
            )}

            <button
              onClick={() => setActiveTab('rag')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all flex-shrink-0 touch-target flex items-center justify-center ${
                activeTab === 'rag'
                  ? 'rescue-gradient text-slate-950 font-black rescue-glow shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
              }`}
            >
              RAG Knowledge Base ({ragDocs.length})
            </button>

            {(userRole === 'Organization Owner' || userRole === 'Marketing Manager') && (
              <button
                onClick={() => setActiveTab('crm_sync')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all flex-shrink-0 touch-target flex items-center justify-center ${
                  activeTab === 'crm_sync'
                    ? 'rescue-gradient text-slate-950 font-black rescue-glow shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                External CRM Connectors ({crmConnectors.length})
              </button>
            )}

            {userRole === 'Organization Owner' && (
              <button
                onClick={() => setActiveTab('org')}
                className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all flex-shrink-0 touch-target flex items-center justify-center ${
                  activeTab === 'org'
                    ? 'rescue-gradient text-slate-950 font-black rescue-glow shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                Organization Details
              </button>
            )}
          </div>

          {/* TAB 1: TEAM MANAGEMENT */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white">Team Members &amp; Access Control</h2>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Plan User Usage: <strong className="text-cyan-400 font-bold">{currentPlan.current_user_count} / {currentPlan.user_limit}</strong> seats filled
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCreatedInviteUrl(null);
                      setInviteError('');
                      setShowInviteModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 min-h-[40px] self-start sm:self-auto shadow-md"
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
            <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    Lead Capture Sources &amp; Webhook Endpoints
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Incoming leads sent to these live endpoints trigger automatic AI qualification, CRM pipeline insertion, and real-time alert notifications.
                  </p>
                </div>

                <button
                  onClick={() => setShowSourceModal(true)}
                  className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 min-h-[40px] self-start sm:self-auto shadow-md"
                >
                  <Plus className="w-4 h-4" /> Add Lead Source
                </button>
              </div>

              {/* Test Notification Banner */}
              {testSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-medium">{testSuccessMessage}</span>
                  </div>
                  <button onClick={() => setTestSuccessMessage(null)} className="text-emerald-400 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {sources.map((src) => {
                  const canonicalUrl = getCanonicalWebhookUrl(src);
                  const isManual = src.type === 'Manual';
                  const totalReceived = src.configuration?.total_received || 0;
                  const lastReceived = src.configuration?.last_received_at;

                  return (
                    <div key={src.id} className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 text-xs shadow-lg hover:border-cyan-500/30 transition-all">
                      {/* Source Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                            src.type.includes('Facebook')
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : src.type.includes('WhatsApp')
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : src.type === 'Manual'
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                          }`}>
                            {src.type.includes('Facebook') ? (
                              <Globe className="w-4 h-4" />
                            ) : src.type.includes('WhatsApp') ? (
                              <Zap className="w-4 h-4" />
                            ) : src.type === 'Manual' ? (
                              <Users className="w-4 h-4" />
                            ) : (
                              <Globe className="w-4 h-4" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-sm sm:text-base">{src.name}</h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono border border-slate-700">
                                {src.type}
                              </span>
                            </div>
                          </div>

                          {/* Live Status Indicator */}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 ml-auto sm:ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {isManual ? 'Internal Active' : 'Live Endpoint'}
                          </span>

                          {!isManual && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              Ingested: <strong className="text-cyan-400">{totalReceived}</strong> leads
                            </span>
                          )}
                        </div>

                        {/* Edit & Delete Controls */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setEditingSource(src);
                              setEditName(src.name);
                              setEditType(src.type);
                            }}
                            title="Edit Lead Source Name & Type"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {sources.length > 1 && (
                            <button
                              onClick={() => handleDeleteSource(src.id)}
                              title="Delete Lead Source"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Manual Entry Specific UI */}
                      {isManual ? (
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300 text-xs">
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Built-in direct manual entry is active. Sales reps and admins can manually create leads anytime through the Leads Table or Smart CRM Kanban board.
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href="/leads"
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Users className="w-3.5 h-3.5" /> Leads Table
                            </a>
                            <a
                              href="/crm"
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> CRM Board
                            </a>
                          </div>
                        </div>
                      ) : (
                        /* Webhook URL & Action Buttons */
                        <div className="space-y-2">
                          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            {/* URL Box */}
                            <div
                              title={canonicalUrl || ''}
                              className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] truncate select-all shadow-inner"
                            >
                              {canonicalUrl}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                              <button
                                onClick={() => canonicalUrl && copyWebhook(canonicalUrl, src.id)}
                                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] border border-slate-700/60"
                              >
                                {copiedWebhookId === src.id ? (
                                  <>
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4 text-slate-400" />
                                    <span>Copy URL</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleTestWebhook(src)}
                                disabled={testingSourceId === src.id}
                                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl rescue-gradient text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 transition-all min-h-[38px] disabled:opacity-50"
                              >
                                {testingSourceId === src.id ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                    <span>Testing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Test Webhook</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => setSelectedGuideSource(src)}
                                className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] border border-slate-800"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                                <span>Guide &amp; cURL</span>
                              </button>
                            </div>
                          </div>

                          {/* Telemetry and Meta Footer */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
                            <span>
                              {lastReceived
                                ? `Last payload received: ${new Date(lastReceived).toLocaleString()}`
                                : 'Ready for incoming HTTP POST • Supports JSON, Form-data & Webhooks'}
                            </span>
                            <span className="text-slate-500 font-mono hidden sm:inline">
                              Format: JSON / Form-Urlencoded / Facebook Leads
                            </span>
                          </div>
                        </div>
                      )}
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
                <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Lead Limit Usage</span>
                  <div className="flex items-center justify-between text-white font-extrabold text-lg">
                    <span>{currentPlan.current_lead_count} / {currentPlan.lead_limit} Leads</span>
                    <span className="text-xs font-mono text-cyan-400">
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

                <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Seats Usage</span>
                  <div className="flex items-center justify-between text-white font-extrabold text-lg">
                    <span>{currentPlan.current_user_count} / {currentPlan.user_limit} Seats</span>
                    <span className="text-xs font-mono text-purple-400">
                      {Math.round((currentPlan.current_user_count / currentPlan.user_limit) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
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
                      className={`glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-4 flex flex-col justify-between ${
                        isCurrent ? 'border-cyan-400/80 rescue-glow shadow-[0_0_25px_rgba(0,240,255,0.15)]' : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-base text-white">{plan.name}</h3>
                          {isCurrent && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
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
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpgradePlan(plan)}
                        disabled={isCurrent}
                        className={`w-full py-2.5 rounded-xl text-xs font-black transition-all mt-4 min-h-[40px] flex items-center justify-center ${
                          isCurrent
                            ? 'bg-slate-900 text-slate-500 cursor-default border border-slate-800'
                            : 'rescue-gradient rescue-glow text-slate-950 hover:opacity-95'
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
                        ? 'bg-cyan-950/30 border-cyan-500 text-white rescue-glow'
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
                    {selectedProvider === 'stripe' && <Check className="w-5 h-5 text-cyan-400" />}
                  </div>

                  <div
                    onClick={() => setSelectedProvider('payoneer')}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      selectedProvider === 'payoneer'
                        ? 'bg-cyan-950/30 border-cyan-500 text-white rescue-glow'
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
                    {selectedProvider === 'payoneer' && <Check className="w-5 h-5 text-cyan-400" />}
                  </div>
                </div>

                <button
                  onClick={handleExecuteCheckout}
                  disabled={processingPayment}
                  className="w-full py-3 rounded-xl rescue-gradient rescue-glow text-slate-950 text-xs font-black tracking-wide uppercase disabled:opacity-50 min-h-[44px]"
                >
                  {processingPayment ? 'Connecting Gateway...' : `Proceed to ${selectedProvider.toUpperCase()} Payment`}
                </button>
              </div>
            </div>
          )}

          {/* TAB: RAG COMPANY KNOWLEDGE BASE */}
          {activeTab === 'rag' && (
            <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">RAG Company Knowledge Base</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upload product FAQs, pricing guides, or company specifications. OpenRouter AI retrieves this context during qualification and follow-up generation.
                  </p>
                </div>

                <button
                  onClick={() => setShowRagModal(true)}
                  className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 min-h-[40px] self-start sm:self-auto shadow-md"
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
                          <Zap className="w-4 h-4 text-cyan-400" />
                          <h3 className="font-bold text-white text-sm">{doc.title}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-cyan-300 font-mono border border-slate-700">
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
                      <p className="text-slate-300 text-xs line-clamp-3 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono break-all">
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
            <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">External CRM Data Connectors</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Extract customer leads automatically from HubSpot, Salesforce, Zoho, Pipedrive, or GoHighLevel and sync pipeline stages in real time.
                  </p>
                </div>

                <button
                  onClick={() => setShowCrmModal(true)}
                  className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 min-h-[40px] self-start sm:self-auto shadow-md"
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-cyan-400" />
                          <h3 className="font-bold text-white text-sm">{connector.name} ({connector.provider})</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                            {connector.status}
                          </span>
                        </div>

                        <button
                          onClick={() => handleSyncCrm(connector.id)}
                          disabled={syncingCrmId === connector.id}
                          className="px-3.5 py-2 rounded-xl rescue-gradient text-slate-950 font-black text-xs disabled:opacity-50 min-h-[38px] self-start sm:self-auto"
                        >
                          {syncingCrmId === connector.id ? 'Extracting Data...' : 'Sync & Extract Now'}
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-800">
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
            <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 max-w-md space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-white">Organization Profile</h2>

              <form onSubmit={handleSaveOrg} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400 min-h-[44px]"
                  />
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black text-xs mt-2 min-h-[44px] flex items-center justify-center"
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

      {/* LEAD SOURCE INTEGRATION GUIDE MODAL */}
      {selectedGuideSource && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    Webhook Integration Guide
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      Live
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedGuideSource.name} ({selectedGuideSource.type})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuideSource(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Webhook Endpoint Box */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Production Webhook URL
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="flex-1 font-mono text-[11px] text-cyan-300 break-all select-all">
                  {getCanonicalWebhookUrl(selectedGuideSource)}
                </span>
                <button
                  onClick={() => {
                    const url = getCanonicalWebhookUrl(selectedGuideSource);
                    if (url) copyWebhook(url, selectedGuideSource.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-white font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  {copiedWebhookId === selectedGuideSource.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Guide Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
              <button
                onClick={() => setGuideTab('curl')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  guideTab === 'curl'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" /> cURL Command
              </button>
              <button
                onClick={() => setGuideTab('json')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  guideTab === 'json'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> JSON Schema
              </button>
              <button
                onClick={() => setGuideTab('html')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  guideTab === 'html'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> HTML / JS Form
              </button>
              <button
                onClick={() => setGuideTab('platforms')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  guideTab === 'platforms'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Meta &amp; Zapier
              </button>
            </div>

            {/* Tab Contents */}
            <div className="text-xs space-y-3">
              {/* cURL TAB */}
              {guideTab === 'curl' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Send a real test lead from your terminal or API tester:</span>
                    <button
                      onClick={() => {
                        const url = getCanonicalWebhookUrl(selectedGuideSource);
                        const cmd = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "Alex Johnson",\n    "email": "alex.j@enterprise.com",\n    "phone": "+1 (555) 234-5678",\n    "company": "Apex Dynamics Corp",\n    "deal_value": 4500,\n    "notes": "Inbound inquiry for enterprise sales lead qualification"\n  }'`;
                        copySnippet(cmd);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSnippet ? 'Copied' : 'Copy cURL'}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`curl -X POST "${getCanonicalWebhookUrl(selectedGuideSource)}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Alex Johnson",
    "email": "alex.j@enterprise.com",
    "phone": "+1 (555) 234-5678",
    "company": "Apex Dynamics Corp",
    "deal_value": 4500,
    "notes": "Inbound inquiry for enterprise sales lead qualification"
  }'`}
                  </pre>
                </div>
              )}

              {/* JSON SCHEMA TAB */}
              {guideTab === 'json' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Standard JSON schema accepted by our ingestion pipeline:</span>
                    <button
                      onClick={() => {
                        const schema = `{\n  "name": "Alex Johnson",\n  "email": "alex.j@enterprise.com",\n  "phone": "+1 (555) 234-5678",\n  "company": "Apex Dynamics Corp",\n  "deal_value": 4500,\n  "notes": "Inbound inquiry for enterprise sales lead qualification"\n}`;
                        copySnippet(schema);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSnippet ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "name": "Alex Johnson",               // (string) Lead full name or contact name
  "email": "alex.j@enterprise.com",     // (string) Lead email address
  "phone": "+1 (555) 234-5678",         // (string) Phone number
  "company": "Apex Dynamics Corp",       // (string) Company or Organization
  "deal_value": 4500,                   // (number) Estimated deal / contract value
  "notes": "Interested in sales AI..."   // (string) Customer inquiry / product interest
}`}
                  </pre>
                  <p className="text-[11px] text-slate-400">
                    <strong>Flexible Mapping:</strong> The webhook engine also supports aliases: <code className="text-cyan-400">first_name</code>, <code className="text-cyan-400">last_name</code>, <code className="text-cyan-400">full_name</code>, <code className="text-cyan-400">contact_phone</code>, <code className="text-cyan-400">mobile</code>, <code className="text-cyan-400">product_interest</code>, and <code className="text-cyan-400">budget</code>.
                  </p>
                </div>
              )}

              {/* HTML FORM TAB */}
              {guideTab === 'html' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Ready-to-embed website form (works on Webflow, WordPress, HTML):</span>
                    <button
                      onClick={() => {
                        const url = getCanonicalWebhookUrl(selectedGuideSource);
                        const htmlCode = `<!-- Lead Rescue AI Inbound Form -->\n<form id="leadRescueForm">\n  <input type="text" name="name" placeholder="Full Name" required />\n  <input type="email" name="email" placeholder="Work Email" required />\n  <input type="tel" name="phone" placeholder="Phone Number" />\n  <input type="text" name="company" placeholder="Company Name" />\n  <textarea name="notes" placeholder="How can we assist you?"></textarea>\n  <button type="submit">Submit Inquiry</button>\n</form>\n\n<script>\n  document.getElementById('leadRescueForm').addEventListener('submit', async (e) => {\n    e.preventDefault();\n    const formData = new FormData(e.target);\n    const payload = Object.fromEntries(formData.entries());\n    try {\n      const response = await fetch('${url}', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(payload)\n      });\n      if (response.ok) alert('Inquiry received! Our AI is preparing qualification.');\n    } catch (err) {\n      console.error(err);\n    }\n  });\n</script>`;
                        copySnippet(htmlCode);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSnippet ? 'Copied' : 'Copy HTML & JS'}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-purple-300 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48">
{`<!-- Lead Rescue AI Inbound Form -->
<form id="leadRescueForm">
  <input type="text" name="name" placeholder="Full Name" required />
  <input type="email" name="email" placeholder="Work Email" required />
  <input type="tel" name="phone" placeholder="Phone Number" />
  <input type="text" name="company" placeholder="Company Name" />
  <textarea name="notes" placeholder="How can we assist you?"></textarea>
  <button type="submit">Submit Inquiry</button>
</form>

<script>
  document.getElementById('leadRescueForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch('${getCanonicalWebhookUrl(selectedGuideSource)}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) alert('Inquiry received! AI qualification in progress.');
  });
</script>`}
                  </pre>
                </div>
              )}

              {/* PLATFORMS TAB */}
              {guideTab === 'platforms' && (
                <div className="space-y-3 text-[11px] text-slate-300">
                  {/* Meta Facebook Leads */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 font-bold">
                      <Globe className="w-4 h-4" /> Facebook Lead Ads / Meta Graph API
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                      <li>In Meta Developer Portal / Events Manager, navigate to <strong>Webhooks &gt; Leadgen</strong>.</li>
                      <li>Paste the <strong>Production Webhook URL</strong> into the Callback URL field.</li>
                      <li>Paste the Secret: <code className="text-cyan-300 font-mono select-all">{selectedGuideSource.configuration?.secret || selectedGuideSource.configuration?.webhook_secret || 'sec_lead_rescue_live'}</code> into the <strong>Verify Token</strong> field.</li>
                      <li>Click <strong>Verify and Save</strong>. Lead Rescue AI automatically fulfills Meta's challenge handshake.</li>
                    </ol>
                  </div>

                  {/* Zapier / Make.com */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Zap className="w-4 h-4" /> Zapier, Make.com, n8n, &amp; Typeform
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                      <li>Create a trigger in Zapier or Make (e.g., Google Forms, Calendly, Jotform, Unbounce).</li>
                      <li>Add action: <strong>Webhooks by Zapier &gt; POST</strong>.</li>
                      <li>Set URL to the <strong>Production Webhook URL</strong> above with Payload Type <strong>JSON</strong>.</li>
                      <li>Map your lead's name, email, phone, and company into the payload fields.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleTestWebhook(selectedGuideSource)}
                disabled={testingSourceId === selectedGuideSource.id}
                className="w-full sm:w-auto px-4 py-2 rounded-xl rescue-gradient text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 transition-all min-h-[38px] disabled:opacity-50"
              >
                {testingSourceId === selectedGuideSource.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Sending Test Lead...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Live Test Lead Now</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedGuideSource(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT LEAD SOURCE MODAL */}
      {editingSource && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" /> Edit Lead Source
              </h3>
              <button onClick={() => setEditingSource(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSource} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Source Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Website Form">Website Form (Webhook)</option>
                  <option value="Facebook Leads">Facebook Lead Ads</option>
                  <option value="WhatsApp">WhatsApp Business API</option>
                  <option value="Manual">Manual Entry / Direct CRM</option>
                </select>
              </div>

              {/* Secret Display */}
              {editingSource.configuration?.secret && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Webhook Secret / Verify Token</label>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300">
                    <span className="truncate flex-1">{editingSource.configuration.secret}</span>
                    <button
                      type="button"
                      onClick={() => copySecret(editingSource.configuration.secret, editingSource.id)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center gap-1"
                    >
                      {copiedSecretId === editingSource.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSecretId === editingSource.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSource(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl rescue-gradient text-slate-950 font-black text-xs shadow-md hover:brightness-110 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LEAD SOURCE MODAL */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Add Lead Source &amp; Webhook
              </h3>
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
                  placeholder="e.g. Landing Page Contact Form, FB Campaign 2026..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Source Type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Website Form">Website Form (Dedicated Webhook Endpoint)</option>
                  <option value="Facebook Leads">Facebook Lead Ads (Meta Graph Webhook)</option>
                  <option value="WhatsApp">WhatsApp Inbound (Wasender / Twilio API)</option>
                  <option value="Manual">Manual Entry / Direct CRM (No Webhook)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <span className="text-cyan-400 font-semibold">Automatic Provisioning:</span> When created, an instant canonical webhook endpoint and security token will be allocated for this source with automated AI qualification pipelines.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black text-xs mt-4 shadow-lg hover:brightness-110 transition-all"
              >
                Provision Webhook Endpoint
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
