import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventClickArg, EventInput } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { confirmAction } from '@devpablocristo/core-browser';
import {
  CalendarSurface,
  resolveInitialTimeGridScrollTime,
  type CalendarView,
} from '@devpablocristo/modules-calendar-board';
import type { SchedulingClient } from './client';
import {
  SchedulingBookingModal,
  type SchedulingBookingAction,
  type SchedulingBookingDraft,
  type SchedulingBookingModalState,
} from './SchedulingBookingModal';
import type { Booking, BookingStatus, Branch, DashboardStats, Resource, SchedulingCalendarCopy, Service, TimeSlot } from './types';

const schedulingKeys = {
  branches: ['scheduling', 'branches'] as const,
  services: ['scheduling', 'services'] as const,
  resources: (branchId: string | null) => ['scheduling', 'resources', branchId ?? 'all'] as const,
  dashboard: (branchId: string | null, day: string) => ['scheduling', 'dashboard', branchId ?? 'all', day] as const,
  slots: (branchId: string | null, serviceId: string | null, resourceId: string | null, day: string) =>
    ['scheduling', 'slots', branchId ?? 'none', serviceId ?? 'none', resourceId ?? 'any', day] as const,
  bookingsRange: (branchId: string | null, start: string, end: string) =>
    ['scheduling', 'bookings-range', branchId ?? 'none', start, end] as const,
};

