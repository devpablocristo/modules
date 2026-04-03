import { useEffect, useState, type FormEvent } from 'react';
import { confirmAction } from '@devpablocristo/core-browser';
import type { Booking, SchedulingCalendarCopy, Service, TimeSlot } from './types';

export type SchedulingBookingDraft = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
};

export type SchedulingBookingModalState =
  | {
      open: false;
    }
  | {
      open: true;
      mode: 'create';
      slot: TimeSlot;
      service?: Service;
      resourceName?: string;
      draft: SchedulingBookingDraft;
    }
  | {
      open: true;
      mode: 'details';
      booking: Booking;
      service?: Service;
      resourceName?: string;
    };

export type SchedulingBookingAction =
  | 'confirm'
  | 'cancel'
  | 'check_in'
  | 'start_service'
  | 'complete'
  | 'no_show';

type Props = {
  state: SchedulingBookingModalState;
  copy: SchedulingCalendarCopy;
  saving?: boolean;
  onClose: () => void;
  onCreate: (draft: SchedulingBookingDraft) => Promise<void> | void;
  onAction: (action: SchedulingBookingAction, booking: Booking) => Promise<void> | void;
};

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function actionButtons(status: Booking['status']): SchedulingBookingAction[] {
  switch (status) {
    case 'hold':
    case 'pending_confirmation':
      return ['confirm', 'cancel'];
    case 'confirmed':
      return ['check_in', 'cancel', 'no_show'];
    case 'checked_in':
      return ['start_service', 'cancel'];
    case 'in_service':
      return ['complete'];
    default:
      return [];
  }
}

function actionLabel(copy: SchedulingCalendarCopy, action: SchedulingBookingAction): string {
  switch (action) {
    case 'confirm':
      return copy.confirmBooking;
    case 'cancel':
      return copy.cancelBooking;
    case 'check_in':
      return copy.checkInBooking;
    case 'start_service':
      return copy.startService;
    case 'complete':
      return copy.completeBooking;
    case 'no_show':
      return copy.noShowBooking;
  }
}

