# Versionado independiente en `modules`

`modules` es un solo repo, pero no tiene una sola versión global.

La unidad de versionado es cada implementación concreta:

- `calendar/board/ts`
- `crud/ui/ts`
- `crud/paths/go`
- `kanban/board/ts`
- `sidebar/ts`
- `ui/data-display/ts`
- `ui/filters/ts`
- `ui/forms/ts`

## Regla

Cada implementación tiene su propio archivo `VERSION` en la raíz del runtime:

```text
calendar/
  board/
    ts/
      VERSION
      package.json

crud/
  ui/
    ts/
      VERSION
      package.json

crud/
  paths/
    go/
      VERSION
      go.mod

kanban/
  board/
    ts/
      VERSION
      package.json

sidebar/
  ts/
    VERSION
    package.json
```

## Semántica

- usar `semver`
- en `VERSION` guardar `0.1.0`, no `v0.1.0`
- empezar en `0.x` mientras la API siga moviéndose
- no inventar una versión global del repo
- solo se sube la versión del módulo que cambió

## Tags

Los tags se cortan por subdirectorio:

- `calendar/board/ts/v0.1.0`
- `crud/ui/ts/v0.1.0`
- `crud/paths/go/v0.1.0`
- `kanban/board/ts/v0.1.0`
- `sidebar/ts/v0.1.0`
- `ui/data-display/ts/v0.1.0`
- `ui/filters/ts/v0.1.0`
- `ui/forms/ts/v0.1.0`

Para Go esto sigue la convención correcta de módulos versionados en subdirectorios del monorepo.

## Fuente de verdad

- Go: `VERSION` es la fuente de verdad del release
- TypeScript: `VERSION` y `package.json` deben coincidir

## Scripts

- `scripts/list-module-versions.sh`: lista versiones y tags esperados
- `scripts/validate-module-versions.sh`: valida semver y consistencia
- `scripts/bump-module-version.sh <modulo/runtime> <version>`: sube una versión localmente

## Flujo recomendado

1. hacer cambios en un solo módulo
2. correr validación local
3. subir la versión de ese módulo
4. correr tests del repo
5. crear el tag del subdirectorio correspondiente

## Ejemplos

Listar versiones:

```bash
./scripts/list-module-versions.sh
```

Validar consistencia:

```bash
./scripts/validate-module-versions.sh
```

Subir `crud/ui/ts` a `0.2.0`:

```bash
./scripts/bump-module-version.sh crud/ui/ts 0.2.0
```
