/**
 * CRUD de consola (React). Primitivas de layout en `@devpablocristo/core-browser/crud`.
 */
export { CrudPage, type CrudPageProps } from "./CrudPage";
export type {
  CrudColumn,
  CrudDataSource,
  CrudFieldValue,
  CrudFormField,
  CrudFormValues,
  CrudHelpers,
  CrudHttpClient,
  CrudListHeaderSlotContext,
  CrudPageConfig,
  CrudRowAction,
  CrudToolbarAction,
} from "./types";
export {
  crudStringsEs,
  defaultCrudStrings,
  interpolate,
  mergeCrudStrings,
  type CrudStrings,
} from "./strings";
export { CrudPathSegment, crudItemPath, crudListPath } from "./restPaths";
