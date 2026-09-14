<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Skeleton from 'primevue/skeleton';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/layout/PageHeader.vue';
import { TraApi, type DashboardStats, type Appeal } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';
import { replyBadge, isInteractiveTarget } from '@/components/lists/replyStatus';
import { formatDate, humanize } from '@/utils/format';
import { apiErrorMessage } from '@/utils/errors';

const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const stats = ref<DashboardStats>({});
const recent = ref<Appeal[]>([]);
const loading = ref(true);
const error = ref('');

interface Tile {
  label: string;
  value: number | undefined;
  icon: string;
  to: string;
  danger?: boolean;
}

// Until stats arrive, the signed-in role decides which tile set (and skeletons) to show.
const supervisor = computed(() => (stats.value.role ? stats.value.role === 'supervisor' : auth.isAdmin));

const tiles = computed<Tile[]>(() => {
  const s = stats.value;
  if (!supervisor.value) {
    return [
      { label: 'My Cases', value: s.myCases, icon: 'pi pi-briefcase', to: '/appeals?scope=mine' },
      { label: 'Pending Replies', value: s.myPendingReplies, icon: 'pi pi-pencil', to: '/appeals?scope=mine&reply=pending' },
      {
        label: 'Overdue',
        value: s.myOverdue,
        icon: 'pi pi-exclamation-triangle',
        to: '/appeals?scope=mine&overdue=1',
        danger: (s.myOverdue ?? 0) > 0,
      },
      { label: 'Upcoming Hearings', value: s.myUpcomingHearings, icon: 'pi pi-calendar-clock', to: '/summons' },
      { label: 'Decided', value: s.decided, icon: 'pi pi-verified', to: '/decisions' },
    ];
  }
  return [
    { label: 'Appeals Against TRA', value: s.totalAppeals, icon: 'pi pi-briefcase', to: '/appeals?scope=all' },
    {
      label: 'Unassigned',
      value: s.unassigned,
      icon: 'pi pi-user-plus',
      to: '/appeals?scope=all&officer=unassigned',
      danger: (s.unassigned ?? 0) > 0,
    },
    { label: 'Pending Replies', value: s.pendingReplies, icon: 'pi pi-pencil', to: '/appeals?scope=all&reply=pending' },
    {
      label: 'Overdue',
      value: s.overdue,
      icon: 'pi pi-exclamation-triangle',
      to: '/appeals?scope=all&overdue=1',
      danger: (s.overdue ?? 0) > 0,
    },
    { label: 'Upcoming Hearings', value: s.upcomingHearings, icon: 'pi pi-calendar-clock', to: '/summons' },
    { label: 'Decided', value: s.decided, icon: 'pi pi-verified', to: '/decisions' },
  ];
});

const tileLabel = (t: Tile) =>
  loading.value ? `${t.label}: loading` : error.value ? `${t.label}: unavailable` : `${t.label}: ${(t.value ?? 0).toLocaleString()}`;

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [s, res] = await Promise.all([TraApi.dashboard(), TraApi.appeals({ page: 1, size: 6, scope: auth.isAdmin ? 'all' : 'mine' })]);
    stats.value = s;
    recent.value = res.items;
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not load the dashboard.');
    toast.add({ severity: 'error', summary: 'Dashboard unavailable', detail: error.value, life: 5000 });
  } finally {
    loading.value = false;
  }
};

