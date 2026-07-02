[README.md](https://github.com/user-attachments/files/29598577/README.md)
# Loan Officer Toolkit

A full loan-officer CRM built on top of the original Loan Calculator — same ledger-inspired
design (deep teal + warm gold, monospace numerals, receipt-tape formula view), now expanded
into six pages with a shared navbar. Pure HTML/CSS/JavaScript, no backend, no build step —
everything persists in the browser's Local Storage and it deploys straight to GitHub Pages.

## Pages

| Page | File | What it does |
|---|---|---|
| 🏠 Dashboard | `index.html` | Stat cards, recent clients, recent activity, portfolio widgets |
| 🧮 Loan Calculator | `calculator.html` | Original calculator + "Create Client From Calculation" |
| 📋 Requirements Checklist | `checklist.html` | Per-client document checklist with smart conditional items |
| 👥 Client Manager | `clients.html` | Searchable client table + full client profile (tabs) |
| 📄 Reports | `reports.html` | Chart.js dashboards + export (PDF/JSON/CSV) + backup/restore |
| ⚙ Settings | `settings.html` | Company branding, theme, currency, loan defaults |

## Project structure

```
loan-toolkit/
├── index.html
├── calculator.html
├── clients.html
├── checklist.html
├── reports.html
├── settings.html
├── css/
│   └── style.css              (shared design system)
├── js/
│   ├── storage.js              (Local Storage data layer — the single source of truth)
│   ├── checklist-schema.js     (requirements list + conditional logic + progress math)
│   ├── checklist-ui.js         (renders/wires the interactive checklist — shared by 2 pages)
│   ├── pdf.js                  (jsPDF client report generator — shared by 3 pages)
│   ├── utils.js                (formatting, toast, theme, debounce, branding)
│   ├── navbar.js                (injects the shared top navbar)
│   ├── dashboard.js / calculator.js / clients.js / checklist-page.js / reports.js / settings.js
└── assets/
    ├── logo.png                 (default company logo — replaceable in Settings)
    └── hero-bg.jpg               (dashboard hero background)
```

## Data model

Everything lives under one Local Storage key (`loanToolkitData_v1`) so Backup/Restore is a
single JSON file:

```js
{
  settings: { companyName, companyPrefix, companyLogo, theme, currency, interestDefault, serviceFeeDefault, nextSeq },
  clients: [
    {
      id, applicantName, contact, loanAmount, loanTerm, loanType, businessType,
      interestRate, serviceFee, notes, status, dateCreated, dateModified,
      checklist: { sectionKey: { itemKey: { status, notes } } },
      history: [{ date, text }]
    }
  ],
  calculatorHistory: [...],
  activity: [...]
}
```

Client IDs auto-generate as `PREFIX-YEAR-####` (e.g. `ESQ-2026-0001`) using the prefix set in
Settings.

## Smart conditional checklist

Some checklist items only appear based on client data — defined once in
`js/checklist-schema.js` and evaluated live:

- **Barangay Permit** shows when loan amount ≤ ₱300,000; **Mayor's Permit** shows at ₱301,000+.
- **SEC Registration**, **Articles**, **GIS**, and **Secretary Certificate** only show when
  Business Type = Corporation.

Each client's checklist is stored under their own record, so checking a document for one client
never touches another.

## Notes on scope

A couple of small, deliberate additions beyond the original brief, flagged here for
transparency:

- **Business Type** (Sole Proprietorship / Corporation) was added as a client field — it's
  required to drive the SEC/GIS/Secretary Certificate conditional logic you asked for.
- Backup/Restore and Export live on the **Reports** page (grouped with the other
  data-management tools) rather than as a separate top-level nav item, to keep the six-page
  navbar exactly as specified.
- "Future ready" modules (Commission Calculator, OCR, SMS/Email reminders, Calendar, Task
  Manager, full CRM) were intentionally **not** built — the codebase is structured (one file per
  concern, a single shared data layer, a shared navbar) so any of those can be added later as a
  new page + JS file without touching existing ones.

## Publishing to GitHub Pages

1. Create a new GitHub repository and upload this entire folder (keep the structure — `css/`,
   `js/`, `assets/` must sit alongside the `.html` files).
2. In the repo, go to **Settings → Pages → Source → Deploy from a branch**, choose `main` and
   `/ (root)`, then **Save**.
3. Your toolkit will be live at `https://yourusername.github.io/your-repo-name/`.

Because everything is Local Storage-based, each visitor's data stays in their own browser — the
hosted site itself has no shared database.
