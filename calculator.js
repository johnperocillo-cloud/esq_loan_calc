(function () {
  "use strict";

  ltInitTheme();
  ltRenderNavbar("calculator");
  ltApplyBranding();

  const $ = (id) => document.getElementById(id);

  const els = {
    loanProduct: $("loanProduct"),
    applicantName: $("applicantName"),
    loanAmount: $("loanAmount"),
    loanTerm: $("loanTerm"),
    interestRate: $("interestRate"),
    serviceFee: $("serviceFee"),
    feeHandling: $("feeHandling"),
    paymentFrequency: $("paymentFrequency"),
    businessType: $("businessTypeCalc"),
  };

  const errEls = { loanAmount: $("err-amount") };

  let lastState = null;

  function validate() {
    let ok = true;
    const errors = [];
    const amount = parseFloat(els.loanAmount.value);
    const term = parseFloat(els.loanTerm.value);
    const rate = parseFloat(els.interestRate.value);
    const fee = parseFloat(els.serviceFee.value);

    if (!(amount > 0)) { ok = false; errors.push("Loan amount must be greater than zero."); errEls.loanAmount.style.display = "block"; }
    else errEls.loanAmount.style.display = "none";

    if (!(term >= 1)) { ok = false; errors.push("Loan term must be at least 1 month."); }
    if (!(rate >= 0)) { ok = false; errors.push("Interest rate cannot be negative."); }
    if (!(fee >= 0)) { ok = false; errors.push("Service fee cannot be negative."); }

    const banner = $("validationBanner");
    if (!ok) { banner.innerHTML = "⚠ " + errors.join(" "); banner.classList.add("show"); }
    else banner.classList.remove("show");
    return ok;
  }

  function compute() {
    const amount = parseFloat(els.loanAmount.value) || 0;
    const term = parseFloat(els.loanTerm.value) || 0;
    const ratePct = parseFloat(els.interestRate.value) || 0;
    const feePct = parseFloat(els.serviceFee.value) || 0;
    const feeHandling = els.feeHandling.value;
    const frequency = els.paymentFrequency.value;

    const rate = ratePct / 100;
    const fee = feePct / 100;

    const serviceFee = amount * fee;
    const totalInterest = amount * rate * term;

    const totalPayable = feeHandling === "finance" ? amount + totalInterest + serviceFee : amount + totalInterest;
    const netProceeds = feeHandling === "deduct" ? amount - serviceFee : amount;

    const monthlyPayment = term > 0 ? totalPayable / term : 0;
    const semiPayments = term * 2;
    const semiPayment = semiPayments > 0 ? totalPayable / semiPayments : 0;
    const perCheck = frequency === "semi" ? semiPayment : monthlyPayment;
    const numPayments = frequency === "semi" ? semiPayments : term;

    return {
      applicantName: els.applicantName.value.trim(),
      amount, term, ratePct, feePct, feeHandling, frequency, businessType: els.businessType.value,
      serviceFee, totalInterest, totalPayable, netProceeds, monthlyPayment, semiPayment, perCheck, numPayments
    };
  }

  function pulse(card) { card.classList.remove("updated"); void card.offsetWidth; card.classList.add("updated"); }

  function renderCards(s) {
    const map = { serviceFee: s.serviceFee, totalInterest: s.totalInterest, totalPayable: s.totalPayable, netProceeds: s.netProceeds, monthlyPayment: s.monthlyPayment, semiPayment: s.semiPayment, perCheck: s.perCheck };
    Object.keys(map).forEach((key) => {
      const el = $("out-" + key);
      const newVal = ltPeso(map[key]);
      if (el.textContent !== newVal) { el.textContent = newVal; pulse(el.closest(".stat-card")); }
    });
  }

  function renderTape(s) {
    const tape = $("formulaTape");
    const line = (cls, left, right) => right === undefined ? `<div class="tape-line ${cls}">${left}</div>` : `<div class="tape-line ${cls}"><span>${left}</span><span>${right}</span></div>`;
    const p = (n) => ltPeso(n).replace("₱", "");
    let html = "";
    html += line("head", "SERVICE FEE") + line("calc", `${p(s.amount)} × ${s.feePct.toFixed(2)}%`) + line("result", "=", ltPeso(s.serviceFee)) + line("rule", "");
    html += line("head", "TOTAL INTEREST (simple)") + line("calc", `${p(s.amount)} × ${s.ratePct.toFixed(2)}% × ${s.term} mo`) + line("result", "=", ltPeso(s.totalInterest)) + line("rule", "");
    html += line("head", "TOTAL PAYABLE");
    html += s.feeHandling === "finance" ? line("calc", `${p(s.amount)} + ${p(s.totalInterest)} + ${p(s.serviceFee)}`) : line("calc", `${p(s.amount)} + ${p(s.totalInterest)}`);
    html += line("result", "=", ltPeso(s.totalPayable)) + line("rule", "");
    html += line("head", "NET PROCEEDS");
    html += s.feeHandling === "deduct" ? line("calc", `${p(s.amount)} − ${p(s.serviceFee)}`) : line("calc", `${p(s.amount)} (fee financed, not deducted)`);
    html += line("result", "=", ltPeso(s.netProceeds)) + line("rule", "");
    html += line("head", "MONTHLY PAYMENT") + line("calc", `${p(s.totalPayable)} ÷ ${s.term}`) + line("result", "=", ltPeso(s.monthlyPayment)) + line("rule", "");
    html += line("head", "SEMI-MONTHLY PAYMENT") + line("calc", `${p(s.totalPayable)} ÷ (${s.term} × 2)`) + line("result", "=", ltPeso(s.semiPayment)) + line("rule", "");
    html += line("head", "AMOUNT PER CHECK (" + (s.frequency === "semi" ? "semi-monthly" : "monthly") + ")") + line("result", "=", ltPeso(s.perCheck));
    tape.innerHTML = html;
  }

  function renderSummary(s) {
    $("summaryDate").textContent = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    const rows = [
      ["Applicant", s.applicantName || "—"],
      ["Loan amount", ltPeso(s.amount)],
      ["Loan term", s.term + " months"],
      ["Interest rate", s.ratePct.toFixed(2) + "% per month"],
      ["Service fee", s.feePct.toFixed(2) + "%"],
      ["Fee handling", s.feeHandling === "finance" ? "Added to total payable" : "Deducted from proceeds"],
      ["Total interest", ltPeso(s.totalInterest)],
      ["Total payable", ltPeso(s.totalPayable), true],
      ["Net proceeds", ltPeso(s.netProceeds), true],
      ["Payment frequency", s.frequency === "semi" ? "Semi-Monthly" : "Monthly"],
      ["Number of payments", String(s.numPayments)],
      ["Amount per check", ltPeso(s.perCheck), true],
    ];
    $("summaryGrid").innerHTML = rows.map(([k, v, isTotal]) => `<div class="summary-row${isTotal ? " total" : ""}"><span class="k">${k}</span><span class="v">${v}</span></div>`).join("");
  }

  function recalc() {
    validate();
    const s = compute();
    lastState = s;
    renderCards(s);
    renderTape(s);
    renderSummary(s);
  }

  Object.values(els).forEach((el) => { el.addEventListener("input", recalc); el.addEventListener("change", recalc); });

  els.loanProduct.addEventListener("change", () => {
    const opt = els.loanProduct.selectedOptions[0];
    if (opt.dataset.rate) { els.interestRate.value = opt.dataset.rate; els.serviceFee.value = opt.dataset.fee; recalc(); }
  });

  $("resetBtn").addEventListener("click", () => {
    els.loanProduct.value = "custom"; els.applicantName.value = "";
    els.loanAmount.value = 750000; els.loanTerm.value = 12; els.interestRate.value = 3.5;
    els.serviceFee.value = 5; els.feeHandling.value = "deduct"; els.paymentFrequency.value = "monthly";
    els.businessType.value = "sole";
    recalc();
    ltToast("Calculator reset", "↺");
  });

  $("copyBtn").addEventListener("click", () => {
    if (!lastState) return;
    const s = lastState;
    const text = [
      "LOAN SUMMARY", s.applicantName ? `Applicant: ${s.applicantName}` : null,
      `Loan Amount: ${ltPeso(s.amount)}`, `Loan Term: ${s.term} months`,
      `Interest Rate: ${s.ratePct.toFixed(2)}% per month`, `Service Fee: ${s.feePct.toFixed(2)}%`,
      `Total Interest: ${ltPeso(s.totalInterest)}`, `Total Payable: ${ltPeso(s.totalPayable)}`,
      `Net Proceeds: ${ltPeso(s.netProceeds)}`, `Payment Frequency: ${s.frequency === "semi" ? "Semi-Monthly" : "Monthly"}`,
      `Payments: ${s.numPayments}`, `Amount Per Check: ${ltPeso(s.perCheck)}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => ltToast("Results copied to clipboard", "⧉")).catch(() => ltToast("Could not copy — please copy manually", "⚠"));
  });

  $("printBtn").addEventListener("click", () => window.print());

  $("pdfBtn").addEventListener("click", () => {
    if (!lastState) return;
    const s = lastState;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("Loan Summary", 14, y); y += 10;
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }), 14, y); y += 10;
    doc.setTextColor(20); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    const rows = [
      ["Applicant", s.applicantName || "—"], ["Loan Amount", ltPeso(s.amount)], ["Loan Term", s.term + " months"],
      ["Interest Rate", s.ratePct.toFixed(2) + "% per month"], ["Service Fee", s.feePct.toFixed(2) + "%"],
      ["Fee Handling", s.feeHandling === "finance" ? "Added to total payable" : "Deducted from proceeds"],
      ["Total Interest", ltPeso(s.totalInterest)], ["Total Payable", ltPeso(s.totalPayable)], ["Net Proceeds", ltPeso(s.netProceeds)],
      ["Payment Frequency", s.frequency === "semi" ? "Semi-Monthly" : "Monthly"], ["Number of Payments", String(s.numPayments)],
      ["Amount Per Check", ltPeso(s.perCheck)],
    ];
    rows.forEach(([k, v]) => { doc.setFont("helvetica", "bold"); doc.text(k + ":", 14, y); doc.setFont("helvetica", "normal"); doc.text(v, 90, y); y += 8; });
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("Figures are estimates for planning purposes only and do not constitute a final loan offer.", 14, y + 6);
    doc.save("loan-summary.pdf");
    ltToast("PDF exported", "⇩");
  });

  $("excelBtn").addEventListener("click", () => {
    if (!lastState) return;
    const s = lastState;
    const rows = [
      ["Field", "Value"], ["Applicant", s.applicantName || ""], ["Loan Amount", s.amount], ["Loan Term (months)", s.term],
      ["Interest Rate (% per month)", s.ratePct], ["Service Fee (%)", s.feePct],
      ["Fee Handling", s.feeHandling === "finance" ? "Added to total payable" : "Deducted from proceeds"],
      ["Total Interest", s.totalInterest], ["Total Payable", s.totalPayable], ["Net Proceeds", s.netProceeds],
      ["Payment Frequency", s.frequency === "semi" ? "Semi-Monthly" : "Monthly"], ["Number of Payments", s.numPayments],
      ["Amount Per Check", s.perCheck],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 26 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loan Summary");
    XLSX.writeFile(wb, "loan-summary.xlsx");
    ltToast("Excel file exported", "⇩");
  });

  // ---------- Create Client From Calculation ----------
  $("createClientBtn").addEventListener("click", () => {
    if (!validate()) { ltToast("Fix the highlighted fields first", "⚠"); return; }
    const s = lastState;
    const data = ltLoad();
    const client = ltNewClient(data, {
      applicantName: s.applicantName || "Unnamed Applicant",
      loanAmount: s.amount,
      loanTerm: s.term,
      loanType: "new",
      businessType: s.businessType,
      interestRate: s.ratePct,
      serviceFee: s.feePct,
      notes: `Created from Loan Calculator. Frequency: ${s.frequency === "semi" ? "Semi-Monthly" : "Monthly"}, Amount per check: ${ltPeso(s.perCheck)}.`,
      status: "pending"
    });
    data.calculatorHistory.unshift({ date: new Date().toISOString(), clientId: client.id, ...s });
    data.calculatorHistory = data.calculatorHistory.slice(0, 100);
    ltSave(data);
    ltToast(`Client ${client.id} created`, "👤");
    setTimeout(() => { window.location.href = `clients.html?open=${encodeURIComponent(client.id)}`; }, 900);
  });

  recalc();
})();
