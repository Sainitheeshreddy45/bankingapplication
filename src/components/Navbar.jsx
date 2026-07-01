import React, { useContext, useMemo } from 'react';
import { AuthContext } from './AuthContext';

const STYLES = {
  navContainer: { height: '70px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', width: '100%' },
  brandSection: { display: 'flex', alignItems: 'center', gap: '12px' },
  brandName: { fontSize: '18px', fontWeight: '700', color: '#0a192f', letterSpacing: '-0.3px' },
  actionSection: { display: 'flex', alignItems: 'center', gap: '24px' },
  profileMetadata: { textAlign: 'right' },
  userEmail: { fontSize: '14px', fontWeight: '600', color: '#0a192f', margin: 0 },
  userRole: { fontSize: '11px', color: '#718096', margin: '2px 0 0 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  btnGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  exitImpersonationBtn: { padding: '8px 16px', backgroundColor: '#fffaf0', color: '#dd6b20', border: '1px solid #fbd38d', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px', outline: 'none' },
  logoutBtn: (disabled) => ({ padding: '8px 16px', backgroundColor: '#ffffff', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px', outline: 'none' })
};

const Navbar = () => {
  // 🌟 FIX: Injected 'isLoggingOut' track handler from AuthContext
  const { user, isImpersonating, logout, isLoggingOut, stopImpersonation } = useContext(AuthContext);

  const handleLogoutClick = async (e) => {
    e.preventDefault();
    if (logout && !isLoggingOut) {
      await logout();
    }
  };

  const handleExitImpersonation = async (e) => {
    e.preventDefault();
    try {
      if (stopImpersonation) {
        await stopImpersonation();
      }
    } catch (error) {
      console.error("Could not exit impersonation context gracefully:", error);
    }
  };

  const dynamicEnvironmentBadgeStyle = useMemo(() => ({
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    backgroundColor: isImpersonating ? '#fff5f5' : '#e6f0fa',
    color: isImpersonating ? '#c53030' : '#0066b2',
    border: isImpersonating ? '1px solid #fed7d7' : '1px solid #cee0f5',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }), [isImpersonating]);

  return (
    <nav style={STYLES.navContainer}>
      <div style={STYLES.brandSection}>
        <span style={STYLES.brandName}>ToPay Enterprise</span>
        <span style={dynamicEnvironmentBadgeStyle}>
          {isImpersonating ? <>🔴 READ-ONLY AUDIT MODE</> : <>🛡️ SECURE ENVIRONMENT</>}
        </span>
      </div>

      <div style={STYLES.actionSection}>
        <div style={STYLES.profileMetadata}>
          <p style={STYLES.userEmail}>{user?.email || 'anonymous@platform.com'}</p>
          <p style={STYLES.userRole}>
            {user?.role ? user.role.replace(/_/g, ' ') : 'UNVERIFIED PROFILE'}
          </p>
        </div>

        <div style={STYLES.btnGroup}>
          {isImpersonating && (
            <button
              type="button"
              style={STYLES.exitImpersonationBtn}
              onClick={handleExitImpersonation}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fffaf0';
                e.currentTarget.style.borderColor = '#dd6b20';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fffaf0';
                e.currentTarget.style.borderColor = '#fbd38d';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              </svg>
              Exit Impersonation
            </button>
          )}

          {/* 🌟 FIX: Transformed button to pass disabled states dynamically */}
          <button 
            type="button"
            disabled={isLoggingOut}
            style={STYLES.logoutBtn(isLoggingOut)} 
            onClick={handleLogoutClick}
            onMouseEnter={(e) => {
              if (!isLoggingOut) {
                e.currentTarget.style.backgroundColor = '#fff5f5';
                e.currentTarget.style.borderColor = '#e53e3e';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoggingOut) {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#fed7d7';
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {isLoggingOut ? 'Terminating...' : 'Log Out'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;