import React from 'react';

const TABS = [
  {
    id: 'home',
    label: 'Hub',
    svg: (
      <path
        d="M3.5 9.2L11 3.5l7.5 5.7v8.3a1 1 0 01-1 1h-13a1 1 0 01-1-1V9.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    svg: (
      <path
        d="M3.5 6h4M3.5 11h4M3.5 16h4M10.5 6h8M10.5 11h8M10.5 16h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    ),
  },
  {
    id: 'hours',
    label: 'Shifts',
    svg: (
      <>
        <circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M11 6.8V11l3 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    id: 'ledger',
    label: 'Ledger',
    svg: (
      <path
        d="M3.5 17.5V9M8.5 17.5V4.5M13.5 17.5v-6M18.5 17.5V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    svg: (
      <path
        d="M4 5.5h14a1 1 0 011 1v7a1 1 0 01-1 1h-7l-4 3v-3H4a1 1 0 01-1-1v-7a1 1 0 011-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    ),
  },
];

export default function NavigationTabs({ activeTab, setActiveTab, pendingCount }) {
  return (
    <nav className="mobile-bottom-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav-btn${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          aria-label={tab.label}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="bottom-nav-icon-wrap">
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {tab.svg}
            </svg>
            {tab.id === 'tasks' && pendingCount > 0 && (
              <span className="nav-badge">{pendingCount}</span>
            )}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
