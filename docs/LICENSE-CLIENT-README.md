# License Server client generation

This repository includes a minimal OpenAPI spec for the License Server at:

- `docs/license-openapi.yaml`

You can generate TypeScript types from the spec using `openapi-typescript`.

Quick steps (local machine):

```bash
# from repo root
corepack enable
corepack prepare pnpm@latest --activate
pnpm install --frozen-lockfile # if you prefer pnpm
./scripts/gen-license-client.sh
```

The generated types will be written to:

- `apps/desktop/src/lib/license/types.generated.ts`

If you prefer automated codegen, use `openapi-generator` or `swagger-codegen` to generate a client (axios/fetch) and add it to the dashboard service.
