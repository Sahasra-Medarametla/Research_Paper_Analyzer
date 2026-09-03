from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    ListFlowable,
    ListItem
)
from reportlab.lib.units import mm

import os
import uuid
import json
import traceback
import html
import fitz
from groq import Groq

# ============================================================
# LOAD ENVIRONMENT
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

load_dotenv(
    os.path.join(BASE_DIR, ".env")
)


# ============================================================
# FLASK
# ============================================================

app = Flask(__name__)

CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024


# ============================================================
# DIRECTORIES
# ============================================================

FRONTEND_FOLDER = os.path.join(
    BASE_DIR,
    "frontend"
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)

REPORT_FOLDER = os.path.join(
    BASE_DIR,
    "reports"
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)

os.makedirs(
    REPORT_FOLDER,
    exist_ok=True
)


# ============================================================
# GEMINI
# ============================================================

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)

client = None

if GEMINI_API_KEY:

    client = genai.Client(
        api_key=GEMINI_API_KEY
    )
    groq_client = Groq(
        api_key=os.getenv("GROQ_API_KEY")
    )


# ============================================================
# FRONTEND
# ============================================================

@app.route("/")
def home():

    return send_from_directory(
        FRONTEND_FOLDER,
        "index.html"
    )


@app.route("/<path:filename>")
def frontend_files(filename):

    return send_from_directory(
        FRONTEND_FOLDER,
        filename
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route(
    "/api/health",
    methods=["GET"]
)
def health_check():

    return jsonify({

        "success": True,

        "message":
            "Research Paper Analyzer backend is running.",

        "gemini_configured":
            bool(GEMINI_API_KEY)

    })


# ============================================================
# ANALYZE PAPER
# ============================================================

@app.route(
    "/api/analyze",
    methods=["POST"]
)
def analyze_paper():

    uploaded_path = None

    try:

        # ----------------------------------------------------
        # GEMINI CHECK
        # ----------------------------------------------------

        if not client:

            return jsonify({

                "success": False,

                "message":
                    "Gemini API key is not configured."

            }), 500


        # ----------------------------------------------------
        # FILE CHECK
        # ----------------------------------------------------

        if "paper" not in request.files:

            return jsonify({

                "success": False,

                "message":
                    "No PDF file was uploaded."

            }), 400


        file = request.files["paper"]


        if not file.filename:

            return jsonify({

                "success": False,

                "message":
                    "No file was selected."

            }), 400


        original_filename = file.filename


        # ----------------------------------------------------
        # PDF VALIDATION
        # ----------------------------------------------------

        if not original_filename.lower().endswith(".pdf"):

            return jsonify({

                "success": False,

                "message":
                    "Only PDF files are supported."

            }), 400


        # ----------------------------------------------------
        # SAVE TEMPORARY FILE
        # ----------------------------------------------------

        unique_name = (
            str(uuid.uuid4())
            + ".pdf"
        )

        uploaded_path = os.path.join(
            UPLOAD_FOLDER,
            unique_name
        )

        file.save(
            uploaded_path
        )


        print()
        print("=" * 65)
        print("RESEARCH PAPER RECEIVED")
        print("=" * 65)
        print(
            "Filename:",
            original_filename
        )
        print("=" * 65)


        # ----------------------------------------------------
        # UPLOAD PDF TO GEMINI
        # ----------------------------------------------------

        print(
            "Uploading PDF to Gemini..."
        )

        gemini_file = client.files.upload(
            file=uploaded_path
        )

        print(
            "PDF uploaded successfully."
        )


        # ----------------------------------------------------
        # PROMPT
        # ----------------------------------------------------

        prompt = """
You are an expert Research Paper Analyzer.

Analyze the uploaded research or conference paper carefully.

Create a concise but comprehensive report that is easy for a
college student or researcher to understand.

IMPORTANT:

- Use ONLY information supported by the uploaded paper.
- Never invent facts, results, authors, datasets or accuracy values.
- If information is unavailable, write:
  "Not clearly mentioned in the paper."
- Extract information from tables, figures and diagrams when possible.
- Keep explanations informative but not unnecessarily long.
- Preserve important technical details.

Return ONLY valid JSON.

Use EXACTLY this structure:

{
    "paperTitle": "",
    "authors": [],
    "publicationYear": "",
    "documentType": "",

    "executiveSummary": "",

    "researchProblem": "",

    "objectives": [],

    "methodology": "",

    "dataset": "",

    "algorithmsModels": [],

    "keyFindings": [],

    "results": "",

    "limitations": [],

    "researchGap": "",

    "futureScope": [],

    "keyConcepts": [],

    "overallEvaluation": ""
}

FIELD REQUIREMENTS:

paperTitle:
Exact paper title.

authors:
All authors mentioned in the paper.

publicationYear:
Publication year if available.

documentType:
Research paper, conference paper, journal paper,
review paper, etc.

executiveSummary:
A short overall summary covering the problem,
approach, findings and contribution.

researchProblem:
Clearly explain the main problem addressed.

objectives:
List the major objectives.

methodology:
Explain the research approach, workflow and methodology.

dataset:
Mention datasets, data sources and dataset size if available.

algorithmsModels:
List algorithms, models, frameworks and important techniques.

keyFindings:
List the most important findings.

results:
Summarize experimental/performance results.
Mention numerical values only when present in the paper.

limitations:
List limitations mentioned by the authors.

researchGap:
Identify unresolved issues or research opportunities
supported by the paper.

futureScope:
List future work or improvements.

keyConcepts:
Important NLP, AI, ML and domain-specific concepts.

overallEvaluation:
Give a short evaluation of the contribution and significance.
"""


        # ----------------------------------------------------
        # GEMINI ANALYSIS
        # ----------------------------------------------------

        print(
            "Analyzing paper with Gemini..."
        )

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                prompt,
                gemini_file
            ]
        )


        result_text = response.text.strip()


        print(
            "Gemini response received."
        )


        # ----------------------------------------------------
        # CLEAN JSON
        # ----------------------------------------------------

        if result_text.startswith(
            "```json"
        ):

            result_text = result_text[
                7:
            ]

        elif result_text.startswith(
            "```"
        ):

            result_text = result_text[
                3:
            ]


        if result_text.endswith(
            "```"
        ):

            result_text = result_text[
                :-3
            ]


        result_text = result_text.strip()


        # ----------------------------------------------------
        # PARSE JSON
        # ----------------------------------------------------

        try:

            # Clean Gemini response
            cleaned_text = result_text.strip()

            # Remove Markdown JSON code fences if Gemini adds them
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]

            elif cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]

            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]

            cleaned_text = cleaned_text.strip()

            # Find the actual JSON object
            start = cleaned_text.find("{")
            end = cleaned_text.rfind("}")

            if start == -1 or end == -1:
                raise ValueError("No JSON object found in Gemini response.")

            cleaned_text = cleaned_text[start:end + 1]

            # Convert JSON string to Python dictionary
            report = json.loads(cleaned_text)

            print("Gemini JSON parsed successfully.")

        except (json.JSONDecodeError, ValueError) as e:

            print("Gemini returned invalid JSON.")
            print("JSON parsing error:", e)
            print("Raw Gemini response:")
            print(result_text)

            return jsonify({

                "success": False,

                "message":
                    "The AI returned an unexpected format.",

                "raw_response":
                    result_text

            }), 500


        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        print(
            "Analysis completed successfully."
        )


        return jsonify({

            "success": True,

            "filename":
                original_filename,

            "report":
                report

        })


    except Exception as error:

        print()
        print("=" * 65)
        print("ANALYSIS ERROR")
        print("=" * 65)

        print(
            str(error)
        )

        traceback.print_exc()


        return jsonify({

            "success": False,

            "message":
                "Unable to analyze the research paper.",

            "error":
                str(error)

        }), 500


    finally:

        # ----------------------------------------------------
        # DELETE TEMPORARY PDF
        # ----------------------------------------------------

        if uploaded_path:

            try:

                if os.path.exists(
                    uploaded_path
                ):

                    os.remove(
                        uploaded_path
                    )

                    print(
                        "Temporary PDF deleted."
                    )

            except Exception:

                pass



