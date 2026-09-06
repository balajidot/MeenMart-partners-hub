import React, { lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NavigationTabs from './components/NavigationTabs';
import Toast from './components/Toast';
import { triggerHaptic } from './utils/haptics';
import { getLocalDateStr } from './utils/calculations';

// Lazy load tabs
const HomeTab = lazy(() => import('./components/HomeTab'));
const TasksTab = lazy(() => import('./components/TasksTab'));
const WorkTab = lazy(() => import('./components/WorkTab'));
const FinanceTab = lazy(() => import('./components/FinanceTab'));
const ChatTab = lazy(() => import('./components/ChatTab'));

// Lazy load modals
const TaskModal = lazy(() => import('./components/modals/TaskModal'));
const TaskCompleteModal = lazy(() => import('./components/modals/TaskCompleteModal'));
const ExpenseModal = lazy(() => import('./components/modals/ExpenseModal'));
const WorkModal = lazy(() => import('./components/modals/WorkModal'));
const CapitalModal = lazy(() => import('./components/modals/CapitalModal'));
const DataModal = lazy(() => import('./components/modals/DataModal'));
const LightboxModal = lazy(() => import('./components/modals/LightboxModal'));

function TabLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '260px',
        gap: '12px',
        color: 'var(--text-muted)',
      }}
    >
      <div className="auth-spinner" />
      <span style={{ fontSize: '12.5px', fontWeight: 500 }}>Loading…</span>
    </div>
  );
}

const PARTNER_CYCLE = ['Balaji', 'Nagoor', 'JP'];

