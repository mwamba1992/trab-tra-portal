import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWithApp } from '@/test/mountPage';
import type { OfficerRecord } from '@/service/tra';

vi.mock('@/service/tra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/service/tra')>();
  return { ...actual, OfficerApi: { list: vi.fn(), create: vi.fn(), update: vi.fn() } };
});

import { OfficerApi } from '@/service/tra';
import OfficerDialog from './OfficerDialog.vue';

const peter = {
  id: 'o2',
  firstName: 'Peter',
  lastName: 'Auma',
  email: 'peter@tra.go.tz',
  status: 'active',
  role: { name: 'tra-officer' },
} as OfficerRecord;

const open = async (officer: OfficerRecord | null, currentUserId = 'officer-1') => {
  const { wrapper } = await mountWithApp(OfficerDialog, { props: { visible: false, officer, currentUserId } });
  await wrapper.setProps({ visible: true });
  return wrapper;
};

describe('OfficerDialog', () => {
  beforeEach(() => {
    vi.mocked(OfficerApi.create)
      .mockReset()
      .mockImplementation((data) => Promise.resolve({ ...peter, ...data } as OfficerRecord));
    vi.mocked(OfficerApi.update)
      .mockReset()
      .mockImplementation((_id, data) => Promise.resolve({ ...peter, ...data } as OfficerRecord));
  });

  it('explains every missing field and does not create the officer', async () => {
    const wrapper = await open(null);

    await wrapper.find('#officer-form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('First name is required.');
    expect(wrapper.text()).toContain('Email is required.');
    expect(wrapper.text()).toContain('An initial password is required.');
    expect(wrapper.find('#officer-form-firstName').attributes('aria-invalid')).toBe('true');
    expect(OfficerApi.create).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('creates an administrator with trimmed details', async () => {
    const wrapper = await open(null);

    await wrapper.find('#officer-form-firstName').setValue('  Grace ');
    await wrapper.find('#officer-form-lastName').setValue('Mushi');
    await wrapper.find('#officer-form-email').setValue('grace@tra.go.tz');
    await wrapper.find('#officer-form-password').setValue('Initial#2026');
    await wrapper.find('#officer-form-role').setValue('admin');
    await wrapper.find('#officer-form').trigger('submit');
    await flushPromises();

    expect(OfficerApi.create).toHaveBeenCalledWith({
      firstName: 'Grace',
      lastName: 'Mushi',
      email: 'grace@tra.go.tz',
      password: 'Initial#2026',
      isAdmin: true,
    });
    expect(wrapper.emitted('saved')).toHaveLength(1);
    const visibility = wrapper.emitted('update:visible') ?? [];
    expect(visibility[visibility.length - 1]).toEqual([false]);
    wrapper.unmount();
  });

  it('sends only the fields that changed when editing', async () => {
    const wrapper = await open(peter);
    expect((wrapper.find('#officer-form-email').element as HTMLInputElement).readOnly).toBe(true);

    await wrapper.find('#officer-form-lastName').setValue('Auma-Mrema');
    await wrapper.find('#officer-form-phone').setValue('0712000111');
    await wrapper.find('#officer-form').trigger('submit');
    await flushPromises();

    expect(OfficerApi.update).toHaveBeenCalledWith('o2', { lastName: 'Auma-Mrema', phone: '0712000111' });
    wrapper.unmount();
  });

  it('does not let officers change their own role', async () => {
    const wrapper = await open(peter, 'o2');
    expect(wrapper.find('#officer-form-role').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('You cannot change your own role.');
    wrapper.unmount();
  });
});
