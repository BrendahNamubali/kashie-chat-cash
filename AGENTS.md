# Architecture rules

- Keep presentation motion in shared CSS and UI helpers; never use animation state to drive financial writes or AI requests.
- Use the shared reduced-motion hook for JavaScript animations so system preference changes also stop count-ups and chart motion.