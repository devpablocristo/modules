# `crud`

Módulo CRUD agnóstico de dominio: primero **capacidad CRUD**, después **implementación TypeScript** (`ts/`) y constantes **Go** (`go/paths`).

| Artefacto | Relación con `core` | Contenido |
|-----------|---------------------|-----------|
| `ts/` | Depende de `core/browser/ts` (`@devpablocristo/core-browser/crud` para layout) | `@devpablocristo/modules-crud` — `CrudPage`, tipos, strings por defecto, helpers de rutas REST. |
| `go/` | Patrón de módulo chico con `go.mod` propio | `github.com/devpablocristo/modules/crud/go/paths` — solo constantes de segmentos URL. |

## Imports

**TypeScript** (subpath `./crud`, igual que en core-browser):

```ts
import { CrudPage, crudStringsEs } from "@devpablocristo/modules-crud/crud";
// o desde la raíz del paquete:
import { CrudPage } from "@devpablocristo/modules-crud";
```

**Go:**

```go
import "github.com/devpablocristo/modules/crud/go/paths"
// paths.SegmentArchived, etc.
```

`replace` local en el `go.mod` del backend, como hacéis con módulos de `core`:

```text
replace github.com/devpablocristo/modules/crud/go => ../modules/crud/go
```

(Ruta relativa según tu checkout.)

## Verificación con Docker (sin Node/Go en el host)

Mismo criterio que el flujo de Pymes con `docker compose`. El contexto de build es el directorio **padre** de `modules` (donde están `core/` y `modules/`).

Desde la raíz del monorepo **pymes** (hermano de `modules/`):

```bash
make modules-check
```

Equivalente:

```bash
docker compose -f ../modules/docker-compose.yml build crud-ts-check crud-go-check
```

Si trabajás desde `modules/`:

```bash
docker compose build crud-ts-check crud-go-check
```

El build falla si `npm run typecheck`, `npm test` o `go test ./...` fallan.

## Por qué el Go no es “un CRUD completo”

Los handlers, RBAC, GORM y DTOs viven en **cada servicio**. Acá solo se comparten **nombres de rutas** para no desalinear FE y BE.
