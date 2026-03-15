'use client';

import { useState } from 'react';
import {
  HookbasePortal,
  EndpointList,
  EndpointForm,
  SubscriptionManager,
  MessageLog,
  EventTypeList,
  type Endpoint,
} from '@hookbase/portal';

export default function WebhookSettings() {
  // In a real app, this would come from your backend after authenticating the user
  const portalToken = process.env.NEXT_PUBLIC_HOOKBASE_PORTAL_TOKEN || 'whpt_xxx';
  const apiUrl = process.env.NEXT_PUBLIC_HOOKBASE_API_URL || 'https://api.hookbase.app';

  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'messages'>('endpoints');

  return (
    <HookbasePortal
      token={portalToken}
      apiUrl={apiUrl}
      theme={{
        darkMode: 'auto',
      }}
      onError={(error) => {
        console.error('Hookbase Portal Error:', error);
      }}
    >
      <div className="container">
        <header className="header">
          <h1>Webhook Settings</h1>
          <p>Manage your webhook endpoints and subscriptions</p>
        </header>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'endpoints' ? 'active' : ''}`}
            onClick={() => setActiveTab('endpoints')}
          >
            Endpoints
          </button>
          <button
            className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            Delivery History
          </button>
        </div>

        {activeTab === 'endpoints' && (
          <div className="main-grid">
            <div className="section">
              <div className="section-header">
                <h2>Your Endpoints</h2>
                <button
                  className="tab"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  {showCreateForm ? 'Cancel' : '+ Add Endpoint'}
                </button>
              </div>

              {showCreateForm && (
                <div style={{ marginBottom: '1rem' }}>
                  <EndpointForm
                    mode="create"
                    onSuccess={(endpoint, secret) => {
                      console.log('Created endpoint:', endpoint.id);
                      if (secret) {
                        console.log('Save this secret:', secret);
                      }
                      setShowCreateForm(false);
                      setSelectedEndpoint(endpoint);
                    }}
                    onCancel={() => setShowCreateForm(false)}
                  />
                </div>
              )}

              <EndpointList
                showActions={true}
                onEndpointClick={(endpoint) => setSelectedEndpoint(endpoint)}
                onEditClick={(endpoint) => {
                  console.log('Edit endpoint:', endpoint.id);
                }}
                onDeleteClick={(endpoint) => {
                  console.log('Delete endpoint:', endpoint.id);
                }}
              />
            </div>

            <div className="section">
              {selectedEndpoint ? (
                <>
                  <div className="section-header">
                    <h2>Subscriptions for {new URL(selectedEndpoint.url).hostname}</h2>
                    <button
                      className="tab"
                      onClick={() => setSelectedEndpoint(null)}
                    >
                      Close
                    </button>
                  </div>
                  <SubscriptionManager
                    endpointId={selectedEndpoint.id}
                    variant="full"
                    onChange={(subscribedIds) => {
                      console.log('Subscriptions changed:', subscribedIds);
                    }}
                  />
                </>
              ) : (
                <>
                  <h2>Available Event Types</h2>
                  <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Select an endpoint to manage its subscriptions
                  </p>
                  <EventTypeList showSearch={true} />
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="section">
            <MessageLog
              limit={25}
              refreshInterval={30000}
              onMessageClick={(message) => {
                console.log('View message:', message.id);
              }}
            />
          </div>
        )}
      </div>
    </HookbasePortal>
  );
}