export default function AppShell({ _user, partner, onSignOut }) {
  const {
    store,
    activeTab,
    setActiveTab,
    activeModal,
    setActiveModal,
    lightboxProof,
    setLightboxProof,
    toast,
    partnerFilter,
    setPartnerFilter,
    selectedDate,
    setSelectedDate,
    completingTask,
    setCompletingTask,
    isOnline,
    lastSyncedAt,
    addTask,
    completeTask,
    completeTaskWithProof,
    deleteTask,
    addExpense,
    deleteExpense,
    addRevenue,
    deleteRevenue,
    addCapital,
    deleteCapital,
    addWorklog,
    deleteWorklog,
    addProof,
    sendMessage,
    toggleShift,
    wipeAll,
  } = useStore();

  const pendingCount = (store.tasks || []).filter(
    (t) => t.status !== 'completed' && t.s !== 'done'
  ).length;

  const handleOpenLightbox = (imgUrl, partnerName, title, addedAt) => {
    setLightboxProof({ imgUrl, partner: partnerName, title, addedAt });
  };

  const openTask = () => setActiveModal('task');
  const openExpense = () => setActiveModal('expense');
  const openRevenue = () => setActiveModal('revenue');
  const openWork = () => setActiveModal('work');
  const closeModal = () => setActiveModal(null);

  // Cycle user filter or avatar
  const handleCycleUser = () => {
    const currentName = partner?.name || 'Balaji';
    const currentIndex = PARTNER_CYCLE.indexOf(currentName);
    const nextPartnerName = PARTNER_CYCLE[(currentIndex + 1) % PARTNER_CYCLE.length];
    setPartnerFilter(nextPartnerName);
  };

  // Header kicker & title per active tab
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'home':
        return {
          kicker: 'Operations Hub',
          title: `Welcome, ${partner?.name || 'Partner'}`,
        };
      case 'tasks':
        return {
          kicker: 'Task agenda',
          title: 'Tasks',
        };
      case 'hours':
        return {
          kicker: 'Shift & workload',
          title: 'Shifts',
        };
      case 'ledger':
        return {
          kicker: 'Cashflow & capital',
          title: 'Ledger',
        };
      case 'chat':
        return {
          kicker: '3 partners · MeenMart',
          title: 'Partner Stream',
        };
      default:
        return {
          kicker: 'MeenMart Hub',
          title: 'Operations Portal',
        };
    }
  };

  const { kicker, title } = getHeaderInfo();

  return (
    <div className="app-shell-layout">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        partner={partner}
        onSignOut={onSignOut}
      />

      {/* Main Workspace */}
      <div className="app-main-workspace">
        {/* Navy Header */}
        <Header
          kicker={kicker}
          title={title}
          partnerFilter={partnerFilter}
          setPartnerFilter={setPartnerFilter}
          partner={partner}
          onCycleUser={handleCycleUser}
          onOpenData={() => setActiveModal('data')}
          isOnline={isOnline}
        />

        {/* Workspace Body */}
        <main className="workspace-body">
          <Suspense fallback={<TabLoadingFallback />}>
            {activeTab === 'home' && (
              <HomeTab
                store={store}
                partnerFilter={partnerFilter}
                setPartnerFilter={setPartnerFilter}
                onOpenTask={openTask}
                onGoToTasks={() => setActiveTab('tasks')}
                onGoToHours={() => setActiveTab('hours')}
                onGoToLedger={() => setActiveTab('ledger')}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksTab
                store={store}
                partnerFilter={partnerFilter}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                completeTask={completeTask}
                deleteTask={deleteTask}
                addProof={addProof}
                onOpenLightbox={handleOpenLightbox}
                onOpenTask={openTask}
                onOpenCompleteTask={setCompletingTask}
                currentPartner={partner}
              />
            )}

            {activeTab === 'hours' && (
              <WorkTab
                store={store}
                partnerFilter={partnerFilter}
                setPartnerFilter={setPartnerFilter}
                selectedDate={selectedDate}
                deleteWorklog={deleteWorklog}
                addProof={addProof}
                onOpenLightbox={handleOpenLightbox}
                onOpenWork={openWork}
                currentPartner={partner}
                toggleShift={toggleShift}
              />
            )}

            {activeTab === 'ledger' && (
              <FinanceTab
                store={store}
                onOpenCapital={() => setActiveModal('capital')}
                onOpenExpense={openExpense}
                onOpenRevenue={openRevenue}
                onOpenLightbox={handleOpenLightbox}
                deleteExpense={deleteExpense}
                deleteRevenue={deleteRevenue}
                deleteCapital={deleteCapital}
                currentPartner={partner}
              />
            )}

            {activeTab === 'chat' && (
              <ChatTab
                store={store}
                sendMessage={sendMessage}
                currentPartner={partner}
                onOpenLightbox={handleOpenLightbox}
              />
            )}
          </Suspense>
        </main>

        {/* Floating Action Button (FAB) — only on Tasks tab */}
        {activeTab === 'tasks' && (
          <button
            type="button"
            className="fab-btn"
            onClick={() => {
              triggerHaptic('medium');
              openTask();
            }}
            aria-label="Add new task"
            title="Add task"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M11 4.5v13M4.5 11h13"
                stroke="#fff"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        {/* Mobile Bottom Bar (hidden on desktop) */}
        <NavigationTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
        />
      </div>

      {/* Modals & Bottom Sheets */}
      <Suspense fallback={null}>
        {activeModal === 'task' && (
          <TaskModal
            isOpen={true}
            onClose={closeModal}
            onAddTask={addTask}
            currentPartner={partner}
            defaultDate={selectedDate || getLocalDateStr()}
          />
        )}

        {completingTask && (
          <TaskCompleteModal
            isOpen={true}
            task={completingTask}
            onClose={() => setCompletingTask(null)}
            onComplete={completeTaskWithProof}
          />
        )}

        {activeModal === 'expense' && (
          <ExpenseModal
            isOpen={true}
            onClose={closeModal}
            onAddExpense={addExpense}
            currentPartner={partner}
            kind="expense"
          />
        )}

        {activeModal === 'revenue' && (
          <ExpenseModal
            isOpen={true}
            onClose={closeModal}
            onAddExpense={addRevenue}
            currentPartner={partner}
            kind="revenue"
          />
        )}

        {activeModal === 'work' && (
          <WorkModal
            isOpen={true}
            onClose={closeModal}
            onAddWorklog={addWorklog}
            currentPartner={partner}
          />
        )}

        {activeModal === 'capital' && (
          <CapitalModal
            isOpen={true}
            onClose={closeModal}
            onAddCapital={addCapital}
            currentPartner={partner}
          />
        )}

        {activeModal === 'data' && (
          <DataModal
            isOpen={true}
            onClose={closeModal}
            onWipeAll={wipeAll}
            isOnline={isOnline}
            lastSyncedAt={lastSyncedAt}
            store={store}
            currentPartner={partner}
          />
        )}

        {lightboxProof && (
          <LightboxModal
            proofData={lightboxProof}
            onClose={() => setLightboxProof(null)}
          />
        )}
      </Suspense>

      <Toast toast={toast} />
    </div>
  );
}
