/* =========================================================
   RESUME CRAFT — SCRIPT.JS
   Handles: dynamic entries, live preview rendering,
   photo upload, validation, PDF download, reset, nav UX.
   ========================================================= */

/* ---------- Limits ---------- */
const LIMITS = {
  skills: 20,
  projects: 4,
  education: 4,
  experience: 4,
  certifications: 4,
  achievements: 4
};

/* ---------- Application State ---------- */
const state = {
  photo: null,
  skills: [],
  languages: [],
  interests: [],
  projects: [],
  education: [],
  experience: [],
  certifications: [],
  achievements: []
};

let entryIdCounter = 0;
function nextId() { return "e" + (++entryIdCounter); }

/* =========================================================
   1. UTILITIES
   ========================================================= */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* =========================================================
   2. DYNAMIC ENTRY FIELD DEFINITIONS
   Each section defines its fields so we can generate
   entry cards + preview markup generically.
   ========================================================= */
const SECTION_CONFIG = {
  projects: {
    container: "projectsContainer",
    label: "Project",
    fields: [
      { key: "name", label: "Project Name", type: "text", placeholder: "E-Commerce Dashboard", full: true },
      { key: "tech", label: "Technologies Used", type: "text", placeholder: "React, Node.js, MongoDB", full: true },
      { key: "description", label: "Description", type: "textarea", placeholder: "Built a real-time analytics dashboard...", full: true },
      { key: "link", label: "GitHub Link", type: "text", placeholder: "github.com/user/project", full: true }
    ]
  },
  education: {
    container: "educationContainer",
    label: "Education",
    fields: [
      { key: "college", label: "College", type: "text", placeholder: "State University", full: true },
      { key: "degree", label: "Degree", type: "text", placeholder: "B.Tech" },
      { key: "branch", label: "Branch", type: "text", placeholder: "Computer Science" },
      { key: "cgpa", label: "CGPA", type: "text", placeholder: "8.7 / 10" },
      { key: "startYear", label: "Start Year", type: "text", placeholder: "2020" },
      { key: "endYear", label: "End Year", type: "text", placeholder: "2024" }
    ]
  },
  experience: {
    container: "experienceContainer",
    label: "Experience",
    fields: [
      { key: "company", label: "Company", type: "text", placeholder: "Acme Corp" },
      { key: "role", label: "Role", type: "text", placeholder: "Software Engineer" },
      { key: "duration", label: "Duration", type: "text", placeholder: "Jan 2023 – Present", full: true },
      { key: "description", label: "Description", type: "textarea", placeholder: "Led development of...", full: true }
    ]
  },
  certifications: {
    container: "certificationsContainer",
    label: "Certification",
    fields: [
      { key: "name", label: "Certification Name", type: "text", placeholder: "AWS Certified Solutions Architect", full: true },
      { key: "issuer", label: "Issued By", type: "text", placeholder: "Amazon Web Services" },
      { key: "year", label: "Year", type: "text", placeholder: "2024" }
    ]
  },
  achievements: {
    container: "achievementsContainer",
    label: "Achievement",
    fields: [
      { key: "title", label: "Achievement", type: "text", placeholder: "Winner, National Hackathon 2023", full: true },
      { key: "year", label: "Year", type: "text", placeholder: "2023" }
    ]
  }
};

/* =========================================================
   3. GENERIC ENTRY CARD CREATION (add/remove)
   ========================================================= */
function addEntry(sectionKey) {
  const config = SECTION_CONFIG[sectionKey];
  const limit = LIMITS[sectionKey];

  if (state[sectionKey].length >= limit) {
    flashLimitNotice(config.container, `You can add up to ${limit} ${config.label.toLowerCase()} entries.`);
    return;
  }

  const entry = { id: nextId() };
  config.fields.forEach(f => entry[f.key] = "");
  state[sectionKey].push(entry);

  renderEntryCards(sectionKey);
  updateResume();
}

function removeEntry(sectionKey, id) {
  state[sectionKey] = state[sectionKey].filter(e => e.id !== id);
  renderEntryCards(sectionKey);
  updateResume();
}

