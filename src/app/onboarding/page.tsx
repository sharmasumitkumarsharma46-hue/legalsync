'use client';

import { useState } from 'react';

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const steps = [
    { number: 1, title: 'Connect Clio', description: 'Link your case management system' },
    { number: 2, title: 'Connect Calendar', description: 'Link your Google or Outlook calendar' },
    { number: 3, title: 'Select Calendars', description: 'Choose which calendars to sync' },
    { number: 4, title: 'Configure Sync', description: 'Set your sync preferences' },
    { number: 5, title: 'Review', description: 'Review your configuration' },
    { number: 6, title: 'Start Sync', description: 'Begin your first sync' },
  ];

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s) => (
              <div key={s.number} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s.number === step
                    ? 'bg-blue-900 text-white'
                    : s.number < step
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {s.number < step ? '✓' : s.number}
                </div>
                {s.number < steps.length && (
                  <div className={`w-16 h-1 mx-2 ${
                    s.number < step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{steps[step - 1].title}</h2>
          <p className="text-gray-600 mt-1">{steps[step - 1].description}</p>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-900 font-bold text-2xl">C</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Clio Account</h3>
                <p className="text-gray-600 mb-6">Link your Clio case management system to sync your calendar events.</p>
                <button
                  onClick={() => setLoading(true)}
                  className="w-full px-6 py-3 bg-blue-900 text-white rounded-md hover:bg-blue-800 font-medium"
                >
                  {loading ? 'Connecting...' : 'Connect Clio'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect Your Calendar</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setLoading(true)}
                    className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center mr-3">
                      <span className="text-red-600 font-bold">G</span>
                    </div>
                    <span className="font-medium">Google Calendar</span>
                  </button>
                  <button
                    onClick={() => setLoading(true)}
                    className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">O</span>
                    </div>
                    <span className="font-medium">Outlook</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Calendars to Sync</h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" className="w-4 h-4 text-blue-900 rounded" defaultChecked />
                  <span className="ml-3 text-gray-900">Primary Calendar</span>
                </label>
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" className="w-4 h-4 text-blue-900 rounded" defaultChecked />
                  <span className="ml-3 text-gray-900">Work Calendar</span>
                </label>
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" className="w-4 h-4 text-blue-900 rounded" />
                  <span className="ml-3 text-gray-900">Personal Calendar</span>
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Sync Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sync Frequency</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent">
                    <option>Every 5 minutes</option>
                    <option>Every 15 minutes</option>
                    <option>Every 30 minutes</option>
                    <option>Every hour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Conflict Resolution</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent">
                    <option>Last write wins</option>
                    <option>Manual review</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Clio</p>
                    <p className="text-sm text-gray-600">Connected</p>
                  </div>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Google Calendar</p>
                    <p className="text-sm text-gray-600">Connected</p>
                  </div>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Sync Frequency</p>
                    <p className="text-sm text-gray-600">Every 5 minutes</p>
                  </div>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Calendars Selected</p>
                    <p className="text-sm text-gray-600">2 calendars</p>
                  </div>
                  <span className="text-green-600">✓</span>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Setup Complete!</h3>
              <p className="text-gray-600 mb-6">Your calendar sync is now configured. Your first sync will begin shortly.</p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-3 bg-blue-900 text-white rounded-md hover:bg-blue-800 font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {step < 6 && (
          <div className="flex items-center justify-between mt-6">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Back
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 font-medium"
            >
              {step === 5 ? 'Start Sync' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
