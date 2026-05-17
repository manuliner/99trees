# Admin components

**Purpose:** Organizer UI sections for edition setup (stations, teams, map, QR export).

- **AdminEditionHeader.vue**, **AdminEditionControl.vue**, **AdminEditionSettings.vue** — edition meta, status, config
- **AdminStationsSection.vue**, **AdminStationEditModal.vue**, **AdminStationsImportModal.vue** — station CRUD and import
- **AdminTeamsSection.vue** — team list and PIN tools
- **AdminMapUpload.vue** — festival map image
- **AdminPrintPack.vue** — QR export UI
- **AdminCrewPassword.vue** — crew password for edition
- **AdminAccordionSection.vue** — collapsible section wrapper

**Used by:** `app/pages/admin/index.vue` via `useAdminEdition`.
