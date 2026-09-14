<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/layout/PageHeader.vue';
import { TraApi, type DashboardStats, type Appeal } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const stats = ref<DashboardStats>({});
const recent = ref<Appeal[]>([]);
const loading = ref(true);

const n = (v: number | undefined) => v ?? 0;

const tiles = () => {
  const s = stats.value;
  if (s.role === 'officer') {
    return [
      { label: 'My Cases', value: n(s.myCases), icon: 'pi pi-briefcase' },
      { label: 'Pending Replies', value: n(s.myPendingReplies), icon: 'pi pi-pencil' },
      { label: 'Overdue', value: n(s.myOverdue), icon: 'pi pi-exclamation-triangle', danger: n(s.myOverdue) > 0 },
      { label: 'Upcoming Hearings', value: n(s.myUpcomingHearings), icon: 'pi pi-calendar-clock' },
      { label: 'Decided', value: n(s.decided), icon: 'pi pi-verified' },
    ];
  }
  return [
    { label: 'Appeals Against TRA', value: n(s.totalAppeals), icon: 'pi pi-briefcase' },
    { label: 'Unassigned', value: n(s.unassigned), icon: 'pi pi-user-plus', danger: n(s.unassigned) > 0 },
    { label: 'Pending Replies', value: n(s.pendingReplies), icon: 'pi pi-pencil' },
    { label: 'Overdue', value: n(s.overdue), icon: 'pi pi-exclamation-triangle', danger: n(s.overdue) > 0 },
    { label: 'Upcoming Hearings', value: n(s.upcomingHearings), icon: 'pi pi-calendar-clock' },
    { label: 'Decided', value: n(s.decided), icon: 'pi pi-verified' },
  ];
};

onMounted(async () => {
  try {
    stats.value = await TraApi.dashboard();
    const res = await TraApi.appeals({ page: 1, size: 6, scope: auth.isAdmin ? 'all' : 'mine' });
    recent.value = res.items;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <PageHeader title="Dashboard" :crumbs="['Tax Appeals', 'Dashboard']" />

    <p class="text-sm text-tra-muted -mt-2 mb-5">
      Welcome back, <strong class="text-tra-black">{{ auth.fullName }}</strong>. Here is the state of appeals filed against TRA.
    </p>

    <!-- Stat tiles -->
    <div class="tra-stats">
      <div class="tra-stat" :class="{ danger: (t as any).danger }" v-for="t in tiles()" :key="t.label">
        <div class="ico"><i :class="t.icon"></i></div>
        <div class="label">{{ t.label }}</div>
        <div class="value">{{ t.value.toLocaleString() }}</div>
      </div>
    </div>

    <!-- Recent appeals -->
    <div class="tra-card">
      <div class="tra-card-pad flex items-center justify-between" style="border-bottom:1px solid var(--tra-border)">
        <h3 class="font-extrabold text-tra-black text-base m-0">Recent Appeals</h3>
        <span class="tra-link" @click="router.push('/appeals')">View all <i class="pi pi-arrow-right text-[11px]"></i></span>
      </div>
      <div class="tra-scroll-x">
        <table class="w-full" style="border-collapse:collapse">
          <thead>
            <tr class="text-left" style="background:#f4f5f6">
              <th class="th">Appeal No.</th>
              <th class="th">Appellant</th>
              <th class="th">Tax Type</th>
              <th class="th">Filed</th>
              <th class="th">Reply</th>
              <th class="th">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in recent" :key="a.id" class="row" @click="router.push(`/appeals/${a.id}`)">
              <td class="td font-bold text-tra-ink">{{ a.appealNo || '—' }}</td>
              <td class="td">{{ a.appellantName }}</td>
              <td class="td">{{ a.taxType?.name || '—' }}</td>
              <td class="td">{{ a.dateOfFiling }}</td>
              <td class="td">
                <span class="tra-badge" :class="a.traReplied ? 'green' : 'amber'">
                  {{ a.traReplied ? 'Filed' : 'Pending' }}
                </span>
              </td>
              <td class="td"><span class="tra-badge grey">{{ a.statusTrend }}</span></td>
            </tr>
            <tr v-if="!loading && !recent.length">
              <td colspan="6">
                <div class="tra-empty"><i class="pi pi-inbox"></i>No appeals filed against TRA yet.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.th { padding: 11px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--tra-ink); }
.td { padding: 12px 16px; font-size: 13px; border-top: 1px solid #eef0f2; }
.row { cursor: pointer; }
.row:hover { background: #fcfbf3; }
.tra-stat.danger { border-color: var(--tra-danger); }
.tra-stat.danger .value { color: var(--tra-danger); }
</style>
