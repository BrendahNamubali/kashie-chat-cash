# Architecture rules

- Keep presentation motion in shared CSS and UI helpers; never use animation state to drive financial writes or AI requests.
- Use the shared reduced-motion hook for JavaScript animations so system preference changes also stop count-ups and chart motion.
- Store business identity in the existing user-owned profiles table and fetch it server-side for each AI request, so personalization stays current and isolated per user.