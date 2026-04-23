# Mobile Tabs Fix - BLACKBOXAI Progress Tracker

**Status**: 🔄 IN PROGRESS

## Approved Plan (User: ✅ sim)
**Root Cause**: 7 tabs overflow on mobile (375px iPhone width)

**Implementation**:
```
MOBILE (5 tabs): Empresas, Relatórios, Águia + dynamic
ADMIN DRAWER: ☰ → Meta, Users, Config, History (slide-out)
Files: Layout.tsx only
```

## Steps
- [✅] 1. Create TODO-MobileTabsFix.md 
- [✅] 2. Read Layout.tsx 
- [✅] 3. **Edit Layout.tsx**: 5-tab mobile + Admin drawer
  ```
  ✅ MobileBottomNav: 3 core tabs + ☰ Admin button (5 total)
  ✅ MobileAdminDrawer: Slide-out with Meta/Users/Config/History/Sistema
  ✅ Animations: Spring drawer + backdrop
  ✅ Touch targets: 56px height, proper spacing
  ✅ Admin badge: Pulsing dot on ☰ button
  ```
- [ ] 4. Test: 5 tabs visible + drawer works
- [ ] 5. Update TODO ✅ COMPLETE
- [ ] 6. attempt_completion

**Next**: Test mobile → Update TODO → Complete

