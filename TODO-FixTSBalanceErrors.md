# TODO: Fix TypeScript Errors in api/[...slug].ts - Balance Funding Source

## Plan Steps (Approved ✅)
- [✅] 1. Install @types/dotenv
- [✅] 2. Update src/types.ts with FB response interfaces
- [✅] 3. Update api/[...slug].ts: Expand funding_source_details fields, use display_string, fix types/scoping
- [ ] 4. Verify `npm run lint` passes
- [ ] 5. Test /facebook/balance endpoint

## Progress
✅ @types/dotenv installed.
✅ Added FB types to src/types.ts.
✅ Updated api/[...slug].ts with full funding_source_details fields, display_string usage, typed data.

**Next:** Test /facebook/balance endpoint (lint passed silently - no errors output)


