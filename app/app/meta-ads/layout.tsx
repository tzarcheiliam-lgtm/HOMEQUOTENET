import { requireProfile } from '@/lib/auth';
import { canViewMetaAds, isHqnAdministrator } from '@/lib/permissions';
import { StudioTabs, type Tab } from '@/components/meta/studio/ui';

/**
 * Shared frame for every Meta Ads page. The Overview/Campaigns reporting is shared with contractor owners (RLS
 * decides which rows); the Studio sections (creatives, ad creation, audits, rules, settings) are HQN-admin only,
 * and each of those pages repeats the server-side admin check - hiding a tab is never the protection.
 */
export default async function MetaAdsLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const admin = isHqnAdministrator(profile);
  const tabs: Tab[] = [{ href: '/app/meta-ads', label: 'Overview & Campaigns' }];
  if (admin) tabs.push(
    { href: '/app/meta-ads/creatives', label: 'Creative Library' },
    { href: '/app/meta-ads/create', label: 'Create Ad' },
    { href: '/app/meta-ads/audits', label: 'Audits & Recommendations' },
    { href: '/app/meta-ads/rules', label: 'Optimization Rules' },
    { href: '/app/meta-ads/settings', label: 'Activity & Settings' },
  );
  return (
    <div className="space-y-6">
      {canViewMetaAds(profile) && tabs.length > 1 && <StudioTabs tabs={tabs} />}
      {children}
    </div>
  );
}
