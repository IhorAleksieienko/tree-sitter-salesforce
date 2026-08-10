# Step 29: Downstream Semantic Ingestion — Metadata XML, LWC Controller & Template Analyzers (`sf-rag-engine`)

> **Agent Checkpoint — Read This First**
>
> **Status**: NOT STARTED.
> **Prerequisites**: Steps 10–28 are COMPLETE.
> - `tree-sitter-salesforce` provides complete AST extraction for Apex, Anonymous Apex, SOQL, SOSL, and Formula Language.
> - Python bindings (`tree_sitter_salesforce`) are installed in the `sf-rag-engine` downstream environment.
>
> **Design Flag ℹ️ [ARCHITECTURAL BOUNDARY]**:
> As established in Section 1 of `docs/gap-analysis.md`, `tree-sitter-salesforce` is strictly a syntactic parsing layer for proprietary Salesforce DSLs. Non-proprietary formats (standard XML, JavaScript/TypeScript, HTML) are ingested directly in `sf-rag-engine` using standard upstream parsers:
> - **Metadata XML (`*-meta.xml`)**: Ingested via Python `defusedxml` / `lxml`.
> - **LWC JS/TS Controllers (`.js`, `.ts`)**: Ingested via standard `tree-sitter-javascript` / `tree-sitter-typescript`.
> - **LWC HTML Templates (`.html`)**: Ingested via standard `tree-sitter-html` / DOM parser.

---

## Goal

Build the static semantic ingestion pipeline in downstream `sf-rag-engine` to combine syntactic ASTs from `tree-sitter-salesforce` with metadata XML and LWC components into a unified static dependency graph (`dependencies.json`):
1. **Metadata XML Ingestor**: Parse Custom Objects, Custom Fields, Permission Sets, Profiles, and Flow definitions into schema graph nodes.
2. **LWC JS/TS Controller Analyzer**: Extract `@wire(getRecord)`, Apex `@AuraEnabled` method imports (`@salesforce/apex/...`), schema imports (`@salesforce/schema/...`), and public `@api` properties.
3. **LWC HTML Template Analyzer**: Extract data binding expressions (`{property}`) and event handlers (`onclick={handleClick}`) to link UI elements to controller properties.
4. **Graph Aggregator**: Connect Apex classes, triggers, SOQL queries, formula expressions, metadata fields, and LWC components into a deterministic, queryable dependency graph.

---

## Background: Current State

`tree-sitter-salesforce` successfully parses all proprietary Salesforce code (Apex, SOQL, SOSL, Formula Language). However, real-world Salesforce enterprise applications are tightly coupled across multiple layers:
1. An Apex controller provides `@AuraEnabled` methods consumed by an LWC component via `@salesforce/apex/AccountController.getAccounts`.
2. An LWC JavaScript file wires schema references from `@salesforce/schema/Account.Industry`.
3. An LWC HTML template binds a button event `onclick={handleSave}` to a JavaScript method.
4. A Flow definition calls an `@InvocableMethod` in an Apex class.
5. A Custom Field is referenced in a Formula validation rule and a SOQL query.

To achieve complete static codebase intelligence, RAG semantic search, and impact analysis, `sf-rag-engine` must ingest these cross-cutting components without bloating the core Tree-sitter grammars.

---

## Technical Design

### 1. Metadata XML Ingestion Engine (`sf-rag-engine/ingestors/metadata_xml.py`)
- **Where to look**: Ingestor module in `sf-rag-engine`.
- **What to touch**:
  - Implement `MetadataXmlIngestor`:
    - `parse_object(file_path)`: Extract object name, sharing model, and custom fields from `.object-meta.xml` or `objects/` directory.
    - `parse_field(file_path)`: Extract field type, formula expressions, lookup relationships, and required flags from `fields/*.field-meta.xml`.
    - `parse_permission_set(file_path)`: Extract object and field permissions (`<objectPermissions>`, `<fieldPermissions>`) from `permissionsets/*.permissionset-meta.xml`.
    - `parse_flow(file_path)`: Extract flow nodes, record lookups, invocable action calls, and formula formulas from `flows/*.flow-meta.xml`.
  - Use `defusedxml.ElementTree` for safe, high-speed XML parsing.

### 2. LWC JS/TS Controller Semantic Analyzer (`sf-rag-engine/ingestors/lwc_controller.py`)
- **Where to look**: LWC ingestor module in `sf-rag-engine`.
- **What to touch**:
  - Implement `LwcControllerAnalyzer` using `tree-sitter-javascript` / `tree-sitter-typescript`:
    - Query imports for module specifiers starting with `@salesforce/apex/`, `@salesforce/schema/`, `@salesforce/label/`, `@salesforce/messageChannel/`.
    - Query class body for decorators: `@api`, `@wire`, `@track`.
    - Extract wire adapter targets (e.g. `@wire(getAccounts, { searchKey: '$searchKey' })`) and link the parameter dependencies.
    - Extract exported and internal controller methods.

