import React from 'react';
import Icon from './Icons';

const NAV_ITEMS = [
  { id: 'tasks',     label: 'பணிகள் (Tasks)',       icon: 'tasks',     hasBadge: true },
  { id: 'work',      label: 'உழைப்பு (Worklogs)',   icon: 'work' },
  { id: 'chat',      label: 'அரட்டை (Team Chat)',  icon: 'chat' },
  { id: 'finance',   label: 'நிதி (Finance)',       icon: 'finance' },
  { id: 'analytics', label: 'பகுப்பாய்வு (Stats)', icon: 'analytics' },
];

const FOUNDERS = [
  { name: 'Balaji', role: 'Tech',     icon: 'laptop', key: 'balaji' },
  { name: 'Nagoor', role: 'Procure',  icon: 'fish',   key: 'nagoor' },
  { name: 'JP',     role: 'Delivery', icon: 'bike',   key: 'jp' },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  partnerFilter,
  setPartnerFilter,
  onOpenTask,
  user,
  partner,
  onSignOut,
  onOpenData,
  onShareWA,
}) {
  const initial = (partner?.name || user?.displayName || 'U').charAt(0).toUpperCase();

  return (
    <aside className="app-sidebar" aria-label="Desktop Navigation">
      {/* Google Workspace Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Icon name="fish" size={22} color="var(--accent)" />
        </div>
        <div className="sidebar-brand-title">
          <span className="brand-txt">MeenMart</span>
          <span className="brand-sub-badge">Partners</span>
        </div>
      </div>

      {/* Google "+ New" Pill CTA */}
      <div className="sidebar-cta-wrap">
        <button className="sidebar-add-btn" onClick={onOpenTask} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
          </svg>
          <span>புதிய பணி</span>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">செயல்பாடுகள்</div>
        {NAV_ITEMS.map(({ id, label, icon, hasBadge }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
              type="button"
            >
              <span className="nav-item-icon"><Icon name={icon} size={16} /></span>
              <span className="nav-item-label">{label}</span>
              {hasBadge && pendingCount > 0 && (
                <span className="nav-item-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </button>
          );
        })}

        {/* Founders Filter Section */}
        <div className="sidebar-section-label" style={{ marginTop: 24 }}>
          பங்குதாரர்கள்
        </div>
        <button
          className={`sidebar-filter-item ${partnerFilter === 'all' ? 'active' : ''}`}
          onClick={() => setPartnerFilter('all')}
          type="button"
        >
          <span className="filter-dot all" />
          <span>அனைத்துப் பணிகள்</span>
        </button>

        {FOUNDERS.map(({ name, role, icon, key }) => {
          const isActive = partnerFilter === name;
          return (
            <button
              key={name}
              className={`sidebar-filter-item ${isActive ? 'active' : ''}`}
              onClick={() => setPartnerFilter((prev) => (prev === name ? 'all' : name))}
              type="button"
            >
              <Icon name={icon} size={14} className={`founder-icon-small ${key}`} />
              <span className="founder-filter-name">{name}</span>
              <span className="founder-filter-role">{role}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user-row">
          {user?.photoURL ? (
            <img className="sidebar-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="sidebar-avatar-fallback">{initial}</div>
          )}
          <div className="sidebar-user-info">
            <div className="user-info-name">{partner?.name || 'User'}</div>
            <div className="user-info-role">{partner?.role || 'Partner'}</div>
          </div>
        </div>

        <div className="sidebar-footer-actions">
          <button
            className="sidebar-action-btn"
            onClick={onShareWA}
            title="WhatsApp பகிர்வு"
            aria-label="WhatsApp Share"
          >
            <Icon name="whatsapp" size={15} />
          </button>
          <button
            className="sidebar-action-btn"
            onClick={onOpenData}
            title="தரவு மேலாண்மை"
            aria-label="Data Backup"
          >
            <Icon name="database" size={15} />
          </button>
          <button
            className="sidebar-action-btn danger"
            onClick={onSignOut}
            title="வெளியேறு (Sign out)"
            aria-label="Sign Out"
          >
            <Icon name="logout" size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
