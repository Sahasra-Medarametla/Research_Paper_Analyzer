/* =========================================================
   PAPER MIND - RESEARCH PAPER ANALYZER
   Complete frontend controller
   ========================================================= */

let selectedPDF = null;
let currentReport = null;
let analysisRunning = false;

const $ = (id) => document.getElementById(id);

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const paperFile = $("paperFile");
const uploadArea = $("uploadArea");
const selectedFile = $("selectedFile");
const fileName = $("fileName");
const fileSize = $("fileSize");
const removeFile = $("removeFile");

const analyzeButton = $("analyzeButton");
const buttonContent = $("buttonContent");

const analysisStatus = $("analysisStatus");
const statusIcon = $("statusIcon");
const statusTitle = $("statusTitle");
const statusMessage = $("statusMessage");

const progressContainer = $("progressContainer");
const progressBar = $("progressBar");
const progressText = $("progressText");
const progressPercent = $("progressPercent");

const step1 = $("step1");
const step2 = $("step2");
const step3 = $("step3");

const reportSection = $("reportSection");
const reportFileName = $("reportFileName");
const reportPaperTitle = $("reportPaperTitle");
const downloadButton = $("downloadButton");

/* Interactive Assistant */

const chatQuestion = $("chatQuestion");
const askQuestionButton = $("askQuestionButton");
const chatMessages = $("chatMessages");
const chatError = $("chatError");


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    resetApplication();

    setupChat();

});


/* =========================================================
   FILE UPLOAD
   ========================================================= */

if (paperFile) {

    paperFile.addEventListener("change", () => {

        if (paperFile.files.length > 0) {

            handleFile(paperFile.files[0]);

        }

    });

}


function handleFile(file) {

    if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    ) {

        showError(
            "Invalid file",
            "Please upload a PDF research or conference paper."
        );

        if (paperFile) {
            paperFile.value = "";
        }

        return;
    }


    selectedPDF = file;

    currentReport = null;

    clearPreviousReport();


    if (fileName) {
        fileName.textContent = file.name;
    }


    if (fileSize) {
        fileSize.textContent = formatFileSize(file.size);
    }


    if (selectedFile) {
        selectedFile.style.display = "flex";
    }


    if (analyzeButton) {
        analyzeButton.disabled = false;
    }


    setStatus(
        "Paper ready for analysis",
        "Your PDF has been selected successfully. Click Analyze to begin.",
        "success"
    );


    resetSteps();

}


function formatFileSize(bytes) {

    if (!bytes) {
        return "0 Bytes";
    }

    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];

    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );

    return (
        parseFloat(
            (
                bytes /
                Math.pow(1024, index)
            ).toFixed(2)
        )
        +
        " "
        +
        units[index]
    );

}


/* =========================================================
   DRAG AND DROP
   ========================================================= */

if (uploadArea) {

    uploadArea.addEventListener("dragover", (event) => {

        event.preventDefault();

        uploadArea.classList.add(
            "drag-over",
            "dragging"
        );

    });


    uploadArea.addEventListener("dragleave", () => {

        uploadArea.classList.remove(
            "drag-over",
            "dragging"
        );

    });


    uploadArea.addEventListener("drop", (event) => {

        event.preventDefault();

        uploadArea.classList.remove(
            "drag-over",
            "dragging"
        );


        const files = event.dataTransfer.files;


        if (files.length > 0) {

            handleFile(files[0]);

        }

    });

}


if (removeFile) {

    removeFile.addEventListener(
        "click",
        resetApplication
    );

}


/* =========================================================
   ANALYZE PAPER
   ========================================================= */

if (analyzeButton) {

    analyzeButton.addEventListener(
        "click",
        startAnalysis
    );

}


