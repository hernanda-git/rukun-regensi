# Usage Guidance

- The landing page has two tabs:
  1. **RT/RW Candidates** – review the responsive leaderboard, filter by block or gender, and tap the floating action button to open the candidate modal for add/edit.
  2. **Saran Warga** – read community suggestions and tap the button in the tab header to submit new feedback.
- Candidate modal fields: Name, NIK, Birth Date, Marital Status, Gender, Block (K–P), Job Status, RT/RW option, Visi, and Misi. Save unifies create/update via Supabase `candidates` table.
- Saran modal only needs author name and free-text content, stored in the `sarans` table.
- Summary cards above the tabs expose totals (candidates, average age, per-block counts) derived from fetched data.
- Keep the UI mobile-first; NextUI components wrap Tailwind utilities for spacing and responsiveness.
