/* ============================================================
   checklist-schema.js — Requirements checklist definition
   Shared by checklist.js, clients.js, reports.js, dashboard.js
   ============================================================ */

const CHECKLIST_SCHEMA = [
  {
    key: "basic", label: "Basic Documents", icon: "📄",
    items: [
      { key: "loan_application_form", label: "Loan Application Form" },
      { key: "government_id", label: "Government ID" },
      { key: "tin_id", label: "TIN ID" },
      { key: "id_picture", label: "2x2 ID Picture" }
    ]
  },
  {
    key: "banking", label: "Banking Documents", icon: "🏦",
    items: [
      { key: "bank_statement_3mo", label: "Latest 3 Months Bank Statement" },
      { key: "bank_certification", label: "Bank Certification" },
      { key: "checking_account", label: "Checking Account" },
      { key: "savings_account", label: "Savings Account" },
      { key: "passbook_copy", label: "Passbook Copy" },
      { key: "monthly_bank_statement", label: "Monthly Bank Statement" }
    ]
  },
  {
    key: "business", label: "Business Documents", icon: "🏢",
    items: [
      { key: "barangay_permit", label: "Barangay Business Permit", hint: "Required for loans up to ₱300,000", visible: c => (Number(c.loanAmount) || 0) <= 300000 },
      { key: "mayors_permit", label: "Mayor's Permit", hint: "Required for loans ₱301,000 and above", visible: c => (Number(c.loanAmount) || 0) >= 301000 },
      { key: "dti_registration", label: "DTI Registration" },
      { key: "bir_registration", label: "BIR Registration" },
      { key: "sec_registration", label: "SEC Registration", hint: "Corporation only", visible: c => c.businessType === "corporation" },
      { key: "articles", label: "Articles of Incorporation", hint: "Corporation only", visible: c => c.businessType === "corporation" },
      { key: "gis", label: "General Information Sheet (GIS)", hint: "Corporation only", visible: c => c.businessType === "corporation" },
      { key: "secretary_certificate", label: "Secretary Certificate", hint: "Corporation only", visible: c => c.businessType === "corporation" }
    ]
  },
  {
    key: "verification", label: "Business Verification", icon: "🔍",
    items: [
      { key: "proof_of_billing", label: "Proof of Billing" },
      { key: "exterior_photo", label: "Exterior Business Photo" },
      { key: "interior_photo", label: "Interior Business Photo" },
      { key: "sketch_map", label: "Sketch Map" }
    ]
  },
  {
    key: "insurance", label: "Insurance", icon: "🛡",
    items: [
      { key: "insurance_form", label: "Creditors Group Life Insurance Form" },
      { key: "beneficiary_info", label: "Beneficiary Information" },
      { key: "borrower_signature", label: "Borrower Signature" },
      { key: "witness_signature", label: "Witness Signature" }
    ]
  },
  {
    key: "submission", label: "Submission", icon: "📬",
    items: [
      { key: "uploaded_hunyo", label: "Uploaded to Hunyo" },
      { key: "verified_sales_officer", label: "Verified by Sales Officer" }
    ]
  }
];

const LT_STATUS_META = {
  pending:  { label: "Pending",  badge: "badge-gray"   },
  received: { label: "Received", badge: "badge-orange" },
  verified: { label: "Verified", badge: "badge-green"  },
  rejected: { label: "Rejected", badge: "badge-red"    }
};

/** Returns the flat list of checklist items visible for a given client (conditional logic applied). */
function ltVisibleItems(client) {
  const out = [];
  CHECKLIST_SCHEMA.forEach(sec => {
    sec.items.forEach(it => {
      if (!it.visible || it.visible(client)) out.push({ section: sec.key, sectionLabel: sec.label, ...it });
    });
  });
  return out;
}

/** Gets (and lazily initializes) the state object for one checklist item on a client. */
function ltGetItemState(client, sectionKey, itemKey) {
  client.checklist = client.checklist || {};
  client.checklist[sectionKey] = client.checklist[sectionKey] || {};
  if (!client.checklist[sectionKey][itemKey]) {
    client.checklist[sectionKey][itemKey] = { status: "pending", notes: "" };
  }
  return client.checklist[sectionKey][itemKey];
}

/** Computes progress stats for a client based on currently visible items. */
function ltComputeProgress(client) {
  const visible = ltVisibleItems(client);
  const total = visible.length;
  let verified = 0, received = 0, pending = 0, rejected = 0;
  visible.forEach(it => {
    const st = ltGetItemState(client, it.section, it.key).status;
    if (st === "verified") verified++;
    else if (st === "received") received++;
    else if (st === "rejected") rejected++;
    else pending++;
  });
  const pct = total ? Math.round((verified / total) * 100) : 0;
  return { total, verified, received, pending, rejected, pct, missing: pending + rejected };
}

/** Auto-promotes client status based on checklist progress (lightweight, non-destructive). */
function ltAutoUpdateStatus(client) {
  if (client.status === "cancelled") return client.status;
  const { pct } = ltComputeProgress(client);
  if (pct === 100) client.status = "completed";
  else if (pct > 0 && client.status === "pending") client.status = "in-progress";
  return client.status;
}

const LT_CLIENT_STATUS_META = {
  "pending":     { label: "Pending",     badge: "badge-gray"  },
  "in-progress": { label: "In Progress", badge: "badge-blue"  },
  "completed":   { label: "Completed",   badge: "badge-green" },
  "cancelled":   { label: "Cancelled",   badge: "badge-red"   }
};

const LT_LOAN_TYPE_META = {
  "new":        "New Client",
  "additional": "Additional Loan",
  "reloan":     "Re-loan"
};