async function startAnalysis() {

    if (
        !selectedPDF ||
        analysisRunning
    ) {

        return;

    }


    analysisRunning = true;

    currentReport = null;

    clearPreviousReport();


    if (selectedFile) {
        selectedFile.style.display = "none";
    }


    if (analysisStatus) {
        analysisStatus.style.display = "none";
    }


    if (progressContainer) {
        progressContainer.style.display = "block";
    }


    if (analyzeButton) {
        analyzeButton.disabled = true;
    }


    if (buttonContent) {

        buttonContent.innerHTML =
            `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Analyzing Your Paper...
            `;

    }


    resetSteps();


    updateProgress(
        8,
        "Uploading your research paper...",
        step1
    );


    const formData = new FormData();

    formData.append(
        "paper",
        selectedPDF
    );


    try {

        updateProgress(
            20,
            "Reading your research paper...",
            step1
        );


        const response = await fetch(
            "/api/analyze",
            {
                method: "POST",
                body: formData
            }
        );


        updateProgress(
            55,
            "Extracting important insights...",
            step2
        );


        let data;


        try {

            data = await response.json();

        } catch (error) {

            throw new Error(
                "The server returned an invalid response. Check the Flask terminal."
            );

        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                data.error ||
                "Analysis failed."
            );

        }


        /*
         * IMPORTANT
         *
         * Flask returns:
         *
         * {
         *    success: true,
         *    report: {...}
         * }
         *
         */

        if (
            !data.report ||
            typeof data.report !== "object"
        ) {

            throw new Error(
                "The AI analysis was received, but the report data is missing."
            );

        }


        currentReport = data.report;


        updateProgress(
            82,
            "Preparing your intelligent report...",
            step3
        );


        await wait(400);


        updateProgress(
            100,
            "Analysis completed successfully!",
            step3
        );


        await wait(500);


        /*
         * SHOW REAL GEMINI DATA
         */

        showRealReport(
            currentReport,
            data.filename || selectedPDF.name
        );


        if (progressContainer) {
            progressContainer.style.display = "none";
        }


        analysisRunning = false;


        if (analyzeButton) {
            analyzeButton.disabled = false;
        }


        if (buttonContent) {

            buttonContent.innerHTML =
                `
                <i class="bi bi-stars"></i>
                Analyze Research Paper
                `;

        }

    }


    catch (error) {

        console.error(
            "Analysis error:",
            error
        );


        if (progressContainer) {
            progressContainer.style.display = "none";
        }


        analysisRunning = false;


        if (analyzeButton) {
            analyzeButton.disabled = false;
        }


        if (selectedFile) {
            selectedFile.style.display = "flex";
        }


        if (buttonContent) {

            buttonContent.innerHTML =
                `
                <i class="bi bi-stars"></i>
                Analyze Research Paper
                `;

        }


        showError(
            "Analysis failed",
            error.message ||
            "Something went wrong while analyzing the paper."
        );

    }

}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress(
    percent,
    message,
    activeStep
) {

    if (progressBar) {

        progressBar.style.width =
            percent + "%";

    }


    if (progressPercent) {

        progressPercent.textContent =
            percent + "%";

    }


    if (progressText) {

        progressText.textContent =
            message;

    }


    if (activeStep) {

        activeStep.classList.add(
            "active"
        );

    }

}


function resetSteps() {

    [
        step1,
        step2,
        step3
    ].forEach((step) => {

        if (step) {

            step.classList.remove(
                "active"
            );

        }

    });

}


function wait(ms) {

    return new Promise(
        (resolve) => setTimeout(resolve, ms)
    );

}


/* =========================================================
   DISPLAY REAL REPORT
   ========================================================= */

