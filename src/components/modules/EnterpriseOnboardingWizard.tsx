import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  RefreshCw,
  Save,
  Award,
  Layers,
  FileText,
  DollarSign,
  Calendar,
  Lock,
  Globe,
  Store,
  Warehouse,
  FileCheck,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { ApiClient } from '../../services/apiClient';
import {
  EnterpriseReadinessReport,
  PilotIndustryProfileId,
  OnboardingCompletionCertificate
} from '../../verticals/types';

interface WizardStateResponse {
  totalSteps: number;
  currentStep: number;
  isCompleted: boolean;
  activeProfile: {
    profileId: PilotIndustryProfileId;
    name: string;
    nameAr: string;
    description?: string;
    wizardSteps?: any[];
  };
  steps: Array<{
    stepNumber: number;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr?: string;
    isDynamicVerticalStep?: boolean;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
  wizardData?: Record<string, any>;
}

export const EnterpriseOnboardingWizard: React.FC = () => {
  const { lang, activeCompany, activeTenant, setActiveCompany, setActiveTenant, setActiveModule, markOnboardingCompleted } = usePlatform();
  const isAr = lang === 'ar';
  const checkLabels: Record<string, string> = {
    TENANT_EXISTS_ACTIVE: 'حساب المنشأة',
    LEGAL_IDENTITY_COMPLETE: 'البيانات القانونية',
    BASE_CURRENCY_VALID: 'العملة الأساسية',
    FISCAL_YEAR_CALENDAR_VALID: 'الفترة المالية',
    BRANCH_SETUP_VALID: 'الفروع التشغيلية',
    WAREHOUSE_SETUP_VALID: 'المستودعات',
    CHART_OF_ACCOUNTS_COMPLETE: 'الحسابات الأساسية',
    TAX_CONFIGURATION_VALID: 'إعدادات الضرائب',
    FIRST_ADMIN_AUTHENTICATABLE: 'المستخدم المسؤول'
  };

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [wizardState, setWizardState] = useState<WizardStateResponse | null>(null);
  const [readiness, setReadiness] = useState<EnterpriseReadinessReport | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [certificate, setCertificate] = useState<OnboardingCompletionCertificate | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [bootstrapForm, setBootstrapForm] = useState({ tenantName: '', companyName: '' });
  const [bootstraping, setBootstraping] = useState(false);

  const companyId = activeCompany?.id;
  const tenantId = activeTenant?.id || activeCompany?.tenantId;

  // Fetch wizard state and readiness report from server
  const fetchWizardData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    if (!companyId || !tenantId) {
      setLoading(false);
      setLoadError(isAr ? 'ابدأ بإدخال بيانات منشأتك' : 'Start by entering your business details');
      return;
    }

    try {
      const data = await ApiClient.getOnboardingWizardState(companyId, tenantId);
      if (!data.success || !data.wizardState || !Array.isArray(data.wizardState.steps) || !data.readiness) {
        throw new Error('Malformed onboarding response');
      }

      setWizardState(data.wizardState);
      setReadiness(data.readiness);
      setActiveStep(data.wizardState.currentStep || 1);
        
      // Merge persisted step data into local formData
      const initialForm: Record<string, any> = {};
      if (data.wizardState.wizardData) {
        Object.values(data.wizardState.wizardData).forEach((sData: any) => {
          if (sData && typeof sData === 'object') {
            Object.assign(initialForm, sData);
          }
        });
      }
      if (!initialForm.companyName && activeCompany) initialForm.companyName = activeCompany.name;
      if (!initialForm.companyCode && activeCompany) initialForm.companyCode = activeCompany.code;
      if (!initialForm.taxNumber && activeCompany?.taxNumber) initialForm.taxNumber = activeCompany.taxNumber;
      if (!initialForm.tenantName && activeTenant) initialForm.tenantName = activeTenant.name;
      if (!initialForm.profileId) initialForm.profileId = data.wizardState.activeProfile?.profileId;

      setFormData(initialForm);
    } catch (err) {
      console.error('Error fetching wizard data:', err);
      setLoadError(isAr ? 'تعذر تحميل إعدادات المنشأة' : 'Unable to load business setup');
    } finally {
      setLoading(false);
    }
  }, [companyId, tenantId, activeCompany, activeTenant, isAr]);

  const handleBootstrapSetup = useCallback(async () => {
    const tenantName = bootstrapForm.tenantName.trim();
    const companyName = bootstrapForm.companyName.trim();
    if (!tenantName || !companyName) {
      setRequestError(isAr ? 'يرجى إدخال اسم المنشأة واسم الشركة.' : 'Please provide tenant and company names.');
      return;
    }

    setBootstraping(true);
    setRequestError(null);

    try {
      const data = await ApiClient.initializeOnboardingTenant({
        tenantName,
        companyName,
        tenantCode: `TEN-${Date.now().toString().slice(-4)}`,
        companyCode: `COMP-${Date.now().toString().slice(-4)}`,
        profileId: 'COMMERCIAL_DISTRIBUTION'
      });
      if (!data.success) {
        throw new Error(data?.error || 'Unable to initialize tenant and company.');
      }

      if (data.tenant) setActiveTenant(data.tenant);
      if (data.company) setActiveCompany(data.company);
      setActiveModule('onboarding_wizard');
      await fetchWizardData();
    } catch (err: any) {
      console.error('Bootstrap setup error:', err);
      setRequestError(err?.message || 'Enterprise setup could not be initialized.');
    } finally {
      setBootstraping(false);
    }
  }, [bootstrapForm, fetchWizardData, isAr, setActiveCompany, setActiveModule, setActiveTenant]);

  useEffect(() => {
    fetchWizardData();
  }, [fetchWizardData]);

  // Handle Input Changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Submit Step to Server
  const handleAdvanceStep = async () => {
    if (!companyId || !tenantId) {
      setRequestError(isAr ? 'تعذر تحميل إعدادات المنشأة' : 'Unable to load business setup');
      return;
    }
    setSaving(true);
    setRequestError(null);
    setValidationErrors({});
    try {
      const result = await ApiClient.saveOnboardingWizardStep({
        stepNumber: activeStep,
        payload: formData,
        companyId,
        tenantId
      });
      if (!result.success) {
        if (result.errors) {
          setValidationErrors(result.errors);
        } else {
          setValidationErrors({ general: result.error || 'Validation error' });
        }
        return;
      }

      setSaveNotice(isAr ? 'تم حفظ الخطوة بنجاح' : 'تم حفظ الخطوة بنجاح');

      // Refresh state
      if (result.wizardState) {
        setWizardState(result.wizardState);
      }
      if (activeStep < 19) {
        setActiveStep(prev => prev + 1);
      }
      // Re-fetch readiness check
      const rData = await ApiClient.getOnboardingReadiness(companyId, tenantId);
      if (!rData.success || !rData.report) throw new Error('Malformed readiness response');
      setReadiness(rData.report);
    } catch (err: any) {
      console.error('Error saving onboarding step:', err);
      setRequestError('تعذر حفظ الإعدادات. يرجى إعادة المحاولة.');
    } finally {
      setSaving(false);
    }
  };

  // Final Certification & Materialization Sign-Off
  const handleCompleteCertification = async () => {
    if (!companyId || !tenantId) {
      setRequestError(isAr ? 'تعذر تحميل إعدادات المنشأة' : 'Unable to load business setup');
      return;
    }
    if (!readiness?.isReady) {
      setRequestError(isAr ? 'لا يمكن إكمال الإعداد بعد' : 'Setup cannot be completed yet');
      return;
    }
    setSaving(true);
    setRequestError(null);
    try {
      const data = await ApiClient.completeOnboardingWizard(companyId, tenantId);
      if (!data.success) {
        setRequestError(isAr ? 'لا يمكن إكمال الإعداد بعد' : 'Setup cannot be completed yet');
        return;
      }
      setCertificate(data.certificate);
      setReadiness(data.report);
      if (wizardState) {
        setWizardState({ ...wizardState, isCompleted: true });
      }
      // Keep the wizard mounted so the user can review the completion result
      // and explicitly choose whether to open Opening Balances or the dashboard.
    } catch (err: any) {
      console.error('Certification error:', err);
      setRequestError(isAr ? 'تعذر إكمال الإعداد. يرجى إعادة المحاولة.' : 'Setup could not be completed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <span className="text-lg font-medium">{isAr ? 'جارٍ تحميل إعدادات المنشأة...' : 'Loading business setup...'}</span>
      </div>
    );
  }

  if (certificate && wizardState?.isCompleted) {
    return (
      <div className="min-h-full bg-[#061224] px-4 py-10 text-white sm:px-8" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center gap-4">
            <img src="/am-monogram.svg" alt="AM CONSULTANT" className="h-16 w-16 rounded-xl border border-[#CDAF7D] bg-[#0B1D36] p-3" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CDAF7D]">AM CONSULTANT</p>
              <h1 className="mt-1 text-3xl font-black">{isAr ? 'تم إعداد منشأتك بنجاح' : 'Your business is set up successfully'}</h1>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B1D36] p-6 shadow-2xl sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-slate-400">{isAr ? 'المنشأة' : 'Business'}:</span> {activeCompany?.name || formData.companyName || formData.tenantName}</div>
              <div><span className="text-slate-400">{isAr ? 'النشاط' : 'Activity'}:</span> {wizardState.activeProfile?.name || formData.profileId}</div>
              <div><span className="text-slate-400">{isAr ? 'العملة' : 'Currency'}:</span> {activeCompany?.currency || formData.baseCurrency}</div>
              <div><span className="text-slate-400">{isAr ? 'السنة المالية' : 'Fiscal year'}:</span> {formData.fiscalYearStart || '—'}</div>
            </div>
            <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              <p className="font-bold">{isAr ? 'قاعدة البيانات جاهزة للعمل' : 'Your database is ready for work'}</p>
              <p className="mt-1 text-emerald-200/80">{isAr ? 'لم يتم إدخال أي أرصدة أو حركات تشغيلية تلقائيًا.' : 'No balances or operational transactions were entered automatically.'}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => { markOnboardingCompleted(); setActiveModule('accounting'); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#CDAF7D] px-5 py-3 font-bold text-[#061224]">
                {isAr ? 'إدخال الأرصدة الافتتاحية' : 'Enter Opening Balances'}
              </button>
              <button type="button" onClick={() => { markOnboardingCompleted(); setActiveModule('dashboard'); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-3 font-bold text-white">
                {isAr ? 'الدخول إلى البرنامج' : 'Enter the program'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    if (!companyId || !tenantId) {
      return (
        <div className="min-h-screen bg-[#061224] px-4 py-10 text-white sm:px-8" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex items-center gap-4">
              <img src="/am-monogram.svg" alt="AM" className="h-16 w-16 rounded-xl border border-[#CDAF7D] bg-[#0B1D36] p-3" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CDAF7D]">AM CONSULTANT</p>
                <p className="text-[11px] text-slate-300">{isAr ? 'منصة مالية وإدارية للمؤسسات' : 'Financial & Management Platform'}</p>
                <h1 className="mt-1 text-3xl font-black">{isAr ? 'ابدأ إعداد منشأتك' : 'Set up your business'}</h1>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0B1D36] p-6 shadow-2xl sm:p-8">
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {[
                  isAr ? 'هوية المنشأة' : 'Business identity',
                  isAr ? 'التشغيل والمحاسبة' : 'Operations & accounting',
                  isAr ? 'المستخدم والأرصدة' : 'Admin & balances'
                ].map((label, index) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                    <span className="mb-2 block text-xs text-[#CDAF7D]">{index + 1}</span>{label}
                  </div>
                ))}
              </div>
              <p className="mb-6 text-sm leading-6 text-slate-300">
                {isAr
                  ? 'سنحفظ تقدمك بعد كل خطوة. لن نضيف عملاء أو منتجات أو معاملات تجريبية إلى قاعدة بياناتك.'
                  : 'Your progress is saved after every step. No customers, products, or transactions will be added automatically.'}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  {isAr ? 'اسم المنشأة' : 'Business name'}
                  <input className="mt-2 w-full rounded-lg border border-white/15 bg-white px-3 py-2 text-slate-900" value={bootstrapForm.tenantName} onChange={e => setBootstrapForm(v => ({ ...v, tenantName: e.target.value }))} />
                </label>
                <label className="text-sm font-semibold">
                  {isAr ? 'اسم الشركة القانوني' : 'Legal company name'}
                  <input className="mt-2 w-full rounded-lg border border-white/15 bg-white px-3 py-2 text-slate-900" value={bootstrapForm.companyName} onChange={e => setBootstrapForm(v => ({ ...v, companyName: e.target.value }))} />
                </label>
              </div>
              {requestError && <p role="alert" className="mt-4 rounded-lg border border-rose-400/40 bg-rose-950/40 p-3 text-sm text-rose-200">{requestError}</p>}
              <button type="button" disabled={bootstraping} onClick={handleBootstrapSetup} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#CDAF7D] px-5 py-3 font-bold text-[#061224] disabled:opacity-60">
                {bootstraping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {isAr ? 'حفظ وبدء المعالج' : 'Save and start setup'}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h1 className="text-lg font-bold">{loadError}</h1>
          <p className="mt-2 text-sm">يرجى التحقق من اتصال النظام وسياق المنشأة ثم المحاولة مرة أخرى.</p>
          <button onClick={fetchWizardData} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const currentStepDef = wizardState?.steps.find(s => s.stepNumber === activeStep);
  const progressPercent = Math.round((activeStep / 19) * 100);

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* AM Enterprise Header Bar */}
      <div className="bg-[#0B1D36] text-white border border-[#16304F] rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1D36] border-2 border-[#CDAF7D] text-[#CDAF7D] flex items-center justify-center font-black text-lg shadow-sm">
              AM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {isAr ? 'معالج إعداد المنشأة' : 'Company Setup Wizard'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#CDAF7D]/20 text-[#CDAF7D] border border-[#CDAF7D]/40">
                  إعدادات منصة الأعمال
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isAr 
                  ? 'تهيئة المنشأة والتحقق من الجاهزية التشغيلية (19 خطوة)'
                  : 'Configure your business and verify operational readiness'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-xl">
          <div className="text-right rtl:text-left">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              {isAr ? 'التقدم الإجمالي' : 'Total Progress'}
            </span>
            <div className="text-lg font-black text-[#CDAF7D]">
              {progressPercent}% <span className="text-xs font-normal text-slate-400">({activeStep} / 19)</span>
            </div>
          </div>

          <div className="w-24 bg-white/10 rounded-full h-2.5 overflow-hidden border border-white/20">
            <div 
              className="bg-[#CDAF7D] h-full transition-all duration-300 rounded-full shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {wizardState?.isCompleted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {isAr ? 'تم إكمال الإعداد' : 'Setup completed'}
            </span>
          )}
        </div>
      </div>

      {saveNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {saveNotice}
        </div>
      )}
      {requestError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" />{requestError}</div>
        </div>
      )}

      {/* Main Grid: Stepper Navigation (Left) + Form & Diagnostic Content (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Step Navigation Sidebar (4 cols on lg) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-2 max-h-[780px] overflow-y-auto">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? 'خارطة الخطوات (19 خطوة)' : 'Step Sequence (19 Steps)'}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {isAr ? `الخطوة الحالية: ${activeStep}` : `Step ${activeStep} of 19`}
            </span>
          </div>

          <div className="space-y-1">
            {wizardState?.steps.map((step) => {
              const isActive = step.stepNumber === activeStep;
              const isPast = step.stepNumber < activeStep;
              return (
                <button
                  key={step.stepNumber}
                  onClick={() => {
                    setActiveStep(step.stepNumber);
                    setValidationErrors({});
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : isPast
                      ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isPast
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {isPast ? '✓' : step.stepNumber}
                    </span>
                    <span className="truncate">
                      {isAr ? step.titleAr : step.title}
                    </span>
                  </div>

                  {step.isDynamicVerticalStep && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      {isAr ? 'نشاط' : 'Business'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content Form Area (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
            
            {/* Step Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  {isAr ? `الخطوة ${activeStep} من 19` : `Step ${activeStep} of 19`}
                </span>
                {currentStepDef?.isDynamicVerticalStep && (
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    {wizardState?.activeProfile.name}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isAr ? currentStepDef?.titleAr : currentStepDef?.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentStepDef?.description}
              </p>
            </div>

            {/* Validation Errors Banner */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-sm text-rose-800 dark:text-rose-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  {isAr ? 'يرجى تصحيح أخطاء التحقق التالية:' : 'Please correct the following validation requirements:'}
                </div>
                <ul className="list-disc list-inside text-xs space-y-0.5 pl-2">
                  {Object.entries(validationErrors).map(([key, msg]) => (
                    <li key={key}><strong>{key}:</strong> {msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dynamic Step Content Rendering */}
            <div className="space-y-4">
              
              {/* Step 1: Tenant Context */}
              {activeStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'اسم المنشأة أو المجموعة *' : 'Company or Group Name *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.tenantName || ''}
                      onChange={(e) => handleInputChange('tenantName', e.target.value)}
                      placeholder="e.g. Al-Madina Enterprise Group"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'رمز المنشأة (من حرفين إلى 16 حرفًا)' : 'Company Code (2-16 characters) *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.tenantCode || ''}
                      onChange={(e) => handleInputChange('tenantCode', e.target.value.toUpperCase())}
                      placeholder="e.g. ALMADINA"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'البريد الإلكتروني لمالك النظام' : 'Owner / Administrator Email *'}
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.ownerEmail || ''}
                      onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                      placeholder="admin@enterprise.pilot"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Legal Company Identity */}
              {activeStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'الاسم القانوني المسجل للشركة' : 'Legal Registered Company Name *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.companyName || ''}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="e.g. Al-Madina Commercial & Retail LLC"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'الرقم الضريبي الرسمي (VAT / TRN)' : 'Tax ID / VAT Registration Number *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.taxNumber || ''}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      placeholder="e.g. 310123456700003"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'رقم السجل التجاري' : 'Commercial Register Number (CRN) *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.commercialRegister || ''}
                      onChange={(e) => handleInputChange('commercialRegister', e.target.value)}
                      placeholder="e.g. 1010998877"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Trading & Display Name */}
              {activeStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'الاسم التجاري (إنجليزي)' : 'Trading / Display Name (EN) *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.tradingNameEn || ''}
                      onChange={(e) => handleInputChange('tradingNameEn', e.target.value)}
                      placeholder="e.g. Al-Madina Hyperstores"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'الاسم التجاري (عربي)' : 'Trading / Display Name (AR) *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.tradingNameAr || ''}
                      onChange={(e) => handleInputChange('tradingNameAr', e.target.value)}
                      placeholder="مثال: أسواق المدينة المركزية"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Visual Identity & White-Labeling */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  {/* Master AM Platform Anchor Information */}
                  <div className="bg-[#0B1D36] text-white p-4 rounded-xl border border-[#16304F] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0B1D36] border border-[#CDAF7D] flex items-center justify-center font-black text-[#CDAF7D]">
                        AM
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{isAr ? 'هوية منصة إيه إم للأعمال' : 'Business Platform Identity'}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#CDAF7D]/20 text-[#CDAF7D] border border-[#CDAF7D]/40">
                            Fixed Master Identity
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          {isAr 
                            ? 'ألوان النواة: كحلي داكن (#0B1D36) • ذهبي حقيقي (#CDAF7D) • خطوط Plus Jakarta Sans و Cairo'
                            : 'ألوان وهوية العرض المعتمدة للمنصة'}
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:block text-right rtl:text-left text-[11px] text-[#CDAF7D] font-bold">
                      {isAr ? '«كل قرار ناجح يبدأ برقم صحيح»' : '"Accurate Numbers First"'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'اللون الأساسي للمنشأة' : 'Primary Company Color'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="w-10 h-10 rounded border border-slate-300 cursor-pointer shrink-0"
                          value={formData.primaryColor || '#0B1D36'}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        />
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          value={formData.primaryColor || '#0B1D36'}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'اللون المميز للمنشأة' : 'Company Accent Color'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="w-10 h-10 rounded border border-slate-300 cursor-pointer shrink-0"
                          value={formData.accentColor || '#CDAF7D'}
                          onChange={(e) => handleInputChange('accentColor', e.target.value)}
                        />
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          value={formData.accentColor || '#CDAF7D'}
                          onChange={(e) => handleInputChange('accentColor', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'رابط شعار المنشأة (Light Logo URL)' : 'Company Logo URL'}
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        value={formData.logoUrl || ''}
                        onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                        placeholder="https://domain.com/logo.svg"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'اسم التطبيق المخصص للمنشأة' : 'Custom Company App Name'}
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        value={formData.appName || ''}
                        onChange={(e) => handleInputChange('appName', e.target.value)}
                        placeholder="e.g. Al-Madina Enterprise Portal"
                      />
                    </div>
                  </div>

                  {/* Tenant Branding Card Preview */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isAr ? 'معاينة هوية المنشأة' : 'Company Workspace Preview'}
                    </span>
                    <div 
                      className="p-3 rounded-lg text-white flex items-center justify-between"
                      style={{ backgroundColor: formData.primaryColor || '#0B1D36' }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs"
                          style={{ backgroundColor: formData.accentColor || '#CDAF7D', color: '#0B1D36' }}
                        >
                          {formData.appName ? formData.appName.slice(0, 2).toUpperCase() : 'CO'}
                        </div>
                        <span className="font-bold text-xs">
                          {formData.appName || (isAr ? 'بوابة المنشأة' : 'Company Portal')}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-80">
                        منصة إيه إم للأعمال
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Country & Address */}
              {activeStep === 5 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'دولة المقر التشغيلي' : 'Country Jurisdiction *'}
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.countryCode || ''}
                      onChange={(e) => handleInputChange('countryCode', e.target.value)}
                    >
                      <option value="SA">Saudi Arabia (SA) - ZATCA</option>
                      <option value="EG">Egypt (EG) - ETA</option>
                      <option value="AE">United Arab Emirates (AE) - FTA</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'المدينة' : 'City *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="e.g. Riyadh"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'العنوان التفصيلي' : 'Street Address *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="e.g. King Fahd Road, Business District"
                    />
                  </div>
                </div>
              )}

              {/* Step 6: Operating Currency */}
              {activeStep === 6 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'العملة الأساسية' : 'Base Operating Currency *'}
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.currencyCode || ''}
                      onChange={(e) => handleInputChange('currencyCode', e.target.value)}
                    >
                      <option value="SAR">SAR - Saudi Riyal</option>
                      <option value="EGP">EGP - Egyptian Pound</option>
                      <option value="AED">AED - UAE Dirham</option>
                      <option value="USD">USD - US Dollar</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'الخانات العشرية' : 'Decimal Precision'}
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.decimalPlaces ?? ''}
                      onChange={(e) => handleInputChange('decimalPlaces', Number(e.target.value))}
                    >
                      <option value={2}>2 Decimals (Standard)</option>
                      <option value={3}>3 Decimals (Wholesale/B2B)</option>
                      <option value={4}>4 Decimals (Precision)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 7: Fiscal Year & Accounting Calendar */}
              {activeStep === 7 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'اسم السنة المالية' : 'Fiscal Year Name *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.fiscalYearName || ''}
                      onChange={(e) => handleInputChange('fiscalYearName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'تاريخ البداية' : 'Start Date *'}
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.startDate || ''}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'تاريخ النهاية' : 'End Date *'}
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.endDate || ''}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 8: Branch Setup */}
              {activeStep === 8 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'كود الفرع الرئيسي' : 'Primary Branch Code *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.branchCode || ''}
                      onChange={(e) => handleInputChange('branchCode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'اسم الفرع' : 'Branch Name *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.branchName || ''}
                      onChange={(e) => handleInputChange('branchName', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 9: Warehouse Setup */}
              {activeStep === 9 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'كود المستودع الرئيسي' : 'Primary Warehouse Code *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.warehouseCode || ''}
                      onChange={(e) => handleInputChange('warehouseCode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'اسم المستودع' : 'Warehouse Name *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.warehouseName || ''}
                      onChange={(e) => handleInputChange('warehouseName', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 10: Cashbox & Bank */}
              {activeStep === 10 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'كود الصندوق النقدي الرئيسي' : 'Cashbox Code *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.cashboxCode || ''}
                      onChange={(e) => handleInputChange('cashboxCode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'اسم البنك التشغيلي' : 'Bank Name *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.bankName || ''}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'رقم الحساب / الآيبان' : 'Bank Account / IBAN *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.bankAccount || ''}
                      onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 13: Tax Jurisdiction */}
              {activeStep === 13 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'التشريع الضريبي' : 'Tax Jurisdiction *'}
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.taxJurisdiction || ''}
                      onChange={(e) => {
                        const jur = e.target.value;
                        handleInputChange('taxJurisdiction', jur);
                        handleInputChange('standardRate', jur === 'EG-ETA' ? 14 : jur === 'SA-ZATCA' ? 15 : undefined);
                      }}
                    >
                      <option value="SA-ZATCA">Saudi Arabia — ZATCA (15% VAT)</option>
                      <option value="EG-ETA">Egypt — ETA (14% VAT)</option>
                      <option value="AE-FTA">UAE — FTA (5% VAT)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'نسبة الضريبة القياسية (%)' : 'Standard VAT Rate (%) *'}
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.standardRate ?? ''}
                      onChange={(e) => handleInputChange('standardRate', Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Step 15: Dynamic Vertical Profile Config */}
              {activeStep === 15 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'ملف النشاط التشغيلي' : 'Business profile *'}
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.profileId || ''}
                      onChange={(e) => handleInputChange('profileId', e.target.value)}
                    >
                      <option value="COMMERCIAL_DISTRIBUTION">1. Commercial Trading & Distribution (FMCG)</option>
                      <option value="RESTAURANT_FNB">2. Restaurant & Food & Beverage</option>
                      <option value="RETAIL_MOBILE_PHONES">3. Retail — Mobile Phones & Electronics (IMEI)</option>
                      <option value="RETAIL_WOMENS_CLOTHING">4. Retail — Women's Apparel (Matrix & Barcode)</option>
                      <option value="RETAIL_CHILDRENS_CLOTHING">5. Retail — Children's Clothing</option>
                      <option value="MFG_WOMENS_APPAREL">6. Manufacturing — Women's Apparel</option>
                      <option value="MFG_MENS_APPAREL">7. Manufacturing — Men's Tailoring</option>
                      <option value="MFG_CHILDRENS_APPAREL">8. Manufacturing — Children's Safety QA</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'خصائص النشاط المحددة:' : 'Business Capabilities:'}
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                      <div>• {isAr ? 'شجرة حسابات مخصصة تلقائياً للنشاط' : 'Auto-provisioned Industry Chart of Accounts'}</div>
                      <div>• {isAr ? 'مؤشرات أداء ومعايير تشغيلية مدمجة' : 'Built-in business indicators and reconciliations'}</div>
                      <div>• {isAr ? 'نماذج تسعير ومستندات أعمال متوافقة' : 'Domain pricing models and validation rules'}</div>
                      <div>• {isAr ? 'ربط مباشر بمحرك القيود والضرائب' : 'Direct journal & statutory tax binding'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 16: Document Numbering */}
              {activeStep === 16 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'بادئة فواتير المبيعات' : 'Invoice Prefix *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.invoicePrefix || ''}
                      onChange={(e) => handleInputChange('invoicePrefix', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'بادئة أوامر البيع' : 'Sales Order Prefix *'}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      value={formData.orderPrefix || ''}
                      onChange={(e) => handleInputChange('orderPrefix', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 17: First Administrator Security */}
              {activeStep === 17 && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      {isAr 
                        ? 'تنبيه أمان: يتم تشفير كلمات المرور فوراً باستخدام PBKDF2/SHA-512 مع ملح عشوائي. لا يتم حفظ كلمات المرور بنص صريح إطلاقاً.'
                        : 'Security Notice: Administrator passwords are salted and hashed with PBKDF2/SHA-512. Plaintext credentials are never saved in storage or API payloads.'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'اسم المستخدم الإداري' : 'Administrator Username *'}
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        value={formData.adminUsername || ''}
                        onChange={(e) => handleInputChange('adminUsername', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'الاسم الكامل للمسؤول' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        value={formData.adminFullName || ''}
                        onChange={(e) => handleInputChange('adminFullName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'كلمة المرور المشفرة (8+ خانات، أحرف وأرقام ورموز)' : 'Strong Administrator Password *'}
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        value={formData.adminPassword || ''}
                        onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                        placeholder="••••••••••••"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isAr ? 'رمز كاشير سريع (PIN)' : 'POS Cashier PIN (4-8 digits)'}
                      </label>
                      <input
                        type="password"
                        maxLength={8}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        value={formData.adminPin || ''}
                        onChange={(e) => handleInputChange('adminPin', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 19: Final Readiness Diagnostic Review & Sign-Off */}
              {activeStep === 19 && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-600" />
                          {isAr ? 'فحص جاهزية الإعداد (16 معيارًا)' : 'Setup readiness check (16 requirements)'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {isAr ? 'يتم التحقق من اكتمال كافة البيانات التشغيلية والقانونية والمحاسبية' : 'Evaluates server-side persisted state against authoritative controls'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          readiness?.isReady 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {readiness?.overallStatus || 'CHECKING...'}
                        </span>
                      </div>
                    </div>

                    {/* 16 Checks Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {readiness?.completedChecks.map(check => (
                        <div key={check.id} className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {isAr ? check.nameAr : (checkLabels[check.id] || check.name)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {isAr ? check.messageAr : check.message}
                            </div>
                          </div>
                        </div>
                      ))}

                      {readiness?.failedChecks.map(check => (
                        <div key={check.id} className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-rose-800 dark:text-rose-300">
                              {isAr ? check.nameAr : (checkLabels[check.id] || check.name)}
                            </div>
                            <div className="text-[11px] text-rose-600 dark:text-rose-400">
                              {isAr ? check.messageAr : check.message}
                            </div>
                            {(check.requiredAction || check.blockingReason) && (
                              <div className="mt-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                                المطلوب: {check.requiredAction || check.blockingReason}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certification Action */}
                  <div className="p-6 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {isAr ? 'إكمال الإعداد وبدء التشغيل' : 'Complete setup and start operating'}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                        {isAr
                          ? 'بعد الإكمال، تُحفظ إعداداتك في قاعدة البيانات وتصبح المنصة جاهزة لإدخال البيانات والمعاملات الفعلية.'
                          : 'Your configuration is saved durably and the platform is unlocked for real business data and transactions.'}
                      </p>
                    </div>

                    <button
                      onClick={handleCompleteCertification}
                      disabled={saving || !readiness?.isReady}
                      className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      <Award className="w-4 h-4" />
                      {saving ? (isAr ? 'جارٍ إكمال الإعداد...' : 'Completing setup...') : readiness?.isReady ? (isAr ? 'إكمال الإعداد' : 'Complete setup') : (isAr ? 'لا يمكن إكمال الإعداد بعد' : 'Setup cannot be completed yet')}
                    </button>
                  </div>
                </div>
              )}

              {/* Default Step placeholder for intermediate steps */}
              {![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 15, 16, 17, 19].includes(activeStep) && (
                <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <FileCheck className="w-8 h-8 text-blue-600 mx-auto" />
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {isAr ? 'الإعدادات القياسية لهذه الخطوة' : 'Standard settings for this step'}
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {isAr 
                      ? 'تم تطبيق المعايير والسياسات الافتراضية المعتمدة لهذا النشاط. يمكنك المتابعة للخطوة التالية.'
                      : 'Standard recommended parameters are active for this stage. Proceed to the next step.'}
                  </p>
                </div>
              )}

            </div>

            {/* Navigation Action Buttons */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  if (activeStep > 1) {
                    setActiveStep(prev => prev - 1);
                    setValidationErrors({});
                  }
                }}
                disabled={activeStep === 1 || saving}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                {isAr ? 'الخطوة السابقة' : 'Previous Step'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdvanceStep}
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ ومتابعة' : 'Save & Continue')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Completion Certificate Modal */}
      {certificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6">
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                {isAr ? 'شهادة اكتمال الإعداد والجاهزية التشغيلية' : 'Setup completion certificate'}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {certificate.certificateId}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400">{isAr ? 'المنشأة:' : 'Company:'}</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{certificate.companyName}</div>
                </div>
                <div>
                  <span className="text-slate-400">{isAr ? 'النشاط المعتمد:' : 'Certified Profile:'}</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{certificate.certifiedProfile}</div>
                </div>
                <div>
                  <span className="text-slate-400">{isAr ? 'درجة الجاهزية:' : 'Readiness Score:'}</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">{certificate.readinessScore}% PASS</div>
                </div>
                <div>
                  <span className="text-slate-400">{isAr ? 'تاريخ الاعتماد:' : 'Certified Date:'}</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{new Date(certificate.certifiedAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider">{isAr ? 'التوقيع التشفيري للكتلة (SHA-256):' : 'Cryptographic Audit Vault Hash (SHA-256):'}</span>
                <div className="font-mono text-[10px] break-all text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                  {certificate.auditHash}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                {isAr ? 'طباعة الشهادة' : 'Print Certificate'}
              </button>
              <button
                onClick={() => {
                  setCertificate(null);
                  setActiveModule('dashboard');
                }}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                {isAr ? 'إغلاق والذهاب إلى لوحة التحكم' : 'Close & Launch Dashboard'}
              </button>
            </div>

          </div>
        </div>
      )}

      </div>
    </div>
  );
};
