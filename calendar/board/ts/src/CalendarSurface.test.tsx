// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarSurface } from './CalendarSurface';

vi.mock('@fullcalendar/react', () => ({
  default: forwardRef(function FullCalendarMock(
    { initialView, locale }: { initialView: string; locale: string },
    _ref,
  ) {
    return (
      <div data-testid="fullcalendar-mock">
        calendar:{initialView}:{locale}
      </div>
    );
  }),
}));

vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));

describe('CalendarSurface', () => {
  it('renders the loading fallback when the calendar is not ready', () => {
    render(
      <CalendarSurface
        calendarRef={{ current: null }}
        view="timeGridWeek"
        loaded={false}
        onToday={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onViewChange={vi.fn()}
        calendarOptions={{}}
        loadingFallback={<div>loading calendar</div>}
      />,
    );

    expect(screen.getByText('loading calendar')).toBeTruthy();
    expect(screen.queryByTestId('fullcalendar-mock')).toBeNull();
  });

  it('wires toolbar actions, active view and calendar props', () => {
    const onToday = vi.fn();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onViewChange = vi.fn();

    render(
      <CalendarSurface
        calendarRef={{ current: null }}
        view="timeGridWeek"
        title="Agenda"
        loaded
        onToday={onToday}
        onPrev={onPrev}
        onNext={onNext}
        onViewChange={onViewChange}
        locale="es"
        calendarOptions={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    fireEvent.click(screen.getByRole('button', { name: '‹' }));
    fireEvent.click(screen.getByRole('button', { name: '›' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mes' }));

    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith('dayGridMonth');
    expect(screen.getByText('Agenda')).toBeTruthy();
    expect(screen.getByTestId('fullcalendar-mock').textContent).toContain('calendar:timeGridWeek:es');
    expect(screen.getByRole('button', { name: 'Semana' }).className).toContain('modules-calendar__view-btn--active');
  });
});