function showRealReport(
    report,
    filename
) {

    if (!reportSection) {
        console.error(
            "reportSection not found in HTML."
        );
        return;
    }


    reportSection.style.display =
        "block";


    if (reportFileName) {

        reportFileName.textContent =
            "Generated analysis for: " +
            filename;

    }


    if (reportPaperTitle) {

        reportPaperTitle.textContent =
            report.paperTitle ||
            cleanPaperTitle(filename);

    }


    /*
     * IMPORTANT:
     *
     * Find the report content container
     * and replace the placeholder text.
     */

    const reportContent =
        reportSection.querySelector(
            ".report-content"
        );


    if (reportContent) {

        reportContent.innerHTML =
            buildReportHTML(report);

    }

    else {

        console.error(
            "Could not find .report-content inside #reportSection"
        );

    }


    if (downloadButton) {

        downloadButton.onclick =
            downloadReport;

    }


    setTimeout(() => {

        reportSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 250);

}


/* =========================================================
   BUILD REPORT HTML
   ========================================================= */

function buildReportHTML(report) {

    const authors =
        normalizeArray(
            report.authors
        );


    const objectives =
        normalizeArray(
            report.objectives
        );


    const findings =
        normalizeArray(
            report.keyFindings
        );


    const limitations =
        normalizeArray(
            report.limitations
        );


    const algorithms =
        normalizeArray(
            report.algorithmsModels
        );


    const futureScope =
        normalizeArray(
            report.futureScope
        );


    const concepts =
        normalizeArray(
            report.keyConcepts
        );


    return `

        <!-- 01 PAPER OVERVIEW -->

        <div class="report-section-block">

            <div class="report-block-title">

                <span class="report-number">
                    01
                </span>

                <span>
                    Paper Overview
                </span>

            </div>


            <div class="overview-grid">

                ${overviewItem(
                    "Title",
                    report.paperTitle
                )}


                ${overviewItem(
                    "Authors",
                    authors.join(", ")
                )}


                ${overviewItem(
                    "Publication Year",
                    report.publicationYear
                )}


                ${overviewItem(
                    "Document Type",
                    report.documentType ||
                    "Research / Conference Paper"
                )}


                ${overviewItem(
                    "Analysis Type",
                    "NLP + Large Language Models"
                )}


                <div class="overview-item">

                    <span>
                        Status
                    </span>

                    <strong
                        style="color:#22a66c;"
                    >

                        <i
                            class="bi bi-check-circle-fill"
                        ></i>

                        Successfully Analyzed

                    </strong>

                </div>

            </div>

        </div>


        <!-- 02 EXECUTIVE SUMMARY -->

        <div class="report-section-block">

            <div class="report-block-title">

                <span class="report-number">
                    02
                </span>

                <span>
                    Executive Summary
                </span>

            </div>


            <p class="report-text">

                ${formatText(
                    report.executiveSummary
                )}

            </p>

        </div>


        <!-- 03 + 04 -->

        <div class="report-two-column">


            <div class="report-section-block">

                <div class="report-block-title">

                    <span class="report-number">
                        03
                    </span>

                    <span>
                        Research Problem
                    </span>

                </div>


                <p class="report-text">

                    ${formatText(
                        report.researchProblem
                    )}

                </p>

            </div>



            <div class="report-section-block">

                <div class="report-block-title">

                    <span class="report-number">
                        04
                    </span>

                    <span>
                        Objectives
                    </span>

                </div>


                ${listHTML(
                    objectives
                )}

            </div>


        </div>


        <!-- 05 METHODOLOGY -->

        <div class="report-section-block">

            <div class="report-block-title">

                <span class="report-number">
                    05
                </span>

                <span>
                    Methodology
                </span>

            </div>


            <p class="report-text">

                ${formatText(
                    report.methodology
                )}

            </p>


            <div
                style="
                    margin-top:18px;
                    padding:16px;
                    border-radius:14px;
                    background:#f7f7ff;
                    border:1px solid #e5e0ff;
                "
            >

                <strong>
                    Dataset
                </strong>


                <p
                    class="report-text"
                    style="margin-top:8px;"
                >

                    ${formatText(
                        report.dataset
                    )}

                </p>


                <strong>
                    Algorithms / Models
                </strong>


                ${listHTML(
                    algorithms
                )}

            </div>

        </div>


        <!-- 06 + 07 -->

        <div class="report-two-column">


            <div class="report-section-block">

                <div class="report-block-title">

                    <span class="report-number">
                        06
                    </span>

                    <span>
                        Key Findings
                    </span>

                </div>


                ${listHTML(
                    findings
                )}


                <div
                    style="
                        margin-top:18px;
                        padding:14px;
                        border-radius:12px;
                        background:#f8f9ff;
                        border:1px solid #e5e8f5;
                    "
                >

                    <strong>
                        Results
                    </strong>


                    <p
                        class="report-text"
                        style="margin-top:8px;"
                    >

                        ${formatText(
                            report.results
                        )}

                    </p>

                </div>

            </div>



            <div class="report-section-block">

                <div class="report-block-title">

                    <span class="report-number">
                        07
                    </span>

                    <span>
                        Limitations
                    </span>

                </div>


                ${listHTML(
                    limitations
                )}

            </div>


        </div>


        <!-- 08 RESEARCH GAP -->

        <div class="report-section-block">

            <div class="report-block-title">

                <span class="report-number">
                    08
                </span>

                <span>
                    Research Gap &amp; Future Scope
                </span>

            </div>


            <p class="report-text">

                ${formatText(
                    report.researchGap
                )}

            </p>


            <div
                style="margin-top:18px;"
            >

                <strong>
                    Future Scope
                </strong>


                ${listHTML(
                    futureScope
                )}

            </div>

        </div>


        <!-- 09 KEY CONCEPTS -->

        <div class="report-section-block">

            <div class="report-block-title">

                <span class="report-number">
                    09
                </span>

                <span>
                    Key Concepts
                </span>

            </div>


            <div class="method-tags">

                ${
                    concepts.length

                    ?

                    concepts
                        .map(
                            (concept) =>
                                `
                                <span>
                                    ${escapeHTML(
                                        concept
                                    )}
                                </span>
                                `
                        )
                        .join("")

                    :

                    `
                    <span>
                        Not clearly mentioned in the paper.
                    </span>
                    `
                }

            </div>

        </div>


        <!-- 10 OVERALL EVALUATION -->

        <div class="report-section-block">

            <div class="report-block-title">

                <span class="report-number">
                    10
                </span>

                <span>
                    Overall Evaluation
                </span>

            </div>


            <p class="report-text">

                ${formatText(
                    report.overallEvaluation
                )}

            </p>

        </div>

    `;

}


/* =========================================================
   OVERVIEW ITEM
   ========================================================= */

function overviewItem(
    label,
    value
) {

    return `

        <div class="overview-item">

            <span>
                ${escapeHTML(label)}
            </span>


            <strong>

                ${escapeHTML(
                    value ||
                    "Not clearly mentioned in the paper."
                )}

            </strong>

        </div>

    `;

}


/* =========================================================
   NORMALIZE ARRAYS
   ========================================================= */

function normalizeArray(value) {

    if (Array.isArray(value)) {

        return value
            .filter(
                (x) =>
                    x !== null &&
                    x !== undefined
            )
            .map(String);

    }


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return [];

    }


    return [
        String(value)
    ];

}


