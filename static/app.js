// ---- Index page ----
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("preview-container");
const previewImg = document.getElementById("preview-img");
const analyzeBtn = document.getElementById("analyzeBtn");
const loadingEl = document.getElementById("loading");
const dropzone = document.getElementById("dropzone");
const gallery = document.getElementById("gallery");

if (fileInput) {
  fileInput.addEventListener("change", handleFileSelect);

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) showPreview(file);
  });

  analyzeBtn && analyzeBtn.addEventListener("click", analyzePlant);

  loadGallery();
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) showPreview(file);
}

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewContainer.classList.remove("hidden");
    fileInput._selectedFile = file;
  };
  reader.readAsDataURL(file);
}

async function analyzePlant() {
  const file = fileInput._selectedFile || fileInput.files[0];
  if (!file) return;

  dropzone.classList.add("hidden");
  loadingEl.classList.remove("hidden");

  const formData = new FormData();
  formData.append("foto", file);

  try {
    const res = await fetch("/api/analyze", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      alert("Error: " + (err.error || "Error desconocido"));
      return;
    }
    const planta = await res.json();
    window.location.href = `/planta/${planta.id}`;
  } catch (e) {
    alert("Error de red: " + e.message);
  } finally {
    loadingEl.classList.add("hidden");
    dropzone.classList.remove("hidden");
  }
}

async function loadGallery() {
  if (!gallery) return;
  try {
    const res = await fetch("/api/plantas");
    const plantas = await res.json();
    if (!plantas.length) return;

    gallery.innerHTML = "";
    plantas.slice().reverse().forEach((p) => {
      const card = document.createElement("a");
      card.href = `/planta/${p.id}`;
      card.className = "gallery-card";

      const pct = p.salud_porcentaje ?? 0;
      const barColor = pct >= 70 ? "#52b788" : pct >= 40 ? "#f4a261" : "#e63946";

      card.innerHTML = `
        <img src="${p.imagen_base64}" alt="${p.nombre}" loading="lazy" />
        <div class="gallery-card-body">
          <h3>${p.nombre}</h3>
          <p class="especie">${p.especie}</p>
          <div class="health-bar-wrap">
            <div class="health-bar" style="width:${pct}%;background:${barColor}"></div>
          </div>
          <p class="pct-label">${pct}% salud</p>
        </div>`;
      gallery.appendChild(card);
    });
  } catch (e) {
    console.error("Error cargando plantas:", e);
  }
}

// ---- Detail page ----
if (typeof plantaId !== "undefined") {
  loadDetail(plantaId);
}

async function loadDetail(id) {
  const detailEl = document.getElementById("detail");
  const loadEl = document.getElementById("loading");

  try {
    const res = await fetch(`/api/plantas/${id}`);
    if (!res.ok) {
      loadEl.innerHTML = "<p>Planta no encontrada.</p>";
      return;
    }
    const p = await res.json();

    document.title = p.nombre + " — Plant Health";
    document.getElementById("planta-img").src = p.imagen_base64;
    document.getElementById("planta-nombre").textContent = p.nombre;
    document.getElementById("planta-especie").textContent = p.especie;
    document.getElementById("salud-pct").textContent = p.salud_porcentaje + "%";

    const estadoBadge = document.getElementById("estado-badge");
    estadoBadge.textContent = p.estado;
    estadoBadge.className = `estado-badge estado-${p.estado}`;

    const fecha = new Date(p.fecha);
    document.getElementById("planta-fecha").textContent =
      "Analizada el " + fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

    // Health ring
    const circumference = 2 * Math.PI * 50; // ~314
    const offset = circumference - (p.salud_porcentaje / 100) * circumference;
    const ringFill = document.getElementById("ring-fill");
    const pct = p.salud_porcentaje;
    ringFill.style.stroke = pct >= 70 ? "#52b788" : pct >= 40 ? "#f4a261" : "#e63946";
    setTimeout(() => { ringFill.style.strokeDashoffset = offset; }, 100);

    // Lists
    fillList("list-problemas", p.problemas, "section-problemas");
    fillList("list-necesidades", p.necesidades);
    fillList("list-consejos", p.consejos);

    loadEl.classList.add("hidden");
    detailEl.classList.remove("hidden");
  } catch (e) {
    loadEl.innerHTML = "<p>Error al cargar la planta.</p>";
    console.error(e);
  }
}

function fillList(listId, items, sectionId) {
  const ul = document.getElementById(listId);
  if (!ul) return;
  if (!items || items.length === 0) {
    ul.innerHTML = '<li class="no-items">Ninguno detectado</li>';
    if (sectionId) {
      const sec = document.getElementById(sectionId);
      if (sec) sec.style.opacity = "0.5";
    }
    return;
  }
  ul.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}
