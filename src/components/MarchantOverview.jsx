import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from './apiClient';

const STYLES = {
  wrapper: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0a192f', color: '#8892b0', fontFamily: 'sans-serif', boxSizing: 'border-box' },
  container: { display: 'flex', flexDirection: 'column', flex: 1, padding: '40px', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  header: { borderBottom: '1px solid #172a45', paddingBottom: '20px', marginBottom: '30px' },
  contentArea: { display: 'flex', flex: 1, gap: '25px', alignItems: 'stretch' },
  mainPane: { flex: 1, backgroundColor: '#112240', padding: '30px', borderRadius: '8px', border: '1px solid #233554', display: 'flex', flexDirection: 'column' },
  codeWrapper: { flex: 1, color: '#64ffda', fontSize: '13px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'Courier, monospace', margin: 0, backgroundColor: '#0a192f', padding: '20px', borderRadius: '4px', border: '1px solid #172a45' },
  loadingContainer: { minHeight: '100vh', backgroundColor: '#0a192f', color: '#0066b2', padding: '40px', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  errorContainer: { minHeight: '100vh', backgroundColor: '#0a192f', color: '#ff6b6b', padding: '40px', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

const MerchantOverviewTab = () => {
  const { merchantId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMerchantDetails = async () => {
      try {
        const res = await apiClient.get(`/admin/management/merchants/${merchantId}/summary`);
        if (isMounted) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load merchant snapshot scope mapping:", err);
        if (isMounted) {
          setError(err.response?.data?.message || "Unauthorized or invalid data structural mapping layout.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (merchantId) {
      fetchMerchantDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  if (loading) {
    return <div style={STYLES.loadingContainer}>🛡️ Loading secure merchant operational dashboard overview dataset parameters...</div>;
  }
  
  if (error) {
    return <div style={STYLES.errorContainer}>⚠️ Context Error Failure: {error}</div>;
  }

  return (
    <div style={STYLES.wrapper}>
      <div style={STYLES.container}>
        <header style={STYLES.header}>
          <h1 style={{ color: '#64ffda', margin: '0 0 5px 0', fontSize: '28px', fontWeight: '700' }}>Admin Console Operations: Merchant Insight Workspace</h1>
          <p style={{ margin: 0, fontSize: '14px' }}>Isolating System Workspace Profile Target Identifier: <strong style={{ color: '#fff' }}>{merchantId}</strong></p>
        </header>

        <div style={STYLES.contentArea}>
          <div style={STYLES.mainPane}>
            <h3 style={{ color: '#fff', marginTop: 0, borderBottom: '1px solid #233554', paddingBottom: '12px', fontSize: '18px' }}>Business Realtime Data Metrics Summary</h3>
            <pre style={STYLES.codeWrapper}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantOverviewTab;