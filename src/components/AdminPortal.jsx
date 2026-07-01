import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import Navbar from './Navbar';               
import apiClient from './apiClient';

const STYLES = {
  wrapper: { display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: '-apple-system, sans-serif', backgroundColor: '#f4f6f9' },
  container: { padding: '40px', boxSizing: 'border-box', maxWidth: '1600px', width: '100%', margin: '0 auto' },
  tabsHeader: { display: 'flex', gap: '15px', borderBottom: '2px solid #e2e8f0', marginBottom: '30px' },
  tab: (active) => ({ padding: '12px 24px', cursor: 'pointer', fontWeight: '700', borderBottom: active ? '3px solid #0066b2' : '3px solid transparent', color: active ? '#0066b2' : '#718096', transition: 'all 0.2s' }),
  card: { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: '25px', border: '1px solid #e2e8f0', position: 'relative' },
  riskContainer: { marginTop: '15px', backgroundColor: '#fff5f5', borderLeft: '4px solid #e53e3e', padding: '12px 18px', borderRadius: '4px' },
  riskTag: { display: 'inline-block', backgroundColor: '#fed7d7', color: '#9b2c2c', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', marginRight: '8px' },
  actionGrid: { display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' },
  diffBox: { display: 'flex', gap: '20px', marginTop: '20px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '6px', borderLeft: '4px solid #0066b2' },
  removedText: { color: '#c53030', backgroundColor: '#fff5f5', padding: '8px 12px', borderRadius: '4px', textDecoration: 'line-through', fontFamily: 'monospace' },
  addedText: { color: '#2f855a', backgroundColor: '#f0fff4', padding: '8px 12px', borderRadius: '4px', fontFamily: 'monospace' },
  btn: { padding: '10px 18px', backgroundColor: '#0066b2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' },
  badge: (status) => {
    const isSuspended = status === 'SUSPENDED' || status === 'REJECTED';
    return { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', backgroundColor: isSuspended ? '#fed7d7' : '#e6fffa', color: isSuspended ? '#9b2c2c' : '#234e52' };
  },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,25,47,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 },
  modal: { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }
};

const AdminPortal = () => {
  const { viewMerchantOverview } = useContext(AuthContext); 
  
  const [merchants, setMerchants] = useState([]);
  const [monitoredMerchants, setMonitoredMerchants] = useState([]); 
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('queue');
  const [activeDiffData, setActiveDiffData] = useState({}); 
  const [processingId, setProcessingId] = useState(null);

  const [impersonationModalOpen, setImpersonationModalOpen] = useState(false);
  const [impersonateTargetId, setImpersonateTargetId] = useState(null);
  const [impersonationReason, setImpersonationReason] = useState('');

  const refreshTabContextData = async () => {
    try {
      if (activeSubTab === 'queue') {
        const res = await apiClient.get('/admin/management/merchants/queue');
        setMerchants(res.data || []);
      } else if (activeSubTab === 'audit') {
        const res = await apiClient.get('/admin/management/audit-logs');
        setAuditLogs(res.data || []);
      } else if (activeSubTab === 'monitor') {
        // Updated to use pagination variables matching structural database layouts
        const res = await apiClient.get('/admin/management/merchants/queue', { params: { page: 0, size: 100 } });
        setMonitoredMerchants(res.data || []);
      }
    } catch (err) {
      console.error("Dynamic sync context processing failure.", err);
    }
  };

  useEffect(() => {
    refreshTabContextData();
  }, [activeSubTab]);

  const handleApproveKyc = async (merchantId) => {
    setProcessingId(merchantId);
    try {
      await apiClient.post(`/admin/management/merchants/${merchantId}/review`, null, {
        params: { action: 'APPROVE', notes: 'Standard automated back-office clearing context passed.' }
      });
      alert("Success: Account onboarding verified.");
      refreshTabContextData();
    } catch (err) {
      alert("KYC Update processing constraint caught.");
    } finally {
      setProcessingId(null);
    }
  };

  const executeUtilityAction = async (merchantId, command) => {
    setProcessingId(`${merchantId}-${command}`);
    try {
      await apiClient.post(`/admin/management/merchants/${merchantId}/action`, null, { 
        params: { command } 
      });
      alert(`Operation [${command}] completed successfully.`);
      refreshTabContextData();
    } catch (err) {
      alert("Utility modification exception caught.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleLaunchImpersonation = async (e) => {
    e.preventDefault();
    if (impersonationReason.trim().length < 10) return;

    try {
      const res = await apiClient.post(`/admin/management/merchants/${impersonateTargetId}/impersonate`, {
        reason: impersonationReason
      });
      
      sessionStorage.setItem('impersonation_token', res.data.impersonationToken);
      alert(`⚠️ IMPERSONATION ACTIVE (READ-ONLY) Session auto-expires in 15 mins.\nActing as: ${res.data.targetEmail}`);
      
      setImpersonationModalOpen(false);
      setImpersonationReason('');
      viewMerchantOverview(impersonateTargetId);
    } catch (err) {
      alert(err.response?.data?.message || "Impersonation initialization denied.");
    }
  };

  const handleFetchDiffView = async (merchantId) => {
    if (activeDiffData[merchantId]) {
      setActiveDiffData(prev => { const c = { ...prev }; delete c[merchantId]; return c; });
      return;
    }
    try {
      const res = await apiClient.get(`/admin/management/merchants/${merchantId}/diff-view`);
      setActiveDiffData(prev => ({ ...prev, [merchantId]: res.data }));
    } catch (err) {
      alert("Failed to sync patch logs.");
    }
  };

  return (
    <div style={STYLES.wrapper}>
      <Navbar />
      <div style={STYLES.container}>
        <div>
          <h1 style={{ color: '#0a192f', margin: 0, fontSize: '28px', fontWeight: '700' }}>Operations Control Board</h1>
          <p style={{ color: '#718096', margin: '5px 0 30px 0' }}>Internal processing dashboard, risk mitigation engine, and immutable ledger logging metrics.</p>
        </div>

        <div style={STYLES.tabsHeader}>
          <span style={STYLES.tab(activeSubTab === 'queue')} onClick={() => setActiveSubTab('queue')}>📥 Onboarding Approval Queue ({merchants.length})</span>
          <span style={STYLES.tab(activeSubTab === 'monitor')} onClick={() => setActiveSubTab('monitor')}>📊 Operations Management Console</span>
          <span style={STYLES.tab(activeSubTab === 'audit')} onClick={() => setActiveSubTab('audit')}>Ledger Audit Trail (Immutable)</span>
        </div>

        {/* SUBTAB 1: ONBOARDING ACCELERATOR QUEUE */}
        {activeSubTab === 'queue' && (
          <div>
            {merchants.length === 0 ? (
              <p style={{ color: '#718096' }}>No active cases awaiting system review.</p>
            ) : (
              merchants.map((m) => (
                <div key={m.id} style={STYLES.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#0a192f' }}>{m.businessName} (ID: {m.id})</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>Owner: <code>{m.ownerEmail}</code></p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={{ ...STYLES.btn, backgroundColor: '#4a5568' }} onClick={() => handleFetchDiffView(m.id)}>
                        {activeDiffData[m.id] ? 'Collapse Parameters' : 'Inspect Parameters (Diff)'}
                      </button>
                      <button style={{ ...STYLES.btn, backgroundColor: '#2f855a' }} disabled={processingId === m.id} onClick={() => handleApproveKyc(m.id)}>Approve Profile</button>
                    </div>
                  </div>

                  {activeDiffData[m.id] && (
                    <div style={STYLES.diffBox}>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: '0 0 5px 0', color: '#718096', fontSize: '11px' }}>Field Target</h5>
                        <strong style={{ fontFamily: 'monospace' }}>{activeDiffData[m.id].fieldModified}</strong>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: '0 0 5px 0', color: '#718096', fontSize: '11px' }}>Previous Historical State</h5>
                        <div style={STYLES.removedText}>{activeDiffData[m.id].previousValue}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: '0 0 5px 0', color: '#718096', fontSize: '11px' }}>Submitted Variable</h5>
                        <div style={STYLES.addedText}>{activeDiffData[m.id].submittedValue}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBTAB 2: OPERATIONAL TELEMETRY BOARD */}
        {activeSubTab === 'monitor' && (
          <div>
            {monitoredMerchants.length === 0 ? (
              <p style={{ color: '#718096' }}>No records located inside monitoring scopes.</p>
            ) : (
              monitoredMerchants.map((m) => (
                <div key={m.id} style={STYLES.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0 }}>{m.businessName}</h3>
                        <span style={STYLES.badge(m.kycStatus || 'ACTIVE')}>{m.kycStatus || 'ACTIVE'}</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Context Handle: <code>{m.ownerEmail}</code></p>
                    </div>
                    <div>
                      <button style={{ ...STYLES.btn, backgroundColor: '#d69e2e' }} onClick={() => { setImpersonateTargetId(m.id); setImpersonationModalOpen(true); }}>🎭 Impersonate User</button>
                    </div>
                  </div>

                  <div style={STYLES.actionGrid}>
                    <button style={{ ...STYLES.btn, backgroundColor: '#3182ce' }} onClick={() => executeUtilityAction(m.id, 'TRIGGER_SETTLEMENT')}>💸 Trigger Core Settlement</button>
                    <button style={{ ...STYLES.btn, backgroundColor: '#e53e3e' }} onClick={() => executeUtilityAction(m.id, 'BLOCK')}>🛑 Suspend Merchant</button>
                    <button style={{ ...STYLES.btn, backgroundColor: '#38a169' }} onClick={() => executeUtilityAction(m.id, 'UNBLOCK')}>✅ Reactivate Access</button>
                    <button style={{ ...STYLES.btn, backgroundColor: '#4a5568' }} onClick={() => executeUtilityAction(m.id, 'RESET_2FA')}>🔑 Force 2FA Hardware Reset</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBTAB 3: IMMUTABLE AUDIT LOG ENGINE TABLE */}
        {activeSubTab === 'audit' && (
          <div style={{ ...STYLES.card, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7' }}>
                  <th style={{ padding: '16px 12px' }}>Timestamp</th>
                  <th style={{ padding: '16px 12px' }}>Actor</th>
                  <th style={{ padding: '16px 12px' }}>Action Mapping</th>
                  <th style={{ padding: '16px 12px' }}>Pre-Mutation Context</th>
                  <th style={{ padding: '16px 12px' }}>Post-Mutation Context</th>
                  <th style={{ padding: '16px 12px' }}>Ingress IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #edf2f7', verticalAlign: 'top' }}>
                    <td style={{ padding: '14px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                    <td style={{ padding: '14px 12px' }}><code>{log.adminUsername}</code></td>
                    <td style={{ padding: '14px 12px', fontWeight: '700', color: '#0066b2' }}>{log.action}</td>
                    <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#c53030' }}>{log.preStateJson}</td>
                    <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#2f855a' }}>{log.postStateJson}</td>
                    <td style={{ padding: '14px 12px', fontFamily: 'monospace' }}>{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* IMPERSONATION MODAL LAYER */}
      {impersonationModalOpen && (
        <div style={STYLES.modalOverlay}>
          <div style={STYLES.modal}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0a192f' }}>Mandatory Security Reason Log</h3>
            <p style={{ fontSize: '13px', color: '#718096', marginBottom: '15px' }}>Impersonations are tracked via the hardware audit ledger. Provide your operational ticket description details below.</p>
            <form onSubmit={handleLaunchImpersonation}>
              <textarea 
                style={{ width: '100%', height: '100px', padding: '10px', boxSizing: 'border-box', marginBottom: '15px', borderRadius: '4px', border: '1px solid #cbd5e0', outline: 'none' }}
                placeholder="Enter regulatory tracking or debugging reason ticket description..."
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" style={{ ...STYLES.btn, backgroundColor: '#718096' }} onClick={() => { setImpersonationModalOpen(false); setImpersonationReason(''); }}>Cancel</button>
                <button type="submit" style={STYLES.btn} disabled={impersonationReason.trim().length < 10}>Confirm and Assume Access</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;