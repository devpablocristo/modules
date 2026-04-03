/**
 * Tablero Kanban genérico por estado (columnas = ids de estado).
 * El padre posee `items`, reacciona a `onMoveCard` (optimistic + API) y a `onCardOpen`.
 */
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CrudPageShell } from "@devpablocristo/core-browser/crud";
import { useMemo, useRef, useState, type ReactElement, type ReactNode, type RefObject } from "react";
import { kanbanCollisionDetection } from "./collision";
import "./StatusKanbanBoard.css";

export type KanbanColumnDef = { id: string; label: string };

/** Evita abrir detalle justo después de soltar drag. */
export type SuppressCardOpen = { id: string | null; until: number };

export type StatusKanbanBoardProps<T extends { id: string }> = {
  columns: KanbanColumnDef[];
  columnIdSet: Set<string>;
  getRowColumnId: (row: T) => string;
  fallbackColumnId: string;
  items: T[];
  loading: boolean;
  error: string | null;
  /** Recarga manual (p. ej. tras error); si no se pasa, no hay botón en la barra. */
  onReload?: () => void | Promise<void>;
  onMoveCard: (id: string, targetColumnId: string) => void;
  resolveDropColumnId: (overId: string | undefined, items: T[]) => string | null;
  sortInColumn?: (a: T, b: T) => number;
  filterRow?: (row: T, queryLower: string) => boolean;
  renderCard: (args: {
    row: T;
    onOpen: () => void;
    suppressOpenRef: RefObject<SuppressCardOpen>;
  }) => ReactElement;
  renderOverlayCard: (row: T) => ReactElement;
  onCardOpen: (row: T) => void;
  title: string;
  subtitle?: string;
  headerLeadSlot?: ReactNode;
  searchPlaceholder?: string;
  statsLine: (visibleCount: number, totalCount: number) => string;
  emptyState?: ReactNode;
  columnFooter?: (columnId: string) => ReactNode;
  /** Si devuelve false, la tarjeta no se arrastra (p. ej. estados terminales). Por defecto todas draggable. */
  isRowDraggable?: (row: T) => boolean;
  /** Si devuelve false, la columna no acepta soltar (p. ej. columna solo lectura). Por defecto todas droppable. */
  isColumnDroppable?: (columnId: string) => boolean;
  /** Clase extra para el input de búsqueda canónico. */
  searchInputClassName?: string;
  /** Contenido entre la línea de estadísticas y el tablero (p. ej. filtros por persona). */
  afterStats?: ReactNode;
  /** Fila bajo el buscador en la columna derecha (p. ej. mismas acciones que el listado CRUD). */
  toolbarButtonRow?: ReactNode;
  /** Búsqueda controlada desde afuera. Si está definido, oculta el input interno. */
  externalSearch?: string;
};

