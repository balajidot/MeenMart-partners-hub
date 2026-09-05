import React from 'react';
import { PARTNERS } from '../config/partners';

export default function AuthGate({ status, error, onSignIn }) {
  if (status === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand-badge" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6Z" />
              <path d="M18 12c0-1.66-1.34-3-3-3s-3 1.34-3 3 1.34 3 3 3 3-1.34 3-3Z" />
              <path d="M2 16l4.5-4L2 8" />
            </svg>
          </div>
          <div className="auth-title">
            MeenMart <span className="hub-pill">OPS HUB</span>
          </div>
          <div className="auth-portal-tag">மீன்மார்ட் பங்குதாரர்கள் தளம்</div>
          <p className="auth-sub">சரிபார்க்கிறது... தயவுசெய்து காத்திருக்கவும்</p>
          <div className="auth-spinner" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-brand-badge" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6Z" />
              <path d="M18 12c0-1.66-1.34-3-3-3s-3 1.34-3 3 1.34 3 3 3 3-1.34 3-3Z" />
              <path d="M2 16l4.5-4L2 8" />
            </svg>
          </div>
          <div className="auth-title">
            MeenMart <span className="hub-pill">OPS HUB</span>
          </div>
          <div className="auth-portal-tag">மீன்மார்ட் பங்குதாரர்கள் தளம்</div>
          <p className="auth-sub">
            உள்நுழைய உங்கள் பதிவு செய்யப்பட்ட Google கணக்கைப் பயன்படுத்தவும்
          </p>
        </div>

        {/* Authorized Co-Founders Grid */}
        <div className="auth-founders-box">
          <div className="auth-founders-header">
            <span className="auth-shield-icon">🛡️</span>
            <span>அனுமதிக்கப்பட்ட நிறுவனர்கள் (3 Co-Founders)</span>
          </div>
          <div className="auth-founders-grid">
            {PARTNERS.map((p) => {
              const key = p.name.toLowerCase();
              return (
                <div key={p.name} className={`auth-founder-pill ${key}`}>
                  <span className="auth-founder-emoji">{p.avatar}</span>
                  <div className="auth-founder-meta">
                    <span className="auth-founder-name">{p.name}</span>
                    <span className="auth-founder-role">{p.role}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error">
            <span className="auth-error-icon">⚠️</span>
            <div className="auth-error-text">{error}</div>
          </div>
        )}

        {/* Google Sign In CTA Button */}
        <button className="auth-google-btn" onClick={onSignIn} type="button">
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Security / Privacy Warning */}
        <div className="auth-footer">
          <div className="auth-security-badge">
            <span className="auth-lock-dot">🔒</span>
            <span>3 நிறுவனர்களுக்கு மட்டுமே அனுமதி · பிறருக்கு அனுமதி இல்லை</span>
          </div>
        </div>
      </div>
    </div>
  );
}
