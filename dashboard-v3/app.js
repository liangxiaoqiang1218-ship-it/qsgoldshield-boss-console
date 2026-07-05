const fallback = {
  release_version: "V3.4",
  status_label: "preview ready",
  status_reason: "static preview route ready",
  open_issue_count: 0,
  failed_workflow_count: 0,
  owner_decision_needed: false,
  next_action: "connect hosting"
};

function set(id, v) {
  const e = document.getElementById(id);
  if (e) e.textContent = v;
}

function show(d) {
  set("statusLabel", d.status_label || "unknown");
  set("statusReason", d.status_reason || "-");
  set("releaseVersion", d.release_version || "-");
  set("openIssueCount", d.open_issue_count ?? "-");
  set("failedWorkflowCount", d.failed_workflow_count ?? "-");
  set("nextAction", d.next_action || "-");
}

async function load() {
  try {
    const r = await fetch("./status.json", { cache: "no-store" });
    if (!r.ok) throw new Error("no");
    show(await r.json());
  } catch (e) {
    show(fallback);
  }
}

document.getElementById("refreshBtn")?.addEventListener("click", load);
load();
