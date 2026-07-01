import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import apiClient from './apiClient';

const STYLES = {
  wrapper: { display: 'flex', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f4f6f9' },
  sidebar: { width: '260px', backgroundColor: '#0a192f', color: '#fff', padding: '30px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' },
  sidebarTop: { flex: 1 },
  main: { flex: 1, padding: '40px', boxSizing: 'border-box' },
  navLink: (active) => ({ display: 'block', padding: '12px 16px', color: active ? '#fff' : '#8892b0', backgroundColor: active ? '#0066b2' : 'transparent', borderRadius: '4px', textDecoration: 'none', marginBottom: '10px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }),
  card: { backgroundColor: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '25px' },
  errorBox: { backgroundColor: '#fff5f5', color: '#c53030', padding: '12px 16px', borderRadius: '4px', borderLeft: '4px solid #e53e3e', marginBottom: '20px', fontSize: '14px' },
  successBox: { backgroundColor: '#f0fff4', color: '#2f855a', padding: '12px 16px', borderRadius: '4px', borderLeft: '4px solid #38a169', marginBottom: '20px', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #edf2f7', color: '#4a5568', backgroundColor: '#f7fafc' },
  td: { padding: '12px', borderBottom: '1px solid #edf2f7', color: '#2d3748' },
  badge: (status) => {
    let bg = '#e2e8f0', text = '#4a5568';
    if (status === 'SUCCESS' || status === 'APPROVED' || status === 'ACCEPTED') { bg = '#c6f6d5'; text = '#22543d'; }
    else if (status === 'FAILED' || status === 'REJECTED') { bg = '#fed7d7'; text = '#742a2a'; }
    else if (status === 'SUBMITTED' || status === 'PENDING') { bg = '#feebc8'; text = '#744210'; }
    return { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', backgroundColor: bg, color: text };
  },
  input: { width: '100%', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '4px', marginTop: '6px', boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '4px', marginTop: '6px', backgroundColor: '#fff', boxSizing: 'border-box' },
  btn: { padding: '10px 20px', backgroundColor: '#0066b2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  stepIndicator: (active) => ({ flex: 1, textAlign: 'center', paddingBottom: '10px', borderBottom: active ? '3px solid #0066b2' : '3px solid #e2e8f0', color: active ? '#0066b2' : '#718096', fontWeight: '600' }),
  sidebarLogoutBtn: (isLoggingOut) => ({ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: 'transparent', color: '#ff6b6b', border: '1px solid rgba(255, 107, 107, 0.2)', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: isLoggingOut ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', outline: 'none', marginTop: '20px' }),
  impersonationBanner: { backgroundColor: '#fff3cd', color: '#856404', padding: '12px 20px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', border: '1px solid #ffeeba', fontWeight: '500' },
  filterGrid: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' },
  paginationContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }
};

const MerchantDashboard = () => {
  const { user, isLoggingOut, logout, isImpersonating, stopImpersonation } = useContext(AuthContext); 
  
  const [activeTab, setActiveTab] = useState('overview');
  const [kycStep, setKycStep] = useState(1);
  const [kycStatus, setKycStatus] = useState('DRAFT'); 
  const [businessName, setBusinessName] = useState('');
  const [companyType, setCompanyType] = useState('PRIVATE_LIMITED');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [directorNames, setDirectorNames] = useState('');
  
  const [panUploadStatus, setPanUploadStatus] = useState('PENDING'); 
  const [gstUploadStatus, setGstUploadStatus] = useState('PENDING');

  // Synchronized state to store backend schema tracking variables cleanly
  const [metrics, setMetrics] = useState({ todaysVolume: 0, successRatePercentage: 0 });

  const [kycError, setKycError] = useState('');
  const [kycSuccessMessage, setKycSuccessMessage] = useState('');

  // 🏛️ SERVER-SIDE PAGINATION & FILTER STATES
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [refundingTxnId, setRefundingTxnId] = useState(null);

  const hydrateMerchantDataScope = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.user) {
        const dataContext = res.data.user;
        setKycStatus(dataContext.kycStatus || 'DRAFT');
        setBusinessName(dataContext.businessName || '');
        setCompanyType(dataContext.companyType || 'PRIVATE_LIMITED');
        setAccountNumber(dataContext.accountNumber || '');
        setIfscCode(dataContext.ifscCode || '');
        setDirectorNames(dataContext.directorDetails || '');
        setPanUploadStatus(dataContext.panStatus || 'PENDING');
        setGstUploadStatus(dataContext.gstStatus || 'PENDING');
        
        if (dataContext.kycStatus === 'REJECTED') {
          setKycStep(2);
        }
      }
    } catch (err) {
      console.error("Failed to rehydrate session details payload.", err);
    }
  };

  // ✅ FIXED: Correct routing assignment mapping straight onto /transactions/metrics
  const fetchPerformanceMetrics = async () => {
    try {
      const res = await apiClient.get('/merchant/transactions/metrics');
      setMetrics({
        todaysVolume: res.data?.todaysVolume || 0,
        successRatePercentage: res.data?.successRatePercentage || 0
      });
    } catch (err) {
      console.error("Failed to recover ledger aggregate metrics from API core.", err);
      setMetrics({ todaysVolume: 0, successRatePercentage: 0 });
    }
  };

  useEffect(() => {
    if (user) {
      if (isImpersonating) {
        hydrateMerchantDataScope();
      } else {
        setKycStatus(user.kycStatus || 'DRAFT');
        setBusinessName(user.businessName || '');
        setCompanyType(user.companyType || 'PRIVATE_LIMITED');
        setAccountNumber(user.accountNumber || '');
        setIfscCode(user.ifscCode || '');
        setDirectorNames(user.directorDetails || '');
        setPanUploadStatus(user.panStatus || 'PENDING');
        setGstUploadStatus(user.gstStatus || 'PENDING');
        if (user.kycStatus === 'REJECTED') setKycStep(2);
      }
    }
  }, [user, isImpersonating]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchPerformanceMetrics();
    }
  }, [activeTab]);

  // FETCH WITH SERVER PAGINATION ARGUMENTS
  const fetchLiveTransactions = async () => {
    try {
      const res = await apiClient.get('/merchant/transactions', {
        params: { page, size: 10, status: statusFilter, paymentMode: modeFilter }
      });
      
      // Handles standard list wrappers or Spring Page content arrays natively
      setTransactions(res.data?.records || res.data?.content || []);
      
      const serverTotalPages = parseInt(res.data?.totalPages, 10);
      setTotalPages(!isNaN(serverTotalPages) ? serverTotalPages : 1);
    } catch (err) {
      console.error("Failed to fetch page collections from ledger API.", err);
      setTransactions([]);
      setTotalPages(1);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchLiveTransactions();
    }
  }, [activeTab, page, statusFilter, modeFilter]);

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (isImpersonating) return;
    setKycError(''); setKycSuccessMessage('');
    try {
      const res = await apiClient.post('/onboarding/step1-business', { businessName, companyType });
      if (res.data?.status) setKycStatus(res.data.status);
      setKycSuccessMessage("Business profile metadata cached successfully.");
      setKycStep(2);
    } catch (err) {
      setKycError(err.response?.data?.message || "Failed to submit base business profile parameters.");
    }
  };

  const handleDocumentUpload = async (docType, file) => {
    if (!file || isImpersonating) return;
    setKycError(''); setKycSuccessMessage('');
    
    const formData = new FormData();
    formData.append("docType", docType);
    formData.append("file", file);

    try {
      const res = await apiClient.post('/onboarding/step2-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      setKycSuccessMessage(`${docType} file passed malware security scanner screening successfully!`);
      
      if (docType === 'PAN') setPanUploadStatus('PENDING');
      if (docType === 'GST') setGstUploadStatus('PENDING');
      if (res.data?.status) setKycStatus(res.data.status);
    } catch (err) {
      setKycError(err.response?.data?.message || `Malware/validation alert on ${docType} file submission.`);
    }
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    if (isImpersonating) return;
    setKycError(''); setKycSuccessMessage('');
    try {
      await apiClient.post('/onboarding/step3-bank', { accountNumber, ifscCode });
      setKycSuccessMessage("Banking structural metrics saved successfully.");
      setKycStep(4);
    } catch (err) {
      setKycError(err.response?.data?.message || "Failed to commit settlement details.");
    }
  };

  const handleStep4Finalize = async (e) => {
    e.preventDefault();
    if (isImpersonating) return;
    setKycError(''); setKycSuccessMessage('');
    try {
      const res = await apiClient.post('/onboarding/step4-directors', { directorNames });
      setKycStatus(res.data.status || 'SUBMITTED');
      alert("Success! Your verification file has been locked and submitted for manual review.");
      setActiveTab('overview');
    } catch (err) {
      setKycError(err.response?.data?.message || "Final account submission lifecycle dropped.");
    }
  };

  const handleRefund = async (txnId) => {
    if (isImpersonating) return;
    setRefundingTxnId(txnId);
    
    const generatedIdempotencyKey = `REQ-REF-${txnId}-${Date.now()}`;

    try {
      await apiClient.post(`/merchant/transactions/${txnId}/refund`, 
        { amount: 'FULL' }, 
        {
          headers: { 'Idempotency-Key': generatedIdempotencyKey }
        }
      );
      alert(`Refund processing completed safely. Verification Token: ${txnId}`);
      fetchLiveTransactions();
    } catch (err) {
      alert(err.response?.data?.message || "Refund execution rejected by boundary validations.");
    } finally {
      setRefundingTxnId(null);
    }
  };

  const handleLogoutClick = async (e) => {
    e.preventDefault();
    if (isLoggingOut) return;
    await logout();
  };

  const canModifyField = !isImpersonating && (kycStatus === 'DRAFT' || kycStatus === 'REJECTED');

  return (
    <div style={STYLES.wrapper}>
      <div style={STYLES.sidebar}>
        <div style={STYLES.sidebarTop}>
          <h3 style={{ color: '#fff', marginBottom: '5px' }}>ToPay Enterprise</h3>
          <p style={{ color: '#8892b0', fontSize: '12px', marginBottom: '40px' }}>Merchant Portal Pipeline v1.2</p>
          <span style={STYLES.navLink(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>Overview Dashboard</span>
          <span style={STYLES.navLink(activeTab === 'kyc')} onClick={() => setActiveTab('kyc')}>KYC Onboarding</span>
          <span style={STYLES.navLink(activeTab === 'transactions')} onClick={() => setActiveTab('transactions')}>Transactions API</span>
        </div>

        <div>
          <button type="button" style={STYLES.sidebarLogoutBtn(isLoggingOut)} disabled={isLoggingOut} onClick={handleLogoutClick}>
            Secure Logout
          </button>
        </div>
      </div>

      <div style={STYLES.main}>
        {isImpersonating && (
          <div style={STYLES.impersonationBanner}>
            <span>⚠️ <b>Impersonation Active:</b> You are viewing this dashboard layout under read-only administrative proxy visibility rules.</span>
            <button style={{ ...STYLES.btn, backgroundColor: '#856404', padding: '6px 14px', fontSize: '13px' }} onClick={stopImpersonation}>
              Exit Proxy
            </button>
          </div>
        )}

        {kycError && <div style={STYLES.errorBox}>⚠️ {kycError}</div>}
        {kycSuccessMessage && <div style={STYLES.successBox}>✅ {kycSuccessMessage}</div>}

        {activeTab === 'overview' && (
          <div>
            <h2>Welcome back, {user?.email || 'Partner Account'}</h2>
            <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
              <div style={{ ...STYLES.card, flex: 1 }}>
                <h4 style={{ color: '#718096', margin: 0 }}>Today's Volume</h4>
                <h2 style={{ marginTop: '10px', color: '#0a192f' }}>
                  {/* ✅ FIXED: Bound safely onto metrics.todaysVolume keys */}
                  ₹{metrics.todaysVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
              <div style={{ ...STYLES.card, flex: 1 }}>
                <h4 style={{ color: '#718096', margin: 0 }}>Success Settlement Ratio</h4>
                <h2 style={{ marginTop: '10px', color: '#2f855a' }}>
                  {/* ✅ FIXED: Bound safely onto metrics.successRatePercentage keys */}
                  {metrics.successRatePercentage}%
                </h2>
              </div>
              <div style={{ ...STYLES.card, flex: 1 }}>
                <h4 style={{ color: '#718096', margin: 0 }}>Global KYC Status</h4>
                <div style={{ marginTop: '15px' }}><span style={STYLES.badge(kycStatus)}>{kycStatus}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div style={STYLES.card}>
            <h2>Corporate Underwriting & Verification Board</h2>
            <p style={{ color: '#718096' }}>Status Trace: <span style={STYLES.badge(kycStatus)}>{kycStatus}</span></p>
            
            <div style={{ display: 'flex', marginTop: '25px', marginBottom: '30px' }}>
              <div style={STYLES.stepIndicator(kycStep === 1)}>1. Profile</div>
              <div style={STYLES.stepIndicator(kycStep === 2)}>2. Attachments</div>
              <div style={STYLES.stepIndicator(kycStep === 3)}>3. Settlement</div>
              <div style={STYLES.stepIndicator(kycStep === 4)}>4. Execution</div>
            </div>

            {kycStep === 1 && (
              <form onSubmit={handleStep1Submit}>
                <h3>Step 1: Core Institutional Metadata</h3>
                <div style={{ marginBottom: '15px' }}>
                  <label>Legal Incorporated Entity Name</label>
                  <input type="text" style={STYLES.input} disabled={!canModifyField} value={businessName} onChange={e => setBusinessName(e.target.value)} required />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Company Structural Ownership Model</label>
                  <select style={STYLES.select} disabled={!canModifyField} value={companyType} onChange={e => setCompanyType(e.target.value)}>
                    <option value="PRIVATE_LIMITED">Private Limited (Pvt Ltd)</option>
                    <option value="PROPRIETORSHIP">Sole Proprietorship</option>
                    <option value="PARTNERSHIP">Registered Partnership Firm</option>
                  </select>
                </div>
                {!isImpersonating && <button type="submit" style={{ ...STYLES.btn, marginTop: '15px' }}>Save & Advance</button>}
              </form>
            )}

            {kycStep === 2 && (
              <div>
                <h3>Step 2: Resource Attachment Scanning Vault</h3>
                <div style={{ ...STYLES.card, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4>Corporate PAN Document Entry</h4>
                    <p style={{ fontSize: '13px', color: '#718096' }}>Verification: <span style={STYLES.badge(panUploadStatus)}>{panUploadStatus}</span></p>
                  </div>
                  <div>
                    <input type="file" accept=".pdf,.jpeg,.png" disabled={isImpersonating || (kycStatus === 'REJECTED' && panUploadStatus === 'ACCEPTED')} onChange={e => handleDocumentUpload('PAN', e.target.files[0])} />
                  </div>
                </div>

                <div style={{ ...STYLES.card, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4>Institutional GST Verification Certificate</h4>
                    <p style={{ fontSize: '13px', color: '#718096' }}>Verification: <span style={STYLES.badge(gstUploadStatus)}>{gstUploadStatus}</span></p>
                  </div>
                  <div>
                    <input type="file" accept=".pdf,.jpeg,.png" disabled={isImpersonating || (kycStatus === 'REJECTED' && gstUploadStatus === 'ACCEPTED')} onChange={e => handleDocumentUpload('GST', e.target.files[0])} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="button" style={{ ...STYLES.btn, backgroundColor: '#718096' }} onClick={() => setKycStep(1)}>Back</button>
                  <button type="button" style={STYLES.btn} onClick={() => setKycStep(3)}>Proceed to Settlement Step</button>
                </div>
              </div>
            )}

            {kycStep === 3 && (
              <form onSubmit={handleStep3Submit}>
                <h3>Step 3: Settlement Escrow Allocation Links</h3>
                <div style={{ marginBottom: '15px' }}>
                  <label>Settlement Bank Account Number</label>
                  <input type="text" style={STYLES.input} disabled={!canModifyField} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>IFSC Identifier Token Code</label>
                  <input type="text" style={STYLES.input} disabled={!canModifyField} placeholder="HDFC0000123" value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} required />
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                  <button type="button" style={{ ...STYLES.btn, backgroundColor: '#718096' }} onClick={() => setKycStep(2)}>Back</button>
                  {!isImpersonating && <button type="submit" style={STYLES.btn}>Validate Routing Bounds</button>}
                </div>
              </form>
            )}

            {kycStep === 4 && (
              <form onSubmit={handleStep4Finalize}>
                <h3>Step 4: Director Details Declaration</h3>
                <div style={{ marginBottom: '20px' }}>
                  <label>Executive Board Authorized Signatories</label>
                  <input type="text" style={STYLES.input} disabled={!canModifyField} placeholder="Jane Doe, John Smith" value={directorNames} onChange={e => setDirectorNames(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="button" style={{ ...STYLES.btn, backgroundColor: '#718096' }} onClick={() => setKycStep(3)}>Back</button>
                  {!isImpersonating && (
                    <button type="submit" style={{ ...STYLES.btn, backgroundColor: '#2f855a' }} disabled={kycStatus === 'SUBMITTED' || kycStatus === 'APPROVED'}>
                      Freeze State & Submit
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div style={STYLES.card}>
            <h2>Core Ledger Verification Registers Engine</h2>
            
            <div style={STYLES.filterGrid}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a5568' }}>Status Filter</label>
                <select style={{ ...STYLES.select, marginTop: '2px', width: '160px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                  <option value="">ALL SETTLEMENTS</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a5568' }}>Method Mode</label>
                <select style={{ ...STYLES.select, marginTop: '2px', width: '160px' }} value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(0); }}>
                  <option value="">ALL MODES</option>
                  <option value="UPI">UPI ROUTING</option>
                  <option value="CARD">CREDIT/DEBIT</option>
                  <option value="NETBANKING">NET BANKING</option>
                </select>
              </div>
            </div>

            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={STYLES.th}>Transaction Hash</th>
                  <th style={STYLES.th}>Clearing Amount</th>
                  <th style={STYLES.th}>Masked Customer PII</th>
                  <th style={STYLES.th}>Ledger Status</th>
                  <th style={STYLES.th}>Operations Execution</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ ...STYLES.td, textAlign: 'center', color: '#718096', padding: '30px' }}>
                      No live transaction records located matching current filter criteria.
                    </td>
                  </tr>
                ) : (
                  transactions.map(txn => {
                    // ✅ FIXED: Support standard backend model key variables ('transactionId', 'maskingVpa') natively
                    const currentTxnId = txn.transactionId || txn.id;
                    const customerPii = txn.maskingVpa || txn.customer || 'N/A';
                    
                    return (
                      <tr key={currentTxnId}>
                        <td style={{ ...STYLES.td, fontFamily: 'monospace', fontWeight: 'bold' }}>{currentTxnId}</td>
                        <td style={STYLES.td}>₹{Number(txn.amount || 0).toFixed(2)}</td>
                        <td style={{ ...STYLES.td, color: '#4a5568' }}>{customerPii}</td>
                        <td style={STYLES.td}><span style={STYLES.badge(txn.status)}>{txn.status}</span></td>
                        <td style={STYLES.td}>
                          <button 
                            style={{ ...STYLES.btn, backgroundColor: '#e53e3e', padding: '6px 14px', fontSize: '13px', opacity: (isImpersonating || txn.status === 'FAILED') ? 0.6 : 1, cursor: (isImpersonating || txn.status === 'FAILED') ? 'not-allowed' : 'pointer' }}
                            disabled={refundingTxnId === currentTxnId || txn.status === 'FAILED' || isImpersonating} 
                            onClick={() => handleRefund(currentTxnId)}
                          >
                            {refundingTxnId === currentTxnId ? 'Processing...' : 'Issue Refund'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* DYNAMIC SERVER-DRIVEN PAGINATION CONTROLS */}
            <div style={STYLES.paginationContainer}>
              <button 
                style={{ ...STYLES.btn, backgroundColor: '#718096' }} 
                disabled={page === 0} 
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                Previous
              </button>
              
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                Page {page + 1}
              </span>
              
              <button 
                style={STYLES.btn} 
                disabled={transactions.length < 10 || page >= totalPages - 1} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;