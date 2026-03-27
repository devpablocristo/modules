# Modules

Paquetes listos para integrar **encima de [`core`](../core)**, sin lógica de negocio y ordenados por `responsabilidad/subresponsabilidad/lenguaje/paquete`.

## Layout

```
modules/
  crud/
    ui/ts           → npm @devpablocristo/modules-crud-ui
    paths/go        → module github.com/devpablocristo/modules/crud/paths/go
  kanban/
    board/ts        → npm @devpablocristo/modules-kanban-board
  ui/
    data-display/ts → npm @devpablocristo/modules-ui-data-display
    filters/ts      → npm @devpablocristo/modules-ui-filters
    forms/ts        → npm @devpablocristo/modules-ui-forms
```

## Responsabilidades

- `crud`: shell CRUD y segmentos HTTP compartidos.
- `kanban`: tablero por estados y drag and drop.
- `ui`: primitivas de interfaz genéricas que no pertenecen a CRUD ni a Kanban.

## Referencias

- Ver [`crud/README.md`](./crud/README.md) para el detalle de la familia CRUD.
- El chequeo con Docker vive en [`docker-compose.yml`](./docker-compose.yml).
- La política de versionado vive en [`docs/VERSIONING.md`](./docs/VERSIONING.md).

## Versionado

`modules` es un solo repo, pero no tiene una sola versión global.

La unidad de versionado es cada implementación concreta:

- `crud/ui/ts`
- `crud/paths/go`
- `kanban/board/ts`
- `ui/data-display/ts`
- `ui/filters/ts`
- `ui/forms/ts`

Cada una tiene su propio archivo `VERSION`.

- La validación de consistencia se corre con:

```bash
npm run version:check
```

- El listado de versiones y tags esperados se obtiene con:

```bash
npm run version:list
```