function flashLimitNotice(containerId, message) {
  const container = document.getElementById(containerId);
  let notice = container.querySelector(".limit-notice");
  if (!notice) {
    notice = document.createElement("p");
    notice.className = "limit-notice";
    notice.style.cssText = "font-size:0.8rem;color:#DC2626;margin-top:6px;";
    container.parentNode.insertBefore(notice, container.nextSibling);
  }
  notice.textContent = message;
  setTimeout(() => notice.remove(), 2500);
}

function renderEntryCards(sectionKey) {
  const config = SECTION_CONFIG[sectionKey];
  const container = document.getElementById(config.container);
  container.innerHTML = "";

  state[sectionKey].forEach((entry, index) => {
    const card = document.createElement("div");
    card.className = "entry-card";
    card.dataset.id = entry.id;

    const fieldsHTML = config.fields.map(f => {
      const inputEl = f.type === "textarea"
        ? `<textarea rows="3" data-field="${f.key}" placeholder="${f.placeholder}">${escapeHTML(entry[f.key])}</textarea>`
        : `<input type="text" data-field="${f.key}" placeholder="${f.placeholder}" value="${escapeHTML(entry[f.key])}">`;
      return `
        <div class="form-field ${f.full ? "full" : ""}">
          <label>${f.label}</label>
          ${inputEl}
        </div>`;
    }).join("");

    card.innerHTML = `
      <div class="entry-card-header">
        <span>${config.label} ${index + 1}</span>
        <button type="button" class="entry-remove-btn" aria-label="Remove ${config.label}" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="form-grid">${fieldsHTML}</div>
    `;

    // Remove button
    card.querySelector(".entry-remove-btn").addEventListener("click", () => removeEntry(sectionKey, entry.id));

    // Input listeners -> update state + preview live
    card.querySelectorAll("[data-field]").forEach(input => {
      input.addEventListener("input", () => {
        entry[input.dataset.field] = input.value;
        updateResume();
      });
    });

    container.appendChild(card);
  });
}

/* =========================================================
   4. TAG-BASED INPUTS (skills, languages, interests)
   ========================================================= */
function setupTagInput({ inputId, addBtnId, listId, stateKey, limit }) {
  const input = document.getElementById(inputId);
  const addBtn = document.getElementById(addBtnId);

  function addTag() {
    const value = input.value.trim();
    if (!value) return;
    if (limit && state[stateKey].length >= limit) {
      flashLimitNotice(listId, `Maximum ${limit} items allowed.`);
      return;
    }
    if (state[stateKey].some(v => v.toLowerCase() === value.toLowerCase())) {
      input.value = "";
      return;
    }
    state[stateKey].push(value);
    input.value = "";
    renderTagList(stateKey, listId);
    updateResume();
  }

  addBtn.addEventListener("click", addTag);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  });
}

function renderTagList(stateKey, listId) {
  const list = document.getElementById(listId);
  list.innerHTML = "";
  state[stateKey].forEach((val, idx) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.innerHTML = `${escapeHTML(val)} <button type="button" aria-label="Remove ${escapeHTML(val)}">&times;</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      state[stateKey].splice(idx, 1);
      renderTagList(stateKey, listId);
      updateResume();
    });
    list.appendChild(chip);
  });

  if (stateKey === "skills") {
    document.getElementById("skillsCount").textContent = `${state.skills.length}/${LIMITS.skills}`;
  }
}

/* =========================================================
   5. PHOTO UPLOAD
   ========================================================= */
function setupPhotoUpload() {
  const input = document.getElementById("photoInput");
  const preview = document.getElementById("photoPreview");
  const removeBtn = document.getElementById("removePhotoBtn");

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      state.photo = e.target.result;
      preview.innerHTML = `<img src="${state.photo}" alt="Profile photo">`;
      updateResume();
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener("click", () => {
    state.photo = null;
    input.value = "";
    preview.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`;
    updateResume();
  });
}

/* =========================================================
   6. VALIDATION
   ========================================================= */
function validateField(id, condition) {
  const el = document.getElementById(id);
  const valid = condition(el.value.trim());
  el.classList.toggle("invalid", !valid);
  return valid;
}

