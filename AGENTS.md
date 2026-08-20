# Teyvat Contributor Guide

## Product direction

Teyvat is a TypeScript library focused exclusively on Genshin Impact. Its public API should be small, stable, and centered on useful domain objects rather than upstream HTTP details.

## Architecture

- `lib/client/` contains the public client classes and private orchestration that maps endpoint data into public models.
- `lib/types/` contains public ArkType schemas and their inferred TypeScript types.
- `lib/endpoints/` contains private upstream routes, raw response schemas, and endpoint request functions.
- `lib/auth/` owns cookies and request authentication or signing utilities.
- `lib/consts/` and `lib/utils/` contain private shared implementation details.
- Only intended client classes, public errors, and public models may be exported from `lib/index.ts`.

Every upstream response must be parsed as JSON, checked for API errors, and validated against its raw ArkType schema before mapping. Every mapped public object must also be constructed through its public ArkType schema. Raw response types and endpoint functions must never appear in the package declarations.

One hidden HTTP client and cookie jar belong to each `Teyvat` instance. Account objects reuse that client and are cached by UID.

## Naming and organization

- Public classes and inferred types use `Teyvat` prefixes.
- ArkType schema constants use `schema_teyvat_*` for public models and `schema_hoyolab_*` for private raw responses.
- Private functions use a leading underscore and remain outside root exports.
- Teyvat-owned functions, variables, options, properties, and public model fields use `snake_case`, never `camelCase`. Class and type names remain PascalCase, and upstream wire keys retain their exact spelling.
- Reusable private helpers belong in `lib/utils/` and use a leading underscore.
- Public models may group related upstream fields into clearer nested objects.

## Testing

The live integration suite is `lib/index.test.ts` and uses credentials supplied through `.env`. Agents may run the `bun dev` integration command, but must never edit `lib/index.test.ts`.

Agents may run static TypeScript checks and non-mutating Biome checks. Do not run library or documentation builds while the package is under active implementation. Never print, inspect, or expose `.env` values or cookies.

## Roadmap

- Complete the account surface: characters, daily notes, Spiral Abyss, exploration, and activities.
- Add configurable language after the English endpoint surface is stable.
- Expand the app-authentication flow only when concrete session behavior requires it.
- Add caching and specialized API errors only when concrete endpoint behavior requires them.
