import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import bgloginimg from '../assets/login-bg.jpg';
import { AuthContext } from './AuthContext';
import apiClient from './apiClient';

const getNormalizedRole = (roleString) => {
  if (!roleString) return '';
  return roleString.replace('ROLE_', '').toUpperCase().trim();
};

const PASSWORD_REGEX = /^.{8,}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const STYLES = {
  container: { minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  card: { backgroundColor: '#ffffff', borderRadius: '8px', padding: '40px', width: '100%', maxWidth: '450px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)', boxSizing: 'border-box' },
  title: { color: '#0066b2', textAlign: 'center', fontSize: '24px', margin: '0 0 15px 0', fontWeight: '600' },
  subtitle: { color: '#666666', fontSize: '14px', textAlign: 'center', marginBottom: '20px', lineHeight: '1.4' },
  errorBox: { backgroundColor: '#fff5f5', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: '4px', padding: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '500', lineHeight: '1.5' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', color: '#333333', fontSize: '14px', textAlign: 'left', fontWeight: '500' },
  input: { width: '100%', padding: '12px', backgroundColor: '#ffffff', color: '#333333', border: '1px solid #cccccc', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  totpInput: { width: '100%', padding: '15px', backgroundColor: '#f8f9fa', color: '#333333', border: '2px solid #0066b2', borderRadius: '6px', fontSize: '22px', letterSpacing: '8px', textAlign: 'center', boxSizing: 'border-box', outline: 'none', fontWeight: '700' },
  select: { width: '100%', padding: '12px', backgroundColor: '#ffffff', color: '#333333', border: '1px solid #cccccc', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' },
  helperTextContainer: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '10px' },
  linkText: { color: '#0066b2', cursor: 'pointer', textDecoration: 'none', fontWeight: '500' },
  buttonContainer: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px' },
  submitBtn: { padding: '12px 24px', backgroundColor: '#e2e8f0', color: '#94a3b8', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'not-allowed', width: '100%', fontWeight: '600', transition: 'all 0.2s' },
  submitBtnActive: { backgroundColor: '#0066b2', color: '#ffffff', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0, 102, 178, 0.2)' },
  loadingSpinner: { color: '#666666', textAlign: 'center', fontSize: '16px', fontWeight: '500' }
};

const Login = () => {
  const { user, login, isAuthenticating } = useContext(AuthContext);

  const [email, setEmail] = useState(() => sessionStorage.getItem('auth_pending_email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [targetRole, setTargetRole] = useState(() => sessionStorage.getItem('auth_pending_role') || 'ROLE_MERCHANT_OWNER');
  const [totpCode, setTotpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [step, setStep] = useState(() => sessionStorage.getItem('auth_login_step') || 'login'); 
  const [submitting, setSubmitting] = useState(false);
  
  const [tempUserPayload, setTempUserPayload] = useState(() => {
    const saved = sessionStorage.getItem('auth_temp_user');
    if (saved) return JSON.parse(saved);
    return null;
  });

  const navigate = useNavigate();
  const location = useLocation(); 

  const dynamicBackgroundStyle = useMemo(() => ({
    ...STYLES.container,
    backgroundImage: `linear-gradient(rgba(10, 25, 47, 0.6), rgba(10, 25, 47, 0.8)), url(${bgloginimg})`
  }), []);

  useEffect(() => {
    if (isAuthenticating) return;

    if (user?.role && location.pathname === '/login') {
      const normalizedRole = getNormalizedRole(user.role);
      const targetDestination = ['SUPER_ADMIN', 'OPS_ADMIN'].includes(normalizedRole)
        ? '/admin/dashboard'
        : '/merchant/dashboard';

      navigate(targetDestination, { replace: true });
    }
  }, [user, isAuthenticating, navigate, location.pathname]);

  useEffect(() => {
    if (location.state?.sessionExpired) {
      setErrorMessage('Your secure operational session has expired. Please re-authenticate.');
      handleResetToLoginStep();
      navigate('/login', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage('');
    setSubmitting(true);
    
    try {
      const res = await apiClient.post('/auth/login', { 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      if (res.data?.user) {
        const userPayload = res.data.user;
        setTempUserPayload(userPayload);
        
        // Save to session storage so refresh during 2FA prompt doesn't lose position
        sessionStorage.setItem('auth_login_step', '2fa');
        sessionStorage.setItem('auth_temp_user', JSON.stringify(userPayload));
        
        setStep('2fa');
        setPassword(''); 
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Authentication failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTwoFactorVerify = (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage('');

    const isStrictSixDigit = /^\d{6}$/.test(totpCode);
    if (!isStrictSixDigit) {
      setErrorMessage('Security validation error: Code must be exactly 6 digits without alphabets.');
      return;
    }

    if (!tempUserPayload) {
      setErrorMessage('Authentication session context missing. Please try logging in again.');
      handleResetToLoginStep();
      return;
    }

    setSubmitting(true);

    // Commit authentication payload right away to Global Context state
    login(tempUserPayload);

    const normalizedRole = getNormalizedRole(tempUserPayload.role);
    const targetDestination = ['SUPER_ADMIN', 'OPS_ADMIN'].includes(normalizedRole)
      ? '/admin/dashboard'
      : '/merchant/dashboard';

    sessionStorage.clear();
    setSubmitting(false);
    navigate(targetDestination, { replace: true });
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage("Password verification error: Confirmation mismatch.");
      return;
    }
    
    setSubmitting(true);
    
    try {
      await apiClient.post('/auth/signup', { 
        email: email.trim().toLowerCase(), 
        password,
        targetRole 
      });
      
      alert(`Account configured successfully for [${targetRole}]. Proceeding to login.`);
      handleResetToLoginStep();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Registration rejected due to invalid parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetToLoginStep = () => {
    sessionStorage.clear();
    setTempUserPayload(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setTotpCode('');
    setErrorMessage('');
    setStep('login');
  };

  const isLoginFormValid = EMAIL_REGEX.test(email) && password.length > 0 && !submitting;
  const isSignUpFormValid = EMAIL_REGEX.test(email) && PASSWORD_REGEX.test(password) && password === confirmPassword && !submitting;
  const isTotpValid = totpCode.length === 6 && /^\d+$/.test(totpCode) && !submitting;

  if (isAuthenticating || (user && user.role)) {
    return (
      <div style={dynamicBackgroundStyle}>
        <div style={STYLES.card}>
          <div style={STYLES.loadingSpinner}>🛡️ Verifying secure session context metrics...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={dynamicBackgroundStyle}>
      <div style={STYLES.card}>
        <h2 style={STYLES.title}>
          {step === 'signup' ? 'Create Account' : step === '2fa' ? 'Security Verification' : 'Log In'}
        </h2>
        <p style={STYLES.subtitle}>Secure Transaction Management Platform Engine.</p>

        {errorMessage && <div style={STYLES.errorBox}>⚠️ {errorMessage}</div>}

        {step === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Email Address</label>
              <input type="email" autoComplete="username" style={STYLES.input} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Password</label>
              <input type="password" autoComplete="current-password" style={STYLES.input} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div style={STYLES.helperTextContainer}>
              <span style={STYLES.linkText}>Forgot Password?</span>
              <span>New User? <span style={STYLES.linkText} onClick={() => { setStep('signup'); setErrorMessage(''); setPassword(''); }}>Sign up</span></span>
            </div>
            <div style={STYLES.buttonContainer}>
              <button type="submit" disabled={!isLoginFormValid} style={{...STYLES.submitBtn, ...(isLoginFormValid ? STYLES.submitBtnActive : {})}}>
                {submitting ? 'Connecting...' : 'Log In'}
              </button>
            </div>
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSignUpSubmit}>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Email Address</label>
              <input type="email" style={STYLES.input} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Assign System Role</label>
              <select style={{ ...STYLES.select }} value={targetRole} onChange={(e) => setTargetRole(e.target.value)} required>
                <option value="ROLE_MERCHANT_OWNER">Merchant Owner</option>
                <option value="ROLE_RISK_ANALYST">Risk Analyst</option>
                <option value="ROLE_SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Password</label>
              <input type="password" autoComplete="new-password" placeholder="Min 12 chars (A-z, 0-9, symbol)" style={STYLES.input} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Confirm Password</label>
              <input type="password" autoComplete="new-password" style={STYLES.input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <div style={STYLES.helperTextContainer}>
              <span>Already have an account? <span style={STYLES.linkText} onClick={() => { setStep('login'); setErrorMessage(''); setPassword(''); setConfirmPassword(''); }}>Log In</span></span>
            </div>
            <div style={STYLES.buttonContainer}>
              <button type="submit" disabled={!isSignUpFormValid} style={{...STYLES.submitBtn, ...(isSignUpFormValid ? STYLES.submitBtnActive : {})}}>
                {submitting ? 'Registering...' : 'Sign Up'}
              </button>
            </div>
          </form>
        )}

        {step === '2fa' && (
          <form onSubmit={handleTwoFactorVerify}>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Two-Factor Security Code</label>
              <input 
                type="text" 
                maxLength="6" 
                placeholder="000000" 
                autoFocus 
                style={STYLES.totpInput} 
                value={totpCode} 
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} 
                required 
              />
            </div>
            <div style={STYLES.buttonContainer}>
              <button type="submit" disabled={!isTotpValid} style={{...STYLES.submitBtn, ...(isTotpValid ? STYLES.submitBtnActive : {})}}>
                Verify & Connect
              </button>
            </div>
            <div style={{...STYLES.helperTextContainer, justifyContent: 'center', marginTop: '20px'}}>
              <span style={STYLES.linkText} onClick={handleResetToLoginStep}>← Cancel and return to Login</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;