export const schedulingCalendarCopyPresets: Record<'en' | 'es', SchedulingCalendarCopy> = {
  en: {
    branchLabel: 'Branch',
    serviceLabel: 'Service',
    resourceLabel: 'Resource',
    anyResource: 'Any resource',
    focusDateLabel: 'Focus date',
    summaryTitle: 'Daily picture',
    summaryBookings: 'Bookings',
    summaryConfirmed: 'Confirmed',
    summaryQueues: 'Active queues',
    summaryWaiting: 'Waiting tickets',
    slotsTitle: 'Available slots',
    slotsDescription: 'Slots are generated from availability rules, buffers, and conflicts.',
    slotsEmpty: 'No slots available for the current filters.',
    slotsLoading: 'Loading slots…',
    loading: 'Loading schedule…',
    unavailableTitle: 'Scheduling is not configured yet',
    unavailableDescription: 'Create at least one active branch and one schedule-enabled service to use this calendar.',
    filtersTitle: 'Filters',
    filtersDescription: 'Branch and service are mandatory. Resource is optional.',
    timelineTitle: 'Operational timeline',
    timelineDescription: 'Bookings are shown on the calendar. New bookings should be created from available slots.',
    openBooking: 'Book slot',
    bookingTitleCreate: 'Create booking',
    bookingTitleDetails: 'Booking details',
    bookingSubtitleCreate: 'New reservation',
    bookingSubtitleDetails: 'Current lifecycle state',
    customerNameLabel: 'Customer name',
    customerPhoneLabel: 'Phone',
    customerEmailLabel: 'Email',
    notesLabel: 'Notes',
    statusLabel: 'Status',
    serviceNameLabel: 'Service',
    resourceNameLabel: 'Resource',
    slotLabel: 'Slot',
    slotRemainingLabel: 'Remaining',
    referenceLabel: 'Reference',
    close: 'Close',
    create: 'Create booking',
    saving: 'Saving…',
    cancelBooking: 'Cancel booking',
    confirmBooking: 'Confirm booking',
    checkInBooking: 'Check in',
    startService: 'Start service',
    completeBooking: 'Complete',
    noShowBooking: 'Mark no-show',
    rescheduleBooking: 'Reschedule booking',
    dragRescheduleTitle: 'Reschedule booking',
    dragRescheduleDescription: 'Do you want to move this booking to the new slot?',
    destructiveTitle: 'Confirm action',
    cancelActionDescription: 'This booking will be cancelled and removed from the active agenda.',
    noShowActionDescription: 'This booking will be marked as no-show.',
    closeDirtyTitle: 'Discard booking draft',
    closeDirtyDescription: 'You have unsaved customer data in this booking draft.',
    keepEditing: 'Keep editing',
    discard: 'Discard',
    searchPlaceholder: 'Search bookings, customers, resources…',
    statuses: {
      hold: 'Hold',
      pending_confirmation: 'Pending confirmation',
      confirmed: 'Confirmed',
      checked_in: 'Checked in',
      in_service: 'In service',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No show',
      expired: 'Expired',
    },
  },
  es: {
    branchLabel: 'Sucursal',
    serviceLabel: 'Servicio',
    resourceLabel: 'Recurso',
    anyResource: 'Cualquier recurso',
    focusDateLabel: 'Fecha foco',
    summaryTitle: 'Panorama diario',
    summaryBookings: 'Reservas',
    summaryConfirmed: 'Confirmadas',
    summaryQueues: 'Colas activas',
    summaryWaiting: 'Esperando',
    slotsTitle: 'Slots disponibles',
    slotsDescription: 'Los slots se calculan con disponibilidad, buffers y conflictos.',
    slotsEmpty: 'No hay slots disponibles para los filtros actuales.',
    slotsLoading: 'Cargando slots…',
    loading: 'Cargando agenda…',
    unavailableTitle: 'Scheduling todavía no está configurado',
    unavailableDescription: 'Creá al menos una sucursal activa y un servicio de agenda para usar este calendario.',
    filtersTitle: 'Filtros',
    filtersDescription: 'Sucursal y servicio son obligatorios. Recurso es opcional.',
    timelineTitle: 'Agenda operativa',
    timelineDescription: 'El calendario muestra reservas. Las nuevas reservas se crean desde slots disponibles.',
    openBooking: 'Reservar slot',
    bookingTitleCreate: 'Crear reserva',
    bookingTitleDetails: 'Detalle de la reserva',
    bookingSubtitleCreate: 'Nueva reserva',
    bookingSubtitleDetails: 'Estado actual del turno',
    customerNameLabel: 'Cliente',
    customerPhoneLabel: 'Teléfono',
    customerEmailLabel: 'Email',
    notesLabel: 'Notas',
    statusLabel: 'Estado',
    serviceNameLabel: 'Servicio',
    resourceNameLabel: 'Recurso',
    slotLabel: 'Slot',
    slotRemainingLabel: 'Cupos',
    referenceLabel: 'Referencia',
    close: 'Cerrar',
    create: 'Crear reserva',
    saving: 'Guardando…',
    cancelBooking: 'Cancelar reserva',
    confirmBooking: 'Confirmar',
    checkInBooking: 'Check-in',
    startService: 'Iniciar atención',
    completeBooking: 'Completar',
    noShowBooking: 'Marcar no-show',
    rescheduleBooking: 'Reprogramar reserva',
    dragRescheduleTitle: 'Reprogramar reserva',
    dragRescheduleDescription: '¿Querés mover esta reserva al nuevo horario?',
    destructiveTitle: 'Confirmar acción',
    cancelActionDescription: 'La reserva se cancelará y saldrá de la agenda activa.',
    noShowActionDescription: 'La reserva se marcará como no-show.',
    closeDirtyTitle: 'Descartar borrador',
    closeDirtyDescription: 'Hay datos cargados sin guardar en esta reserva.',
    keepEditing: 'Seguir editando',
    discard: 'Descartar',
    searchPlaceholder: 'Buscar reservas, clientes, recursos…',
    statuses: {
      hold: 'Hold',
      pending_confirmation: 'Pendiente de confirmación',
      confirmed: 'Confirmada',
      checked_in: 'Check-in',
      in_service: 'En atención',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No-show',
      expired: 'Expirada',
    },
  },
};

export type SchedulingCalendarProps = {
  client: SchedulingClient;
  searchQuery?: string;
  copy?: Partial<SchedulingCalendarCopy>;
  locale?: 'en' | 'es';
  initialBranchId?: string;
  initialServiceId?: string;
  initialResourceId?: string | null;
  initialDate?: string;
  className?: string;
};

type VisibleRange = {
  start: Date;
  end: Date;
};