const openRow = (event: MouseEvent, id: string) => {
  if (isInteractiveTarget(event) || window.getSelection()?.toString()) return;
  router.push(`/appeals/${id}`);
};

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="Dashboard" :crumbs="['Tax Appeals', 'Dashboard']" />

    <p class="text-sm text-tra-muted -mt-2 mb-5">
      Welcome back, <strong class="text-tra-black">{{ auth.fullName }}</strong
      >. Here is the state of appeals filed against TRA.
    </p>

    <div v-if="error" class="tra-card tra-card-pad mb-4 flex items-center gap-3 flex-wrap dash-error" role="alert">
      <i class="pi pi-exclamation-circle"></i>
      <span class="text-sm">{{ error }}</span>
      <button type="button" class="tra-btn tra-btn-ghost ml-auto" @click="load"><i class="pi pi-refresh"></i> Retry</button>
    </div>

    <!-- Stat tiles: each opens the matching filtered list -->
    <div class="tra-stats" :aria-busy="loading">
      <router-link
        v-for="t in tiles"
        :key="t.label"
        :to="t.to"
        class="tra-stat tile-link"
        :class="{ danger: !loading && !error && t.danger }"
        :aria-label="tileLabel(t)"
      >
        <div class="ico" aria-hidden="true"><i :class="t.icon"></i></div>
        <div class="label">{{ t.label }}</div>
        <div class="value">
          <Skeleton v-if="loading" width="4rem" height="2rem" class="mt-1" />
          <template v-else-if="error">-</template>
          <template v-else>{{ (t.value ?? 0).toLocaleString() }}</template>
        </div>
      </router-link>
    </div>

    <!-- Recent appeals -->
    <div class="tra-card">
      <div class="tra-card-pad flex items-center justify-between" style="border-bottom: 1px solid var(--tra-border)">
        <h3 class="font-extrabold text-tra-black text-base m-0">Recent Appeals</h3>
        <router-link to="/appeals" class="tra-link">View all <i class="pi pi-arrow-right text-[11px]" aria-hidden="true"></i></router-link>
      </div>
      <div class="tra-scroll-x">
        <table class="w-full" style="border-collapse: collapse">
          <thead>
            <tr class="text-left" style="background: #f4f5f6">
              <th class="th" scope="col">Appeal No.</th>
              <th class="th" scope="col">Appellant</th>
              <th class="th" scope="col">Tax Type</th>
              <th class="th" scope="col">Filed</th>
              <th class="th" scope="col">Reply</th>
              <th class="th" scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="i in 3" :key="`sk-${i}`">
                <td v-for="c in 6" :key="c" class="td"><Skeleton height="1rem" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="a in recent" :key="a.id" class="row" @click="openRow($event, a.id)">
                <td class="td">
                  <router-link :to="`/appeals/${a.id}`" class="row-link">{{ a.appealNo || 'No number yet' }}</router-link>
                </td>
                <td class="td">{{ a.appellantName }}</td>
                <td class="td">{{ a.taxType?.name || '-' }}</td>
                <td class="td">{{ formatDate(a.dateOfFiling) }}</td>
                <td class="td">
                  <span class="tra-badge" :class="replyBadge(a).cls" :title="replyBadge(a).title || undefined">{{
                    replyBadge(a).text
                  }}</span>
                </td>
                <td class="td">
                  <span class="tra-badge grey">{{ humanize(a.statusTrend) }}</span>
                </td>
              </tr>
              <tr v-if="!error && !recent.length">
                <td colspan="6">
                  <div class="tra-empty"><i class="pi pi-inbox"></i>No appeals filed against TRA yet.</div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.th {
  padding: 11px 16px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tra-ink);
}
.td {
  padding: 12px 16px;
  font-size: 13px;
  border-top: 1px solid #eef0f2;
}
.row {
  cursor: pointer;
}
.row:hover {
  background: #fcfbf3;
}
.row-link {
  font-weight: 700;
  color: var(--tra-ink);
  text-decoration: none;
}
.row-link:hover {
  text-decoration: underline;
  text-decoration-color: var(--tra-yellow-dark);
}
.tile-link {
  display: block;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.tile-link:hover {
  border-color: var(--tra-border-strong);
  box-shadow: var(--tra-shadow-lg);
}
.tile-link:focus-visible,
.row-link:focus-visible,
.tra-link:focus-visible {
  outline: 2px solid var(--tra-yellow-dark);
  outline-offset: 2px;
}
.tra-stat.danger {
  border-color: var(--tra-danger);
}
.tra-stat.danger .value {
  color: var(--tra-danger);
}
.dash-error {
  border-color: var(--tra-danger);
  color: var(--tra-danger);
}
</style>