export function SchedulingBookingModal({ state, copy, saving = false, onClose, onCreate, onAction }: Props) {
  const [draft, setDraft] = useState<SchedulingBookingDraft>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  });

  useEffect(() => {
    if (state.open && state.mode === 'create') {
      setDraft(state.draft);
    }
  }, [state]);

  if (!state.open) {
    return null;
  }

  const closeWithGuard = async () => {
    if (saving) {
      return;
    }
    if (state.mode === 'create') {
      const dirty =
        draft.customerName.trim() !== state.draft.customerName.trim() ||
        draft.customerPhone.trim() !== state.draft.customerPhone.trim() ||
        draft.customerEmail.trim() !== state.draft.customerEmail.trim() ||
        draft.notes.trim() !== state.draft.notes.trim();
      if (dirty) {
        const confirmed = await confirmAction({
          title: copy.closeDirtyTitle,
          description: copy.closeDirtyDescription,
          confirmLabel: copy.discard,
          cancelLabel: copy.keepEditing,
          tone: 'danger',
        });
        if (!confirmed) {
          return;
        }
      }
    }
    onClose();
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreate(draft);
  };

  return (
    <div className="modules-scheduling__backdrop app-modal-backdrop" role="presentation" onClick={() => void closeWithGuard()}>
      <div className="modules-scheduling__modal app-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="app-modal__header">
          <div className="app-modal__title-block">
            <p className="app-modal__eyebrow">
              {state.mode === 'create' ? copy.bookingSubtitleCreate : copy.bookingSubtitleDetails}
            </p>
            <h3 className="app-modal__title">
              {state.mode === 'create' ? copy.bookingTitleCreate : copy.bookingTitleDetails}
            </h3>
            <p className="app-modal__subtitle">
              {state.mode === 'create'
                ? `${formatDateTime(state.slot.start_at)} • ${state.resourceName ?? state.slot.resource_name}`
                : `${formatDateTime(state.booking.start_at)} • ${state.resourceName ?? state.booking.resource_id}`}
            </p>
          </div>
          <button type="button" className="app-modal__close" aria-label={copy.close} onClick={() => void closeWithGuard()}>
            ×
          </button>
        </div>

        {state.mode === 'create' ? (
          <form className="app-modal__body modules-scheduling__modal-form" onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="scheduling-customer-name">{copy.customerNameLabel}</label>
              <input
                id="scheduling-customer-name"
                value={draft.customerName}
                onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))}
                required
                autoFocus
              />
            </div>

            <div className="modules-scheduling__form-row">
              <div className="form-group grow">
                <label htmlFor="scheduling-customer-phone">{copy.customerPhoneLabel}</label>
                <input
                  id="scheduling-customer-phone"
                  value={draft.customerPhone}
                  onChange={(event) => setDraft((current) => ({ ...current, customerPhone: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group grow">
                <label htmlFor="scheduling-customer-email">{copy.customerEmailLabel}</label>
                <input
                  id="scheduling-customer-email"
                  type="email"
                  value={draft.customerEmail}
                  onChange={(event) => setDraft((current) => ({ ...current, customerEmail: event.target.value }))}
                />
              </div>
            </div>

            <div className="modules-scheduling__detail-grid">
              <div className="modules-scheduling__detail">
                <span>{copy.serviceNameLabel}</span>
                <strong>{state.service?.name ?? '—'}</strong>
              </div>
              <div className="modules-scheduling__detail">
                <span>{copy.resourceNameLabel}</span>
                <strong>{state.resourceName ?? state.slot.resource_name}</strong>
              </div>
              <div className="modules-scheduling__detail">
                <span>{copy.slotLabel}</span>
                <strong>{formatDateTime(state.slot.start_at)}</strong>
              </div>
              <div className="modules-scheduling__detail">
                <span>{copy.slotRemainingLabel}</span>
                <strong>{state.slot.remaining}</strong>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="scheduling-notes">{copy.notesLabel}</label>
              <textarea
                id="scheduling-notes"
                rows={3}
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>

            <div className="app-modal__footer">
              <div className="app-modal__footer-spacer" aria-hidden />
              <button type="button" className="btn-secondary btn-sm app-modal__action" disabled={saving} onClick={() => void closeWithGuard()}>
                {copy.close}
              </button>
              <button type="submit" className="btn-primary btn-sm app-modal__action" disabled={saving}>
                {saving ? copy.saving : copy.create}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="app-modal__body modules-scheduling__modal-body">
              <div className="modules-scheduling__detail-grid">
                <div className="modules-scheduling__detail">
                  <span>{copy.customerNameLabel}</span>
                  <strong>{state.booking.customer_name}</strong>
                </div>
                <div className="modules-scheduling__detail">
                  <span>{copy.customerPhoneLabel}</span>
                  <strong>{state.booking.customer_phone || '—'}</strong>
                </div>
                <div className="modules-scheduling__detail">
                  <span>{copy.customerEmailLabel}</span>
                  <strong>{state.booking.customer_email || '—'}</strong>
                </div>
                <div className="modules-scheduling__detail">
                  <span>{copy.statusLabel}</span>
                  <strong>{copy.statuses[state.booking.status]}</strong>
                </div>
                <div className="modules-scheduling__detail">
                  <span>{copy.serviceNameLabel}</span>
                  <strong>{state.service?.name ?? state.booking.service_id}</strong>
                </div>
                <div className="modules-scheduling__detail">
                  <span>{copy.resourceNameLabel}</span>
                  <strong>{state.resourceName ?? state.booking.resource_id}</strong>
                </div>
                <div className="modules-scheduling__detail">
                  <span>{copy.slotLabel}</span>
                  <strong>{formatDateTime(state.booking.start_at)}</strong>
                </div>
                <div className="modules-scheduling__detail">
                  <span>{copy.referenceLabel}</span>
                  <strong>{state.booking.reference}</strong>
                </div>
              </div>
              {state.booking.notes ? (
                <div className="modules-scheduling__notes">
                  <span>{copy.notesLabel}</span>
                  <p>{state.booking.notes}</p>
                </div>
              ) : null}
            </div>
            <div className="app-modal__footer">
              {actionButtons(state.booking.status).map((action) => (
                <button
                  key={action}
                  type="button"
                  className={action === 'cancel' || action === 'no_show' ? 'btn-danger btn-sm app-modal__action' : 'btn-secondary btn-sm app-modal__action'}
                  onClick={() => void onAction(action, state.booking)}
                  disabled={saving}
                >
                  {actionLabel(copy, action)}
                </button>
              ))}
              <div className="app-modal__footer-spacer" aria-hidden />
              <button type="button" className="btn-secondary btn-sm app-modal__action" disabled={saving} onClick={onClose}>
                {copy.close}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
