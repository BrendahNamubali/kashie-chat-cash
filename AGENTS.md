# Architecture rules

- Keep presentation motion in shared CSS and UI helpers; never use animation state to drive financial writes or AI requests.
- Use the shared reduced-motion hook for JavaScript animations so system preference changes also stop count-ups and chart motion.
- Store business identity in the existing user-owned profiles table and fetch it server-side for each AI request, so personalization stays current and isolated per user.
- Keep post-login currency reminder dismissal in per-user runtime memory, separate from saved profile currency; Settings reads the profile so an unset currency is never mistaken for a display fallback.
- Render official branding through the shared KashieLogo helper backed by immutable asset pointers; use an independent small raster favicon so browser requests work without the asset loader.
- Keep tax preparation in a dedicated wizard using existing tax calculations and user-owned return snapshots; exports are draft worksheets and must never imply URA filing or overwrite progressed returns.
- Share deterministic planning calculations between forecast and financing screens; missing records are explicit, profit is not available cash, and scenarios never write financial data.
- Pricing and subscription pages must distinguish advertised offers from verified billing; never infer trial dates or paid entitlements without a connected billing source.