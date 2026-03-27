# Modules

Paquetes listos para integrar **encima de [`core`](../core)** (primitivas), sin lógica de negocio.

## Layout

`core` agrupa por **runtime** (`browser/ts`, etc.). En **modules/crud** la responsabilidad principal es el **CRUD**; el runtime TypeScript vive en `ts/` (no hay carpeta `browser/` duplicada).

```
modules/crud/
  ts/             → npm @devpablocristo/modules-crud (consume `@devpablocristo/core-browser/crud` para el shell)
  go/             → module github.com/devpablocristo/modules/crud/go (como core/validate/go)
    paths/        → constantes de segmentos HTTP
```

## CRUD

Ver [`crud/README.md`](./crud/README.md).

**Chequeo con Docker** (sin herramientas en el host): [`docker-compose.yml`](./docker-compose.yml) en este directorio; desde `pymes/`: `make modules-check`.
