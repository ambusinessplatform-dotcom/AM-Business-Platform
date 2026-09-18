/**
 * AM Business Platform - Navigation Sidebar
 * Uses a single authoritative feature registry for customer-facing visibility.
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Truck,
  Package,
  Calculator,
  Landmark,
  Factory,
  PieChart,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  ClipboardList,
  Settings,
  Database,
  Palette,
  Award,
  ChevronDown,
  Sparkles,
  ChevronRight,
  UserCheck,
  Briefcase,
  Building2
} from 'lucide-react';
import { ModuleView, usePlatform } from '../../context/PlatformContext';
import { FEATURE_REGISTRY, getVisibleFeatures } from '../../features/featureRegistry';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  sales: ShoppingBag,
  pos: Store,
  purchasing: Truck,
  inventory: Package,
  accounting: Calculator,
  banking: Landmark,
  fixed_assets: Building2,
  bi_analytics: PieChart,
  reports: FileSpreadsheet,
  manufacturing: Factory,
  crm: Users,
  hr: UserCheck,
  workflows: Briefcase,
  users_security: ShieldCheck,
  audit_center: ClipboardList,
  settings: Settings,
  master_data: Database,
  branding: Palette,
  onboarding_wizard: Award,
  ai: Sparkles,
  default: LayoutDashboard
};

interface NavItem {
  id: ModuleView;
  labelEn: string;
  labelAr: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

interface NavCategory {
  titleEn: string;
  titleAr: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const {
    lang,
    activeModule,
    setActiveModule,
    pendingApprovalsCount,
    branding,
    currentUser,
    activeCompany
  } = usePlatform();
  const isAr = lang === 'ar';
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (title: string) => {
    setCollapsedCategories(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const visibleFeatures = getVisibleFeatures(currentUser?.role || 'Super Admin', (activeCompany as any)?.vertical || (activeCompany as any)?.industry || '');

  const navCategories: NavCategory[] = [
    { titleEn: 'Workspace', titleAr: 'المساحة', items: visibleFeatures.filter(feature => feature.navigationGroup === 'Workspace').map(feature => ({ id: feature.module as ModuleView, labelEn: feature.displayName.en, labelAr: feature.displayName.ar, icon: iconMap[feature.module] || iconMap.default })) },
    { titleEn: 'Sales', titleAr: 'المبيعات', items: visibleFeatures.filter(feature => feature.navigationGroup === 'Sales').map(feature => ({ id: feature.module as ModuleView, labelEn: feature.displayName.en, labelAr: feature.displayName.ar, icon: iconMap[feature.module] || iconMap.default, badge: feature.module === 'pos' ? 'POS' : undefined, badgeColor: feature.module === 'pos' ? 'bg-[#CDAF7D] text-slate-950 font-bold' : undefined })) },
    { titleEn: 'Purchases', titleAr: 'المشتريات', items: visibleFeatures.filter(feature => feature.navigationGroup === 'Purchases').map(feature => ({ id: feature.module as ModuleView, labelEn: feature.displayName.en, labelAr: feature.displayName.ar, icon: iconMap[feature.module] || iconMap.default })) },
    { titleEn: 'Inventory', titleAr: 'المخزون', items: visibleFeatures.filter(feature => feature.navigationGroup === 'Inventory').map(feature => ({ id: feature.module as ModuleView, labelEn: feature.displayName.en, labelAr: feature.displayName.ar, icon: iconMap[feature.module] || iconMap.default })) },
    { titleEn: 'Finance', titleAr: 'المالية', items: visibleFeatures.filter(feature => feature.navigationGroup === 'Finance').map(feature => ({ id: feature.module as ModuleView, labelEn: feature.displayName.en, labelAr: feature.displayName.ar, icon: iconMap[feature.module] || iconMap.default })) },
    { titleEn: 'Operations', titleAr: 'العمليات', items: visibleFeatures.filter(feature => feature.navigationGroup === 'Operations').map(feature => ({ id: feature.module as ModuleView, labelEn: feature.displayName.en, labelAr: feature.displayName.ar, icon: iconMap[feature.module] || iconMap.default })) },
    { titleEn: 'Reports', titleAr: 'التقارير', items: visibleFeatures.filter(feature => feature.navigationGroup === 'Reports').map(feature => ({ id: feature.module as ModuleView, labelEn: feature.displayName.en, labelAr: feature.displayName.ar, icon: iconMap[feature.module] || iconMap.default })) },
    { titleEn: 'Administration', titleAr: 'الإدارة', items: visibleFeatures.filter(feature => feature.navigationGroup === 'Administration').map(feature => ({ id: feature.module as ModuleView, labelEn: feature.displayName.en, labelAr: feature.displayName.ar, icon: iconMap[feature.module] || iconMap.default, badge: feature.module === 'workflows' && pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined, badgeColor: feature.module === 'workflows' ? 'bg-rose-500 text-white font-bold' : undefined })) }
  ].filter(category => category.items.length > 0);

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-[#0B1D36] px-3 py-4 hidden md:flex flex-col justify-between select-none overflow-y-auto max-h-[calc(100vh-4.25rem)]">
      <div className="space-y-5">
        {navCategories.map((cat) => {
          const isCollapsed = collapsedCategories[cat.titleEn];
          return (
            <div key={cat.titleEn} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleCategory(cat.titleEn)}
                className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white/80 transition cursor-pointer"
              >
                <span>{isAr ? cat.titleAr : cat.titleEn}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>

              {!isCollapsed && (
                <nav className="space-y-0.5">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveModule(item.id)}
                        style={isActive ? {
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          borderColor: branding?.accentColor || '#CDAF7D'
                        } : {}}
                        className={`w-full min-h-[38px] flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition cursor-pointer ${
                          isActive ? 'text-white font-bold border-s-2' : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate min-w-0">
                          <Icon className="w-4 h-4 shrink-0" style={isActive ? { color: branding?.accentColor || '#CDAF7D' } : {}} />
                          <span className="truncate text-xs font-semibold">{isAr ? item.labelAr : item.labelEn}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge ? (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'text-white'}`} style={!item.badgeColor ? { backgroundColor: branding?.accentColor || '#CDAF7D' } : {}}>{item.badge}</span>
                          ) : isActive ? <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" style={{ color: branding?.accentColor || '#CDAF7D' }} /> : null}
                        </div>
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-4 mt-4 border-t border-white/10">
        <div className="rounded-xl bg-white/5 p-3 border border-white/10 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-white font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: branding?.accentColor || '#CDAF7D' }} />
              <span className="font-bold truncate max-w-[140px]">{isAr ? (branding?.appNameAr || branding?.appName || 'نظام إيه إم لإدارة الأعمال') : (branding?.appName || 'AM Business OS')}</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border" style={{ color: branding?.accentColor || '#CDAF7D', backgroundColor: `${branding?.accentColor || '#CDAF7D'}1A`, borderColor: `${branding?.accentColor || '#CDAF7D'}33` }}>v2.8.0</span>
          </div>
          <p className="text-[10px] text-white/55 leading-normal">{branding?.tradingName || (isAr ? 'منصة متكاملة لتخطيط موارد المؤسسات وإدارة الأعمال' : 'Integrated ERP & business management')}</p>
          {branding?.showPoweredBy !== false && <p className="text-[10px] text-white/45">Powered by AM CONSULTANT</p>}
        </div>
      </div>
    </aside>
  );
};
