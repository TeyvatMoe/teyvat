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

Each cookie-backed, authkey-backed, or authentication client owns one immutable validated language, defaulting to `en-us`. Endpoint adapters read it from their HTTP client; public account methods do not accept language overrides. Shared localized caches must be keyed by language.

Wish and transaction history use one isolated authkey-scoped client with no cookies, cookie preparation, session repair, or authkey renewal. Authkeys must never appear in public properties, logs, endpoint identifiers, errors, or nested error causes.

Public paginators are lazy, single-use async iterators. They serialize concurrent `next()` calls, keep upstream cursors private, and advance cursor state only after a page has been fetched, validated, and mapped successfully.

## Naming and organization

- Public classes and inferred types use `Teyvat` prefixes.
- ArkType schema constants use `schema_teyvat_*` for public models and `schema_hoyolab_*` for private raw responses.
- Keep composition-only ArkType schemas file-local; export a schema from its module only when another module uses it, and expose only intentional boundary schemas from root barrels.
- Root-export only complete consumer-facing models, meaningful unions, and reusable public options. Do not root-export composition subtypes merely because an implementation uses them.
- Add `@useDeclaredType` to exported ArkType-inferred aliases so TypeDoc renders their public structure instead of ArkType internals. Also add `@interface` to object-shaped aliases; never add `@interface` to unions or enumerations.
- Private functions use a leading underscore and remain outside root exports.
- Teyvat-owned functions, variables, options, properties, and public model fields use `snake_case`, never `camelCase`. Class and type names remain PascalCase, and upstream wire keys retain their exact spelling.
- Reusable private helpers belong in `lib/utils/` and use a leading underscore.
- Public models may group related upstream fields into clearer nested objects.

## Testing

The manual live integration entrypoint is `tests/index.ts` and uses locally persisted authentication plus credentials supplied through `.env`. Run `bun dev` only when the feature can be exercised by the available saved session and the user has permitted a live request. Do not add authkey-dependent wish or transaction calls because no test authkey is available. Edit the manual integration file only when the task explicitly requests coverage there.

After every implementation, run `bun check`, `bun check --fix`, a final `bun check`, and `bun run build`. The build includes the library declarations and tracked TypeDoc output. Treat warnings as issues to investigate rather than declaring success from the exit code alone.

Never print, inspect, or expose `.env` values, cookies, authkeys, passwords, captcha data, or other authentication material.

At handoff, suggest one commit message describing the complete current uncommitted feature diff, not the final small adjustment. Never create commits for the user because their commits are GPG-signed.

## Roadmap

- Add remaining focused Genshin account and utility surfaces only when their public domain models are clear.
- Defer Genius Invokation TCG support until the core account, inventory, diary, calendar, wish, and transaction surfaces are stable.
- Expand the app-authentication flow only when concrete session behavior requires it.
- Add caching and specialized API errors only when concrete endpoint behavior requires them.
