// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SchedulingClient } from './client';
import { SchedulingCalendar } from './SchedulingCalendar';
import type { Booking, Branch, DashboardStats, Resource, Service, TimeSlot } from './types';

const confirmActionMock = vi.hoisted(() => vi.fn(async () => true));
const modalMocks = vi.hoisted(() => ({
  props: [] as Array<{
    state: { open: boolean; mode?: 'create' | 'details'; booking?: Booking };
    onCreate: (draft: {
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      notes: string;
    }) => Promise<void> | void;
    onAction: (action: 'confirm', booking: Booking) => Promise<void> | void;
  }>,
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

vi.mock('@devpablocristo/core-browser', () => ({
  confirmAction: confirmActionMock,
}));

vi.mock('@fullcalendar/react', () => ({
  default: () => null,
}));

vi.mock('./SchedulingBookingModal', () => ({
  SchedulingBookingModal: ({
    state,
    onCreate,
    onAction,
  }: {
    state: { open: boolean; mode?: 'create' | 'details'; booking?: Booking };
    onCreate: (draft: {
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      notes: string;
    }) => Promise<void> | void;
    onAction: (action: 'confirm', booking: Booking) => Promise<void> | void;
  }) => {
    modalMocks.props.push({ state, onCreate, onAction });
    if (!state.open) {
      return null;
    }
    return (
      <div data-testid="mock-booking-modal">
        {state.mode === 'create' ? (
          <button
            type="button"
            onClick={() =>
              void onCreate({
                customerName: 'Grace Hopper',
                customerPhone: '+54 381 555 0303',
                customerEmail: 'grace@example.com',
                notes: 'Control anual',
              })
            }
          >
            mock-create-booking
          </button>
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

vi.mock('@devpablocristo/modules-calendar-board', () => ({
  resolveInitialTimeGridScrollTime: () => '08:00:00',
  CalendarSurface: ({ calendarRef, calendarOptions }: { calendarRef: { current: unknown }; calendarOptions?: Record<string, unknown> }) => {
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
      };
      calendarRef.current = {
        getApi: () => api,
      };
      const datesSet = calendarOptions?.datesSet as
        | ((info: { start: Date; end: Date }) => void)
        | undefined;
      datesSet?.({
        start: api.view.activeStart,
        end: api.view.activeEnd,
      });
    }, []);

    const events = Array.isArray(calendarOptions?.events) ? calendarOptions.events : [];
    const eventClick = calendarOptions?.eventClick as
      | ((info: { event: { extendedProps: { booking?: Booking } } }) => void)
      | undefined;

    return (
      <div data-testid="calendar-surface">
        calendar
        {events.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              const booking = (events[0] as { extendedProps?: { booking?: Booking } }).extendedProps?.booking;
              if (booking) {
                eventClick?.({ event: { extendedProps: { booking } } });
              }
            }}
          >
            open-calendar-booking
          </button>
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
    getDashboard: vi.fn(async () => dashboard),
    listSlots: vi.fn(async () => [slot]),
    listBookings: vi.fn(async () => [sampleBooking]),
    getBooking: vi.fn(),
    createBooking: vi.fn(async () => sampleBooking),
    confirmBooking: vi.fn(async () => ({ ...sampleBooking, status: 'confirmed' })),
    cancelBooking: vi.fn(),
    checkInBooking: vi.fn(),
    startService: vi.fn(),
    completeBooking: vi.fn(),
    markBookingNoShow: vi.fn(),
    rescheduleBooking: vi.fn(),
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

function renderCalendar(client: SchedulingClient) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SchedulingCalendar client={client} locale="es" initialDate="2099-04-05" initialBranchId="branch-1" />
    </QueryClientProvider>,
  );
}

describe('SchedulingCalendar', () => {
  it('creates a booking from an available slot with the canonical admin payload', async () => {
    const client = createClient();
    modalMocks.props.length = 0;

    renderCalendar(client);

    fireEvent.click(await screen.findByRole('button', { name: 'Reservar slot' }));
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
        source: 'admin',
      });
    });
  });

  it('opens booking details and confirms a pending booking', async () => {
    const client = createClient();
    modalMocks.props.length = 0;

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
});
