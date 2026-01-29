# People & Groups — System View & Next Steps

Quick view of how People/Groups fit the rest of Fusion and what to do next.

---

## How It Fits Today

| Area | People | Groups |
|------|--------|--------|
| **Dashboard** | Site manager shown as PersonToken; click → People page. Manager name matched to Person by name. | Not shown. |
| **Map / Locations** | People rendered on map (x,y); click → People page. | No group filter on map. |
| **Zones** | People on ZoneCanvas; select → People page. | No link to groups. |
| **Rules** | Not used. Rules target zones/devices only. | Not used. |
| **Device Lookup** | Not linked. | Not linked. |
| **Firmware / Faults** | Not linked. | Not linked. |
| **BACnet** | Not linked. | Not linked. |

**Data:** Person has `x, y, role, imageUrl`; Group has `personIds`, `deviceIds`. Site has `manager` (string). No `Device.assignedTo` or Rule↔Person.

---

## Gaps vs Rest of System

1. **No group-based filtering on Map/Zones** — Zones and map filter by type/status; you can’t “show only this group” on the map.
2. **People/Groups not in export** — `EXPORT_DATA.md` / seed export is zones + devices only; people and groups aren’t in the export story.
3. **Rules don’t know people/groups** — Rules are zone/device-only; no “notify group” or “run when person X is assigned.”
4. **Dashboard doesn’t use groups** — Manager is a single person; no “store team” or group-based dashboard widgets.
5. **Device has no “assigned to”** — No link from device to person for accountability/maintenance.
6. **Nav grouping** — Groups under “Mapping & Organization,” People under “Configuration”; they’re related but split.

---

## Recommended Next Steps (Prioritized)

### Do Soon (high impact, aligns with rest of app)

1. **Group filter on Map**  
   Add a map filter (or layer) “Show by group” so devices/people can be filtered by group, similar to zone/device filters. Reuses existing map + filter patterns.

2. **Include People & Groups in export/seed**  
   Extend export/seed (and docs) so people and groups are part of the “current state” export and deployment story, like zones and devices.

3. **Document the “manager ↔ person” flow**  
   One short doc or section: how Site.manager (string) is matched to Person, where it’s used (dashboard, AddSiteModal), and that it’s name-based. Reduces confusion and supports future improvements (e.g. Site.managerId).

### Do Next (clear value, medium effort)

4. **Device “assigned to” (optional person)**  
   Add `assignedToPersonId` (or similar) on Device; show in Device Lookup and optionally on map. Gives accountability without tying rules to people yet.

5. **Dashboard: “Store team” or group summary**  
   For the selected site, show one line or card: “Team: N people in M groups” or list groups with counts; link to Groups/People. Keeps dashboard as the hub.

6. **Bulk actions for People**  
   On People page: multi-select then “Assign role,” “Add to group,” “Remove from group.” Matches the way devices/zones are managed elsewhere.

### Later (when you need them)

7. **Rules and people** — e.g. “Notify group when…” or “If person X is assigned to device…” (needs product rules first).
8. **Group-based rules** — e.g. “Apply this rule only to devices in group G.”
9. **People activity / audit** — who did what, when (if you need compliance or debugging).

---

## Small Wins You Can Do Anytime

- **Nav:** Move People next to Groups (e.g. both under “Mapping & Organization” or a shared “People & Groups” block) so the relationship is obvious.
- **People page:** Add “Export CSV” for current site’s people (and optionally their groups) using existing table data.
- **Groups page:** In empty state or panel, add one line: “Tip: Add people and devices from the People page and Device Lookup, then group them here.”

---

## Summary

People and Groups are well integrated with each other and with Dashboard (manager), Map (people pins), and Zones (people on canvas). The main gaps are: **no group filter on map**, **no people/groups in export**, and **no link from devices or rules to people/groups**. Tackling the “Do Soon” list will align People/Groups with how the rest of the system works and make them first-class in deployment and discovery.
