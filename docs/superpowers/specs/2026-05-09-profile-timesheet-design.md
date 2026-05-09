# Design Spec: Keka-style Profile & Timesheet
**Date:** 2026-05-09
**Project:** YCPL Internal Portal — `index.html` (single-file vanilla JS app)
**Scope:** Two features built into the existing file. No new dependencies.

---

## 1. Timesheet Redesign — Project × Day Grid

### Overview
Replace the current chip-based day-per-row timesheet with a Keka-style grid: rows are projects, columns are weekdays. The submission flow (weekly, manager approval) is unchanged.

### Layout

```
[ ← ]  Week of 5 May – 9 May 2026  [ → ]   [ Save Draft ]  [ Submit for Approval ]

Weekly Progress ────────────────────────── 22h / 45h

┌─────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────┐
│ Day Status      │ MON 5    │ TUE 6    │ WED 7    │ THU 8    │ FRI 9    │       │
│                 │ Present▼ │ WFH   ▼  │ Present▼ │ Leave ▼  │ Present▼ │       │
├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────┤
│ YCPL Portal     │   4.0    │   8.0    │   5.0    │   —      │   4.0    │ 21.0h │
│ EcoVadis Gap    │   4.0    │   0.0    │   3.0    │   —      │   4.0    │ 11.0h │
│ + Add Project   │          │          │          │          │          │       │
├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────┤
│ Daily Total     │   8.0h   │   8.0h   │   8.0h   │   —      │   8.0h   │ 32.0h │
└─────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────┘
```

### Day Status Strip
- One dropdown per weekday column: `Present | WFH | Leave | Holiday | Weekend`
- Weekends (Sat/Sun): auto-set to `Weekend`, column greyed, inputs hidden
- Public holidays: auto-set from existing `HOLIDAYS` data, column styled gold
- `Leave` or `Holiday` status: column greyed, all hour inputs disabled and show `—`

### Project Rows
- Pre-populated from `yt_projects` where `assignedTo` includes `currentUser.name` and `status === 'active'`
- If no projects assigned: one blank editable row shown with free-text name input
- "+ Add Project" button appends a new row — user can type a project name or pick from a dropdown of assigned projects not yet in the grid
- Rows can be removed via a `×` button on the left

### Hour Inputs
- Number input, min 0, max 24, step 0.5
- Empty = 0 for totals calculation
- Daily total cell: colour-coded — green (7.5–9h), amber (< 6h or > 10h), default otherwise

### Data Model
Saves into existing `yt_logs` localStorage format so Submission History, Approvals, and Analytics views continue to work unchanged.

Each weekly save stores:
```js
{
  user: currentUser.name,
  weekStart: "2026-05-05",   // ISO Monday
  days: {
    "2026-05-05": { status: "Present", projects: { "YCPL Portal": 4, "EcoVadis Gap": 4 }, note: "" },
    "2026-05-06": { status: "WFH",     projects: { "YCPL Portal": 8 }, note: "" },
    // ...
  },
  status: "draft" | "submitted" | "approved" | "rejected"
}
```

The `renderWeek()` and `buildWeekRows()` functions are replaced entirely. `saveDraft()` and `submitWeek()` updated to write the new format. History/approval reads adapted to handle both old and new format.

---

## 2. Profile Customisation — Tabbed, Keka-style

### Overview
Replace the current read-only profile view with a fully editable tabbed profile. The existing left-card (avatar, name, role) becomes the persistent sidebar; all editable content lives in tabs on the right.

### Layout

```
┌────────────────┬──────────────────────────────────────────────────────┐
│                │  [ Personal ] [ Work Info ] [ Bank & PAN ] [ Edu ] [ Docs ] │
│  [  Photo  ]   ├──────────────────────────────────────────────────────┤
│  Mamta Kumar   │                                                      │
│  Admin         │  < tab content >                    [ Edit ]         │
│  Leadership    │                                                      │
│  Full-time     │                                                      │
│  Joined: —     │                                                      │
└────────────────┴──────────────────────────────────────────────────────┘
```

### Left Sidebar Card (persistent)
- Profile photo: click to open file picker → stores as base64 in `yt_profile_<name>`
- Displays: name, role badge, department, employment type, joining date
- "Change Photo" link below avatar
- Below the card: **Activity Heatmap** (hours logged — last 12 weeks) and **Monthly Summary** preserved from the current profile view

