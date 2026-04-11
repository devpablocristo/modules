import type { CrudFeatureFlags, CrudPageConfig, CrudViewModeConfig, CrudViewModeId } from "./types";

export type CrudUiResourceOverride = {
  enabledViewModeIds?: CrudViewModeId[];
  defaultViewModeId?: CrudViewModeId;
  featureFlags?: Partial<CrudFeatureFlags>;
};

export type CreateCrudUiPreferencesApiOptions = {
  storageKey: string;
  knownResourceIds: readonly string[];
  /** Evento DOM al persistir (p. ej. para invalidar caches en la app). */
  changeEventName?: string;
};

function isCrudViewModeId(value: string): value is CrudViewModeId {
  return value === "list" || value === "gallery" || value === "kanban" || value === "table-detail";
}

function sanitizeOverride(raw: unknown): CrudUiResourceOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const enabledViewModeIds = Array.isArray(source.enabledViewModeIds)
    ? source.enabledViewModeIds.map((value) => String(value)).filter(isCrudViewModeId)
    : undefined;
  const defaultViewModeId =
    typeof source.defaultViewModeId === "string" && isCrudViewModeId(source.defaultViewModeId)
      ? source.defaultViewModeId
      : undefined;
  const featureFlags =
    source.featureFlags && typeof source.featureFlags === "object"
      ? (source.featureFlags as Partial<CrudFeatureFlags>)
      : undefined;
  return {
    ...(enabledViewModeIds ? { enabledViewModeIds } : {}),
    ...(defaultViewModeId ? { defaultViewModeId } : {}),
    ...(featureFlags ? { featureFlags } : {}),
  };
}

function applyViewModeOverride(viewModes: CrudViewModeConfig[], override: CrudUiResourceOverride): CrudViewModeConfig[] {
  const enabled = override.enabledViewModeIds?.length ? new Set(override.enabledViewModeIds) : null;
  let next = enabled ? viewModes.filter((mode) => enabled.has(mode.id)) : [...viewModes];
  if (next.length === 0) {
    next = [...viewModes];
  }
  const defaultId =
    override.defaultViewModeId && next.some((mode) => mode.id === override.defaultViewModeId)
      ? override.defaultViewModeId
      : next.find((mode) => mode.isDefault)?.id ?? next[0]?.id;
  return next.map((mode) => ({ ...mode, isDefault: mode.id === defaultId }));
}

export function createCrudUiPreferencesApi(options: CreateCrudUiPreferencesApiOptions) {
  const changeEventName = options.changeEventName ?? "crud-ui-preferences-changed";

  function readState(): Record<string, CrudUiResourceOverride> {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(options.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const out: Record<string, CrudUiResourceOverride> = {};
      for (const resourceId of options.knownResourceIds) {
        const clean = sanitizeOverride(parsed[resourceId]);
        if (clean) out[resourceId] = clean;
      }
      return out;
    } catch {
      return {};
    }
  }

  function writeState(state: Record<string, CrudUiResourceOverride>): void {
    if (typeof window === "undefined") return;
    let existing: Record<string, unknown> = {};
    try {
      const raw = window.localStorage.getItem(options.storageKey);
      if (raw) existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      existing = {};
    }
    const next = { ...existing };
    for (const [resourceId, value] of Object.entries(state)) {
      if (!options.knownResourceIds.includes(resourceId)) continue;
      const clean = sanitizeOverride(value);
      if (!clean || Object.keys(clean).length === 0) {
        delete next[resourceId];
      } else {
        next[resourceId] = clean;
      }
    }
    window.localStorage.setItem(options.storageKey, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(changeEventName));
  }

  function readOverride(resourceId: string): CrudUiResourceOverride | null {
    return readState()[resourceId] ?? null;
  }

  function applyCrudUiOverride<T extends { id: string }>(resourceId: string, config: CrudPageConfig<T>): CrudPageConfig<T> {
    const override = readOverride(resourceId);
    if (!override) return config;

    const nextViewModes = config.viewModes ? applyViewModeOverride(config.viewModes, override) : config.viewModes;

    return {
      ...config,
      viewModes: nextViewModes,
      featureFlags: override.featureFlags
        ? { ...(config.featureFlags ?? {}), ...override.featureFlags }
        : config.featureFlags,
    };
  }

  return { readState, writeState, readOverride, applyCrudUiOverride, changeEventName };
}

/** Claves de flags expuestas en el panel de preferencias (orden estable). */
export const CRUD_UI_PREFERENCES_FEATURE_KEYS = [
  ["creatorFilter", "Filtro creador (Todos / Yo…)"],
  ["headerQuickFilterStrip", "Franja de filtros en cabecera"],
  ["csvToolbar", "CSV toolbar"],
  ["pagination", "Paginación"],
  ["tagsColumn", "Columna tags"],
] as const;
