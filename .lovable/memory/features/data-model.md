---
name: Data model
description: Database tables for business profile, daily financial entries, and inventory tracking
type: feature
---
Three tables in Lovable Cloud (Supabase):
- **business_profiles**: stores business_name (single row, no auth)
- **daily_entries**: date (unique), revenue, expenses, profit
- **inventory_items**: item_name, quantity, unit
All have open RLS policies (no auth). Will need tightening when auth is added.
localStorage is no longer used — all persistence is via Supabase.
