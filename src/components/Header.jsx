import React from 'react';
import { triggerHaptic } from '../utils/haptics';
import { FILTER_OPTIONS, metaFor } from '../config/partners';

export default function Header({
  title,
  partnerFilter,
  setPartnerFilter,
  partner,
  onOpenSettings,
  profiles,
  onOpenData,
  isOnline,
}) {
  const meta = metaFor(partner?.name);
  const avatarBg = meta.color;
  const initials = partner?.initials || meta.initials;
  const avatarUrl = profiles?.[partner?.name]?.avatarUrl;
  const filterLabel = partnerFilter === 'all' ? 'All partners' : partnerFilter;

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="header-titles">
          <h1 className="header-title">{title}</h1>
          <span className="header-context" aria-live="polite">
            Viewing {filterLabel}
          </span>
        </div>
        <div className="header-actions">
          <span
            className={`header-net-pill ${isOnline ? 'is-online' : 'is-offline'}`}
            title={isOnline ? 'Synced with the cloud' : 'Offline — changes are saved on this device'}
          >
            <span className="header-net-dot" />
            {isOnline ? 'Live' : 'Offline'}
          </span>

          {onOpenData && (
            <button
              type="button"
              className="header-icon-btn"
              onClick={() => {
                triggerHaptic('light');
                onOpenData();
              }}
              aria-label="Open data and sync status"
              title="Data & sync"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <ellipse cx="12" cy="5" rx="8" ry="3" />
                <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
                <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
              </svg>
            </button>
          )}

        <button
          type="button"
          className="user-avatar-btn"
          style={{ background: avatarBg }}
          onClick={() => {
            triggerHaptic('medium');
            if (onOpenSettings) onOpenSettings();
          }}
          aria-label="Open settings and profile"
          title={`Active: ${partner?.name ?? 'Unknown'} — tap for Settings & Profile`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={partner?.name} className="header-avatar-img" />
          ) : (
            initials
          )}
        </button>
        </div>
      </div>

      <div className="filter-chips">
        {FILTER_OPTIONS.map(({ label, shortLabel, value, dot }) => {
          const isActive = partnerFilter === value;
          const isCurrentUser = partner?.name === value;
          return (
            <button
              key={value}
              type="button"
              className={`filter-chip${isActive ? ' active' : ''}${isCurrentUser ? ' is-me' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setPartnerFilter(value);
              }}
              aria-pressed={isActive}
              title={isCurrentUser ? `${label} (Your workspace)` : `Filter by ${label}`}
            >
              {dot && (
                <span
                  className="filter-chip-dot"
                  style={{
                    background: dot,
                    boxShadow: isActive ? `0 0 6px ${dot}` : 'none',
                  }}
                />
              )}
              {/* Both render; the stylesheet picks one per breakpoint, so a chip
                  whose short and full labels match must still emit both. */}
              <span className="chip-label-full">{label}</span>
              <span className="chip-label-short">{shortLabel}</span>
              {isCurrentUser && <span className="filter-chip-you">You</span>}
            </button>
          );
        })}
      </div>
    </header>
  );
}