### 3. LWC HTML Template Binding Analyzer (`sf-rag-engine/ingestors/lwc_template.py`)
- **Where to look**: Template ingestor module in `sf-rag-engine`.
- **What to touch**:
  - Implement `LwcTemplateAnalyzer` using `tree-sitter-html` / DOM parser:
    - Extract dynamic attribute bindings: `value={account.Name}`, `if:true={hasRecords}`.
    - Extract event bindings: `onclick={handleClick}`, `onchange={handleInputChange}`.
    - Extract component instantiations: `<c-custom-card>` (linking child component dependency).
    - Map bound identifiers to controller properties and methods.

### 4. Unified Dependency Graph Serialization (`sf-rag-engine/graph/builder.py`)
- **Where to look**: Graph aggregation module in `sf-rag-engine`.
- **What to touch**:
  - Combine:
    - Apex symbol ASTs (from `tree-sitter-salesforce` Apex/SOQL/SOSL parsers).
    - Formula expressions (from `tree-sitter-salesforce` Formula parser).
    - Metadata schema entities (from `MetadataXmlIngestor`).
    - LWC Controller & Template mappings (from LWC analyzers).
  - Emit deterministic output `dependencies.json` with standardized node IDs and typed dependency edges (`CALLS`, `REFERENCES_FIELD`, `QUERIES_OBJECT`, `WIRES_APEX`, `BINDS_TEMPLATE_EVENT`).

---

## Affected Files (in `sf-rag-engine` & Documentation)

| File | Change Type | Description |
|---|---|---|
| `sf-rag-engine/ingestors/metadata_xml.py` | **New** | XML metadata parser for objects, fields, permissions, and flows. |
| `sf-rag-engine/ingestors/lwc_controller.py` | **New** | LWC JS/TS controller AST analyzer. |
| `sf-rag-engine/ingestors/lwc_template.py` | **New** | LWC HTML template binding analyzer. |
| `sf-rag-engine/graph/builder.py` | Modify | Unified static graph builder combining AST and metadata edges. |
| `sf-rag-engine/tests/test_ingestion.py` | **New** | End-to-end static ingestion test suite. |
| `ARCHITECTURE.md` | Modify | Document data-flow architecture between syntactic and semantic layers. |

---

## Sub-Tasks

### Sub-Task 29.1: Build XML Metadata Ingestor
- Implement `defusedxml` parser for CustomObject, CustomField, PermissionSet, and Flow metadata XML files.
- Add unit tests verifying schema entity extraction.

### Sub-Task 29.2: Build LWC Controller Analyzer
- Author Tree-sitter JS/TS queries for `@salesforce/*` imports and decorators (`@wire`, `@api`).
- Add unit tests extracting Apex method dependencies from sample LWC controllers.

### Sub-Task 29.3: Build LWC Template Analyzer
- Author template parser extracting `{property}` bindings and `on*` event handlers.
- Add unit tests linking HTML elements to JS controller handlers.

### Sub-Task 29.4: Implement Unified Graph Export
- Construct unified graph builder producing `dependencies.json`.
- Validate that changing an Apex method name correctly flags dependent LWC controllers in impact queries.

---

## How to Test This Step

### 1. Run Ingestion Unit Tests
```cmd
cd d:\Git\sf-rag-engine
pytest tests/test_ingestion.py
```
Verify that XML, LWC JS, and LWC HTML test fixtures parse without errors.

### 2. End-to-End Dependency Graph Verification
Run the graph builder on a sample Salesforce project:
```cmd
python -m sf_rag_engine.graph.builder --project-root ./tests/fixtures/sample_project --output dependencies.json
```
Inspect `dependencies.json`:
- Confirm node types exist for `ApexClass`, `CustomObject`, `CustomField`, `LwcComponent`, `Flow`.
- Confirm edge types exist for `WIRES_APEX`, `REFERENCES_FIELD`, `BINDS_EVENT`.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | CustomObject and CustomField XML files ingest with types and formulas extracted | Pytest: `test_ingestion.py` |
| 2 | LWC JavaScript `@salesforce/apex/...` imports resolve to Apex class and method symbols | Pytest: `test_ingestion.py` |
| 3 | LWC HTML `{handler}` attributes map to Controller method definitions | Pytest: `test_ingestion.py` |
| 4 | Unified `dependencies.json` generated deterministically with 0 schema errors | Graph builder test |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Zero for `tree-sitter-salesforce`. Operates downstream in `sf-rag-engine`.
- **API Contract Impact**:
  - Standardizes the `dependencies.json` graph schema across the entire Salesforce code intelligence ecosystem.

---

## Documentation Updates Required

- [ ] `ARCHITECTURE.md`: Document separation of concerns between `tree-sitter-salesforce` and `sf-rag-engine`.
- [ ] `docs/gap-analysis.md`: Mark Phase 5 downstream ingestion tasks as complete.
- [ ] `CHANGELOG.md`: Record delivery of downstream semantic ingestion engine in `sf-rag-engine`.
