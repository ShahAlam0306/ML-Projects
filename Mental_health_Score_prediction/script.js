/* ============================================================
   Student Mental Health Score Prediction — Frontend Logic

   This frontend communicates with the existing FastAPI backend.
   It does NOT calculate the prediction itself.

   Backend:
   POST https://student-mental-health-api.onrender.com/predict
============================================================ */


/* ------------------------------------------------------------
   FastAPI prediction endpoint
------------------------------------------------------------ */

const API_URL =
    "https://student-mental-health-api.onrender.com/predict";


/* ------------------------------------------------------------
   DOM Elements
------------------------------------------------------------ */

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


/* ------------------------------------------------------------
   Gauge settings

   Mental Health Score is treated as a 0–10 scale.
------------------------------------------------------------ */

const GAUGE_MIN = 0;
const GAUGE_MAX = 10;

const GAUGE_CIRCUMFERENCE = 283;


/* ------------------------------------------------------------
   Fields that should be converted to numbers
------------------------------------------------------------ */

const NUMBER_FIELDS = [
    "Age",
    "Avg_Daily_Usage_Hours",
    "Daily_Unlocks",
    "Study_Hours",
    "Physical_Activity_Hours",
    "Sleep_Hours_Per_Night"
];


/* ------------------------------------------------------------
   Required fields

   These names MUST match the Pydantic model / FastAPI API.
------------------------------------------------------------ */

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
    "Stress_Level"
];


/* ------------------------------------------------------------
   Maps backend field names to HTML error element slugs
------------------------------------------------------------ */

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

    Stress_Level: "stress-level"
};


/* ------------------------------------------------------------
   Form Submit Event
------------------------------------------------------------ */

form.addEventListener("submit", handleSubmit);


/* ============================================================
   MAIN SUBMIT FUNCTION
============================================================ */

async function handleSubmit(event) {

    // Prevent normal HTML form submission
    event.preventDefault();

    // Remove previous errors
    clearErrors();

    // Collect and validate form data
    const { payload, isValid } = collectAndValidate();

    // Stop if validation failed
    if (!isValid) {
        return;
    }

    // Show loading state
    setLoading(true);
    showState("loading");


    try {

        /* ----------------------------------------------------
           Send request to FastAPI
        ---------------------------------------------------- */

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify(payload)
        });


        /* ----------------------------------------------------
           Handle HTTP errors
        ---------------------------------------------------- */

        if (!response.ok) {

            let errorMessage =
                `Server responded with status ${response.status}.`;

            try {

                const errorData = await response.json();

                if (errorData.detail) {

                    if (Array.isArray(errorData.detail)) {

                        errorMessage = errorData.detail
                            .map(error => error.msg || "Validation error")
                            .join(", ");

                    } else {

                        errorMessage = String(errorData.detail);
                    }
                }

            } catch (jsonError) {

                // Keep the default error message
            }

            throw new Error(errorMessage);
        }


        /* ----------------------------------------------------
           Read JSON response
        ---------------------------------------------------- */

        const data = await response.json();


        /* ----------------------------------------------------
           Check prediction exists
        ---------------------------------------------------- */

        if (
            typeof data.predicted_mental_health_score === "undefined"
        ) {

            throw new Error(
                "Response did not include predicted_mental_health_score."
            );
        }


        /* ----------------------------------------------------
           Display prediction
        ---------------------------------------------------- */

        renderSuccess(
            data.predicted_mental_health_score
        );


    } catch (err) {

        renderError(err);

    } finally {

        // Stop loading animation
        setLoading(false);
    }
}


/* ============================================================
   COLLECT AND VALIDATE FORM DATA
============================================================ */

function collectAndValidate() {

    const formData = new FormData(form);

    const payload = {};

    let isValid = true;


    /* --------------------------------------------------------
       Process every required field
    -------------------------------------------------------- */

    REQUIRED_FIELDS.forEach((field) => {

        const raw = formData.get(field);

        const slug = ERROR_SLUG_BY_FIELD[field];


        /* ----------------------------------------------------
           Check empty fields
        ---------------------------------------------------- */

        if (
            raw === null ||
            String(raw).trim() === ""
        ) {

            markFieldError(
                slug,
                "This field is required."
            );

            isValid = false;

            return;
        }


        /* ----------------------------------------------------
           Convert numerical fields to Number
        ---------------------------------------------------- */

        if (NUMBER_FIELDS.includes(field)) {

            const num = Number(raw);


            if (Number.isNaN(num)) {

                markFieldError(
                    slug,
                    "Enter a valid number."
                );

                isValid = false;

                return;
            }


            payload[field] = num;

        } else {

            payload[field] = String(raw).trim();
        }

    });


    /* --------------------------------------------------------
       Grouped_country

       Your CURRENT FastAPI/Pydantic model still expects this
       field in the request body.

       The backend itself calculates the actual country group,
       so this value is only supplied to satisfy the current
       request schema.
    -------------------------------------------------------- */

    payload.Grouped_country = payload.Country || "";


    return {
        payload,
        isValid
    };
}


