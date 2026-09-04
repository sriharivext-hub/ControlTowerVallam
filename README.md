# Control Tower Application

Control Tower is an internal monitoring and reporting dashboard built with an ASP.NET Core Web API backend and a lightweight Vanilla JavaScript frontend. It is designed to track factory line production metrics, cycle times, and inspection reports across various lines and stations.

## ⚙️ Technical Details

### Architecture
* **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6) served statically via `wwwroot`. No heavy frontend framework (React/Angular/Vue) is used, ensuring maximum performance and easy maintainability.
* **Backend**: ASP.NET Core Web API.
* **Data Access**: [Dapper](https://github.com/DapperLib/Dapper) micro-ORM for high-performance SQL Server data retrieval.
* **Database**: Microsoft SQL Server.

### Third-Party Frontend Libraries
* **[Chart.js](https://www.chartjs.org/)**: Renders dynamic, responsive dashboards and charts.
* **[Flatpickr](https://flatpickr.js.org/)**: Provides sleek, lightweight datetime pickers for report filtering.
* **[SheetJS (XLSX)](https://sheetjs.com/)**: Enables rich Excel data exports directly from HTML tables on the client-side.

---

## 🔄 Functional Flow

### 1. Global Configuration
The application is governed by a **Global Dashboard Line Dropdown** located in the top navigation bar. The values for this dropdown (e.g., `JEA1_New`, `JEA2`) are dynamically populated from `appsettings.json` -> `DashboardDropdownValues`. Changing this dropdown dictates the context for all subsequent data queries.

### 2. Dashboards Tab
* Serves as the landing page.
* Features a high-level overview of production lines.
* Data visualizations are powered by Chart.js.
* **Sidebar**: Collapses to an 80px icon rail by default on desktop (`assets/logo-small.png` shown when collapsed) with a toggle button; state persists via `localStorage.sidebarExpanded`. All nav items, including sub-menu entries, show tooltips on hover.
* **Fire Hydrant Monitoring** (`#tab-fire-hydrant`): A SCADA/P&ID-style dashboard for the factory's fire hydrant and sprinkler system. All datapoints are currently mock values defined as JS constants in `app.js` (`SCADA_TANKS`, `SCADA_DIESEL`, `SCADA_PUMPS`, `SCADA_GAUGES`, `SCADA_PRESSURE_POINTS`) — live backend wiring is planned via **MQTT** and not yet implemented. Rendered by `renderScadaDashboard()`, it has three sections:
  * **Water/Diesel Tanks**: CAD-style tank illustrations (header/nozzles, ladder, brick partition, level color-scale, butterfly-valve outlets) showing live-style fill % with green (>75%), yellow (50–75%), red (<50%) bands.
  * **Pump Manifold**: A 5-branch piping manifold (Diesel, Hydrant Main, Hydrant Jockey, Sprinkler Jockey, Sprinkler Main pumps) laid out with CSS Grid; piping is drawn dynamically into an SVG layer (`layoutScadaManifoldPipes()`) using `getBoundingClientRect()` measurements of the actual rendered valve/gate positions, so pipes stay pixel-aligned to components regardless of layout changes. Pipes render as a permanent 3D-gradient "tube" plus a red dashed flow overlay that only animates while a pump is toggled on.
  * **Shopfloor Pressure**: A coordinate-based schematic positioned beside (not below) the pump manifold, built from a fixed-size `position:relative` container (`.pipe-schematic`) with a single absolute `<svg class="pipe-svg">` layer (`overflow:visible`, z-index 0) drawing every pipe segment as `#800000` maroon `<path>`s at hardcoded coordinates, and `.pipe-card` widgets (z-index 1, transparent background, thin `#555` border) positioned on top via explicit `left`/`right`/`top` pixel values — left-column cards (Machine Shop, Engine Assembly, Vehicle Assembly) use `right`, right-column cards (Canteen, Paint Shop 2, Paint Shop 1) use `left`. EV Building sits above G120 with its own vertical connector; G120/RO ETP & STP/Fire Hydrant/MRS sit on the top branch. FG Warehouse shares Vehicle Assembly's row as a narrower card (`.pipe-card.narrow`) at the leftmost position, connected by its own pipe stub off the spine. Each row's pipe is drawn in two segments (spine → left card edge, then that card's far edge → right card edge) rather than one continuous line, so the pipe visibly stops at each card border instead of passing behind it. Values use a digital/7-segment-style monospace readout: bright red at `0.00`, neon green when `>0`. The whole canvas background and card label color follow the app's light/dark theme via CSS custom properties (`var(--background)`, `var(--dark)`), so the schematic stays legible in both modes.
* **EMS Renewable** (`#tab-ems-renewable`): A bento-box industrial dashboard for the Vallam renewable energy source, laid out with CSS Grid (`.ems-grid`, 62%/38% columns) rather than the SCADA canvas's absolute positioning. All data is mock JS constants (`EMS_GREEN`, `EMS_SOURCES`, `EMS_VOC`, `EMS_SOLAR`, `EMS_CONTRIB`) rendered by `renderEmsRenewable()`, with four Chart.js charts built in `emsRenderCharts()`: a Green Energy source-mix donut, a VOC pink bar chart, a Roof Top Solar spline-area chart (neon-green gradient fill), and a Green Power Contributions bar chart using a small inline `emsValueLabelPlugin` (a `chartjs-plugin-datalabels` substitute, since that plugin isn't bundled) to print values above each bar. The VOC "Actual Status" gauge is a hand-built SVG semicircle (`emsGaugeSvg()`), following the same arc/needle pattern as the Fire Hydrant gauges. Same `0`/`>0` → muted-blue/neon-green value coloring convention as the SCADA dashboards. Like the Fire Hydrant screen, colors are driven by the app's theme CSS variables (`var(--background)`, `var(--white)`, `var(--dark)`, `var(--gray)`, `var(--neutral)`) so it adapts to light/dark mode; `emsRenderCharts()` additionally picks Chart.js text/grid colors based on `document.body.classList.contains('light-mode')` (same pattern as the existing Pareto chart), and `applyTheme()` re-renders the EMS charts on the fly if that tab is active when the theme toggle changes.

### 3. Reports Tab
The core analytical section of the app, split into several specialized sub-reports:

* **Biometric Shiftwise**: 
   * **Dynamic UI Filtering**: The frontend dynamically populates a History Card (HC) dropdown based on the Global Dashboard Line Dropdown selection. Features an "ALL" option to fetch biometric data across all configured History Cards.
   * **Shift Configuration**: `appsettings.json` natively supports complex configurations for Shifts (A, B, C) and Pre-Shifts to allow exact time-range boundaries.
   * **High-Performance SQL Engine (UNION ALL)**: Instead of dropping data across complex midnight boundaries, the backend leverages a raw SQL `UNION ALL` query. It aggregates data simultaneously across `[BioMetric_Historical]`, `[BioMetric_CurrentShift]`, and `[BioMetric_PreShift]`.
   * **Dynamic Station Filtering**: Uses an `INNER JOIN` against `ehc.Vallam_StationMaster` to strictly filter Biometric data based on the selected Line and History Card, guaranteeing that only the correct stations are displayed. It defaults to ordering by Station Number ascending when "ALL" is selected.
* **Biometric Engine NO and Barcode**:
   * A new submenu entry under Reports, directly below Biometric Shiftwise (`#tab-biometric-engine-barcode`).
   * **Filters**: Global Line dropdown, a "Select HC" dropdown (populated via the same cascade as Biometric Shiftwise's HC list, minus the "ALL" option — HC is required here), and a toggle switch that swaps between an "Engine No" input and a "Barcode" input (the inactive one is disabled and faded).
   * **Step 1 (Station Resolution)**: Resolves every station for the selected Line + HistoryCard from `ehc.Vallam_StationMaster` in one query, capturing `DatabaseName`/`DbName` (for routing) and `StationName`/`StationType` (for display) together — no second lookup needed.
   * **Step 2 (Engine/Barcode Scan)**: Groups stations by physical table and scans each for `Engine_Number`, `Barcode_1`, `Barcode_2`, or `Barcode_3` matching the searched value, scoped per station — same value is checked regardless of which input (Engine No vs Barcode) the user typed into.
   * **Step 3 (Shift Resolution)**: For each matching event's `Date_Time`, computes which shift (A/B/C) it falls in using `ShiftConfiguration:Shifts` from `appsettings.json`, including correct handling of Shift C's midnight wraparound (its start date rolls back a day when the event time is in the post-midnight portion).
   * **Step 4 (Biometric Lookup)**: Reuses the exact `UNION ALL` shape from Biometric Shiftwise (Historical + CurrentShift + PreShift), but bounded to `[shift start, event time]` and filtered to the matched station — this naturally covers "is this the current/pre shift" without extra branching.
   * Table adds an **"Engine Number / Barcode"** column immediately after Station ID; Excel export mirrors the other reports' ExcelJS pattern.
   * Verified end-to-end against the live database (see API Details below).
* **Main Line Cycle Time**: 
   * **Step 1 (Dynamic Mapping)**: Queries the Filter database (`ehc.Vallam_StationMaster`) using the globally selected Line, a HistoryCard, and a Station to dynamically resolve the physical `DatabaseName` and `DbName` (table name) where the telemetry resides.
   * **Step 2 (Data Fetch)**: Queries the resolved dynamic table over the Data Connection string for actual cycle times and renders a 54-column paginated Grid.
* **Poke Yoke Manual Inspection**: 
   * **Dual Search Modes (Toggle)**: The UI features a dynamic, responsive toggle switch to switch between two distinct search modes:
     * **HC Mode**: Filters by Date Range and specific Stations. Features a custom Vanilla JS multi-select dropdown for selecting one or multiple stations simultaneously.
     * **Engine No Mode**: Omits date constraints. Performs an extremely optimized scan for a specific engine number across all configured checkpoints on the entire line.
   * **Dynamic Multi-Checkpoint Configuration**: The backend queries `ehc.Vallam_TagMaster` (where `PokeYokeCheckPoints = 'YES'`) to discover which tags/checkpoints to evaluate dynamically for each station, fully replacing legacy hardcoded columns.
   * **Intelligent Condition Filtering**: Adapts failure rules dynamically based on the tag: evaluates empty/null strings for barcode checkpoints, and evaluates `'BYPASSED'` strings for statuses, flags, and other inspections.
   * **Extreme Database-Level SQL Optimization**: Aggregates hundreds of dynamic tag conditions across dozens of stations into a single `CROSS APPLY` + `UNION ALL` SQL statement per physical database table. This executes complex engine-wide or multi-station searches instantly without looping.
* **Poke Yoke Manual Inspection Summary**:
   * Uses complex SQL "Gaps and Islands" approach using `ROW_NUMBER()` logic to identify consecutive islands of engine failures (where status is BYPASSED or barcode is missing).
   * Aggregates engine sequences into summary blocks specifying the `Starting Engine Number`, `Ending Engine Number`, `No Of Engines`, and the `Duration` in seconds of the consecutive failure event.
   * Leverages the same dynamic `ehc.Vallam_TagMaster` lookup configuration used by the Overall report.

---

## 🔌 API Details

The backend exposes RESTful API endpoints organized into two main controllers:

### `ConfigurationController.cs` (`/api/config`)
* `GET /api/config/dashboard-lines`
  * Returns a string array of available Dashboard Lines defined in `appsettings.json`.

### `ReportsController.cs` (`/api/reports`)
* `GET /api/reports/biometric-shiftwise`
  * Fetches Biometric Shiftwise data given `line`, `historyCard`, `startDate`, and `endDate`.
  * Executes the `UNION ALL` logic against historical, pre-shift, and current shift tables.
* `GET /api/reports/biometric-engine-barcode?line=...&historyCard=...&engineNo=...` (or `&barcode=...` instead of `engineNo`)
  * Resolves stations for the Line/HistoryCard, scans the resolved station tables for a matching `Engine_Number`/`Barcode_1/2/3`, then returns the biometric punch(es) recorded during that event's shift window at that station.
  * Requires `line`, `historyCard`, and exactly one of `engineNo` or `barcode`; returns `400` if neither is supplied.
  * Returns `[]` (not an error) when the station/value combination exists but no biometric punch falls within the resolved shift window — this is expected on sparse/stale biometric data, not a failure.
* `GET /api/reports/mainline/history-cards?line={line}`
  * Fetches distinct `HistoryCard` dropdown values for the Main Line Cycle Time report.
* `GET /api/reports/mainline/stations?line={line}&historyCard={historyCard}`
  * Fetches distinct Stations for a specific line and history card.
* `GET /api/reports/mainline/data?line=...&historyCard=...&station=...&startDate=...&endDate=...`
  * Performs the 2-step dynamic query to return the massive Main Line cycle time payload.
* `GET /api/reports/poke-yoke/history-cards?line={line}`
  * Fetches distinct `HistoryCard` values for Poke Yoke (often shares the same logic as Mainline).
* `GET /api/reports/poke-yoke/stations?line={line}&historyCard={historyCard}`
  * Fetches distinct Stations for the Poke Yoke report.
* `GET /api/reports/poke-yoke/data?line=...&historyCard=...&station=...&startDate=...&endDate=...&engineNo=...`
  * Performs the dynamic query and returns bypassed Engine/Station data. 
  * If `engineNo` is provided, the API ignores date/station constraints and searches for the engine across all associated station tables.
  * If `station` is used, it supports multiple comma-separated stations (e.g., `ML-01,ML-02`).
* `GET /api/reports/poke-yoke/summary/data?line=...&historyCard=...&station=...&startDate=...&endDate=...`
  * Executes the heavy "Gaps and Islands" SQL query against the resolved station tables.
  * Automatically aggregates bypassed rows into consecutive sequences and calculates failure durations in seconds.

---

## 🔑 Configuration (`appsettings.json`)

The application relies heavily on `appsettings.json` for database routing. 

```json
"ConnectionStrings": {
  "DefaultConnection": "...",
  "MainlineConnection": "...",
  "PokeYokeFilterConnection": "Server=10.130.1.73;Database=HISTORYCARDLINE02;...",
  "PokeYokeDataConnection": "Server=10.130.1.73;Database=master;..."
}
```
* **Filter Connections**: Used strictly to read mapping tables like `ehc.Vallam_StationMaster`.
* **Data Connections**: Because the Data Connections must query dynamically resolved databases (e.g., `[RE_Vallam_J1EA2_Mainline_DB].[dbo].[STN_data]`), the connection string's default `Database` is often set to `master` but requires cross-database query permissions.

---

## ✅ Do's and ❌ Don'ts

### ✅ Do's
* **Do ensure `TrustServerCertificate=True`**: When testing locally or without SSL certificates on the SQL Server, ensure connection strings bypass certificate validation.
* **Do use parameterized queries**: Dapper parameterization (`@Param`) is strictly used in backend services to prevent SQL Injection.
* **Do clear browser cache**: The frontend `app.js` is heavily customized; tell users to do a Hard Refresh (`Ctrl + F5`) if they report "missing" UI features after a deployment.
* **Do verify SQL Permissions**: The SQL login (e.g., `factreread`) must have global/cross-database `SELECT` permissions, as the app dynamically routes to databases like `REJILINE` and `RE_Vallam_J1EA2_Mainline_DB` based on user selection.

### ❌ Don'ts
* **Don't hardcode table or database names in the `ReportsService.cs` queries**: The application is built to scale across multiple factory lines. Always resolve the `DatabaseName` and `DbName` from `ehc.Vallam_StationMaster`.
* **Don't modify DOM Elements from JavaScript without verifying IDs**: The `app.js` file heavily relies on strict HTML IDs (`pokeYokeStart`, `mainDashboardDropdown`). Changing IDs in `index.html` will break javascript logic silently.
* **Don't use `SELECT *` in Dapper queries**: Always explicitly select columns (e.g., `SELECT [Date_Time], [Stn_Number]...`). If a dynamic table lacks a specific column mapped by `*`, Dapper will throw a runtime exception.
