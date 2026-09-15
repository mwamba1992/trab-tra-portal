<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraApi, type AppealDetail, type Filing, type FilingType } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import SectionError from './SectionError.vue';
import { formatDateTime } from './appealUi';

const props = defineProps<{ appeal: AppealDetail; filings: Filing[]; canFile: boolean; error: string }>();
const emit = defineEmits<{ filed: []; retry: [] }>();

const toast = useToast();
const grounds = ref('');
const filing = ref(false);

const TYPE_LABELS: Record<FilingType, string> = {
  PRELIMINARY_OBJECTION: 'Preliminary objection',
  TRIBUNAL_APPEAL_INTENT: 'Intention to appeal to the Tribunal',
};

const decided = computed(() => !!props.appeal.outcomeOfDecision && props.appeal.outcomeOfDecision !== 'NO DECISION');
const intentFiled = computed(() => !!props.appeal.tribunalIntentFiledAt);
// Before the decision TRA raises objections; after it, TRA may give notice of appeal.
const formType = computed<FilingType>(() => (decided.value ? 'TRIBUNAL_APPEAL_INTENT' : 'PRELIMINARY_OBJECTION'));
const showForm = computed(() => props.canFile && !(decided.value && intentFiled.value));

// Tribunal window banner, decided appeals only.
const tribunal = computed(() => {
  const a = props.appeal;
  if (!decided.value) return null;
  if (a.tribunalIntentFiledAt)
    return {
      cls: 'ok',
      icon: 'pi-check-circle',
      text: `Intention to appeal to the Tribunal lodged on ${formatDate(a.tribunalIntentFiledAt)}.`,
    };
  if (a.wonBy === 'RESPONDENT')
    return {
      cls: 'info',
      icon: 'pi-verified',
      text: 'The Board decided in favour of TRA. An appeal to the Tribunal is not usually required.',
    };
  if (a.tribunalWindowLapsed)
    return {
      cls: 'bad',
      icon: 'pi-exclamation-triangle',
      text: `The 30-day window to appeal to the Tribunal closed on ${formatDate(a.tribunalDueDate)}. Lodging now needs an extension of time.`,
    };
  if (a.tribunalDueDate) {
    const d = a.tribunalDaysRemaining ?? 0;
    return {
      cls: d <= 7 ? 'warn' : 'info',
      icon: 'pi-clock',
      text: `Notice of intention to appeal to the Tribunal due ${formatDate(a.tribunalDueDate)}: ${d} day${d === 1 ? '' : 's'} remaining.`,
    };
  }
  return null;
});

const submit = async () => {
  if (!grounds.value.trim()) return;
  filing.value = true;
  try {
    await TraApi.lodgeFiling(props.appeal.id, formType.value, grounds.value);
    grounds.value = '';
    toast.add({ severity: 'success', summary: 'Lodged', detail: `${TYPE_LABELS[formType.value]} lodged`, life: 3000 });
    emit('filed');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lodging failed', detail: apiErrorMessage(e, 'The filing could not be lodged'), life: 4500 });
  } finally {
    filing.value = false;
  }
};
</script>

<template>
  <div>
    <div v-if="tribunal" class="banner" :class="tribunal.cls" role="status">
      <i class="pi" :class="tribunal.icon" aria-hidden="true"></i><span>{{ tribunal.text }}</span>
    </div>

    <div v-if="showForm" class="mb-5">
      <label for="filing-grounds" class="block text-xs font-bold text-tra-ink mb-1">
        {{ decided ? 'LODGE INTENTION TO APPEAL TO THE TRIBUNAL' : 'RAISE A PRELIMINARY OBJECTION' }}
      </label>
      <p class="text-xs text-tra-muted mt-0 mb-2">
        {{
          decided
            ? 'State the grounds on which TRA intends to challenge the Board’s decision.'
            : 'Points of law argued before the merits, such as time bar, jurisdiction, deposit not paid or defective pleadings.'
        }}
      </p>
      <textarea
        id="filing-grounds"
        v-model="grounds"
        rows="5"
        class="fld-area"
        :placeholder="decided ? 'Grounds of the intended appeal…' : 'Grounds of the preliminary objection…'"
        :disabled="filing"
      ></textarea>
      <div class="flex justify-end mt-2">
        <button type="button" class="tra-btn tra-btn-dark" :disabled="filing || !grounds.trim()" @click="submit">
          <i class="pi" :class="filing ? 'pi-spin pi-spinner' : 'pi-send'" aria-hidden="true"></i>
          {{ decided ? 'Lodge Intention to Appeal' : 'Lodge Objection' }}
        </button>
      </div>
    </div>

    <h2 class="sec-head">Lodged Filings</h2>
    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <article v-for="f in filings" :key="f.id" class="filing-card">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="tra-badge" :class="f.type === 'PRELIMINARY_OBJECTION' ? 'gold' : 'grey'">{{ TYPE_LABELS[f.type] }}</span>
            <strong class="text-sm text-tra-black">{{ f.filedByName || 'TRA Officer' }}</strong>
          </div>
          <span class="text-xs text-tra-muted">{{ formatDateTime(f.createdAt) }}</span>
        </div>
        <p class="text-sm text-tra-text whitespace-pre-wrap m-0">{{ f.grounds }}</p>
      </article>
      <div v-if="!filings.length" class="tra-empty">
        <i class="pi pi-flag" aria-hidden="true"></i>No objections or appeal notices lodged.
      </div>
    </template>
  </div>
</template>

<style scoped>
.banner {
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
.banner.ok {
  background: #ecfdf3;
  color: #027a48;
  border-color: #a6f4c5;
}
.banner.info {
  background: #eff8ff;
  color: #175cd3;
  border-color: #b2ddff;
}
.banner.warn {
  background: #fffaeb;
  color: #b54708;
  border-color: #fedf89;
}
.banner.bad {
  background: #fef3f2;
  color: #b42318;
  border-color: #fecdca;
}
.sec-head {
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 8px;
}
.filing-card {
  border: 1px solid var(--tra-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  background: #fcfcfd;
}
.fld-area {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}
.fld-area:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
