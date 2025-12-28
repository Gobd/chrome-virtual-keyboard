// Virtual Keyboard Options - Layout selector only

const $ = (id) => document.getElementById(id);

function addLayout() {
  const available = $("al").options;
  const selected = $("sl").options;

  if (!available || available.length === 0) return;

  for (const opt of available) {
    if (!opt.selected) continue;

    // Check if already exists
    let exists = false;
    for (const existingOpt of selected) {
      if (existingOpt.value === opt.value) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      const newOpt = document.createElement("option");
      newOpt.text = opt.text;
      newOpt.value = opt.value;
      $("sl").options.add(newOpt);
    }
  }

  saveLayouts();
}

function removeLayout() {
  const selected = $("sl").options;
  if (!selected || selected.length <= 1) return; // Keep at least one

  for (let index = selected.length - 1; index >= 0; index--) {
    if (selected[index].selected) {
      $("sl").removeChild(selected[index]);
    }
  }

  saveLayouts();
}

function saveLayouts() {
  const layouts = [];
  const selected = $("sl").options;

  if (!selected || selected.length === 0) return;

  for (const opt of selected) {
    if (opt.value) {
      layouts.push({ value: opt.value, name: opt.text });
    }
  }

  if (layouts.length === 0) return;

  chrome.storage.local.set({
    keyboardLayoutsList: JSON.stringify(layouts),
    keyboardLayout1: layouts[0].value,
  });

  $("changeEffect").className = "show";
}

async function loadLayouts() {
  const result = await chrome.storage.local.get("keyboardLayoutsList");

  if (!result.keyboardLayoutsList) return;

  let layouts;
  try {
    layouts = JSON.parse(result.keyboardLayoutsList);
  } catch (error) {
    console.error("Failed to parse layouts:", error);
    return;
  }

  if (!layouts || layouts.length === 0) return;

  // Clear default and populate
  $("sl").innerHTML = "";

  for (const layout of layouts) {
    if (!layout.value) continue;

    const opt = document.createElement("option");
    opt.text = layout.name;
    opt.value = layout.value;
    $("sl").options.add(opt);
  }
}

window.addEventListener("load", () => {
  document.body.className = "loaded";

  loadLayouts();

  $("kl_add").addEventListener("click", addLayout);
  $("kl_remove").addEventListener("click", removeLayout);
});
