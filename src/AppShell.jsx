import React, { lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import { shareDaySummaryWhatsApp } from './utils/calculations';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TaskPerformanceHero from './components/TaskPerformanceHero';
import CalendarStrip from './components/CalendarStrip';
import QuickActions from './components/QuickActions';
import NavigationTabs from './components/NavigationTabs';
import TasksTab from './components/TasksTab';
import Toast from './components/Toast';

// Lazy load secondary tabs to shrink initial bundle size (especially Analytics with Chart.js)
const WorkTab = lazy(() => import('./components/WorkTab'));
const ChatTab = lazy(() => import('./components/ChatTab'));
const AnalyticsTab = lazy(() => import('./components/AnalyticsTab'));
const FinanceTab = lazy(() => import('./components/FinanceTab'));

// Lazy load modals on demand
const TaskModal = lazy(() => import('./components/modals/TaskModal'));
const TaskCompleteModal = lazy(() => import('./components/modals/TaskCompleteModal'));
const ExpenseModal = lazy(() => import('./components/modals/ExpenseModal'));
const WorkModal = lazy(() => import('./components/modals/WorkModal'));
const CapitalModal = lazy(() => import('./components/modals/CapitalModal'));
const DataModal = lazy(() => import('./components/modals/DataModal'));
const LightboxModal = lazy(() => import('./components/modals/LightboxModal'));

function TabLoadingFallback() {
  return (
    <div className="tab-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '220px', color: 'var(--text-secondary)' }}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>ஏற்றப்படுகிறது...</div>
      </div>
    </div>
  );
}

export default function AppShell({ user, partner, onSignOut }) {
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
    weekOffset,
    setWeekOffset,
    selectedDate,
    setSelectedDate,
    completingTask,
    setCompletingTask,
    addTask,
    completeTask,
    completeTaskWithProof,
    deleteTask,
    addExpense,
    deleteExpense,
    addCapital,
    deleteCapital,
    addWorklog,
    deleteWorklog,
    addProof,
    sendMessage,
    wipeAll,
    loadDemo,
    exportJSON,
    importJSON,
  } = useStore();

  const pendingCount = (store.tasks || []).filter(
    (t) => t.status !== 'completed'
  ).length;

  const handleOpenLightbox = (imgUrl, partnerName, title, addedAt) => {
    setLightboxProof({ imgUrl, partner: partnerName, title, addedAt });
  };

  const openTask = () => setActiveModal('task');
  const openExpense = () => setActiveModal('expense');
  const openWork = () => setActiveModal('work');
  const closeModal = () => setActiveModal(null);

  return (
    <div className="app-shell-layout">
      {/* Desktop Left Sidebar (hidden on mobile via CSS) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        partnerFilter={partnerFilter}
        setPartnerFilter={setPartnerFilter}
        onOpenTask={openTask}
        user={user}
        partner={partner}
        onSignOut={onSignOut}
        onOpenData={() => setActiveModal('data')}
        onShareWA={() => shareDaySummaryWhatsApp(store)}
      />

      <div className="app-main-workspace">
        {/* Mobile Header (hidden on desktop via CSS) */}
        <div className="mobile-header-bar">
          <Header
            user={user}
            partner={partner}
            onSignOut={onSignOut}
            onOpenData={() => setActiveModal('data')}
            onShareWA={() => shareDaySummaryWhatsApp(store)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingCount={pendingCount}
          />
        </div>

        <main className="workspace-body">
          {(activeTab === 'tasks' || activeTab === 'work') && (
            <div className="dashboard-overview-area">
              <TaskPerformanceHero
                store={store}
                partnerFilter={partnerFilter}
                setPartnerFilter={setPartnerFilter}
              />
              <CalendarStrip
                store={store}
                weekOffset={weekOffset}
                setWeekOffset={setWeekOffset}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
            </div>
          )}

      <Suspense fallback={<TabLoadingFallback />}>
        {activeTab === 'tasks' && (
          <TasksTab
            store={store}
            partnerFilter={partnerFilter}
            selectedDate={selectedDate}
            completeTask={completeTask}
            deleteTask={deleteTask}
            addProof={addProof}
            onOpenLightbox={handleOpenLightbox}
            onOpenTask={openTask}
            onOpenCompleteTask={setCompletingTask}
            currentPartner={partner}
          />
        )}

        {activeTab === 'work' && (
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

        {activeTab === 'analytics' && <AnalyticsTab store={store} />}

        {activeTab === 'finance' && (
          <FinanceTab
            store={store}
            onOpenCapital={() => setActiveModal('capital')}
            onOpenLightbox={handleOpenLightbox}
            deleteExpense={deleteExpense}
            deleteCapital={deleteCapital}
            currentPartner={partner}
          />
        )}
      </Suspense>
      </main>

        {/* Mobile quick actions and bottom nav bar (hidden on desktop via CSS) */}
        <div className="mobile-bottom-bar">
          <QuickActions
            onOpenTask={openTask}
            onOpenExpense={openExpense}
            onOpenWork={openWork}
          />

          <NavigationTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingCount={pendingCount}
          />
        </div>
      </div>

      <Suspense fallback={null}>
        {activeModal === 'task' && (
          <TaskModal
            isOpen={true}
            onClose={closeModal}
            onAddTask={addTask}
            currentPartner={partner}
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
            onExportJSON={exportJSON}
            onImportJSON={importJSON}
            onLoadDemo={loadDemo}
            onWipeAll={wipeAll}
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

