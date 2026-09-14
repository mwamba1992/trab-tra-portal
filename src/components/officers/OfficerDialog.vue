<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { OfficerApi, type OfficerRecord, type UpdateOfficerInput } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import { emptyForm, formFromOfficer, isAdminOfficer, validateOfficer, type OfficerFormErrors, type OfficerFormValues } from './officerForm';

const props = defineProps<{
  /** The officer being edited, or null to create a new one. */
  officer: OfficerRecord | null;
  /** Current user's id: an officer cannot change their own role. */
  currentUserId?: string;
}>();
const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ (e: 'saved', officer: OfficerRecord): void }>();

const toast = useToast();
const form = ref<OfficerFormValues>(emptyForm());
const errors = ref<OfficerFormErrors>({});
const submitted = ref(false);
const saving = ref(false);
const serverError = ref('');

const isEdit = computed(() => props.officer !== null);
const isSelf = computed(() => !!props.officer && props.officer.id === props.currentUserId);
const idPrefix = 'officer-form';
const fieldId = (name: keyof OfficerFormValues) => `${idPrefix}-${name}`;
const errorId = (name: keyof OfficerFormValues) => `${idPrefix}-${name}-error`;

watch(visible, (open) => {
  if (!open) return;
  form.value = props.officer ? formFromOfficer(props.officer) : emptyForm();
  errors.value = {};
  submitted.value = false;
  serverError.value = '';
});

// Re-validate as the user types once they have tried to submit.
watch(
  form,
  (v) => {
    if (submitted.value) errors.value = validateOfficer(v, props.officer);
  },
  { deep: true },
);

const focusFirstError = async () => {
  await nextTick();
  const first = (Object.keys(errors.value) as Array<keyof OfficerFormValues>)[0];
  if (first) document.getElementById(fieldId(first))?.focus();
};

function buildUpdate(v: OfficerFormValues, o: OfficerRecord): UpdateOfficerInput {
  const patch: UpdateOfficerInput = {};
  if (v.firstName.trim() !== o.firstName) patch.firstName = v.firstName.trim();
  if (v.lastName.trim() !== o.lastName) patch.lastName = v.lastName.trim();
  const phone = v.phone.trim();
  if (phone && phone !== (o.phone ?? '')) patch.phone = phone;
  const wantsAdmin = v.role === 'admin';
  if (!isSelf.value && wantsAdmin !== isAdminOfficer(o)) patch.isAdmin = wantsAdmin;
  return patch;
}

const save = async () => {
  submitted.value = true;
  serverError.value = '';
  errors.value = validateOfficer(form.value, props.officer);
  if (Object.keys(errors.value).length) {
    await focusFirstError();
    return;
  }

  const v = form.value;
  saving.value = true;
  try {
    let saved: OfficerRecord;
    if (props.officer) {
      const patch = buildUpdate(v, props.officer);
      if (!Object.keys(patch).length) {
        visible.value = false;
        return;
      }
      saved = await OfficerApi.update(props.officer.id, patch);
      toast.add({ severity: 'success', summary: 'Officer updated', detail: `${saved.firstName} ${saved.lastName}`, life: 3000 });
    } else {
      const phone = v.phone.trim();
      saved = await OfficerApi.create({
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email: v.email.trim(),
        password: v.password,
        ...(phone ? { phone } : {}),
        isAdmin: v.role === 'admin',
      });
      toast.add({ severity: 'success', summary: 'Officer created', detail: `${saved.firstName} ${saved.lastName}`, life: 3000 });
    }
    visible.value = false;
    emit('saved', saved);
  } catch (e) {
    serverError.value = apiErrorMessage(e, isEdit.value ? 'Could not update the officer.' : 'Could not create the officer.');
    toast.add({ severity: 'error', summary: 'Save failed', detail: serverError.value, life: 5000 });
  } finally {
    saving.value = false;
  }
};

