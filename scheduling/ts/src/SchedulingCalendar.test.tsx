// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SchedulingClient } from './client';
import { SchedulingCalendar } from './SchedulingCalendarBoard';
import type {
  BlockedRange,
  Booking,
  Branch,
  CalendarEvent,
  DashboardStats,
  Resource,
  Service,
  TimeSlot,
} from './types';

const confirmActionMock = vi.hoisted(() => vi.fn(async () => true));
const modalMocks = vi.hoisted(() => ({
  props: [] as Array<{
    state: {
      open: boolean;
      mode?: 'create' | 'details';
      booking?: Booking;
      slot?: TimeSlot | null;
      editor?: { date: string; startTime: string; endTime: string; resourceId: string };
    };
    onEditorChange?: (editor: { date?: string; startTime?: string; endTime?: string; resourceId?: string }) => void;
    onCreate: (draft: {
      title: string;
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      notes: string;
      recurrence: {
        mode: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: string;
        count: string;
        byWeekday: number[];
      };
    }) => Promise<void> | void;
    onAction: (action: 'confirm', booking: Booking) => Promise<void> | void;
  }>,
}));
const calendarSurfaceMocks = vi.hoisted(() => ({
  last: null as null | {
    onEventDrop?: (info: {
      event: { id: string; startStr: string; start?: Date; end?: Date; extendedProps: { calendarEvent?: CalendarEvent } };
      revert: () => void;
    }) => Promise<void> | void;
    onEventResize?: (info: {
      event: { id: string; startStr: string; start?: Date; end?: Date; extendedProps: { calendarEvent?: CalendarEvent } };
      revert: () => void;
    }) => Promise<void> | void;
    onSelect?: (info: { start: Date; end: Date; startStr: string; endStr: string }) => void;
  },
}));

const sampleBooking: Booking = {
  id: 'booking-1',
  org_id: 'org-1',
  branch_id: 'branch-1',
  service_id: 'service-1',
  resource_id: 'resource-1',
  reference: 'BK-001',
  customer_name: 'Ada Lovelace',
  customer_phone: '+54 381 555 0202',
  status: 'pending_confirmation',
  source: 'admin',
  start_at: '2099-04-05T10:00:00Z',
  end_at: '2099-04-05T10:30:00Z',
  occupies_from: '2099-04-05T10:00:00Z',
  occupies_until: '2099-04-05T10:30:00Z',
  notes: 'Primera visita',
  created_at: '2099-04-01T00:00:00Z',
  updated_at: '2099-04-01T00:00:00Z',
};

const sampleCalendarEvent: CalendarEvent = {
  id: sampleBooking.id,
  kind: 'booking',
  sourceId: sampleBooking.id,
  sourceType: 'booking',
  title: sampleBooking.customer_name,
  start_at: sampleBooking.start_at,
  end_at: sampleBooking.end_at,
  color: '#d97706',
  status: sampleBooking.status,
  serviceName: 'Consulta inicial',
  resourceName: 'Dr. Rivera',
  sourceBooking: sampleBooking,
};

vi.mock('@devpablocristo/core-browser', () => ({
  confirmAction: confirmActionMock,
}));

vi.mock('@fullcalendar/react', () => ({
  default: () => null,
}));

vi.mock('./SchedulingBookingModal', () => ({
  SchedulingBookingModal: ({
    state,
    onEditorChange,
    onCreate,
    onAction,
  }: {
    state: {
      open: boolean;
      mode?: 'create' | 'details';
      booking?: Booking;
      slot?: TimeSlot | null;
      editor?: { date: string; startTime: string; endTime: string; resourceId: string };
    };
    onEditorChange?: (editor: { date?: string; startTime?: string; endTime?: string; resourceId?: string }) => void;
    onCreate: (draft: {
      title: string;
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      notes: string;
      recurrence: {
        mode: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: string;
        count: string;
        byWeekday: number[];
      };
    }) => Promise<void> | void;
    onAction: (action: 'confirm', booking: Booking) => Promise<void> | void;
  }) => {
    modalMocks.props.push({ state, onEditorChange, onCreate, onAction });
    if (!state.open) {
      return null;
    }
    return (
      <div data-testid="mock-booking-modal">
        {state.mode === 'create' ? (
          <>
            <button
              type="button"
              onClick={() =>
                void onCreate({
                  title: 'Control anual',
                  customerName: 'Grace Hopper',
                  customerPhone: '+54 381 555 0303',
                  customerEmail: 'grace@example.com',
                  notes: 'Control anual',
                recurrence: {
                  mode: 'weekly',
                  frequency: 'weekly',
                  interval: '1',
                  count: '8',
                  byWeekday: [1],
                },
                })
              }
            >
              mock-create-booking
            </button>
            <button
              type="button"
              onClick={() =>
                onEditorChange?.({
                  startTime: '11:00',
                  endTime: '11:30',
                })
              }
            >
              mock-change-slot
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (state.booking) {
                void onAction('confirm', state.booking);
              }
            }}
          >
            mock-confirm-booking
          </button>
        )}
      </div>
    );
  },
}));

