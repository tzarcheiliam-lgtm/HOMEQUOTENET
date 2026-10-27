import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { getContractorDashboard } from '@/lib/data/contractor-dashboard';
import { getAdminDashboard } from '@/lib/data/admin-dashboard';
import { getGrowthContext } from '@/lib/data/service-requests';
import { OPEN_REQUEST_STATUSES } from '@/lib/growth/catalog';
import { ContractorDashboard } from '@/components/dashboard/contractor-dashboard';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { MobileHome } from '@/components/dashboard/mobile-home';
import { SetterDashboard } from '@/components/setter/setter-dashboard';
import { getSetterDashboard } from '@/lib/data/setter-dashboard';
import { getMobileHome } from '@/lib/data/mobile-home';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Dashboard · HomeQuote Network' };

export default async function DashboardPage() {
  const profile = await requireProfile();

  // A caller's whole job is the calling workspace; /app is just the way in.
  if (profile.role === 'caller') redirect('/app/calls');

  // Phones get the action center; the existing dashboards below are untouched and
  // shown from lg up, so desktop is unchanged.
  const mobile = await getMobileHome(profile).catch(() => null);
  const withMobile = (desktop: React.ReactNode) => (
    <>
      {mobile ? <MobileHome data={mobile} name={profile.full_name} role={profile.role} /> : null}
      <div className={mobile ? 'hidden lg:block' : undefined}>{desktop}</div>
    </>
  );

  if (profile.role === 'contractor') {
    const [data, growth] = await Promise.all([
      getContractorDashboard(),
      // The services card is optional: if it can't load, the dashboard still does.
      getGrowthContext(profile)
        .then((g) =>
          g.company
            ? {
                recommendation: g.recommendation,
                openRequests: g.requests.filter((r) =>
                  OPEN_REQUEST_STATUSES.includes(r.status)
                ).length,
              }
            : null
        )
        .catch(() => null),
    ]);
    return withMobile(<ContractorDashboard data={data} name={profile.full_name} growth={growth} />);
  }

  if (profile.role === 'admin') {
    const data = await getAdminDashboard();
    return withMobile(<AdminDashboard data={data} name={profile.full_name} />);
  }

  // Setters: one money-first home for phone and desktop. If its numbers cannot
  // be read, fall back to the phone action center / a plain welcome.
  const setter = await getSetterDashboard(profile.id).catch((e) => {
    console.error('[home] setter dashboard failed', e);
    return null;
  });
  if (setter) return <SetterDashboard d={setter} name={profile.full_name} />;
  return withMobile(
    <PageHeader showTitleOnMobile title={`Welcome${profile.full_name ? `, ${profile.full_name}` : ''}`} description="Leads to work and appointments to set." />
  );
}