/* =========================================================
   LIST HTML
   ========================================================= */

function listHTML(items) {

    if (!items.length) {

        return `
            <ul class="report-list">

                <li>
                    Not clearly mentioned in the paper.
                </li>

            </ul>
        `;

    }


    return `

        <ul class="report-list">

            ${items
                .map(
                    (item) =>
                        `
                        <li>
                            ${escapeHTML(item)}
                        </li>
                        `
                )
                .join("")}

        </ul>

    `;

}


/* =========================================================
   TEXT FORMAT
   ========================================================= */

function formatText(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "Not clearly mentioned in the paper.";

    }


    return escapeHTML(
        String(value)
    )
        .replace(
            /\n\n/g,
            "<br><br>"
        )
        .replace(
            /\n/g,
            "<br>"
        );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   CLEAN PAPER TITLE
   ========================================================= */

function cleanPaperTitle(name) {

    return String(
        name ||
        "Research Paper"
    )

        .replace(
            /\.pdf$/i,
            ""
        )

        .replace(
            /[_-]/g,
            " "
        )

        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        );

}


/* =========================================================
   PDF DOWNLOAD
   ========================================================= */

if (downloadButton) {

    downloadButton.addEventListener(
        "click",
        downloadReport
    );

}


async function downloadReport() {

    if (!currentReport) {

        showError(
            "No report available",
            "Analyze a research paper before downloading the report."
        );

        return;

    }


    const originalText =
        downloadButton.innerHTML;


    downloadButton.disabled =
        true;


    downloadButton.innerHTML =
        `
        <span
            class="spinner-border spinner-border-sm me-2"
        ></span>

        Creating PDF...
        `;


    try {

        const response =
            await fetch(
                "/api/download-report",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        filename:
                            selectedPDF
                                ? selectedPDF.name
                                : "Research_Paper.pdf",

                        report:
                            currentReport

                    })

                }
            );


        if (!response.ok) {

            const errorData =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );


            throw new Error(

                errorData.message ||

                errorData.error ||

                "Could not generate PDF."

            );

        }


        const blob =
            await response.blob();


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            cleanPaperTitle(
                currentReport.paperTitle ||
                "Research_Paper"
            )
            +
            "_Analysis_Report.pdf";


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        URL.revokeObjectURL(
            url
        );

    }


    catch (error) {

        console.error(
            "PDF download error:",
            error
        );


        showError(
            "Download failed",
            error.message ||
            "Unable to create the PDF report."
        );

    }


    finally {

        downloadButton.disabled =
            false;


        downloadButton.innerHTML =
            originalText;

    }

}