# ============================================================
# ASK QUESTION ABOUT CURRENT PAPER
# ============================================================

# ============================================================
# ASK QUESTION ABOUT CURRENT PAPER
# ============================================================

# ============================================================
# INTERACTIVE PAPER ASSISTANT - GROQ
# ============================================================

@app.route(
    "/api/ask",
    methods=["POST"]
)
def ask_question():

    uploaded_path = None

    try:

        # ----------------------------------------------------
        # CHECK GROQ API
        # ----------------------------------------------------

        if not os.getenv("GROQ_API_KEY"):

            return jsonify({
                "success": False,
                "message": "Groq API key is not configured."
            }), 500


        # ----------------------------------------------------
        # CHECK PDF
        # ----------------------------------------------------

        if "paper" not in request.files:

            return jsonify({
                "success": False,
                "message": "No research paper was provided."
            }), 400


        # ----------------------------------------------------
        # GET QUESTION
        # ----------------------------------------------------

        question = request.form.get(
            "question",
            ""
        ).strip()


        if not question:

            return jsonify({
                "success": False,
                "message": "Please enter a question about the paper."
            }), 400


        if len(question) > 2000:

            return jsonify({
                "success": False,
                "message": "Please keep your question under 2000 characters."
            }), 400


        # ----------------------------------------------------
        # GET PDF
        # ----------------------------------------------------

        file = request.files["paper"]


        if not file.filename:

            return jsonify({
                "success": False,
                "message": "No PDF file was selected."
            }), 400


        if not file.filename.lower().endswith(".pdf"):

            return jsonify({
                "success": False,
                "message": "Only PDF files are supported."
            }), 400


        # ----------------------------------------------------
        # SAVE TEMPORARY PDF
        # ----------------------------------------------------

        unique_name = (
            str(uuid.uuid4()) + ".pdf"
        )


        uploaded_path = os.path.join(
            UPLOAD_FOLDER,
            unique_name
        )


        file.save(
            uploaded_path
        )


        print()
        print("=" * 65)
        print("INTERACTIVE PAPER ASSISTANT - GROQ")
        print("=" * 65)
        print("Paper:", file.filename)
        print("Question:", question)
        print("=" * 65)


        # ----------------------------------------------------
        # EXTRACT TEXT FROM PDF
        # ----------------------------------------------------

        print(
            "Extracting text from PDF..."
        )


        document = fitz.open(
            uploaded_path
        )


        paper_text = ""


        for page in document:

            page_text = page.get_text()

            if page_text:

                paper_text += (
                    "\n" + page_text
                )


        document.close()


        # ----------------------------------------------------
        # CHECK TEXT
        # ----------------------------------------------------

        if not paper_text.strip():

            return jsonify({
                "success": False,
                "message":
                    "Could not extract readable text from this PDF. "
                    "The paper may be scanned or image-based."
            }), 400


        print(
            "Extracted characters:",
            len(paper_text)
        )


        # ----------------------------------------------------
        # LIMIT PAPER CONTEXT
        # ----------------------------------------------------

        # ----------------------------------------------------
        # LIMIT PAPER CONTEXT FOR GROQ
        # ----------------------------------------------------

        max_context_length = 28000

        if len(paper_text) > max_context_length:

            beginning = paper_text[:18000]

            ending = paper_text[-10000:]

            paper_text = (
                beginning
                + "\n\n[Middle portion of document omitted to stay within the AI context limit]\n\n"
                + ending
            )

        print(
            "Characters sent to Groq:",
            len(paper_text)
        )


        # ----------------------------------------------------
        # PROMPT
        # ----------------------------------------------------

        prompt = f"""
You are an intelligent Research Paper Assistant.

Answer the user's question using ONLY the
research paper content provided below.

IMPORTANT RULES:

1. Do not invent facts.
2. Do not assume information that is not present.
3. If the answer is not available in the paper, say:
   "This information is not clearly mentioned in the paper."
4. Keep the answer concise but informative.
5. Explain technical concepts in a student-friendly way.
6. Preserve exact algorithm, model and dataset names.
7. Use actual numerical values from the paper when asked.
8. Do not discuss unrelated information.
9. Do not mention Groq.
10. Do not return JSON.
11. Give a normal readable answer.

------------------------------------------------------------
RESEARCH PAPER
------------------------------------------------------------

{paper_text}

------------------------------------------------------------
USER QUESTION
------------------------------------------------------------

{question}

------------------------------------------------------------
ANSWER
------------------------------------------------------------
"""


        # ----------------------------------------------------
        # SEND TO GROQ
        # ----------------------------------------------------

        print(
            "Sending question to Groq..."
        )


        completion = groq_client.chat.completions.create(

            model="openai/gpt-oss-120b",

            messages=[

                {
                    "role": "system",
                    "content":
                        "You are a research paper question-answering assistant. "
                        "Answer only from the supplied paper content."
                },

                {
                    "role": "user",
                    "content": prompt
                }

            ],

            temperature=0.2,

            max_tokens=1200

        )


        # ----------------------------------------------------
        # GET ANSWER
        # ----------------------------------------------------

        answer = (
            completion
            .choices[0]
            .message
            .content
            .strip()
        )


        if not answer:

            return jsonify({
                "success": False,
                "message": "The AI did not return an answer."
            }), 500


        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        print(
            "Groq answer generated successfully."
        )

        print("=" * 65)


        return jsonify({

            "success": True,

            "answer": answer

        })


    # --------------------------------------------------------
    # ERROR
    # --------------------------------------------------------

    except Exception as error:

        print()
        print("=" * 65)
        print("GROQ QUESTION ANSWERING ERROR")
        print("=" * 65)

        print(
            "ERROR:",
            str(error)
        )

        traceback.print_exc()

        print("=" * 65)


        return jsonify({

            "success": False,

            "message":
                "Unable to answer the question.",

            "error":
                str(error)

        }), 500


    # --------------------------------------------------------
    # CLEANUP
    # --------------------------------------------------------

    finally:

        if uploaded_path:

            try:

                if os.path.exists(
                    uploaded_path
                ):

                    os.remove(
                        uploaded_path
                    )

                    print(
                        "Temporary Q&A PDF deleted."
                    )

            except Exception:

                pass


