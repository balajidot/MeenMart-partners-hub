import React from 'react';
import { useStore } from './store/useStore';
import { shareDaySummaryWhatsApp } from './utils/calculations';

import Header from './components/Header';
import KpiTicker from './components/KpiTicker';
import FoundersSummary from './components/FoundersSummary';
import CalendarStrip from './components/CalendarStrip';
import QuickActions from './components/QuickActions';
import NavigationTabs from './components/NavigationTabs';
import TasksTab from './components/TasksTab';
import WorkTab from './components/WorkTab';
import AnalyticsTab from './components/AnalyticsTab';
import FinanceTab from './components/FinanceTab';

import TaskModal from './components/modals/TaskModal';
import ExpenseModal from './components/modals/ExpenseModal';
import WorkModal from './components/modals/WorkModal';
import CapitalModal from './components/modals/CapitalModal';
import DataModal from './components/modals/DataModal';
import LightboxModal from './components/modals/LightboxModal';
import Toast from './components/Toast';

export default function App() {
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
    addTask,
    completeTask,
    deleteTask,
    addExpense,
    addCapital,
    addWorklog,
    deleteWorklog,
    addProof,
    wipeAll,
    loadDemo,
    exportJSON,
    importJSON,
  } = useStore();

  const pendingCount = (store.tasks || []).filter(
    (t) => t.status !== 'completed'
  ).length;

  const handleOpenLightbox = (imgUrl, partner, title, addedAt) => {
    setLightboxProof({ imgUrl, partner, title, addedAt });
  };

  const openTask = () => setActiveModal('task');
  const openExpense = () => setActiveModal('expense');
  const openWork = () => setActiveModal('work');
  const closeModal = () => setActiveModal(null);

  return (
    <div className="app-wrap">
      <Header
        onOpenData={() => setActiveModal('data')}
        onShareWA={() => shareDaySummaryWhatsApp(store)}
      />

      {/* Hero — KPIs above, founder chips below, single visual block */}
      <div className="hero">
        <KpiTicker store={store} />
        <FoundersSummary
          store={store}
          partnerFilter={partnerFilter}
          setPartnerFilter={setPartnerFilter}
        />
      </div>

      <CalendarStrip
        store={store}
        weekOffset={weekOffset}
        setWeekOffset={setWeekOffset}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      {activeTab === 'tasks' && (
        <TasksTab
          store={store}
          partnerFilter={partnerFilter}
          setPartnerFilter={setPartnerFilter}
          selectedDate={selectedDate}
          completeTask={completeTask}
          deleteTask={deleteTask}
          addProof={addProof}
          onOpenLightbox={handleOpenLightbox}
          onOpenTask={openTask}
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
        />
      )}

      {activeTab === 'analytics' && <AnalyticsTab store={store} />}

      {activeTab === 'finance' && (
        <FinanceTab
          store={store}
          onOpenCapital={() => setActiveModal('capital')}
        />
      )}

      {/* Floating action button — task/expense/work */}
      <QuickActions
        onOpenTask={openTask}
        onOpenExpense={openExpense}
        onOpenWork={openWork}
      />

      {/* Bottom fixed nav */}
      <NavigationTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
      />

      {/* Modals */}
      <TaskModal isOpen={activeModal === 'task'} onClose={closeModal} onAddTask={addTask} />
      <ExpenseModal isOpen={activeModal === 'expense'} onClose={closeModal} onAddExpense={addExpense} />
      <WorkModal isOpen={activeModal === 'work'} onClose={closeModal} onAddWorklog={addWorklog} />
      <CapitalModal isOpen={activeModal === 'capital'} onClose={closeModal} onAddCapital={addCapital} />
      <DataModal
        isOpen={activeModal === 'data'}
        onClose={closeModal}
        onExportJSON={exportJSON}
        onImportJSON={importJSON}
        onLoadDemo={loadDemo}
        onWipeAll={wipeAll}
      />

      <LightboxModal proofData={lightboxProof} onClose={() => setLightboxProof(null)} />
      <Toast toast={toast} />
    </div>
  );
}