/* =========================================================
   RESET
   ========================================================= */

function clearPreviousReport() {

    if (reportSection) {

        reportSection.style.display =
            "none";

    }


    currentReport = null;

}


function resetApplication() {

    selectedPDF = null;

    currentReport = null;

    analysisRunning = false;


    if (paperFile) {
        paperFile.value = "";
    }


    if (selectedFile) {
        selectedFile.style.display =
            "none";
    }


    if (reportSection) {
        reportSection.style.display =
            "none";
    }


    if (progressContainer) {
        progressContainer.style.display =
            "none";
    }


    if (analysisStatus) {
        analysisStatus.style.display =
            "flex";
    }


    if (analyzeButton) {
        analyzeButton.disabled =
            true;
    }


    if (buttonContent) {

        buttonContent.innerHTML =
            `
            <i class="bi bi-stars"></i>
            Analyze Research Paper
            `;

    }


    setStatus(

        "Upload a paper to begin",

        "Select a research or conference paper and we'll prepare it for intelligent analysis.",

        "default"

    );


    resetSteps();


    if (chatQuestion) {
        chatQuestion.value = "";
    }


    hideChatError();

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
    title,
    message,
    type
) {

    if (!analysisStatus) {
        return;
    }


    analysisStatus.style.display =
        "flex";


    if (statusTitle) {
        statusTitle.textContent =
            title;
    }


    if (statusMessage) {
        statusMessage.textContent =
            message;
    }


    if (type === "success") {

        if (statusIcon) {

            statusIcon.className =
                "bi bi-check-lg";

        }


        analysisStatus.style.background =
            "#f5fbf8";


        analysisStatus.style.borderColor =
            "#dcefe6";


        const icon =
            analysisStatus.querySelector(
                ".status-icon"
            );


        if (icon) {

            icon.style.color =
                "#22a66c";

            icon.style.background =
                "#e2f7ec";

        }

    }

    else {

        if (statusIcon) {

            statusIcon.className =
                "bi bi-upload";

        }


        analysisStatus.style.background =
            "";

        analysisStatus.style.borderColor =
            "";

    }

}


/* =========================================================
   ERROR
   ========================================================= */

function showError(
    title,
    message
) {

    if (!analysisStatus) {
        return;
    }


    analysisStatus.style.display =
        "flex";


    analysisStatus.style.background =
        "#fff5f5";


    analysisStatus.style.borderColor =
        "#ffd8d8";


    if (statusIcon) {

        statusIcon.className =
            "bi bi-exclamation-triangle";

    }


    if (statusTitle) {

        statusTitle.textContent =
            title;

    }


    if (statusMessage) {

        statusMessage.textContent =
            message;

    }


    const icon =
        analysisStatus.querySelector(
            ".status-icon"
        );


    if (icon) {

        icon.style.color =
            "#dc3545";


        icon.style.background =
            "#ffe8e8";

    }

}


/* =========================================================
   INTERACTIVE PAPER ASSISTANT
   ========================================================= */

