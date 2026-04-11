import type { ReactNode } from "react";

/** Configuración del campo de búsqueda en la columna derecha del `CrudPageShell`. */
export type CrudShellSearchFieldProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  inputClassName?: string;
  id?: string;
};

export type CrudShellHeaderActionsColumnProps = {
  search?: CrudShellSearchFieldProps | null;
  children?: ReactNode;
};

/**
 * Columna derecha de cabecera CRUD: búsqueda + fila de botones (`.actions-row`).
 * Contrato alineado con `CrudPageShell` (`headerActions`); no usa props no soportadas por el shell.
 */
export function CrudShellHeaderActionsColumn({ search, children }: CrudShellHeaderActionsColumnProps) {
  if (!search && !children) return null;
  return (
    <>
      {search ? (
        <input
          type="search"
          id={search.id ?? "crud-shell-list-search"}
          className={search.inputClassName ?? "m-kanban__search"}
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          placeholder={search.placeholder}
          autoComplete="off"
        />
      ) : null}
      {children ? <div className="actions-row">{children}</div> : null}
    </>
  );
}