/* ============================================================
   LOADING STATE
============================================================ */

function setLoading(isLoading) {

    predictBtn.disabled = isLoading;

    btnSpinner.hidden = !isLoading;


    if (isLoading) {

        btnLabel.textContent = "Predicting...";

    } else {

        btnLabel.textContent = "Predict Score";
    }
}


/* ============================================================
   RESULT STATES
============================================================ */

function showState(state) {

    resultIdle.hidden = state !== "idle";

    resultLoading.hidden = state !== "loading";

    resultSuccess.hidden = state !== "success";

    resultError.hidden = state !== "error";
}


/* ============================================================
   CLEAR FORM ERRORS
============================================================ */

function clearErrors() {

    formError.hidden = true;

    formError.textContent = "";


    document
        .querySelectorAll(".field-error")
        .forEach((el) => {

            el.textContent = "";
        });


    document
        .querySelectorAll(".field.has-error")
        .forEach((el) => {

            el.classList.remove("has-error");
        });
}


/* ============================================================
   MARK INDIVIDUAL FIELD ERROR
============================================================ */

function markFieldError(slug, message) {

    const errorEl =
        document.querySelector(
            `[data-error-for="${slug}"]`
        );


    if (errorEl) {

        errorEl.textContent = message;


        const field =
            errorEl.closest(".field");


        if (field) {

            field.classList.add("has-error");
        }
    }
}


/* ============================================================
   SUCCESS RESULT
============================================================ */

function renderSuccess(score) {

    const numericScore = Number(score);


    /* --------------------------------------------------------
       Display score
    -------------------------------------------------------- */

    if (Number.isFinite(numericScore)) {

        resultValueEl.textContent =
            numericScore.toFixed(2);

    } else {

        resultValueEl.textContent =
            String(score);
    }


    /* --------------------------------------------------------
       Calculate gauge position
    -------------------------------------------------------- */

    const clamped = Math.min(
        GAUGE_MAX,
        Math.max(
            GAUGE_MIN,
            Number.isFinite(numericScore)
                ? numericScore
                : 0
        )
    );


    const fraction =
        (clamped - GAUGE_MIN) /
        (GAUGE_MAX - GAUGE_MIN);


    const offset =
        GAUGE_CIRCUMFERENCE *
        (1 - fraction);


    /* --------------------------------------------------------
       Reset gauge before animation
    -------------------------------------------------------- */

    gaugeFill.style.strokeDashoffset =
        GAUGE_CIRCUMFERENCE;


    /* --------------------------------------------------------
       Animate gauge
    -------------------------------------------------------- */

    requestAnimationFrame(() => {

        gaugeFill.style.strokeDashoffset =
            offset;
    });


    /* --------------------------------------------------------
       Change gauge color
    -------------------------------------------------------- */

    gaugeFill.style.stroke =
        colorForScore(fraction);


    /* --------------------------------------------------------
       Display explanatory note
    -------------------------------------------------------- */

    resultNoteEl.textContent =
        noteForScore(fraction);


    /* --------------------------------------------------------
       Show success result
    -------------------------------------------------------- */

    showState("success");
}


/* ============================================================
   ERROR RESULT
============================================================ */

function renderError(err) {

    console.error(
        "Prediction request failed:",
        err
    );


    /* --------------------------------------------------------
       Display actual error when available
    -------------------------------------------------------- */

    if (err && err.message) {

        errorTextEl.textContent =
            err.message;

    } else {

        errorTextEl.textContent =
            "Could not reach the prediction server.";
    }


    showState("error");
}


/* ============================================================
   GAUGE COLOR
============================================================ */

function colorForScore(fraction) {

    if (fraction >= 0.66) {

        // Higher range
        return "#2f6f62";
    }


    if (fraction >= 0.33) {

        // Middle range
        return "#dd9138";
    }


    // Lower range
    return "#b8493c";
}


/* ============================================================
   SCORE DESCRIPTION
============================================================ */

function noteForScore(fraction) {

    if (fraction >= 0.66) {

        return "This falls in the higher end of the predicted range.";
    }


    if (fraction >= 0.33) {

        return "This falls in the middle of the predicted range.";
    }


    return "This falls in the lower end of the predicted range.";
}
