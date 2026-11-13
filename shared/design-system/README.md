# KHATA shared visual language

The working reference is Website 3 in `artifacts/khata-dashboard`. Its `src/index.css` is the canonical visual token source for onboarding and the voice assistant: reuse its CSS custom properties, typography, spacing, border and radius conventions rather than inventing a different application identity.

Shared frontend primitives are the dashboard's local shadcn-compatible components. If integrating the other modules into this repository, move primitives into a shared library before consuming them across artifact packages; do not import directly from one application package into another.

## Product conventions

- Always use **KHATA** as the application identity.
- Call customer credit **credit / Udhar**, incoming money **payment**, and positive debt **outstanding**.
- Format INR using Indian grouping and rupee symbols. Store and transmit money as decimal strings.
- Negative balances are labeled **advance**, not overdue.
- Use the same meaning for credit, payment, correction, and failure colors in every module.
- Keep tap targets practical for shopkeepers using phones, labels explicit, forms keyboard-accessible, and success/error feedback based on server results.
- Do not show unauthenticated financial records, example balances as real data, unsupported language claims, or fake voice interactions.
- Prefer fast, straightforward business tasks over decorative motion or a separate marketing template.

Language preference is a shared shop field. Do not imply all languages have speech support merely because they can be stored as a preference.
