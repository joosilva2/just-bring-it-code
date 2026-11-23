# Architecture rules
- Keep storefront layout and theme overrides scoped to the storefront so administrative screens retain their existing presentation.
- Use the shared Mangofy adapter for PIX creation and verification; validate provider transaction, external reference and amount before accepting status changes.
- Keep Mangofy credentials exclusively in server environment secrets; the admin panel may expose configuration booleans, never credential values.
- Use the existing Radix dialog for review-photo expansion so keyboard dismissal, focus management and scroll locking remain accessible.