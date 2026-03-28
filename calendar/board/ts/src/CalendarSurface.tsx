import type { CalendarOptions } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { ReactNode, Ref } from "react";

export type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

export type CalendarViewOption = {
  value: CalendarView;
  label: string;
};

type EmbeddedCalendarOptions = Omit<
  CalendarOptions,
  | "plugins"
  | "initialView"
  | "headerToolbar"
  | "locale"
  | "height"
  | "slotMinTime"
  | "slotMaxTime"
  | "scrollTime"
  | "scrollTimeReset"
  | "allDayText"
  | "noEventsText"
  | "nowIndicator"
  | "slotDuration"
  | "eventTimeFormat"
>;

export type CalendarSurfaceProps = {
  calendarRef: Ref<FullCalendar>;
  view: CalendarView;
  title?: string;
  loaded: boolean;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onViewChange: (view: CalendarView) => void;
  calendarOptions: EmbeddedCalendarOptions;
  loadingFallback?: ReactNode;
  viewOptions?: readonly CalendarViewOption[];
  locale?: string;
  slotMinTime?: string;
  slotMaxTime?: string;
  scrollTime?: string;
  scrollTimeReset?: boolean;
  slotDuration?: string;
  className?: string;
};

const defaultViewOptions: readonly CalendarViewOption[] = [
  { value: "timeGridDay", label: "Día" },
  { value: "timeGridWeek", label: "Semana" },
  { value: "dayGridMonth", label: "Mes" },
];

export function CalendarSurface({
  calendarRef,
  view,
  title,
  loaded,
  onToday,
  onPrev,
  onNext,
  onViewChange,
  calendarOptions,
  loadingFallback,
  viewOptions = defaultViewOptions,
  locale = "es",
  slotMinTime = "00:00:00",
  slotMaxTime = "24:00:00",
  scrollTime = "00:00:00",
  scrollTimeReset = false,
  slotDuration = "00:30:00",
  className = "",
}: CalendarSurfaceProps) {
  return (
    <div className={`modules-calendar ${className}`.trim()}>
      <div className="modules-calendar__toolbar">
        <div className="modules-calendar__toolbar-left">
          <button type="button" className="modules-calendar__today-btn" onClick={onToday}>
            Hoy
          </button>
          <button type="button" className="modules-calendar__nav-btn" onClick={onPrev}>
            ‹
          </button>
          <button type="button" className="modules-calendar__nav-btn" onClick={onNext}>
            ›
          </button>
        </div>
        {title ? (
          <div className="modules-calendar__toolbar-center">
            <h2 className="modules-calendar__title">{title}</h2>
          </div>
        ) : null}
        <div className="modules-calendar__toolbar-right">
          <div className="modules-calendar__view-group">
            {viewOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`modules-calendar__view-btn ${view === option.value ? "modules-calendar__view-btn--active" : ""}`}
                onClick={() => onViewChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="modules-calendar__body">
        {!loaded ? (
          loadingFallback ?? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div className="spinner" />
            </div>
          )
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            headerToolbar={false}
            locale={locale}
            height="100%"
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
            scrollTime={scrollTime}
            scrollTimeReset={scrollTimeReset}
            allDayText=""
            noEventsText=""
            nowIndicator
            slotDuration={slotDuration}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            {...calendarOptions}
          />
        )}
      </div>
    </div>
  );
}

export default CalendarSurface;
