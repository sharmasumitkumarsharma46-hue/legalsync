'use client';

import { useEffect, useState } from 'react';
import { hasFeatureAccess } from '@/lib/billing/plans';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [planAccess, setPlanAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ name: 'John Doe', firmName: 'Smith & Associates' });
      fetchTrialStatus(token);
      fetchPlanAccess(token);
    }
    setLoading(false);
  }, []);

  const fetchPlanAccess = async (token: string) => {
    try {
      const response = await fetch('/api/billing/plan-access', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setPlanAccess(data);
      }
    } catch (error) {
      console.error('Error fetching plan access:', error);
    }
  };

  const fetchTrialStatus = async (token: string) => {
    try {
      const response = await fetch('/api/billing/trial/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTrialStatus(data.trialStatus);
      }
    } catch (error) {
      console.error('Error fetching trial status:', error);
    }
  };

  const handleConvertTrial = async (paymentMethod: 'stripe' | 'crypto') => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch('/api/billing/trial/convert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethod }),
      });
      const data = await response.json();
      if (data.success) {
        if (paymentMethod === 'crypto' && data.hostedUrl) {
          window.location.href = data.hostedUrl;
        } else {
          alert('Trial converted successfully!');
          setShowPaymentModal(false);
          fetchTrialStatus(token);
        }
      }
    } catch (error) {
      console.error('Error converting trial:', error);
      alert('Failed to convert trial');
    }
  };

  const currentPlan = planAccess?.plan || 'solo';
  const hasTeamDashboard = hasFeatureAccess(currentPlan, 'teamDashboard');
  const hasRoleBasedAccess = hasFeatureAccess(currentPlan, 'roleBasedAccess');
  const hasAdvancedAdmin = hasFeatureAccess(currentPlan, 'advancedAdminControls');
  const hasPremiumSupport = hasFeatureAccess(currentPlan, 'premiumSupport');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-900">LegalSync</h1>
        </div>
        <nav className="mt-6">
          <a href="#" className="flex items-center px-6 py-3 text-blue-900 bg-blue-50 border-r-4 border-blue-900">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Integrations
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sync History
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Billing
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Support
          </a>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.firmName}</p>
            </div>
          </div>
          <button className="mt-3 text-sm text-gray-600 hover:text-gray-900">Sign out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Trial Status Banner */}
        {trialStatus && trialStatus.status === 'trial' && (
          <div className={`mb-6 p-4 rounded-lg ${
            trialStatus.daysRemaining <= 3 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-semibold ${
                  trialStatus.daysRemaining <= 3 ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {trialStatus.daysRemaining <= 0 
                    ? 'Your trial has expired!' 
                    : `${trialStatus.daysRemaining} days remaining in your trial`}
                </p>
                <p className={`text-sm ${
                  trialStatus.daysRemaining <= 3 ? 'text-red-700' : 'text-blue-700'
                }`}>
                  Plan: {trialStatus.plan} | Trial ends: {new Date(trialStatus.trialEndDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {trialStatus && trialStatus.status === 'expired' && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-red-900">Your trial has expired</p>
                <p className="text-sm text-red-700">Please upgrade to continue using LegalSync</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {trialStatus && trialStatus.status === 'active' && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900">Active Subscription</p>
                <p className="text-sm text-green-700">
                  Plan: {trialStatus.plan} | Next billing: {new Date(trialStatus.trialEndDate).toLocaleDateString()}
                </p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Paid
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600 mt-1">Welcome back, {user?.firmName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span className="text-sm text-gray-600">Synced</span>
            </div>
            <span className="text-sm text-gray-500">Last sync: 2 minutes ago</span>
            <button className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800">
              Sync Now
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Plan access</p>
            <p className="mt-3 text-xl font-semibold text-gray-900">{currentPlan.replace('_', ' ')}</p>
            <p className="mt-2 text-sm text-gray-600">{planAccess?.maxUsers || 1} user limit</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Team dashboard</p>
            <p className="mt-3 text-xl font-semibold text-gray-900">{hasTeamDashboard ? 'Enabled' : 'Enabled'}</p>
            <p className="mt-2 text-sm text-gray-600">Shared visibility is available on every paid plan.</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Role controls</p>
            <p className="mt-3 text-xl font-semibold text-gray-900">{hasRoleBasedAccess ? 'Active' : 'Active'}</p>
            <p className="mt-2 text-sm text-gray-600">Admin roles and permissions are included across all plans.</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Premium support</p>
            <p className="mt-3 text-xl font-semibold text-gray-900">{hasPremiumSupport ? 'Priority' : 'Priority'}</p>
            <p className="mt-2 text-sm text-gray-600">Support access is included for every paid plan.</p>
          </div>
        </div>

        {/* Connection Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Clio Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-900 font-bold">C</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Clio</h3>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Connected</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Last sync: 2 minutes ago</p>
              <p className="text-sm text-gray-600">Events synced: 1,234</p>
            </div>
            <button className="mt-4 text-sm text-blue-900 hover:text-blue-800">Configure</button>
          </div>

          {/* Google Calendar Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 font-bold">G</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Google Calendar</h3>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Connected</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Last sync: 2 minutes ago</p>
              <p className="text-sm text-gray-600">Calendars synced: 3</p>
            </div>
            <button className="mt-4 text-sm text-blue-900 hover:text-blue-800">Configure</button>
          </div>

          {/* Outlook Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold">O</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Outlook</h3>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Not Connected</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Connect your Outlook calendar</p>
            </div>
            <button className="mt-4 text-sm text-blue-900 hover:text-blue-800">Connect</button>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">All paid plans include full access</p>
          <p className="mt-2 text-sm text-indigo-900">
            Every LegalSync plan includes the same core features, while the plan choice mainly adjusts seat limits and billing tier.
          </p>
        </div>

        {/* Sync History Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Sync History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events Synced</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2 min ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Clio → Google</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">45</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Success</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 hover:text-blue-800">View</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">7 min ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Google → Clio</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">12</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Success</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 hover:text-blue-800">View</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">12 min ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Clio → Outlook</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">8</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Success</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 hover:text-blue-800">View</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Upgrade Your Plan</h3>
            <p className="text-gray-600 mb-6">
              Choose your payment method to continue using LegalSync
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => handleConvertTrial('stripe')}
                className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-bold">S</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Credit Card (Stripe)</p>
                    <p className="text-sm text-gray-600">Automatic monthly billing</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => handleConvertTrial('crypto')}
                className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-orange-600 font-bold">₿</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Cryptocurrency</p>
                    <p className="text-sm text-gray-600">Pay with Bitcoin, Ethereum, etc.</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="mt-6 w-full py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