function validateForm() {
  const nameValid = validateField("fullName", v => v.length > 0);
  const phoneValid = validateField("phone", v => /^[+\d][\d\s()-]{6,}$/.test(v));
  const emailValid = validateField("email", v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  return nameValid && phoneValid && emailValid;
}

function setupLiveValidation() {
  document.getElementById("fullName").addEventListener("blur", () => validateField("fullName", v => v.length > 0));
  document.getElementById("phone").addEventListener("blur", () => validateField("phone", v => /^[+\d][\d\s()-]{6,}$/.test(v)));
  document.getElementById("email").addEventListener("blur", () => validateField("email", v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)));
}

/* =========================================================
   7. LIVE RESUME PREVIEW RENDERING
   ========================================================= */
function updateResume() {
  const val = id => document.getElementById(id).value.trim();

  // --- Header ---
  document.getElementById("r-name").textContent = val("fullName") || "Your Name";
  const title = val("jobTitle");
  const titleEl = document.getElementById("r-title");
  titleEl.textContent = title;
  titleEl.style.display = title ? "block" : "none";

  const contactParts = [];
  if (val("phone")) contactParts.push(val("phone"));
  if (val("email")) contactParts.push(val("email"));
  if (val("address")) contactParts.push(val("address"));
  if (val("linkedin")) contactParts.push(val("linkedin"));
  if (val("github")) contactParts.push(val("github"));
  if (val("portfolio")) contactParts.push(val("portfolio"));
  document.getElementById("r-contact").innerHTML = contactParts.map(p => `<span>${escapeHTML(p)}</span>`).join("");

  const photoEl = document.getElementById("r-photo");
  photoEl.innerHTML = state.photo ? `<img src="${state.photo}" alt="">` : "";
  photoEl.style.display = state.photo ? "block" : "none";

  // --- Summary ---
  toggleSection("r-summary-section", !!val("summary"));
  document.getElementById("r-summary").textContent = val("summary");

  // --- Skills ---
  toggleSection("r-skills-section", state.skills.length > 0);
  document.getElementById("r-skills").innerHTML = state.skills.map(s => `<span>${escapeHTML(s)}</span>`).join("");

  // --- Experience ---
  const expHTML = state.experience
    .filter(e => e.company || e.role)
    .map(e => `
      <div class="r-entry">
        <div class="r-entry-top">
          <span class="r-entry-title">${escapeHTML(e.role || "Role")}${e.company ? " · " + escapeHTML(e.company) : ""}</span>
          <span class="r-entry-date">${escapeHTML(e.duration)}</span>
        </div>
        ${e.description ? `<p class="r-entry-desc">${escapeHTML(e.description)}</p>` : ""}
      </div>`).join("");
  toggleSection("r-experience-section", expHTML.length > 0);
  document.getElementById("r-experience").innerHTML = expHTML;

  // --- Projects ---
  const projHTML = state.projects
    .filter(p => p.name)
    .map(p => `
      <div class="r-entry">
        <div class="r-entry-top">
          <span class="r-entry-title">${escapeHTML(p.name)}</span>
          ${p.tech ? `<span class="r-entry-date">${escapeHTML(p.tech)}</span>` : ""}
        </div>
        ${p.description ? `<p class="r-entry-desc">${escapeHTML(p.description)}</p>` : ""}
        ${p.link ? `<p class="r-entry-link">${escapeHTML(p.link)}</p>` : ""}
      </div>`).join("");
  toggleSection("r-projects-section", projHTML.length > 0);
  document.getElementById("r-projects").innerHTML = projHTML;

  // --- Education ---
  const eduHTML = state.education
    .filter(e => e.college || e.degree)
    .map(e => `
      <div class="r-entry">
        <div class="r-entry-top">
          <span class="r-entry-title">${escapeHTML(e.college)}</span>
          <span class="r-entry-date">${escapeHTML(e.startYear)}${e.startYear || e.endYear ? " – " : ""}${escapeHTML(e.endYear)}</span>
        </div>
        <span class="r-entry-sub">${[e.degree, e.branch].filter(Boolean).map(escapeHTML).join(", ")}</span>
        ${e.cgpa ? `<p class="r-entry-desc">CGPA: ${escapeHTML(e.cgpa)}</p>` : ""}
      </div>`).join("");
  toggleSection("r-education-section", eduHTML.length > 0);
  document.getElementById("r-education").innerHTML = eduHTML;

  // --- Certifications ---
  const certHTML = state.certifications
    .filter(c => c.name)
    .map(c => `<li>${escapeHTML(c.name)}${c.issuer ? " — " + escapeHTML(c.issuer) : ""}${c.year ? " (" + escapeHTML(c.year) + ")" : ""}</li>`)
    .join("");
  toggleSection("r-certifications-section", certHTML.length > 0);
  document.getElementById("r-certifications").innerHTML = certHTML;

  // --- Achievements ---
  const achHTML = state.achievements
    .filter(a => a.title)
    .map(a => `<li>${escapeHTML(a.title)}${a.year ? " (" + escapeHTML(a.year) + ")" : ""}</li>`)
    .join("");
  toggleSection("r-achievements-section", achHTML.length > 0);
  document.getElementById("r-achievements").innerHTML = achHTML;

  // --- Languages / Interests ---
  toggleSection("r-languages-section", state.languages.length > 0);
  document.getElementById("r-languages").textContent = state.languages.join(", ");
  toggleSection("r-interests-section", state.interests.length > 0);
  document.getElementById("r-interests").textContent = state.interests.join(", ");

  autoFitResumeToPage();
}

