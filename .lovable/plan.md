# Kashie Home and public landing

## Build
- Add a short public landing page at `/` for signed-out visitors with the requested headline, concise product summary, three benefits, trial pricing, and sign-up/sign-in actions.
- Add a protected `/home` command centre and make it the destination after sign-in and onboarding. Signed-in visitors opening `/` will be redirected there.
- Keep `/dashboard` as the detailed analytics view and add clear Home and Dashboard navigation entries.

## Signed-in Home
- Reuse the existing profile, daily-entry, inventory, formatting, and alert helpers so every figure comes from the current user’s stored data.
- Show a time-aware greeting, 30-day Sales, Expenses, Profit, and live low-stock count in four compact cards.
- Show a concise attention list from existing alert logic, including stock, spending/profit, and missing recent activity; otherwise show a positive all-clear state.
- Add “Ask Kashie” questions that open the existing AI CFO chat with that question ready to send.
- Add compact quick actions. Sales, expense, inventory, forecast, tax, and financing will open the existing AI chat with an appropriate prompt; Reports will use the existing reports page. No business logic will be duplicated or changed.

## Small supporting updates
- Let the chat accept a one-time prompt passed from Home, while preserving normal chat behavior.
- Let the public trial button open the existing sign-up form directly.
- Update app metadata to describe Kashie as an AI CFO for small businesses.

## Validation
- Check signed-out `/`, sign-in redirects, onboarding redirects, protected `/home`, Home-to-Dashboard navigation, mobile layout, AI question/action handoff, and existing Dashboard/Reports access.
- Confirm the preview build is clean and fix only errors introduced by these changes.