# ============================================================
# GENERATE PDF REPORT
# ============================================================

@app.route(
    "/api/download-report",
    methods=["POST"]
)
def download_report():

    try:

        data = request.get_json()

        if not data:

            return jsonify({

                "success": False,

                "message":
                    "No report data received."

            }), 400


        report = data.get(
            "report",
            {}
        )

        filename = data.get(
            "filename",
            "Research_Paper"
        )


        # ----------------------------------------------------
        # SAFE TITLE
        # ----------------------------------------------------

        title = report.get(
            "paperTitle",
            filename
        )

        safe_title = "".join(

            character

            for character in title

            if character.isalnum()
            or character in " _-"

        ).strip()

        if not safe_title:

            safe_title = "Research_Paper"


        pdf_filename = (
            safe_title
            + "_Analysis_Report.pdf"
        )

        pdf_path = os.path.join(
            REPORT_FOLDER,
            pdf_filename
        )


        # ----------------------------------------------------
        # PDF DOCUMENT
        # ----------------------------------------------------

        document = SimpleDocTemplate(

            pdf_path,

            pagesize=A4,

            rightMargin=18 * mm,

            leftMargin=18 * mm,

            topMargin=18 * mm,

            bottomMargin=18 * mm

        )


        styles = getSampleStyleSheet()


        title_style = ParagraphStyle(

            "ReportTitle",

            parent=styles["Title"],

            fontSize=20,

            leading=25,

            alignment=TA_CENTER,

            textColor=colors.HexColor(
                "#6847ed"
            ),

            spaceAfter=12

        )


        section_style = ParagraphStyle(

            "Section",

            parent=styles["Heading2"],

            fontSize=13,

            leading=17,

            textColor=colors.HexColor(
                "#27304a"
            ),

            spaceBefore=12,

            spaceAfter=7

        )


        body_style = ParagraphStyle(

            "Body",

            parent=styles["BodyText"],

            fontSize=9.5,

            leading=14,

            textColor=colors.HexColor(
                "#4b556b"
            ),

            spaceAfter=7

        )


        small_style = ParagraphStyle(

            "Small",

            parent=styles["BodyText"],

            fontSize=8,

            textColor=colors.HexColor(
                "#7a8299"
            ),

            spaceAfter=5

        )


        story = []


        # ----------------------------------------------------
        # TITLE
        # ----------------------------------------------------

        story.append(

            Paragraph(
                "Intelligent Research Paper Analysis",
                title_style
            )

        )


        story.append(

            Paragraph(
                html.escape(title),
                small_style
            )

        )


        story.append(
            Spacer(1, 5)
        )


        # ----------------------------------------------------
        # OVERVIEW
        # ----------------------------------------------------

        story.append(

            Paragraph(
                "1. Paper Overview",
                section_style
            )

        )


        overview_data = [

            [
                "<b>Title</b>",
                html.escape(title)
            ],

            [
                "<b>Authors</b>",
                html.escape(
                    ", ".join(
                        report.get(
                            "authors",
                            []
                        )
                    )
                )
            ],

            [
                "<b>Publication Year</b>",
                html.escape(
                    str(
                        report.get(
                            "publicationYear",
                            ""
                        )
                    )
                )
            ],

            [
                "<b>Document Type</b>",
                html.escape(
                    str(
                        report.get(
                            "documentType",
                            ""
                        )
                    )
                )
            ]

        ]


        table = Table(

            overview_data,

            colWidths=[
                42 * mm,
                130 * mm
            ]

        )


        table.setStyle(

            TableStyle([

                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor(
                        "#f3f1ff"
                    )
                ),

                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor(
                        "#dfe2ec"
                    )
                ),

                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP"
                ),

                (
                    "FONTNAME",
                    (0, 0),
                    (-1, -1),
                    "Helvetica"
                ),

                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    8.5
                ),

                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7
                ),

                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    7
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    7
                )

            ])

        )


        story.append(
            table
        )


        # ----------------------------------------------------
        # HELPER
        # ----------------------------------------------------

        def add_text_section(
            number,
            heading,
            value
        ):

            story.append(

                Paragraph(
                    f"{number}. {heading}",
                    section_style
                )

            )

            if isinstance(
                value,
                list
            ):

                items = []

                for item in value:

                    items.append(

                        ListItem(

                            Paragraph(
                                html.escape(
                                    str(item)
                                ),
                                body_style
                            )

                        )

                    )


                story.append(

                    ListFlowable(

                        items,

                        bulletType="bullet",

                        leftIndent=15

                    )

                )

            else:

                story.append(

                    Paragraph(

                        html.escape(
                            str(value)
                        ).replace(
                            "\n",
                            "<br/>"
                        ),

                        body_style

                    )

                )


        # ----------------------------------------------------
        # REPORT SECTIONS
        # ----------------------------------------------------

        add_text_section(
            2,
            "Executive Summary",
            report.get(
                "executiveSummary",
                "Not clearly mentioned in the paper."
            )
        )


        add_text_section(
            3,
            "Research Problem",
            report.get(
                "researchProblem",
                "Not clearly mentioned in the paper."
            )
        )


        add_text_section(
            4,
            "Objectives",
            report.get(
                "objectives",
                []
            )
        )


        add_text_section(
            5,
            "Methodology",
            report.get(
                "methodology",
                "Not clearly mentioned in the paper."
            )
        )


        add_text_section(
            6,
            "Dataset",
            report.get(
                "dataset",
                "Not clearly mentioned in the paper."
            )
        )


        add_text_section(
            7,
            "Algorithms & Models",
            report.get(
                "algorithmsModels",
                []
            )
        )


        add_text_section(
            8,
            "Key Findings",
            report.get(
                "keyFindings",
                []
            )
        )


        add_text_section(
            9,
            "Results",
            report.get(
                "results",
                "Not clearly mentioned in the paper."
            )
        )


        add_text_section(
            10,
            "Limitations",
            report.get(
                "limitations",
                []
            )
        )


        add_text_section(
            11,
            "Research Gap",
            report.get(
                "researchGap",
                "Not clearly mentioned in the paper."
            )
        )


        add_text_section(
            12,
            "Future Scope",
            report.get(
                "futureScope",
                []
            )
        )


        add_text_section(
            13,
            "Key Concepts",
            report.get(
                "keyConcepts",
                []
            )
        )


        add_text_section(
            14,
            "Overall Evaluation",
            report.get(
                "overallEvaluation",
                ""
            )
        )


        # ----------------------------------------------------
        # FOOTER
        # ----------------------------------------------------

        story.append(
            Spacer(1, 12)
        )


        story.append(

            Paragraph(

                "Generated by PaperMind — Intelligent Research Paper Analyzer",

                small_style

            )

        )


        # ----------------------------------------------------
        # BUILD PDF
        # ----------------------------------------------------

        document.build(
            story
        )


        return send_file(

            pdf_path,

            as_attachment=True,

            download_name=pdf_filename,

            mimetype="application/pdf"

        )


    except Exception as error:

        print(
            "PDF generation error:",
            str(error)
        )

        traceback.print_exc()


        return jsonify({

            "success": False,

            "message":
                "Unable to generate PDF report.",

            "error":
                str(error)

        }), 500


# ============================================================
# FILE SIZE ERROR
# ============================================================

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({

        "success": False,

        "message":
            "PDF is too large. Maximum allowed size is 50 MB."

    }), 413


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 65)
    print("INTELLIGENT RESEARCH PAPER ANALYZER")
    print("=" * 65)
    print(
        "Website: http://localhost:5000"
    )
    print(
        "Health:  http://localhost:5000/api/health"
    )
    print("=" * 65)
    print()

    app.run(

        host="0.0.0.0",

        port=5000,

        debug=True

    )
