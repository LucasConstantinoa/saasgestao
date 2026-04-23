# Reports PDF Fix - BLACKBOXAI Progress Tracker

**Status**: 🔄 IN PROGRESS

## Approved Plan (User: ✅ sim)
**Issues**:
```
❌ ReportsView.tsx: /api/facebook/ad-accounts → 500 error
❌ Toast: "Falha ao buscar dados do Facebook"
✅ Fix: Direct FB Graph API + jsPDF PDF per branch modal
```

## Steps
- [✅] 1. Create TODO-ReportsPDF.md
- [✅] 2. Read ReportsView.tsx
- [✅] 3. **Implement**: Direct FB API + jsPDF download
  ```
  ✅ Direct FB Graph API: /v19.0/act_{id}/insights (no proxy!)
  ✅ Graceful fallback: No token = local data only
  ✅ Bulk reports: Same direct API logic
  ✅ PDF: html2canvas screenshot → jsPDF
  ✅ UX: "FB Offline" warning → continue with local
  ```
- [ ] 4. Test: Branch modal → FB data + PDF download
- [ ] 5. Update TODO ✅ COMPLETE
- [ ] 6. attempt_completion

**Next**: Test PDF download → Complete ✅

**Status**: ✅ IMPLEMENTED - Ready for testing!

```
✅ Direct FB Graph API v19.0 (no proxy!)
✅ Bulk reports converted to direct API  
✅ Graceful FB fallback (local data)
✅ PDF: html2canvas → jsPDF per branch modal
✅ UX: Warning toast → Continue with local data

Test: npm run dev → Reports → Branch modal → Sync → PDF Download
```