const invalid = (name: keyof OfficerFormValues) => (errors.value[name] ? 'true' : undefined);
const describedBy = (name: keyof OfficerFormValues) => (errors.value[name] ? errorId(name) : undefined);
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="isEdit ? 'Edit TRA Officer' : 'New TRA Officer'"
    modal
    :closable="!saving"
    :style="{ width: 'min(520px, calc(100vw - 32px))' }"
  >
    <form id="officer-form" class="officer-form" novalidate @submit.prevent="save">
      <div v-if="serverError" class="state-error" role="alert">
        <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
        <span>{{ serverError }}</span>
      </div>

      <div class="officer-form-row">
        <div>
          <label class="fld-label" :for="fieldId('firstName')">First name<span class="req" aria-hidden="true">*</span></label>
          <input
            :id="fieldId('firstName')"
            v-model="form.firstName"
            class="fld"
            autocomplete="given-name"
            required
            :aria-invalid="invalid('firstName')"
            :aria-describedby="describedBy('firstName')"
          />
          <p v-if="errors.firstName" :id="errorId('firstName')" class="fld-error">{{ errors.firstName }}</p>
        </div>
        <div>
          <label class="fld-label" :for="fieldId('lastName')">Last name<span class="req" aria-hidden="true">*</span></label>
          <input
            :id="fieldId('lastName')"
            v-model="form.lastName"
            class="fld"
            autocomplete="family-name"
            required
            :aria-invalid="invalid('lastName')"
            :aria-describedby="describedBy('lastName')"
          />
          <p v-if="errors.lastName" :id="errorId('lastName')" class="fld-error">{{ errors.lastName }}</p>
        </div>
      </div>

      <div>
        <label class="fld-label" :for="fieldId('email')"> Email<span v-if="!isEdit" class="req" aria-hidden="true">*</span> </label>
        <input
          :id="fieldId('email')"
          v-model="form.email"
          class="fld"
          type="email"
          autocomplete="off"
          :required="!isEdit"
          :readonly="isEdit"
          :aria-invalid="invalid('email')"
          :aria-describedby="isEdit ? `${fieldId('email')}-hint` : describedBy('email')"
        />
        <p v-if="isEdit" :id="`${fieldId('email')}-hint`" class="fld-hint">The sign-in email cannot be changed.</p>
        <p v-else-if="errors.email" :id="errorId('email')" class="fld-error">{{ errors.email }}</p>
      </div>

      <div>
        <label class="fld-label" :for="fieldId('phone')">Phone</label>
        <input
          :id="fieldId('phone')"
          v-model="form.phone"
          class="fld"
          type="tel"
          inputmode="tel"
          autocomplete="off"
          placeholder="0712345678"
          :aria-invalid="invalid('phone')"
          :aria-describedby="describedBy('phone')"
        />
        <p v-if="errors.phone" :id="errorId('phone')" class="fld-error">{{ errors.phone }}</p>
      </div>

      <div v-if="!isEdit">
        <label class="fld-label" :for="fieldId('password')">Initial password<span class="req" aria-hidden="true">*</span></label>
        <input
          :id="fieldId('password')"
          v-model="form.password"
          class="fld"
          type="password"
          autocomplete="new-password"
          required
          :aria-invalid="invalid('password')"
          :aria-describedby="describedBy('password')"
        />
        <p v-if="errors.password" :id="errorId('password')" class="fld-error">{{ errors.password }}</p>
      </div>

      <div>
        <label class="fld-label" :for="fieldId('role')">Role</label>
        <select
          :id="fieldId('role')"
          v-model="form.role"
          class="fld"
          :disabled="isSelf"
          :aria-describedby="isSelf ? `${fieldId('role')}-hint` : undefined"
        >
          <option value="officer">TRA Officer</option>
          <option value="admin">TRA Administrator (can manage officers)</option>
        </select>
        <p v-if="isSelf" :id="`${fieldId('role')}-hint`" class="fld-hint">You cannot change your own role.</p>
      </div>
    </form>

    <template #footer>
      <button type="button" class="tra-btn tra-btn-ghost" :disabled="saving" @click="visible = false">Cancel</button>
      <button type="submit" form="officer-form" class="tra-btn tra-btn-dark" :disabled="saving">
        <i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-check'" aria-hidden="true"></i>
        {{ isEdit ? 'Save changes' : 'Create officer' }}
      </button>
    </template>
  </Dialog>
</template>

<style scoped>
.officer-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 4px;
}
.officer-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 480px) {
  .officer-form-row {
    grid-template-columns: 1fr;
  }
}
</style>
