# Feature Request: Developer API & CI/CD Integration Guide (NanoLoc 2.0)

**Context:**
Developers currently use a local script to process CSV files. We are replacing this with a direct API integration.
We need to solve two problems:
1. **The API:** A secured endpoint to fetch translations (JSON/XML).
2. **The UX:** A UI dialog to show developers the correct `Project ID`, `API Token`, and `curl` command to use in their scripts.

Please implement the following 4-part solution:

## Part 1: Configuration (Env & Middleware)
1. **Environment:** Add `API_ACCESS_TOKEN` to `.env` and `docker-compose.yml`.
2. **Middleware (`src/middleware.ts`):** - Exclude `/api/projects/:id/pull` from NextAuth session checks.
   - This route will use its own Bearer Token authentication.

## Part 2: The "Pull" API (`src/app/api/projects/[id]/pull/route.ts`)
Create a route that handles `GET /api/projects/[id]/pull`:

- **Authentication:** - Validate `Authorization: Bearer <API_ACCESS_TOKEN>`. Return 401 if invalid.
- **Parameters:**
  - `id` (Path): The Project ID (Matches `prisma.project.id`).
  - `format` (Query): `'json'` (default) or `'xml'`.
  - `lang` (Query, optional): Specific language code.
- **Logic (Use `storage.service.ts`):**
  - **Mode A (Full Dump - JSON only):** If `format=json` and no `lang` is provided, return a complete map of all keys and all languages. 
    - Structure: `{ "key_name": { "en": "val", "zh-CN": "val" }, ... }`
    - This replaces the CSV source for the python script.
  - **Mode B (Single Lang - XML/JSON):** If `lang` is provided, return just that language's translations.
    - XML format must follow standard Android `<resources><string...>` structure with proper escaping.
    - Use Base Language as fallback for missing values.

## Part 3: Service Layer (`src/lib/services/storage.service.ts`)
Add `pullProjectTranslations(projectId, format, lang?)`:
- Query `prisma.translationKey` with `include: { values: true }`.
- Transform data efficiently into the requested JSON structure or XML string.
- Ensure `projectId` lookup ensures the project exists.

## Part 4: Frontend "Integration Guide" (The Missing Piece)
Add a new Dialog component `src/app/projects/[id]/components/IntegrationDialog.tsx`:

- **Trigger:** A "Code / CI/CD" icon button in the Project Header (next to Export).
- **Content:**
  - Display the **Project ID** (Read-only, Copyable).
  - Display a pre-generated **cURL Command** for developers to copy-paste:
    ```bash
    # Example for Full JSON Dump
    curl -H "Authorization: Bearer <HIDDEN_TOKEN_PLACEHOLDER>" \
         "https://<YOUR_HOST>/api/projects/${projectId}/pull?format=json" \
         -o translations.json
    ```
  - *Note:* Since the frontend shouldn't know the secret `API_ACCESS_TOKEN` for security reasons, just display a placeholder like `YOUR_API_TOKEN` in the command, and add a note telling them to ask the admin for the token.

## Constraints
- **Compatibility:** The API MUST use the existing `id` field from the `Project` model.
- **Performance:** The JSON dump should be fast for projects with <5000 keys.
- **Security:** Do NOT expose the actual `API_ACCESS_TOKEN` value to the frontend browser client.