function toggleSection(id, show) {
  document.getElementById(id).hidden = !show;
}

/* =========================================================
   8. AUTO-FIT: scale resume content so it always fits one A4 page
   ========================================================= */
function autoFitResumeToPage() {
  const inner = document.getElementById("resumeInner");
  // Reset scale first to measure natural height
  inner.style.transform = "scale(1)";
  inner.style.width = "100%";

  const pageHeightPx = inner.parentElement.clientHeight; // resume-page height (297mm rendered)
  const contentHeight = inner.scrollHeight;

  if (contentHeight > pageHeightPx) {
    const scale = Math.max(0.62, pageHeightPx / contentHeight); // never shrink below 0.62 for readability
    inner.style.transform = `scale(${scale})`;
    inner.style.width = `${100 / scale}%`;
  }
}

/* =========================================================
   9. DOWNLOAD PDF
   ========================================================= */
function downloadPDF() {
  if (!validateForm()) {
    document.getElementById("fullName").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (typeof html2pdf === "undefined") {
    alert("The PDF engine couldn't load (this can happen if you're offline or a script was blocked). Please check your internet connection and try again.");
    return;
  }

  const btn = document.getElementById("downloadBtn");
  const navBtn = document.getElementById("navDownloadBtn");
  const overlay = document.getElementById("pdfOverlay");
  const resumePage = document.getElementById("resumePage");
  const resumeInner = document.getElementById("resumeInner");

  btn.disabled = true;
  navBtn.disabled = true;
  overlay.hidden = false;

  // Remember the preview's current inline styles so we can restore them exactly
  const savedPageTransform = resumePage.style.transform;
  const savedPageMargin = resumePage.style.marginBottom;
  const savedInnerTransform = resumeInner.style.transform;
  const savedInnerWidth = resumeInner.style.width;

  function restorePreview() {
    resumePage.style.transform = savedPageTransform;
    resumePage.style.marginBottom = savedPageMargin;
    resumeInner.style.transform = savedInnerTransform;
    resumeInner.style.width = savedInnerWidth;
    overlay.hidden = true;
    btn.disabled = false;
    navBtn.disabled = false;
  }

  // Render the resume at its true, unscaled A4 size (removing the preview's
  // zoomed-out display transform) so html2canvas captures it at full, correct
  // dimensions — capturing the real on-page element directly, with no hidden
  // clones or off-screen positioning, is by far the most reliable approach.
  resumePage.style.transform = "none";
  resumePage.style.marginBottom = "0";
  resumeInner.style.transform = "scale(1)";
  resumeInner.style.width = "100%";

  const pageHeightPx = resumePage.clientHeight;
  const contentHeight = resumeInner.scrollHeight;
  if (contentHeight > pageHeightPx) {
    const scale = Math.max(0.62, pageHeightPx / contentHeight);
    resumeInner.style.transform = `scale(${scale})`;
    resumeInner.style.width = `${100 / scale}%`;
  }

  const opt = {
    margin: 0,
    filename: `${(document.getElementById("fullName").value.trim() || "resume").replace(/\s+/g, "_")}_Resume.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all"] }
  };

  // Give the browser a moment to apply the un-scaled layout before capture
  requestAnimationFrame(() => {
    setTimeout(() => {
      html2pdf().set(opt).from(resumePage).save()
        .then(restorePreview)
        .catch(err => {
          restorePreview();
          console.error("PDF generation failed:", err);
          alert("Something went wrong generating the PDF. Please try again.");
        });
    }, 50);
  });
}

/* =========================================================
   10. RESET FORM
   ========================================================= */
function resetForm() {
  if (!confirm("This will clear all fields. Continue?")) return;

  document.getElementById("resumeForm").reset();
  document.querySelectorAll(".form-field input, .form-field textarea").forEach(el => el.classList.remove("invalid"));

  state.photo = null;
  state.skills = [];
  state.languages = [];
  state.interests = [];
  state.projects = [];
  state.education = [];
  state.experience = [];
  state.certifications = [];
  state.achievements = [];

  document.getElementById("photoPreview").innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`;

  ["projects", "education", "experience", "certifications", "achievements"].forEach(renderEntryCards);
  renderTagList("skills", "skillsList");
  renderTagList("languages", "languagesList");
  renderTagList("interests", "interestsList");

  updateResume();
}

/* =========================================================
   10b. LOAD SAMPLE RESUME
   ========================================================= */
function loadSampleResume() {
  if (hasFormContent() && !confirm("This will replace your current entries with sample data. Continue?")) return;

  const setVal = (id, value) => { document.getElementById(id).value = value; };

  setVal("fullName", "Ananya Rao");
  setVal("jobTitle", "Full-Stack Developer");
  setVal("phone", "+91 98765 43210");
  setVal("email", "ananya.rao@email.com");
  setVal("linkedin", "linkedin.com/in/ananyarao");
  setVal("github", "github.com/ananyarao");
  setVal("portfolio", "ananyarao.dev");
  setVal("address", "Hyderabad, India");
  setVal("summary", "Full-stack developer with 3+ years of experience building scalable web applications using React and Node.js. Passionate about clean code, performance optimization, and mentoring junior developers.");

  state.photo = null;
  document.getElementById("photoPreview").innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`;

  state.skills = ["JavaScript", "React", "Node.js", "TypeScript", "MongoDB", "REST APIs", "Git", "Docker"];
  state.languages = ["English", "Hindi", "Telugu"];
  state.interests = ["Open source", "Chess", "Photography"];

  state.projects = [
    { id: nextId(), name: "TaskFlow — Team Task Manager", tech: "React, Node.js, MongoDB", description: "Built a collaborative task management app with real-time updates and drag-and-drop boards used by 500+ teams.", link: "github.com/ananyarao/taskflow" },
    { id: nextId(), name: "WeatherNow", tech: "JavaScript, OpenWeather API", description: "A lightweight weather dashboard with location search and 5-day forecast, optimized for fast load times.", link: "github.com/ananyarao/weathernow" }
  ];

  state.education = [
    { id: nextId(), college: "Osmania University", degree: "B.Tech", branch: "Computer Science and Engineering", cgpa: "8.6 / 10", startYear: "2018", endYear: "2022" }
  ];

  state.experience = [
    { id: nextId(), company: "BrightTech Solutions", role: "Full-Stack Developer", duration: "Jul 2022 – Present", description: "Developed and maintained core features for a SaaS analytics platform, improving page load speed by 35% and leading a team of 2 junior developers." },
    { id: nextId(), company: "InnovateX", role: "Software Engineer Intern", duration: "Jan 2022 – Jun 2022", description: "Built internal tooling in React that reduced manual QA time by 20% across the engineering team." }
  ];

  state.certifications = [
    { id: nextId(), name: "AWS Certified Developer – Associate", issuer: "Amazon Web Services", year: "2023" },
    { id: nextId(), name: "Meta Front-End Developer Professional Certificate", issuer: "Coursera", year: "2022" }
  ];

  state.achievements = [
    { id: nextId(), title: "Winner, National Collegiate Hackathon", year: "2021" },
    { id: nextId(), title: "Published technical blog with 50K+ combined reads", year: "2023" }
  ];

  ["projects", "education", "experience", "certifications", "achievements"].forEach(renderEntryCards);
  renderTagList("skills", "skillsList");
  renderTagList("languages", "languagesList");
  renderTagList("interests", "interestsList");

  document.querySelectorAll(".form-field input, .form-field textarea").forEach(el => el.classList.remove("invalid"));

  updateResume();
  document.getElementById("resumePage").scrollIntoView({ behavior: "smooth", block: "center" });
}

function hasFormContent() {
  const fieldsFilled = ["fullName", "jobTitle", "phone", "email", "summary"].some(id => document.getElementById(id).value.trim());
  const tagsFilled = state.skills.length || state.languages.length || state.interests.length;
  // Entry sections (projects/education/etc.) always start with one auto-seeded
  // blank card, so only count them as "content" if a field was actually filled in.
  const entriesFilled = ["projects", "education", "experience", "certifications", "achievements"].some(key =>
    state[key].some(entry => Object.keys(entry).some(k => k !== "id" && String(entry[k] || "").trim()))
  );
  return fieldsFilled || tagsFilled || entriesFilled;
}

/* =========================================================
   11. NAVIGATION UX (scroll shadow, active link, mobile menu)
   ========================================================= */
function setupNav() {
  const navbar = document.getElementById("navbar");
  const navLinks = document.querySelectorAll(".nav-link");
  const navToggle = document.getElementById("navToggle");
  const navLinksList = document.getElementById("navLinks");

  window.addEventListener("scroll", debounce(() => {
    navbar.classList.toggle("scrolled", window.scrollY > 12);
    updateActiveLink();
  }, 30));

  navToggle.addEventListener("click", () => {
    navLinksList.classList.toggle("open");
  });

  navLinks.forEach(link => {
    link.addEventListener("click", () => navLinksList.classList.remove("open"));
  });

  function updateActiveLink() {
    const sections = ["home", "builder", "features", "about", "contact"];
    let current = sections[0];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 140) current = id;
    }
    navLinks.forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
    });
  }
  updateActiveLink();
}

/* =========================================================
   12. SCROLL REVEAL FOR FEATURE CARDS
   ========================================================= */
function setupScrollReveal() {
  const items = document.querySelectorAll(".feature-card, .contact-card, .about-copy");
  items.forEach(el => el.classList.add("reveal"));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(el => observer.observe(el));
}

/* =========================================================
   13. INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  // Personal info + summary live update
  ["fullName", "jobTitle", "phone", "email", "linkedin", "github", "portfolio", "address", "summary"]
    .forEach(id => document.getElementById(id).addEventListener("input", updateResume));

  setupLiveValidation();
  setupPhotoUpload();

  setupTagInput({ inputId: "skillInput", addBtnId: "addSkillBtn", listId: "skillsList", stateKey: "skills", limit: LIMITS.skills });
  setupTagInput({ inputId: "languageInput", addBtnId: "addLanguageBtn", listId: "languagesList", stateKey: "languages" });
  setupTagInput({ inputId: "interestInput", addBtnId: "addInterestBtn", listId: "interestsList", stateKey: "interests" });

  document.getElementById("addProjectBtn").addEventListener("click", () => addEntry("projects"));
  document.getElementById("addEducationBtn").addEventListener("click", () => addEntry("education"));
  document.getElementById("addExperienceBtn").addEventListener("click", () => addEntry("experience"));
  document.getElementById("addCertificationBtn").addEventListener("click", () => addEntry("certifications"));
  document.getElementById("addAchievementBtn").addEventListener("click", () => addEntry("achievements"));

  document.getElementById("downloadBtn").addEventListener("click", downloadPDF);
  document.getElementById("navDownloadBtn").addEventListener("click", downloadPDF);
  document.getElementById("resetBtn").addEventListener("click", resetForm);
  document.getElementById("sampleBtn").addEventListener("click", loadSampleResume);
  document.getElementById("heroSampleBtn").addEventListener("click", loadSampleResume);

  // Seed one starter entry per repeating section for a friendlier first impression
  addEntry("projects");
  addEntry("education");
  addEntry("experience");

  setupNav();
  setupScrollReveal();
  updateResume();
});