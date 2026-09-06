import React, { useRef, useState } from 'react';
import { PARTNER_NAMES } from '../../config/partners';
import { compressImage } from '../../utils/calculations';
import { triggerHaptic } from '../../utils/haptics';

const PARTNER_ROLES = {
  Balaji: 'Tech & Product',
  Nagoor: 'Procure & Pack',
  JP:     'Delivery & Sales',
};

const PARTNER_COLORS = {
  Balaji: '#1B2A5B',
  Nagoor: '#0F9E8E',
  JP:     '#B4531F',
};

const PARTNER_INITIALS = {
  Balaji: 'BA',
  Nagoor: 'NA',
  JP:     'JP',
};

export default function SettingsModal({
  isOpen,
  onClose,
  partner,
  onSwitchPartner,
  profiles,
  onUpdateProfilePhoto,
  onlinePartners,
  onSignOut,
  onWipeAll,
  isOnline,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const currentName = partner?.name || 'Balaji';
  const role = PARTNER_ROLES[currentName] || partner?.role || 'Co-Founder';
  const color = PARTNER_COLORS[currentName] || '#16224A';
  const initials = PARTNER_INITIALS[currentName] || currentName.slice(0, 2).toUpperCase();
  const avatarUrl = profiles?.[currentName]?.avatarUrl;
  const isUserOnline = !!onlinePartners?.[currentName];

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    triggerHaptic('medium');
    try {
      const compressed = await compressImage(file);
      onUpdateProfilePhoto(currentName, compressed);
      triggerHaptic('success');
    } catch (err) {
      console.error('Failed to compress profile picture:', err);
      triggerHaptic('warning');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet settings-sheet">
        <div className="sheet-handle" />

        {/* Modal Header with Title & ✕ Close button */}
        <div className="sheet-header-row">
          <div className="sheet-title" style={{ margin: 0 }}>Settings & Profile</div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Partner Profile Hero Card */}
        <div className="profile-hero-card">
          <div className="profile-avatar-container">
            <div
              className="profile-avatar-display"
              style={{ backgroundColor: color }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={currentName} className="profile-avatar-img" />
              ) : (
                <span className="profile-avatar-initials">{initials}</span>
              )}
            </div>

            {/* Camera Upload Overlay Button */}
            <button
              type="button"
              className="profile-photo-change-btn"
              onClick={() => {
                triggerHaptic('light');
                fileInputRef.current?.click();
              }}
              title="Change Profile Photo"
              disabled={uploading}
            >
              {uploading ? '⏳' : '📷'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="profile-details">
            <div className="profile-name-row">
              <h3 className="profile-name">{currentName}</h3>
              <span className={`profile-live-pill ${isUserOnline ? 'online' : 'offline'}`}>
                <span className="profile-live-dot" />
                {isUserOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="profile-role">{role}</div>
            <button
              type="button"
              className="profile-photo-text-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? 'Photo-va maathu' : '+ Profile Photo Podu'}
            </button>
          </div>
        </div>

        {/* Switch Active Partner */}
        <div className="sheet-field-label" style={{ marginTop: '18px' }}>
          Switch Active Partner (Co-Founders)
        </div>
        <div className="sheet-option-chips" style={{ marginBottom: '18px' }}>
          {PARTNER_NAMES.map((name) => {
            const isSelected = name === currentName;
            const isPartnerOnline = !!onlinePartners?.[name];
            return (
              <button
                key={name}
                type="button"
                className={`sheet-option-chip partner-select-chip ${isSelected ? 'active-navy' : ''}`}
                onClick={() => {
                  triggerHaptic('medium');
                  onSwitchPartner?.(name);
                }}
              >
                <span
                  className="partner-chip-dot"
                  style={{ backgroundColor: isPartnerOnline ? '#10B981' : '#94A3B8' }}
                  title={isPartnerOnline ? 'Online' : 'Offline'}
                />
                <span>{name}</span>
                {isSelected && <span style={{ fontSize: '10px', opacity: 0.8 }}> (Active)</span>}
              </button>
            );
          })}
        </div>

        {/* System & Connection Status Card */}
        <div className="settings-section-card">
          <div className="settings-row">
            <div className="settings-row-label">
              <span>Firebase Realtime Sync</span>
              <span className="settings-row-sub">Asia-Southeast (Live cluster)</span>
            </div>
            <span className={`sync-status-badge ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? '🟢 Connected' : '🔴 Offline'}
            </span>
          </div>

          <div className="settings-row">
            <div className="settings-row-label">
              <span>PWA App Status</span>
              <span className="settings-row-sub">MeenMart Partners Hub v2.2</span>
            </div>
            <span className="sync-status-badge ready">⚡ PWA Ready</span>
          </div>
        </div>

        {/* Danger zone / sign out */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          {onWipeAll && (
            <button
              type="button"
              className="settings-action-btn secondary"
              onClick={() => {
                if (window.confirm('Reset local cache data? Cloud data will re-sync.')) {
                  triggerHaptic('warning');
                  onWipeAll();
                  onClose();
                }
              }}
            >
              Reset Cache
            </button>
          )}

          {onSignOut && (
            <button
              type="button"
              className="settings-action-btn danger"
              onClick={() => {
                triggerHaptic('warning');
                onClose();
                onSignOut();
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </>
  );
}