function ColumnBody({
  columnId,
  label,
  count,
  boardDragging,
  droppable,
  children,
  footer,
}: {
  columnId: string;
  label: string;
  count: number;
  boardDragging: boolean;
  droppable: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const droppableId = `col-${columnId}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId, disabled: !droppable });
  return (
    <div
      ref={setNodeRef}
      className={`m-kanban__column-body ${!droppable ? "m-kanban__column-body--no-drop" : ""} ${isOver ? "m-kanban__column-body--over" : ""} ${boardDragging ? "m-kanban__column-body--dragging" : ""}`}
      data-column={columnId}
    >
      <div className="m-kanban__column-head">
        <span className="m-kanban__column-label">{label}</span>
        <div className="m-kanban__column-head-actions">
          <span className="m-kanban__column-count">{count}</span>
          <span className="m-kanban__column-menu" aria-hidden="true">
            ···
          </span>
        </div>
      </div>
      <div className="m-kanban__column-scroll">{children}</div>
      {droppable && boardDragging && count === 0 ? <div className="m-kanban__drop-hint">Soltar aquí</div> : null}
      {footer}
    </div>
  );
}

function DraggableCard<T extends { id: string }>({
  row,
  renderCard,
  onCardOpen,
  suppressOpenRef,
  draggable,
}: {
  row: T;
  renderCard: StatusKanbanBoardProps<T>["renderCard"];
  onCardOpen: (row: T) => void;
  suppressOpenRef: RefObject<SuppressCardOpen>;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: row.id,
    disabled: !draggable,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
  };
  const handleOpen = () => {
    const s = suppressOpenRef.current;
    if (s != null && s.id === row.id && Date.now() < s.until) return;
    onCardOpen(row);
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} draggable={false}>
      {renderCard({ row, onOpen: handleOpen, suppressOpenRef })}
    </div>
  );
}

export function StatusKanbanBoard<T extends { id: string }>(props: StatusKanbanBoardProps<T>): ReactElement {
  const {
    columns,
    columnIdSet,
    getRowColumnId,
    fallbackColumnId,
    items,
    loading,
    error,
    onReload,
    onMoveCard,
    resolveDropColumnId,
    sortInColumn,
    filterRow,
    renderCard,
    renderOverlayCard,
    onCardOpen,
    title,
    subtitle,
    headerLeadSlot,
    searchPlaceholder,
    statsLine,
    emptyState,
    columnFooter,
    isRowDraggable,
    isColumnDroppable,
    searchInputClassName,
    afterStats,
    toolbarButtonRow,
    externalSearch,
  } = props;

  const rowDraggable = isRowDraggable ?? (() => true);
  const columnDroppable = isColumnDroppable ?? (() => true);

  const [internalSearch, setInternalSearch] = useState("");
  const search = externalSearch ?? internalSearch;
  const [activeDrag, setActiveDrag] = useState<T | null>(null);
  const itemsRef = useRef<T[]>([]);
  itemsRef.current = items;
  const suppressCardOpenRef = useRef<SuppressCardOpen>({ id: null, until: 0 });
  const activeDragIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => (filterRow ? filterRow(row, q) : true));
  }, [items, search, filterRow]);

  const byColumn = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const col of columns) {
      map.set(col.id, []);
    }
    const sortFn = sortInColumn ?? (() => 0);
    for (const row of filtered) {
      let c = getRowColumnId(row);
      if (!columnIdSet.has(c)) {
        c = fallbackColumnId;
      }
      const bucket = map.get(c);
      if (bucket) {
        bucket.push(row);
      } else {
        const fb = map.get(fallbackColumnId);
        if (fb) fb.push(row);
      }
    }
    for (const [, list] of map) {
      list.sort(sortFn);
    }
    return map;
  }, [filtered, columns, columnIdSet, getRowColumnId, fallbackColumnId, sortInColumn]);

  const boardDragging = activeDrag != null;

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    activeDragIdRef.current = id;
    setActiveDrag(itemsRef.current.find((x) => x.id === id) ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    suppressCardOpenRef.current = { id: String(e.active.id), until: Date.now() + 260 };
    activeDragIdRef.current = null;
    const { active, over } = e;
    setActiveDrag(null);
    const id = String(active.id);
    const snapshot = itemsRef.current;
    const targetCol = resolveDropColumnId(over?.id != null ? String(over.id) : undefined, snapshot);
    if (!targetCol) return;
    const row = snapshot.find((x) => x.id === id);
    if (!row || getRowColumnId(row) === targetCol) return;
    onMoveCard(id, targetCol);
  };

  const handleDragCancel = () => {
    const id = activeDragIdRef.current;
    if (id) suppressCardOpenRef.current = { id, until: Date.now() + 260 };
    activeDragIdRef.current = null;
    setActiveDrag(null);
  };

  const totalVisible = filtered.length;

  return (
    <div className="m-kanban">
      <CrudPageShell
        title={title}
        subtitle={subtitle}
        headerLeadSlot={
          <>
            {headerLeadSlot != null ? <div className="crud-list-header-lead">{headerLeadSlot}</div> : null}
            <p className="text-secondary" aria-live="polite">
              {loading ? "Cargando…" : statsLine(totalVisible, items.length)}
            </p>
            {afterStats ? <div className="crud-list-header-lead">{afterStats}</div> : null}
          </>
        }
        search={externalSearch == null ? {
          value: internalSearch,
          onChange: setInternalSearch,
          placeholder: searchPlaceholder ?? "Buscar...",
          ariaLabel: searchPlaceholder ?? "Buscar...",
          inputClassName: [searchInputClassName, "m-kanban__search"].filter(Boolean).join(" ").trim(),
        } : undefined}
        headerActions={onReload != null || toolbarButtonRow != null ? (
          <>
            {onReload != null ? (
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={() => {
                  void onReload();
                }}
              >
                Reload
              </button>
            ) : null}
            {toolbarButtonRow}
          </>
        ) : undefined}
        error={error ? (
          <p className="m-kanban__error" role="alert">
            {error}
          </p>
        ) : undefined}
      >
        <>
          {!loading && items.length === 0 && emptyState ? <div className="m-kanban__empty">{emptyState}</div> : null}

          <DndContext
            sensors={sensors}
            collisionDetection={kanbanCollisionDetection}
            autoScroll={false}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="m-kanban__board">
              {columns.map((col) => {
                const columnItems = byColumn.get(col.id) ?? [];
                return (
                  <div key={col.id} className="m-kanban__column-shell">
                    <ColumnBody
                      columnId={col.id}
                      label={col.label}
                      count={columnItems.length}
                      boardDragging={boardDragging}
                      droppable={columnDroppable(col.id)}
                      footer={columnFooter?.(col.id)}
                    >
                      {columnItems.map((row) => (
                        <DraggableCard
                          key={row.id}
                          row={row}
                          renderCard={renderCard}
                          onCardOpen={onCardOpen}
                          suppressOpenRef={suppressCardOpenRef}
                          draggable={rowDraggable(row)}
                        />
                      ))}
                    </ColumnBody>
                  </div>
                );
              })}
            </div>
            <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
              {activeDrag ? renderOverlayCard(activeDrag) : null}
            </DragOverlay>
          </DndContext>
        </>
      </CrudPageShell>
    </div>
  );
}