### Tabs & Fields

**Personal**
| Field | Editable? | Input type |
|---|---|---|
| Full Name | Read-only | — |
| Date of Birth | Yes | date |
| Blood Group | Yes | select: A+/A-/B+/B-/O+/O-/AB+/AB- |
| Marital Status | Yes | select: Single/Married/Divorced/Widowed |
| Gender | Yes | select: Male/Female/Non-binary/Prefer not to say |
| Phone | Yes | tel |
| Home Address | Yes | textarea |
| Emergency Contact Name | Yes | text |
| Emergency Contact Phone | Yes | tel |
| Emergency Contact Relation | Yes | text |

**Work Info** — all read-only for employees, editable only by admin
| Field | Notes |
|---|---|
| Employee ID | Auto-generated from DEMO_USERS index |
| Department | From DEMO_USERS |
| Designation | From DEMO_USERS (type field) |
| Reporting Manager | From DEMO_USERS reportsTo |
| Joining Date | Stored in `yt_profile_<name>` by admin |
| Employment Type | From DEMO_USERS |
| Work Location | Employee-editable: WFH / Office / Hybrid |

**Bank & PAN**
All fields employee-editable. Displayed masked (last 4 digits visible) in read-only view.
- Bank Name (text)
- Account Number (number, masked)
- IFSC Code (text, uppercase)
- Account Type (select: Savings/Current)
- PAN Number (text, masked, uppercase)

**Education** — repeatable list
Each entry: Degree/Qualification · Institution · Year of Passing · Grade/Score
- "Add Education" button appends a new entry form
- Each entry has a delete button
- Saved as array in `yt_profile_<name>.education`

**Documents** — upload slots
Six named slots: Aadhaar · PAN Card · Passport · Offer Letter · Degree Certificate · Other
Each slot:
- Upload button → file picker (accepts PDF, JPG, PNG, max 5MB)
- On upload: stored as base64 in `yt_profile_<name>.documents.<slot>`
- Uploaded state shows: filename + "View" link (opens base64 in new tab) + "Remove" button

### Edit / Save Pattern
- Each tab has a single "Edit" button (top-right of tab content)
- Clicking Edit → all fields in tab become inputs, button changes to "Save Changes" + "Cancel"
- Save → writes to `yt_profile_<name>` in localStorage, exits edit mode, shows success toast
- Cancel → reverts to last saved state, exits edit mode
- Exception: Documents tab has no Edit mode — uploads/removes are immediate

### Data Storage
```js
// localStorage key: yt_profile_<username>
{
  photo: "data:image/jpeg;base64,...",   // or null
  personal: {
    dob: "1985-03-15", bloodGroup: "O+", maritalStatus: "Married",
    gender: "Female", phone: "+91 98765 43210",
    address: "123 Main St, New Delhi",
    emergencyName: "Manoj Kumar", emergencyPhone: "+91 ...", emergencyRelation: "Spouse"
  },
  work: {
    workLocation: "WFH",
    joiningDate: "2020-01-15"   // admin-set
  },
  bank: {
    bankName: "HDFC Bank", accountNumber: "12345678901234",
    ifsc: "HDFC0001234", accountType: "Savings", pan: "ABCDE1234F"
  },
  education: [
    { degree: "MBA", institution: "Delhi University", year: "2010", grade: "8.2 CGPA" }
  ],
  documents: {
    aadhaar: { name: "aadhaar.pdf", data: "data:application/pdf;base64,..." },
    pan: null,
    passport: null,
    offerLetter: null,
    degreeCertificate: null,
    other: null
  }
}
```

---

## 3. Scope Boundaries

**In scope:**
- Both features built entirely inside `index.html`
- All data in `localStorage` (no backend)
- Profile photo and documents stored as base64
- Existing approval, history, and analytics views updated to read new timesheet format

**Out of scope:**
- Server-side storage
- File size enforcement beyond a 5MB soft warning
- Admin UI for setting employee Work Info fields (admin can edit via Settings or their own profile view — not in this spec)
- Export to Excel/PDF

---

## 4. Implementation Order
1. Timesheet grid (CSS + HTML + JS rewrite of `renderWeek` / `buildWeekRows`)
2. Profile left-card + photo upload
3. Profile tabs: Personal → Work Info → Bank & PAN → Education → Documents
