/* ============================================================
   Student Mental Health Score Prediction — frontend logic
   Talks to the existing FastAPI backend at POST /predict.
   This file does NOT calculate any prediction itself — it only
   collects form input, sends it to the backend, and renders
   whatever the backend returns.
   ============================================================ */

const API_URL = "http://127.0.0.1:8000/predict";

const form = document.getElementById("predict-form");
const predictBtn = document.getElementById("predict-btn");
const btnLabel = predictBtn.querySelector(".btn-label");
const btnSpinner = predictBtn.querySelector(".btn-spinner");
const formError = document.getElementById("form-error");

const resultIdle = document.getElementById("result-idle");
const resultLoading = document.getElementById("result-loading");
const resultSuccess = document.getElementById("result-success");
const resultError = document.getElementById("result-error");

const resultValueEl = document.getElementById("result-value");
const resultNoteEl = document.getElementById("result-note");
const gaugeFill = document.getElementById("gauge-fill");
const errorTextEl = document.getElementById("error-text");

// The score is treated as a 0–10 scale for the gauge visual.
const GAUGE_MIN = 0;
const GAUGE_MAX = 10;
const GAUGE_CIRCUMFERENCE = 283; // matches the arc's path length in the SVG

/* ------------------------------------------------------------
   Field definitions used for validation.
   `name` must match the JSON key expected by the FastAPI backend.
   ------------------------------------------------------------ */
const NUMBER_FIELDS = [
  "Age",
  "Avg_Daily_Usage_Hours",
  "Daily_Unlocks",
  "Study_Hours",
  "Physical_Activity_Hours",
  "Sleep_Hours_Per_Night",
];

const REQUIRED_FIELDS = [
  "Age",
  "Gender",
  "Country",
  "Academic_Level",
  "Most_Used_Platform",
  "Purpose_Of_Use",
  "Avg_Daily_Usage_Hours",
  "Daily_Unlocks",
  "Study_Hours",
  "Physical_Activity_Hours",
  "Sleep_Hours_Per_Night",
  "Stress_Level",
];

// Maps a backend field name to the id used in the "field-error" span.
const ERROR_SLUG_BY_FIELD = {
  Age: "age",
  Gender: "gender",
  Country: "country",
  Academic_Level: "academic-level",
  Most_Used_Platform: "platform",
  Purpose_Of_Use: "purpose",
  Avg_Daily_Usage_Hours: "usage-hours",
  Daily_Unlocks: "daily-unlocks",
  Study_Hours: "study-hours",
  Physical_Activity_Hours: "activity-hours",
  Sleep_Hours_Per_Night: "sleep-hours",
  Stress_Level: "stress-level",
};

form.addEventListener("submit", handleSubmit);

async function handleSubmit(event) {
  event.preventDefault();
  clearErrors();

  const { payload, isValid } = collectAndValidate();
  if (!isValid) return;

  setLoading(true);
  showState("loading");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();

    if (typeof data.predicted_mental_health_score === "undefined") {
      throw new Error("Response did not include predicted_mental_health_score.");
    }

    renderSuccess(data.predicted_mental_health_score);
  } catch (err) {
    renderError(err);
  } finally {
    setLoading(false);
  }
}

/* ------------------------------------------------------------
   Collect form values into the exact JSON shape the backend expects.
   ------------------------------------------------------------ */
function collectAndValidate() {
  const formData = new FormData(form);
  const payload = {};
  let isValid = true;

  REQUIRED_FIELDS.forEach((field) => {
    const raw = formData.get(field);
    const slug = ERROR_SLUG_BY_FIELD[field];

    if (raw === null || String(raw).trim() === "") {
      markFieldError(slug, "This field is required.");
      isValid = false;
      return;
    }

    if (NUMBER_FIELDS.includes(field)) {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        markFieldError(slug, "Enter a valid number.");
        isValid = false;
        return;
      }
      payload[field] = num;
    } else {
      payload[field] = String(raw).trim();
    }
  });

  // The backend's request schema also includes "Grouped_country".
  // The form does not expose this as a separate input, so it is
  // derived from the Country field. This does not change any
  // backend logic — it only fills a field the existing API expects.
  payload.Grouped_country = payload.Country || "";

  return { payload, isValid };
}

/* ------------------------------------------------------------
   UI state helpers
   ------------------------------------------------------------ */
function setLoading(isLoading) {
  predictBtn.disabled = isLoading;
  btnSpinner.hidden = !isLoading;
  btnLabel.textContent = isLoading ? "Predicting…" : "Predict Score";
}

function showState(state) {
  resultIdle.hidden = state !== "idle";
  resultLoading.hidden = state !== "loading";
  resultSuccess.hidden = state !== "success";
  resultError.hidden = state !== "error";
}

function clearErrors() {
  formError.hidden = true;
  formError.textContent = "";
  document.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
  });
  document.querySelectorAll(".field.has-error").forEach((el) => {
    el.classList.remove("has-error");
  });
}

function markFieldError(slug, message) {
  const errorEl = document.querySelector(`[data-error-for="${slug}"]`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.closest(".field").classList.add("has-error");
  }
}

function renderSuccess(score) {
  const numericScore = Number(score);

  resultValueEl.textContent = Number.isFinite(numericScore)
    ? numericScore.toFixed(2)
    : String(score);

  const clamped = Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, numericScore || 0));
  const fraction = (clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN);
  const offset = GAUGE_CIRCUMFERENCE * (1 - fraction);

  // Reset then animate on the next frame so the transition plays.
  gaugeFill.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
  requestAnimationFrame(() => {
    gaugeFill.style.strokeDashoffset = offset;
  });

  gaugeFill.style.stroke = colorForScore(fraction);
  resultNoteEl.textContent = noteForScore(fraction);

  showState("success");
}

function renderError(err) {
  errorTextEl.textContent =
    "Could not reach the prediction server. Make sure the FastAPI backend is running at " +
    API_URL +
    ".";
  console.error("Prediction request failed:", err);
  showState("error");
}

function colorForScore(fraction) {
  if (fraction >= 0.66) return "#2f6f62"; // teal — healthier range
  if (fraction >= 0.33) return "#dd9138"; // amber — moderate range
  return "#b8493c"; // red — lower range
}

function noteForScore(fraction) {
  if (fraction >= 0.66) return "This falls in the higher end of the predicted range.";
  if (fraction >= 0.33) return "This falls in the middle of the predicted range.";
  return "This falls in the lower end of the predicted range.";
}