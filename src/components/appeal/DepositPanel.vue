<script setup lang="ts">
import { computed } from 'vue';
import type { AppealDetail, CurrencyAmount } from '@/service/tra';

const props = defineProps<{ appeal: AppealDetail }>();

const deposit = computed(() => props.appeal.deposit ?? null);
const hasFigures = computed(() => !!deposit.value && (deposit.value.disputed.length > 0 || deposit.value.bill));

const money = (a: CurrencyAmount) => `${a.currency} ${a.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
</script>

<template>
  <section v-if="hasFigures" class="deposit" aria-labelledby="deposit-title">
    <h3 id="deposit-title" class="deposit-title">Deposit Check</h3>

    <template v-if="deposit?.disputed.length">
      <dl class="rows">
        <div>
          <dt>Tax in dispute</dt>
          <dd>
            <div v-for="a in deposit.disputed" :key="`d-${a.currency}`">{{ money(a) }}</div>
          </dd>
        </div>
        <div>
          <dt>One third</dt>
          <dd>
            <div v-for="a in deposit.oneThird" :key="`t-${a.currency}`">{{ money(a) }}</div>
          </dd>
        </div>
      </dl>
    </template>
    <p v-else class="note">No disputed amounts recorded on this appeal.</p>

    <template v-if="deposit?.bill">
      <dl class="rows">
        <div>
          <dt>Filing fee</dt>
          <dd>
            {{ deposit.bill.currency }} {{ Number(deposit.bill.paidAmount).toLocaleString() }} of
            {{ Number(deposit.bill.billedAmount).toLocaleString() }}
            <span class="tra-badge" :class="deposit.bill.billPaid ? 'green' : 'amber'">{{
              deposit.bill.billPaid ? 'Paid' : 'Unpaid'
            }}</span>
          </dd>
        </div>
        <div v-if="deposit.bill.controlNumber">
          <dt>Control no.</dt>
          <dd>{{ deposit.bill.controlNumber }}</dd>
        </div>
      </dl>
    </template>

    <p class="note">
      The Act requires the tax not in dispute, or one third of the assessed tax, whichever is greater. The Board records the filing fee, not
      that deposit, so confirm the payment in TRA's own system.
    </p>
  </section>
</template>

<style scoped>
.deposit {
  margin: 0 0 16px;
  padding: 12px 14px;
  border: 1px solid var(--tra-border);
  border-radius: 9px;
}
.deposit-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tra-muted);
}
.rows {
  margin: 0 0 8px;
  display: grid;
  gap: 8px;
}
.rows dt {
  font-size: 11px;
  color: var(--tra-muted);
}
.rows dd {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--tra-black);
  font-variant-numeric: tabular-nums;
}
.note {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--tra-muted);
}
</style>