vi.mock('../../../calendar/board/ts/src/next', () => ({
  resolveInitialTimeGridScrollTime: () => '08:00:00',
  resolveInitialTimeGridViewport: () => ({ scrollTime: '07:30:00', slotMinTime: '07:00:00' }),
  CalendarSurface: ({
    calendarRef,
    events,
    onEventClick,
    onDateClick,
    onSelect,
    onEventDrop,
    onEventResize,
    eventDurationEditable,
    onDatesSet,
    toolbarTrailing,
  }: {
    calendarRef: { current: unknown };
    events?: Array<{
      extendedProps?: { calendarEvent?: CalendarEvent; freeTimeSlot?: TimeSlot };
    }>;
    onEventClick?: (info: {
      event: { extendedProps: { calendarEvent?: CalendarEvent; freeTimeSlot?: TimeSlot } };
    }) => void;
    onDateClick?: (info: { date: Date; dateStr: string }) => void;
    onSelect?: (info: { start: Date; end: Date; startStr: string; endStr: string }) => void;
    onEventDrop?: (info: {
      event: {
        id: string;
        startStr: string;
        start?: Date;
        end?: Date;
        extendedProps: { calendarEvent?: CalendarEvent; freeTimeSlot?: TimeSlot };
      };
      revert: () => void;
    }) => void;
    onEventResize?: (info: {
      event: {
        id: string;
        startStr: string;
        start?: Date;
        end?: Date;
        extendedProps: { calendarEvent?: CalendarEvent; freeTimeSlot?: TimeSlot };
      };
      revert: () => void;
    }) => Promise<void> | void;
    eventDurationEditable?: boolean;
    onDatesSet?: (info: { start: Date; end: Date }) => void;
    toolbarTrailing?: ReactNode;
  }) => {
    const currentEvents = events ?? [];
    calendarSurfaceMocks.last = { onEventDrop, onEventResize, onSelect };

    useEffect(() => {
      const api = {
        view: {
          title: 'Week',
          type: 'timeGridWeek',
          activeStart: new Date('2099-04-05T00:00:00Z'),
          activeEnd: new Date('2099-04-06T00:00:00Z'),
        },
        today: vi.fn(),
        prev: vi.fn(),
        next: vi.fn(),
        changeView: vi.fn(),
        gotoDate: vi.fn(),
        scrollToTime: vi.fn(),
        unselect: vi.fn(),
      };
      calendarRef.current = {
        getApi: () => api,
      };
      onDatesSet?.({
        start: api.view.activeStart,
        end: api.view.activeEnd,
      });
    }, []);

    const bookingEvent = currentEvents.find((ev) => ev.extendedProps?.calendarEvent);
    const freeSlotEvents = currentEvents.filter((ev) => ev.extendedProps?.freeTimeSlot);

    return (
      <div data-testid="calendar-surface">
        calendar
        {toolbarTrailing}
        <button
          type="button"
          onClick={() =>
            onDateClick?.({
              date: new Date('2099-04-05T10:00:00Z'),
              dateStr: '2099-04-05T10:00:00Z',
            })
          }
        >
          open-calendar-create
        </button>
        <button
          type="button"
          onClick={() =>
            onSelect?.({
              start: new Date('2099-04-05T10:00:00Z'),
              end: new Date('2099-04-05T10:30:00Z'),
              startStr: '2099-04-05T10:00:00Z',
              endStr: '2099-04-05T10:30:00Z',
            })
          }
        >
          open-calendar-select
        </button>
        {freeSlotEvents.map((ev, idx) => (
          <button
            key={`free-slot-${idx}`}
            type="button"
            onClick={() =>
              onEventClick?.({
                event: {
                  extendedProps: {
                    freeTimeSlot: ev.extendedProps?.freeTimeSlot,
                  },
                },
              })
            }
          >
            Reservar slot
          </button>
        ))}
        {bookingEvent?.extendedProps?.calendarEvent ? (
          <>
            <button
              type="button"
              onClick={() => {
                const calendarEvent = bookingEvent.extendedProps?.calendarEvent;
                if (calendarEvent) {
                  onEventClick?.({ event: { extendedProps: { calendarEvent } } });
                }
              }}
            >
              open-calendar-booking
            </button>
            <button
              type="button"
              onClick={() => {
                const calendarEvent = bookingEvent.extendedProps?.calendarEvent;
                if (calendarEvent) {
                  onEventDrop?.({
                    event: {
                      id: calendarEvent.id,
                      startStr: '2099-04-05T11:00:00Z',
                      start: new Date('2099-04-05T11:00:00Z'),
                      extendedProps: { calendarEvent },
                    },
                    revert: vi.fn(),
                  });
                }
              }}
            >
              drag-calendar-booking
            </button>
            {eventDurationEditable ? (
              <button
                type="button"
                onClick={() => {
                  const calendarEvent = bookingEvent.extendedProps?.calendarEvent;
                  if (calendarEvent) {
                    onEventResize?.({
                      event: {
                        id: calendarEvent.id,
                        startStr: '2099-04-05T10:00:00Z',
                        start: new Date('2099-04-05T10:00:00Z'),
                        end: new Date('2099-04-05T11:00:00Z'),
                        extendedProps: { calendarEvent },
                      },
                      revert: vi.fn(),
                    });
                  }
                }}
              >
                resize-calendar-booking
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    );
  },
}));

function createClient(overrides?: Partial<Record<keyof SchedulingClient, unknown>>): SchedulingClient {
  const branches: Branch[] = [
    {
      id: 'branch-1',
      org_id: 'org-1',
      code: 'HQ',
      name: 'Casa Central',
      timezone: 'America/Argentina/Tucuman',
      address: 'Main street 123',
      active: true,
      created_at: '2099-04-01T00:00:00Z',
      updated_at: '2099-04-01T00:00:00Z',
    },
  ];

  const services: Service[] = [
    {
      id: 'service-1',
      org_id: 'org-1',
      code: 'CONSULTA',
      name: 'Consulta inicial',
      description: 'Consulta general',
      fulfillment_mode: 'schedule',
      default_duration_minutes: 30,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      slot_granularity_minutes: 30,
      max_concurrent_bookings: 1,
      min_cancel_notice_minutes: 60,
      allow_waitlist: true,
      active: true,
      resource_ids: ['resource-1'],
      created_at: '2099-04-01T00:00:00Z',
      updated_at: '2099-04-01T00:00:00Z',
    },
  ];

  const resources: Resource[] = [
    {
      id: 'resource-1',
      org_id: 'org-1',
      branch_id: 'branch-1',
      code: 'DOC-1',
      name: 'Dr. Rivera',
      kind: 'professional',
      capacity: 1,
      timezone: 'America/Argentina/Tucuman',
      active: true,
      created_at: '2099-04-01T00:00:00Z',
      updated_at: '2099-04-01T00:00:00Z',
    },
  ];

  const slot: TimeSlot = {
    resource_id: 'resource-1',
    resource_name: 'Dr. Rivera',
    start_at: '2099-04-05T10:00:00Z',
    end_at: '2099-04-05T10:30:00Z',
    occupies_from: '2099-04-05T10:00:00Z',
    occupies_until: '2099-04-05T10:30:00Z',
    timezone: 'America/Argentina/Tucuman',
    remaining: 1,
    conflict_count: 0,
    granularity_minutes: 30,
  };

  const laterSlot: TimeSlot = {
    resource_id: 'resource-1',
    resource_name: 'Dr. Rivera',
    start_at: '2099-04-05T11:00:00Z',
    end_at: '2099-04-05T11:30:00Z',
    occupies_from: '2099-04-05T11:00:00Z',
    occupies_until: '2099-04-05T11:30:00Z',
    timezone: 'America/Argentina/Tucuman',
    remaining: 1,
    conflict_count: 0,
    granularity_minutes: 30,
  };

  const dashboard: DashboardStats = {
    date: '2099-04-05',
    timezone: 'America/Argentina/Tucuman',
    bookings_today: 3,
    confirmed_bookings_today: 1,
    active_queues: 1,
    waiting_tickets: 2,
    tickets_in_service: 0,
  };

  return {
    listBranches: vi.fn(async () => branches),
    listServices: vi.fn(async () => services),
    listResources: vi.fn(async () => resources),
    listAvailabilityRules: vi.fn(async () => []),
    getDashboard: vi.fn(async () => dashboard),
    listSlots: vi.fn(async () => [slot, laterSlot]),
    listBookings: vi.fn(async () => [sampleBooking]),
    getBooking: vi.fn(),
    createBooking: vi.fn(async () => sampleBooking),
    confirmBooking: vi.fn(async () => ({ ...sampleBooking, status: 'confirmed' })),
    cancelBooking: vi.fn(),
    checkInBooking: vi.fn(),
    startService: vi.fn(),
    completeBooking: vi.fn(),
    markBookingNoShow: vi.fn(),
    rescheduleBooking: vi.fn(async () => sampleBooking),
    listBlockedRanges: vi.fn(async () => [] as BlockedRange[]),
    createBlockedRange: vi.fn(async () => sampleBlockedRange),
    updateBlockedRange: vi.fn(async () => sampleBlockedRange),
    deleteBlockedRange: vi.fn(async () => undefined),
    listWaitlist: vi.fn(),
    listQueues: vi.fn(),
    createQueueTicket: vi.fn(),
    getQueuePosition: vi.fn(),
    pauseQueue: vi.fn(),
    reopenQueue: vi.fn(),
    closeQueue: vi.fn(),
    callNext: vi.fn(),
    serveTicket: vi.fn(),
    completeTicket: vi.fn(),
    markTicketNoShow: vi.fn(),
    cancelTicket: vi.fn(),
    returnTicketToWaiting: vi.fn(),
    getDayAgenda: vi.fn(),
    ...(overrides ?? {}),
  } as SchedulingClient;
}

const sampleBlockedRange: BlockedRange = {
  id: 'block-1',
  org_id: 'org-1',
  branch_id: 'branch-1',
  resource_id: null,
  kind: 'manual',
  reason: 'Reunión con proveedor',
  start_at: '2099-04-05T17:00:00Z',
  end_at: '2099-04-05T18:00:00Z',
  all_day: false,
  created_at: '2099-04-01T00:00:00Z',
};

function renderCalendar(client: SchedulingClient, locale = 'es') {
  // Evita múltiples <SchedulingCalendar> en el mismo documento (getByRole pegaba al árbol viejo).
  cleanup();
  // Reset module-global mock state so closures from previous tests don't leak in.
  calendarSurfaceMocks.last = null;
  modalMocks.props.length = 0;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SchedulingCalendar client={client} locale={locale} initialDate="2099-04-05" initialBranchId="branch-1" />
    </QueryClientProvider>,
  );
}

describe('SchedulingCalendar', () => {
  it('creates a booking from an available slot with the canonical admin payload', async () => {
    const client = createClient();
    modalMocks.props.length = 0;
    confirmActionMock.mockReset();
    confirmActionMock.mockResolvedValue(true);

    renderCalendar(client);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Reservar slot' }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'mock-create-booking' }));

    await waitFor(() => {
      expect(client.createBooking).toHaveBeenCalledWith({
        branch_id: 'branch-1',
        service_id: 'service-1',
        resource_id: 'resource-1',
        customer_name: 'Grace Hopper',
        customer_phone: '+54 381 555 0303',
        customer_email: 'grace@example.com',
        start_at: '2099-04-05T10:00:00Z',
        notes: 'Control anual',
        metadata: { title: 'Control anual' },
        recurrence: {
          freq: 'weekly',
          interval: 1,
          count: 8,
          by_weekday: [1],
        },
        source: 'admin',
      });
    });
  });

  it('creates a booking draft from calendar date click', async () => {
    const client = createClient();
    modalMocks.props.length = 0;
    confirmActionMock.mockReset();
    confirmActionMock.mockResolvedValue(true);

    renderCalendar(client);

    await screen.findAllByRole('button', { name: 'Reservar slot' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'open-calendar-create' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'mock-create-booking' }));
    });

    await waitFor(() => {
      expect(client.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          branch_id: 'branch-1',
          service_id: 'service-1',
          resource_id: 'resource-1',
          customer_name: 'Grace Hopper',
          customer_phone: '+54 381 555 0303',
          customer_email: 'grace@example.com',
          start_at: '2099-04-05T10:00:00Z',
          notes: 'Control anual',
          metadata: { title: 'Control anual' },
          recurrence: {
            freq: 'weekly',
            interval: 1,
            count: 8,
            by_weekday: [1],
          },
          source: 'admin',
        }),
      );
    });
  });

  it('keeps spanish copy when using a regional spanish locale', async () => {
    const client = createClient();
    modalMocks.props.length = 0;

    renderCalendar(client, 'es-AR');

    expect((await screen.findAllByRole('button', { name: 'Reservar slot' })).length).toBeGreaterThan(0);
  });

  it('uses the newly selected available slot when creating from the modal', async () => {
    const client = createClient();
    modalMocks.props.length = 0;
    confirmActionMock.mockReset();
    confirmActionMock.mockResolvedValue(true);

    renderCalendar(client);

    await screen.findAllByRole('button', { name: 'Reservar slot' });
    fireEvent.click(await screen.findByRole('button', { name: 'open-calendar-create' }));
    fireEvent.click(await screen.findByRole('button', { name: 'mock-change-slot' }));
    let latestCreateProps: (typeof modalMocks.props)[number] | undefined;
    await waitFor(() => {
      latestCreateProps = [...modalMocks.props]
        .reverse()
        .find((entry) => entry.state.open && entry.state.mode === 'create' && entry.state.editor?.startTime === '11:00');
      expect(Boolean(latestCreateProps)).toBe(true);
    });

    expect(latestCreateProps?.state.editor?.startTime).toBe('11:00');
    expect(latestCreateProps?.state.editor?.endTime).toBe('11:30');
  });

  it('creates a booking draft from calendar range selection', async () => {
    const client = createClient();
    modalMocks.props.length = 0;
    confirmActionMock.mockReset();
    confirmActionMock.mockResolvedValue(true);

    renderCalendar(client);

    await screen.findAllByRole('button', { name: 'Reservar slot' });
    fireEvent.click(await screen.findByRole('button', { name: 'open-calendar-select' }));
    fireEvent.click(await screen.findByRole('button', { name: 'mock-create-booking' }));

    await waitFor(() => {
      expect(client.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          branch_id: 'branch-1',
          service_id: 'service-1',
          resource_id: 'resource-1',
          start_at: '2099-04-05T10:00:00Z',
            recurrence: {
              freq: 'weekly',
              interval: 1,
              count: 8,
              by_weekday: [1],
            },
        }),
      );
    });
  });

  it('prefers the exact slot duration when the selected range matches availability', async () => {
    const longSlot: TimeSlot = {
      resource_id: 'resource-1',
      resource_name: 'Dr. Rivera',
      start_at: '2099-04-05T10:00:00Z',
      end_at: '2099-04-05T11:00:00Z',
      occupies_from: '2099-04-05T10:00:00Z',
      occupies_until: '2099-04-05T11:00:00Z',
      timezone: 'America/Argentina/Tucuman',
      remaining: 1,
      conflict_count: 0,
      granularity_minutes: 30,
    };
    const client = createClient({
      listSlots: vi.fn(async () => [longSlot]),
    });
    modalMocks.props.length = 0;
    confirmActionMock.mockReset();
    confirmActionMock.mockResolvedValue(true);

    renderCalendar(client);

    await screen.findByRole('button', { name: 'Reservar slot' });

    await waitFor(() => {
      expect(calendarSurfaceMocks.last?.onSelect).toBeTruthy();
    });

    await act(async () => {
      calendarSurfaceMocks.last?.onSelect?.({
        start: new Date('2099-04-05T10:00:00Z'),
        end: new Date('2099-04-05T11:00:00Z'),
        startStr: '2099-04-05T10:00:00Z',
        endStr: '2099-04-05T11:00:00Z',
      });
    });

    await waitFor(() => {
      const matchingCreateState = modalMocks.props
        .map((entry) => entry.state)
        .find((state) => state.open && state.mode === 'create' && state.slot?.end_at === '2099-04-05T11:00:00Z');
      expect(Boolean(matchingCreateState)).toBe(true);
    });
  });

  it('opens booking details from a calendar event and confirms it', async () => {
    const client = createClient();
    modalMocks.props.length = 0;
    confirmActionMock.mockReset();
    confirmActionMock.mockResolvedValue(true);

    renderCalendar(client);

    await waitFor(() => {
      expect(modalMocks.props.length).toBeGreaterThan(0);
    });
    const latestModalProps = modalMocks.props[modalMocks.props.length - 1];
    expect(latestModalProps).toBeTruthy();
    await act(async () => {
      await latestModalProps?.onAction('confirm', sampleBooking);
    });

    await waitFor(() => {
      expect(client.confirmBooking).toHaveBeenCalledWith('booking-1');
    });
  });

  it('confirms and persists calendar event drag reschedules with custom duration', async () => {
    const client = createClient();
    modalMocks.props.length = 0;
    confirmActionMock.mockReset();
    confirmActionMock.mockResolvedValue(true);

    renderCalendar(client);

    await waitFor(() => {
      expect(calendarSurfaceMocks.last?.onEventDrop).toBeTruthy();
    });

    await act(async () => {
      await calendarSurfaceMocks.last?.onEventDrop?.({
        event: {
          id: 'booking-1',
          startStr: '2099-04-05T11:00:00Z',
          start: new Date('2099-04-05T11:00:00Z'),
          end: new Date('2099-04-05T11:30:00Z'),
          extendedProps: { calendarEvent: sampleCalendarEvent },
        },
        revert: vi.fn(),
      });
    });

    expect(confirmActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Mover evento',
        confirmLabel: 'Reprogramar reserva',
      }),
    );
    expect(client.rescheduleBooking).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        start_at: '2099-04-05T11:00:00.000Z',
        end_at: '2099-04-05T11:30:00.000Z',
      }),
    );
  });

  it('persists calendar event resize as a custom-duration reschedule', async () => {
    const client = createClient();
    modalMocks.props.length = 0;
    confirmActionMock.mockReset();
    confirmActionMock.mockResolvedValue(true);

    renderCalendar(client);

    await waitFor(() => {
      expect(calendarSurfaceMocks.last?.onEventResize).toBeTruthy();
    });

    await act(async () => {
      await calendarSurfaceMocks.last?.onEventResize?.({
        event: {
          id: 'booking-1',
          startStr: '2099-04-05T10:00:00Z',
          start: new Date('2099-04-05T10:00:00Z'),
          end: new Date('2099-04-05T11:00:00Z'),
          extendedProps: { calendarEvent: sampleCalendarEvent },
        },
        revert: vi.fn(),
      });
    });

    expect(confirmActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cambiar duración del turno',
      }),
    );
    expect(client.rescheduleBooking).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        start_at: '2099-04-05T10:00:00.000Z',
        end_at: '2099-04-05T11:00:00.000Z',
      }),
    );
  });

  it('queries blocked ranges for the visible range when a branch is selected', async () => {
    const client = createClient();

    renderCalendar(client);

    await waitFor(() => {
      expect(client.listBlockedRanges).toHaveBeenCalled();
    });
    const firstCall = (client.listBlockedRanges as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(firstCall).toEqual(expect.objectContaining({ branchId: 'branch-1' }));
  });

  it('creates a blocked range from the calendar action button', async () => {
    const client = createClient();
    modalMocks.props.length = 0;

    renderCalendar(client);

    fireEvent.click(await screen.findByRole('button', { name: 'Bloquear horario' }));

    const reasonInput = await screen.findByLabelText('Motivo');
    fireEvent.change(reasonInput, { target: { value: 'Reunión con proveedor' } });

    fireEvent.change(document.getElementById('blocked-range-date') as HTMLInputElement, {
      target: { value: '2099-04-05' },
    });
    fireEvent.change(document.getElementById('blocked-range-start') as HTMLInputElement, {
      target: { value: '14:00' },
    });
    fireEvent.change(document.getElementById('blocked-range-end') as HTMLInputElement, {
      target: { value: '15:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar bloqueo' }));

    await waitFor(() => {
      expect(client.createBlockedRange).toHaveBeenCalledWith(
        expect.objectContaining({
          branch_id: 'branch-1',
          kind: 'manual',
          reason: 'Reunión con proveedor',
        }),
      );
    });
  });
});