type CalendarEventDropArg = {
  event: {
    id: string;
    startStr: string;
  };
  revert: () => void;
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatClock(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function statusClassName(status: BookingStatus): string {
  switch (status) {
    case 'confirmed':
      return 'modules-scheduling__badge modules-scheduling__badge--success';
    case 'checked_in':
    case 'in_service':
      return 'modules-scheduling__badge modules-scheduling__badge--attention';
    case 'cancelled':
    case 'no_show':
    case 'expired':
      return 'modules-scheduling__badge modules-scheduling__badge--critical';
    default:
      return 'modules-scheduling__badge modules-scheduling__badge--neutral';
  }
}

function eventColor(status: BookingStatus): string {
  switch (status) {
    case 'confirmed':
      return '#0f766e';
    case 'checked_in':
      return '#1d4ed8';
    case 'in_service':
      return '#7c3aed';
    case 'completed':
      return '#475569';
    case 'cancelled':
    case 'no_show':
    case 'expired':
      return '#b91c1c';
    default:
      return '#d97706';
  }
}

function buildVisibleDates(range: VisibleRange): string[] {
  const dates: string[] = [];
  const cursor = startOfDay(range.start);
  const limit = startOfDay(range.end);
  while (cursor < limit) {
    dates.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function uniqueBookings(items: Booking[]): Booking[] {
  const seen = new Map<string, Booking>();
  for (const item of items) {
    seen.set(item.id, item);
  }
  return Array.from(seen.values()).sort((left, right) => left.start_at.localeCompare(right.start_at));
}

function defaultVisibleRange(): VisibleRange {
  const today = new Date();
  const start = startOfDay(today);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function matchesSearch(searchQuery: string, pieces: Array<string | undefined | null>): boolean {
  if (!searchQuery.trim()) {
    return true;
  }
  const normalized = searchQuery.trim().toLocaleLowerCase();
  return pieces.some((piece) => piece?.toLocaleLowerCase().includes(normalized));
}

export function SchedulingCalendar({
  client,
  searchQuery = '',
  copy: copyOverrides,
  locale = 'en',
  initialBranchId,
  initialServiceId,
  initialResourceId = null,
  initialDate,
  className = '',
}: SchedulingCalendarProps) {
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);
  const [view, setView] = useState<CalendarView>('timeGridWeek');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [visibleRange, setVisibleRange] = useState<VisibleRange>(defaultVisibleRange);
  const [focusedDate, setFocusedDate] = useState(initialDate ?? toDateInputValue(new Date()));
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(initialBranchId ?? null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(initialServiceId ?? null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(initialResourceId ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<SchedulingBookingModalState>({ open: false });
  const deferredSearch = useDeferredValue(searchQuery);

  const copy = { ...schedulingCalendarCopyPresets[locale], ...copyOverrides };

  const branchesQuery = useQuery<Branch[]>({
    queryKey: schedulingKeys.branches,
    queryFn: () => client.listBranches(),
    staleTime: 60_000,
  });

  const servicesQuery = useQuery<Service[]>({
    queryKey: schedulingKeys.services,
    queryFn: () => client.listServices(),
    staleTime: 60_000,
  });

  const resourcesQuery = useQuery<Resource[]>({
    queryKey: schedulingKeys.resources(selectedBranchId),
    queryFn: () => client.listResources(selectedBranchId),
    enabled: Boolean(selectedBranchId),
    staleTime: 60_000,
  });

  const dashboardQuery = useQuery<DashboardStats>({
    queryKey: schedulingKeys.dashboard(selectedBranchId, focusedDate),
    queryFn: () => client.getDashboard(selectedBranchId, focusedDate),
    enabled: Boolean(selectedBranchId),
    staleTime: 20_000,
  });

  const slotsQuery = useQuery<TimeSlot[]>({
    queryKey: schedulingKeys.slots(selectedBranchId, selectedServiceId, selectedResourceId, focusedDate),
    queryFn: () =>
      client.listSlots({
        branchId: selectedBranchId ?? '',
        serviceId: selectedServiceId ?? '',
        resourceId: selectedResourceId,
        date: focusedDate,
      }),
    enabled: Boolean(selectedBranchId && selectedServiceId),
    staleTime: 10_000,
  });

  const rangeDates = useMemo(() => buildVisibleDates(visibleRange), [visibleRange]);

  const bookingsQuery = useQuery<Booking[]>({
    queryKey: schedulingKeys.bookingsRange(
      selectedBranchId,
      rangeDates[0] ?? focusedDate,
      rangeDates[rangeDates.length - 1] ?? focusedDate,
    ),
    queryFn: async () => {
      if (!selectedBranchId || rangeDates.length === 0) {
        return [];
      }
      const batches = await Promise.all(
        rangeDates.map((date) =>
          client.listBookings({
            branchId: selectedBranchId,
            date,
            limit: 200,
          }),
        ),
      );
      return uniqueBookings(batches.flat());
    },
    enabled: Boolean(selectedBranchId && rangeDates.length > 0),
    staleTime: 10_000,
  });

  const branches = branchesQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const resources = resourcesQuery.data ?? [];

  const scheduleServices = useMemo(
    () =>
      services.filter(
        (service) =>
          service.active && (service.fulfillment_mode === 'schedule' || service.fulfillment_mode === 'hybrid'),
      ),
    [services],
  );

  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? null;

  const filteredResources = useMemo(() => {
    const branchResources = resources.filter((resource) => resource.active);
    const service = scheduleServices.find((candidate) => candidate.id === selectedServiceId);
    if (!service || !service.resource_ids?.length) {
      return branchResources;
    }
    const allowed = new Set(service.resource_ids);
    return branchResources.filter((resource) => allowed.has(resource.id));
  }, [resources, scheduleServices, selectedServiceId]);

  const selectedService = scheduleServices.find((service) => service.id === selectedServiceId) ?? null;
  const selectedResource = filteredResources.find((resource) => resource.id === selectedResourceId) ?? null;

  useEffect(() => {
    if (selectedBranchId) {
      return;
    }
    const preferred = branches.find((branch) => branch.active) ?? branches[0];
    if (preferred) {
      setSelectedBranchId(preferred.id);
    }
  }, [branches, selectedBranchId]);

  useEffect(() => {
    if (selectedServiceId && scheduleServices.some((service) => service.id === selectedServiceId)) {
      return;
    }
    const preferred = scheduleServices[0];
    setSelectedServiceId(preferred?.id ?? null);
  }, [scheduleServices, selectedServiceId]);

  useEffect(() => {
    if (!selectedResourceId) {
      return;
    }
    if (!filteredResources.some((resource) => resource.id === selectedResourceId)) {
      setSelectedResourceId(null);
    }
  }, [filteredResources, selectedResourceId]);

  const invalidateSchedule = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: schedulingKeys.dashboard(selectedBranchId, focusedDate) }),
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.slots(selectedBranchId, selectedServiceId, selectedResourceId, focusedDate),
      }),
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.bookingsRange(
          selectedBranchId,
          rangeDates[0] ?? focusedDate,
          rangeDates[rangeDates.length - 1] ?? focusedDate,
        ),
      }),
    ]);
  };

  const createBookingMutation = useMutation<Booking, Error, SchedulingBookingDraft>({
    mutationFn: async (draft: SchedulingBookingDraft) => {
      if (!selectedBranchId || !selectedServiceId || !modalState.open || modalState.mode !== 'create') {
        throw new Error('missing scheduling context');
      }
      return client.createBooking({
        branch_id: selectedBranchId,
        service_id: selectedServiceId,
        resource_id: modalState.slot.resource_id,
        customer_name: draft.customerName.trim(),
        customer_phone: draft.customerPhone.trim(),
        customer_email: draft.customerEmail.trim() || undefined,
        start_at: modalState.slot.start_at,
        notes: draft.notes.trim() || undefined,
        source: 'admin',
      });
    },
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      setModalState({ open: false });
      await invalidateSchedule();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const bookingActionMutation = useMutation<Booking, Error, { action: SchedulingBookingAction; booking: Booking }>({
    mutationFn: async ({ action, booking }) => {
      switch (action) {
        case 'confirm':
          return client.confirmBooking(booking.id);
        case 'cancel':
          return client.cancelBooking(booking.id, 'Cancelled from scheduling calendar');
        case 'check_in':
          return client.checkInBooking(booking.id);
        case 'start_service':
          return client.startService(booking.id);
        case 'complete':
          return client.completeBooking(booking.id);
        case 'no_show':
          return client.markBookingNoShow(booking.id, 'Marked as no-show from scheduling calendar');
        default:
          throw new Error(`unsupported action: ${action}`);
      }
    },
    onMutate: () => setActionError(null),
    onSuccess: async (booking: Booking) => {
      setModalState({
        open: true,
        mode: 'details',
        booking,
        service: scheduleServices.find((item) => item.id === booking.service_id),
        resourceName: filteredResources.find((item) => item.id === booking.resource_id)?.name,
      });
      await invalidateSchedule();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const rescheduleMutation = useMutation<Booking, Error, { bookingId: string; startAt: string }>({
    mutationFn: async ({ bookingId, startAt }: { bookingId: string; startAt: string }) => {
      return client.rescheduleBooking(bookingId, {
        branch_id: selectedBranchId ?? undefined,
        resource_id: selectedResourceId ?? undefined,
        start_at: startAt,
      });
    },
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await invalidateSchedule();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const bookings = useMemo(() => {
    const source = bookingsQuery.data ?? [];
    return source.filter((booking) => {
      if (selectedServiceId && booking.service_id !== selectedServiceId) {
        return false;
      }
      if (selectedResourceId && booking.resource_id !== selectedResourceId) {
        return false;
      }
      const serviceName = scheduleServices.find((service) => service.id === booking.service_id)?.name;
      const resourceName = filteredResources.find((resource) => resource.id === booking.resource_id)?.name;
      return matchesSearch(deferredSearch, [
        booking.customer_name,
        booking.customer_phone,
        booking.customer_email,
        booking.reference,
        booking.notes,
        serviceName,
        resourceName,
        copy.statuses[booking.status],
      ]);
    });
  }, [bookingsQuery.data, selectedServiceId, selectedResourceId, scheduleServices, filteredResources, deferredSearch, copy.statuses]);

  const slotItems = useMemo(() => {
    const source = slotsQuery.data ?? [];
    return source.filter((slot) =>
      matchesSearch(deferredSearch, [
        slot.resource_name,
        formatClock(slot.start_at),
        formatClock(slot.end_at),
        selectedService?.name,
      ]),
    );
  }, [slotsQuery.data, deferredSearch, selectedService?.name]);

  const eventInputs = useMemo<EventInput[]>(
    () =>
      bookings.map((booking) => {
        const serviceName = scheduleServices.find((service) => service.id === booking.service_id)?.name;
        const resourceName = filteredResources.find((resource) => resource.id === booking.resource_id)?.name;
        return {
          id: booking.id,
          title: booking.customer_name,
          start: booking.start_at,
          end: booking.end_at,
          color: eventColor(booking.status),
          extendedProps: {
            booking,
            serviceName,
            resourceName,
          },
        };
      }),
    [bookings, scheduleServices, filteredResources],
  );

  const handleEventClick = (info: EventClickArg) => {
    const booking = info.event.extendedProps.booking as Booking | undefined;
    if (!booking) {
      return;
    }
    setModalState({
      open: true,
      mode: 'details',
      booking,
      service: scheduleServices.find((service) => service.id === booking.service_id),
      resourceName: filteredResources.find((resource) => resource.id === booking.resource_id)?.name,
    });
  };

  const handleDateClick = (info: DateClickArg) => {
    setFocusedDate(info.dateStr.slice(0, 10));
  };

  const handleEventDrop = async (info: CalendarEventDropArg) => {
    const confirmed = await confirmAction({
      title: copy.dragRescheduleTitle,
      description: copy.dragRescheduleDescription,
      confirmLabel: copy.rescheduleBooking,
      cancelLabel: copy.close,
    });
    if (!confirmed) {
      info.revert();
      return;
    }
    try {
      await rescheduleMutation.mutateAsync({
        bookingId: info.event.id,
        startAt: info.event.startStr,
      });
    } catch {
      info.revert();
    }
  };

  const handleModalAction = async (action: SchedulingBookingAction, booking: Booking) => {
    if (action === 'cancel' || action === 'no_show') {
      const confirmed = await confirmAction({
        title: copy.destructiveTitle,
        description: action === 'cancel' ? copy.cancelActionDescription : copy.noShowActionDescription,
        confirmLabel: action === 'cancel' ? copy.cancelBooking : copy.noShowBooking,
        cancelLabel: copy.close,
        tone: 'danger',
      });
      if (!confirmed) {
        return;
      }
    }
    await bookingActionMutation.mutateAsync({ action, booking });
  };

  const updateCalendarTitle = () => {
    const api = calendarRef.current?.getApi();
    if (!api) {
      return;
    }
    setCalendarTitle(api.view.title);
  };

  const scrollCalendarToRelevantTime = () => {
    const api = calendarRef.current?.getApi();
    if (!api || !api.view.type.startsWith('timeGrid')) {
      return;
    }
    api.scrollToTime(
      resolveInitialTimeGridScrollTime({
        events: eventInputs,
        rangeStart: api.view.activeStart,
        rangeEnd: api.view.activeEnd,
        fallbackHour: 8,
      }),
    );
  };

  const loading = branchesQuery.isLoading || servicesQuery.isLoading;

  if (loading) {
    return (
      <section className={`modules-scheduling ${className}`.trim()}>
        <div className="card modules-scheduling__empty">
          <div className="spinner" />
          <p>{copy.loading}</p>
        </div>
      </section>
    );
  }

  if (!branches.length || !scheduleServices.length) {
    return (
      <section className={`modules-scheduling ${className}`.trim()}>
        <div className="card empty-state">
          <h3 className="text-section-title">{copy.unavailableTitle}</h3>
          <p>{copy.unavailableDescription}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`modules-scheduling ${className}`.trim()}>
      {actionError ? <div className="alert alert-error">{actionError}</div> : null}

      <div className="modules-scheduling__summary stats-grid">
        <article className="stat-card">
          <div className="stat-label">{copy.summaryBookings}</div>
          <div className="stat-value">{dashboardQuery.data?.bookings_today ?? '—'}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">{copy.summaryConfirmed}</div>
          <div className="stat-value">{dashboardQuery.data?.confirmed_bookings_today ?? '—'}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">{copy.summaryQueues}</div>
          <div className="stat-value">{dashboardQuery.data?.active_queues ?? '—'}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">{copy.summaryWaiting}</div>
          <div className="stat-value">{dashboardQuery.data?.waiting_tickets ?? '—'}</div>
        </article>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>{copy.filtersTitle}</h2>
            <p className="text-secondary">{copy.filtersDescription}</p>
          </div>
        </div>
        <div className="modules-scheduling__filters">
          <div className="form-group grow">
            <label htmlFor="scheduling-branch">{copy.branchLabel}</label>
            <select id="scheduling-branch" value={selectedBranchId ?? ''} onChange={(event) => setSelectedBranchId(event.target.value || null)}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group grow">
            <label htmlFor="scheduling-service">{copy.serviceLabel}</label>
            <select
              id="scheduling-service"
              value={selectedServiceId ?? ''}
              onChange={(event) => setSelectedServiceId(event.target.value || null)}
            >
              {scheduleServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group grow">
            <label htmlFor="scheduling-resource">{copy.resourceLabel}</label>
            <select
              id="scheduling-resource"
              value={selectedResourceId ?? ''}
              onChange={(event) => setSelectedResourceId(event.target.value || null)}
            >
              <option value="">{copy.anyResource}</option>
              {filteredResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="scheduling-date">{copy.focusDateLabel}</label>
            <input
              id="scheduling-date"
              type="date"
              value={focusedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setFocusedDate(nextDate);
                calendarRef.current?.getApi().gotoDate(nextDate);
              }}
            />
          </div>
        </div>
      </div>

      <div className="modules-scheduling__layout">
        <div className="card modules-scheduling__calendar-card">
          <div className="card-header">
            <div>
              <h2>{copy.timelineTitle}</h2>
              <p className="text-secondary">{copy.timelineDescription}</p>
            </div>
          </div>
          <CalendarSurface
            calendarRef={calendarRef}
            view={view}
            title={calendarTitle}
            loaded={!bookingsQuery.isLoading}
            onToday={() => {
              const api = calendarRef.current?.getApi();
              api?.today();
              updateCalendarTitle();
              scrollCalendarToRelevantTime();
              setFocusedDate(toDateInputValue(new Date()));
            }}
            onPrev={() => {
              const api = calendarRef.current?.getApi();
              api?.prev();
              updateCalendarTitle();
            }}
            onNext={() => {
              const api = calendarRef.current?.getApi();
              api?.next();
              updateCalendarTitle();
            }}
            onViewChange={(nextView) => {
              const api = calendarRef.current?.getApi();
              api?.changeView(nextView);
              setView(nextView);
              updateCalendarTitle();
              window.requestAnimationFrame(() => {
                scrollCalendarToRelevantTime();
              });
            }}
            scrollTime="07:30:00"
            scrollTimeReset={false}
            slotMinTime="07:00:00"
            calendarOptions={{
              editable: true,
              selectable: false,
              eventDurationEditable: false,
              dayMaxEvents: true,
              weekends: true,
              events: eventInputs,
              eventClick: handleEventClick,
              eventDrop: handleEventDrop,
              dateClick: handleDateClick,
              datesSet: (info) => {
                setVisibleRange({ start: info.start, end: info.end });
                updateCalendarTitle();
                scrollCalendarToRelevantTime();
              },
            }}
          />
        </div>

        <aside className="card modules-scheduling__slots-card">
          <div className="card-header">
            <div>
              <h2>{copy.slotsTitle}</h2>
              <p className="text-secondary">{copy.slotsDescription}</p>
            </div>
          </div>
          <div className="modules-scheduling__slots-date">
            <span>{focusedDate}</span>
            {selectedBranch ? <span>{selectedBranch.name}</span> : null}
          </div>
          {slotsQuery.isLoading ? (
            <div className="modules-scheduling__empty">{copy.slotsLoading}</div>
          ) : slotItems.length === 0 ? (
            <div className="modules-scheduling__empty">{copy.slotsEmpty}</div>
          ) : (
            <ul className="modules-scheduling__slot-list">
              {slotItems.map((slot) => (
                <li key={`${slot.resource_id}:${slot.start_at}`} className="modules-scheduling__slot-card">
                  <div className="modules-scheduling__slot-main">
                    <strong>
                      {formatClock(slot.start_at)} - {formatClock(slot.end_at)}
                    </strong>
                    <span>{slot.resource_name}</span>
                  </div>
                  <div className="modules-scheduling__slot-meta">
                    <span>
                      {copy.slotRemainingLabel}: {slot.remaining}
                    </span>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() =>
                        setModalState({
                          open: true,
                          mode: 'create',
                          slot,
                          service: selectedService ?? undefined,
                          resourceName: slot.resource_name,
                          draft: {
                            customerName: '',
                            customerPhone: '',
                            customerEmail: '',
                            notes: '',
                          },
                        })
                      }
                    >
                      {copy.openBooking}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="modules-scheduling__results">
            {bookings.length === 0 ? (
              <span className="text-muted">{copy.searchPlaceholder}</span>
            ) : (
              bookings.slice(0, 6).map((booking) => {
                const serviceName = scheduleServices.find((service) => service.id === booking.service_id)?.name;
                const resourceName = filteredResources.find((resource) => resource.id === booking.resource_id)?.name;
                return (
                  <button
                    key={booking.id}
                    type="button"
                    className="modules-scheduling__booking-row"
                    onClick={() =>
                      setModalState({
                        open: true,
                        mode: 'details',
                        booking,
                        service: scheduleServices.find((service) => service.id === booking.service_id),
                        resourceName,
                      })
                    }
                  >
                    <div className="modules-scheduling__booking-row-main">
                      <strong>{booking.customer_name}</strong>
                      <span>{serviceName ?? booking.service_id}</span>
                    </div>
                    <div className="modules-scheduling__booking-row-meta">
                      <span>{formatClock(booking.start_at)}</span>
                      <span className={statusClassName(booking.status)}>{copy.statuses[booking.status]}</span>
                      <span>{resourceName ?? booking.resource_id}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <SchedulingBookingModal
        state={modalState}
        copy={copy}
        saving={createBookingMutation.isPending || bookingActionMutation.isPending}
        onClose={() => setModalState({ open: false })}
        onCreate={async (draft) => {
          await createBookingMutation.mutateAsync(draft);
        }}
        onAction={async (action, booking) => {
          await handleModalAction(action, booking);
        }}
      />
    </section>
  );
}