function setupChat() {

    if (askQuestionButton) {

        askQuestionButton.addEventListener(
            "click",
            askPaperQuestion
        );

    }


    if (chatQuestion) {

        chatQuestion.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    askPaperQuestion();

                }

            }
        );

    }


    /*
     * Suggested questions
     */

    document
        .querySelectorAll(
            ".suggestion-btn"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        if (!chatQuestion) {
                            return;
                        }


                        chatQuestion.value =
                            button.dataset.question ||
                            button.textContent.trim();


                        askPaperQuestion();

                    }
                );

            }
        );

}


/* =========================================================
   ASK QUESTION
   ========================================================= */

async function askPaperQuestion() {

    if (
        !selectedPDF ||
        !currentReport
    ) {

        showChatError(
            "Please upload and analyze a research paper first."
        );

        return;

    }


    const question =
        chatQuestion
            ? chatQuestion.value.trim()
            : "";


    if (!question) {

        showChatError(
            "Please enter a question about the paper."
        );


        if (chatQuestion) {
            chatQuestion.focus();
        }


        return;

    }


    if (question.length > 2000) {

        showChatError(
            "Please keep your question under 2000 characters."
        );

        return;

    }


    hideChatError();


    if (askQuestionButton) {

        askQuestionButton.disabled =
            true;


        askQuestionButton.innerHTML =
            `
            <span
                class="spinner-border spinner-border-sm"
            ></span>

            Thinking...
            `;

    }


    addChatMessage(
        question,
        "user"
    );


    const loadingMessage =
        addLoadingMessage();


    const formData =
        new FormData();


    formData.append(
        "paper",
        selectedPDF
    );


    formData.append(
        "question",
        question
    );


    try {

        const response =
            await fetch(
                "/api/ask",
                {
                    method: "POST",
                    body: formData
                }
            );


        let data;


        try {

            data =
                await response.json();

        }


        catch {

            throw new Error(
                "The server returned an invalid answer."
            );

        }


        if (loadingMessage) {

            loadingMessage.remove();

        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                data.error ||
                "Unable to get an answer."

            );

        }


        addChatMessage(
            data.answer ||
            "The assistant did not return an answer.",
            "assistant"
        );


        if (chatQuestion) {

            chatQuestion.value =
                "";

        }

    }


    catch (error) {

        console.error(
            "Question answering error:",
            error
        );


        if (loadingMessage) {

            loadingMessage.remove();

        }


        showChatError(
            error.message ||
            "Something went wrong while answering your question."
        );

    }


    finally {

        if (askQuestionButton) {

            askQuestionButton.disabled =
                false;


            askQuestionButton.innerHTML =
                `
                <i class="bi bi-send-fill"></i>
                Ask
                `;

        }

    }

}


/* =========================================================
   ADD CHAT MESSAGE
   ========================================================= */

function addChatMessage(
    message,
    type
) {

    if (!chatMessages) {
        return null;
    }


    const welcome =
        chatMessages.querySelector(
            ".chat-welcome"
        );


    if (welcome) {
        welcome.remove();
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "chat-message " +
        type;


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "chat-bubble";


    bubble.textContent =
        String(message);


    wrapper.appendChild(
        bubble
    );


    chatMessages.appendChild(
        wrapper
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;


    return wrapper;

}


/* =========================================================
   CHAT LOADING
   ========================================================= */

function addLoadingMessage() {

    if (!chatMessages) {
        return null;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "chat-message assistant";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "chat-bubble";


    bubble.innerHTML =

        `
        <div class="chat-loading">

            <span></span>
            <span></span>
            <span></span>

            <small>
                Analyzing your paper...
            </small>

        </div>
        `;


    wrapper.appendChild(
        bubble
    );


    chatMessages.appendChild(
        wrapper
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;


    return wrapper;

}


/* =========================================================
   CHAT ERROR
   ========================================================= */

function showChatError(
    message
) {

    if (!chatError) {
        return;
    }


    chatError.textContent =
        message;


    chatError.style.display =
        "block";

}


function hideChatError() {

    if (!chatError) {
        return;
    }


    chatError.textContent =
        "";


    chatError.style.display =
        "none";

}