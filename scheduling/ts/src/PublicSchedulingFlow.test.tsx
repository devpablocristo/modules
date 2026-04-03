// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PublicSchedulingClient } from './client';
import { PublicSchedulingFlow } from './PublicSchedulingFlow';
import type {
  PublicAvailabilitySlot,
  PublicBooking,
  PublicBusinessInfo,
  PublicQueueSummary,
  PublicService,
} from './types';

function createClient(overrides?: Partial<Record<keyof PublicSchedulingClient, unknown>>): PublicSchedulingClient {
  const business: PublicBusinessInfo = {
    org_id: 'org-demo',
    name: 'Demo Org',
    slug: 'demo-org',
    business_name: 'Demo Scheduling',
    business_address: 'Main street 123',
    business_phone: '+54 381 555 0101',
    business_email: 'hello@example.com',
    scheduling_enabled: true,
    appointments_enabled: true,
  };
  const services: PublicService[] = [
    {
      id: 'service-1',
      name: 'Consulta inicial',
      type: 'schedule',
      description: 'Consulta general',
      unit: 'session',
      price: 100,
      currency: 'ARS',
    },
  ];
  const availability: PublicAvailabilitySlot[] = [
    {
      start_at: '2099-04-05T10:00:00Z',
      end_at: '2099-04-05T10:30:00Z',
      remaining: 1,
    },
  ];
  const queues: PublicQueueSummary[] = [];
  const bookings: PublicBooking[] = [];

  return {
    getBusinessInfo: vi.fn(async () => business),
    listServices: vi.fn(async () => services),
    getAvailability: vi.fn(async () => availability),
    book: vi.fn(async () => ({
      id: 'booking-1',
      party_name: 'Ada Lovelace',
      party_phone: '+54 381 555 0202',
      title: 'Consulta inicial',
      status: 'pending_confirmation',
      start_at: availability[0].start_at,
      end_at: availability[0].end_at,
      duration: 30,
      actions: {
        confirm_token: 'confirm-token',
        cancel_token: 'cancel-token',
      },
    })),
    listMyBookings: vi.fn(async () => bookings),
    listQueues: vi.fn(async () => queues),
    createQueueTicket: vi.fn(),
    getQueuePosition: vi.fn(),
    joinWaitlist: vi.fn(),
    confirmBooking: vi.fn(),
    cancelBooking: vi.fn(),
    ...(overrides ?? {}),
  } as PublicSchedulingClient;
}

function renderFlow(client: PublicSchedulingClient, props?: Partial<ComponentProps<typeof PublicSchedulingFlow>>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PublicSchedulingFlow
        client={client}
        orgRef="demo-org"
        locale="es"
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('PublicSchedulingFlow', () => {
  it('shows the disabled state when public scheduling is turned off', async () => {
    const client = createClient({
      getBusinessInfo: vi.fn(async () => ({
        org_id: 'org-demo',
        name: 'Demo Org',
        slug: 'demo-org',
        business_name: 'Demo Scheduling',
        business_address: '',
        business_phone: '',
        business_email: '',
        scheduling_enabled: false,
        appointments_enabled: false,
      })),
    });

    renderFlow(client);

    expect(await screen.findByText('El scheduling publico esta deshabilitado')).toBeTruthy();
    expect(screen.getByText('Activa turnos para esta organizacion para exponer el flujo publico.')).toBeTruthy();
  });

  it('books the selected slot with the canonical public payload', async () => {
    const client = createClient();

    renderFlow(client);

    const selectSlotButton = await screen.findByRole('button', { name: /Elegir slot/i });
    const bookingPhoneInput = document.getElementById('public-scheduling-phone');

    fireEvent.click(selectSlotButton);
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Ada Lovelace' } });
    fireEvent.change(bookingPhoneInput as HTMLElement, { target: { value: '+54 381 555 0202' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'Primera visita' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));

    await waitFor(() => {
      expect(client.book).toHaveBeenCalledWith('demo-org', {
        service_id: 'service-1',
        customer_name: 'Ada Lovelace',
        customer_phone: '+54 381 555 0202',
        customer_email: 'ada@example.com',
        start_at: '2099-04-05T10:00:00Z',
        notes: 'Primera visita',
      });
    });
    expect(await screen.findByText('Reserva creada')).toBeTruthy();
  });
});
