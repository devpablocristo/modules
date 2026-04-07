import type { CalendarOptions } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { ReactNode, Ref } from "react";
import { useRef } from "react";

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

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function appendClassName(value: string | string[] | undefined, className: string | null): string[] {
  const base = Array.isArray(value) ? value : value ? [value] : [];
  return className ? [...base, className] : base;
}

function setHoveredDateClasses(root: HTMLElement | null, date: string | null): void {
  if (!root) {
    return;
  }

  root.querySelectorAll(".fc-day-hovered").forEach((node) => {
    node.classList.remove("fc-day-hovered");
  });

  if (!date) {
    return;
  }

  const isWeekView = Boolean(root.querySelector(".fc-timeGridWeek-view"));
  const isMonthView = Boolean(root.querySelector(".fc-dayGridMonth-view"));

  let selector = `[data-date="${date}"]`;
  if (isWeekView) {
    selector = [
      `.fc-timeGridWeek-view .fc-col-header-cell[data-date="${date}"]`,
      `.fc-timeGridWeek-view .fc-timegrid-col[data-date="${date}"]`,
    ].join(", ");
  } else if (isMonthView) {
    selector = `.fc-dayGridMonth-view .fc-daygrid-day[data-date="${date}"]`;
  }

  root.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.classList.add("fc-day-hovered");
  });
}

function resolveDateFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const datedNode =
    target.closest<HTMLElement>("[data-date]") ??
    target.closest<HTMLElement>(".fc-timegrid-col") ??
    target.closest<HTMLElement>(".fc-daygrid-day") ??
    target.closest<HTMLElement>(".fc-col-header-cell");

  return datedNode?.dataset.date ?? null;
}

function resolveHoveredDay(event: { target: EventTarget | null; clientX: number; clientY: number }): string | null {
  if (typeof document !== "undefined") {
    const stack = document.elementsFromPoint(event.clientX, event.clientY);
    for (const node of stack) {
      const date = resolveDateFromTarget(node);
      if (date) {
        return date;
      }
    }
  }

  return resolveDateFromTarget(event.target);
}

function resolveClassNames<TArg>(
  input: string | string[] | ((arg: TArg) => string | string[] | undefined) | undefined,
  arg: TArg,
): string[] {
  if (typeof input === "function") {
    return appendClassName(input(arg), null);
  }
  return appendClassName(input, null);
}

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
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const hoveredDayRef = useRef<string | null>(null);
  const fullCalendarProps = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: view,
    headerToolbar: false,
    locale,
    height: "100%",
    slotMinTime,
    slotMaxTime,
    scrollTime,
    scrollTimeReset,
    allDaySlot: false,
    allDayText: "",
    noEventsText: "",
    nowIndicator: true,
    slotDuration,
    slotLabelInterval: "00:30:00",
    slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
    eventTimeFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
    ...calendarOptions,
  } as CalendarOptions;

  const syncHoveredDay = (event: { target: EventTarget | null; clientX: number; clientY: number }) => {
    const nextHoveredDay = resolveHoveredDay(event);
    if (!nextHoveredDay || hoveredDayRef.current === nextHoveredDay) {
      return;
    }

    hoveredDayRef.current = nextHoveredDay;
    setHoveredDateClasses(bodyRef.current, nextHoveredDay);
  };

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

      <div
        ref={bodyRef}
        className="modules-calendar__body"
        onMouseMove={syncHoveredDay}
        onMouseOverCapture={syncHoveredDay}
        onMouseLeave={() => {
          hoveredDayRef.current = null;
          setHoveredDateClasses(bodyRef.current, null);
        }}
      >
        {!loaded ? (
          loadingFallback ?? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div className="spinner" />
            </div>
          )
        ) : (
          <FullCalendar ref={calendarRef} {...fullCalendarProps} />
        )}
      </div>
    </div>
  );
}

export default CalendarSurface;
