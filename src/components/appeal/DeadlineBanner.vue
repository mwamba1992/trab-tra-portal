<script setup lang="ts">
import { computed } from 'vue';
import type { AppealDetail } from '@/service/tra';
import { formatDate } from '@/utils/format';

const props = defineProps<{ appeal: AppealDetail }>();

// Reply-deadline banner state.
const deadline = computed(() => {
  const a = props.appeal;
  if (a.traReplied || a.replyStatus === 'REPLIED') {
    return {
      cls: 'ok',
      icon: 'pi-check-circle',
      text: `Statement of defence has been filed${a.repliedAt ? ` on ${formatDate(a.repliedAt)}` : ''}.`,
    };
  }
  if (a.caseClosed || a.replyStatus === 'NOT_REQUIRED')
    return { cls: 'info', icon: 'pi-info-circle', text: 'Case closed — a reply is no longer expected.' };
  if (a.overdue) return { cls: 'bad', icon: 'pi-exclamation-triangle', text: `Reply overdue — was due ${formatDate(a.replyDueDate)}.` };
  if (a.replyDueDate) {
    const d = a.daysRemaining ?? 0;
    return {
      cls: d <= 7 ? 'warn' : 'info',
      icon: 'pi-clock',
      text: `Reply due ${formatDate(a.replyDueDate)} — ${d} day${d === 1 ? '' : 's'} remaining.`,
    };
  }
  return null;
});
</script>

<template>
  <div v-if="deadline" class="deadline" :class="deadline.cls" role="status">
    <i class="pi" :class="deadline.icon" aria-hidden="true"></i><span>{{ deadline.text }}</span>
  </div>
</template>

<style scoped>
.deadline {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 16px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
  border: 1px solid;
}
.deadline.ok {
  background: #ecfdf3;
  color: #027a48;
  border-color: #a6f4c5;
}
.deadline.info {
  background: #eff8ff;
  color: #175cd3;
  border-color: #b2ddff;
}
.deadline.warn {
  background: #fffaeb;
  color: #b54708;
  border-color: #fedf89;
}
.deadline.bad {
  background: #fef3f2;
  color: #b42318;
  border-color: #fecdca;
}
</style>
