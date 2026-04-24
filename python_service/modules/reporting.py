from __future__ import annotations

import csv
from datetime import datetime, timezone
from io import BytesIO, StringIO

import cv2
import numpy as np
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image as RLImage
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def metric_rows(metrics: dict) -> list[dict[str, str]]:
    mse = float(metrics.get("mse", 0.0))
    psnr = float(metrics.get("psnr", 0.0))
    ssim = float(metrics.get("ssim", 0.0))

    return [
        {
            "metric": "MSE",
            "value": f"{mse:.6f}",
            "purpose": "Pixel-level error (lower is better, ideal: 0).",
        },
        {
            "metric": "PSNR",
            "value": f"{psnr:.4f} dB",
            "purpose": "Signal quality (higher is better, generally > 30 dB).",
        },
        {
            "metric": "SSIM",
            "value": f"{ssim:.6f}",
            "purpose": "Perceptual similarity (closer to 1 is better, generally >= 0.80).",
        },
    ]


def generate_csv_report(metrics: dict, operation: str = "unknown") -> str:
    rows = metric_rows(metrics)
    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["Operation", operation])
    writer.writerow(["Generated At", datetime.now(timezone.utc).isoformat()])
    writer.writerow([])
    writer.writerow(["Metric", "Value", "Purpose/Acceptable Range"])
    for row in rows:
        writer.writerow([row["metric"], row["value"], row["purpose"]])

    return output.getvalue()


def _encode_png_for_report(image_np: np.ndarray) -> BytesIO:
    ok, encoded = cv2.imencode(".png", image_np)
    if not ok:
        raise ValueError("Failed to encode image for report generation.")
    return BytesIO(encoded.tobytes())


def generate_pdf_report(
    original_image: np.ndarray,
    transformed_image: np.ndarray,
    metrics: dict,
    operation: str = "unknown",
) -> bytes:
    if original_image is None or transformed_image is None:
        raise ValueError("Original and transformed images are required for PDF report.")

    rows = metric_rows(metrics)
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title="Facial Image Warping - Quantitative Evaluation Report",
    )

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    meta_style = ParagraphStyle(
        "meta",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#334155"),
        leading=14,
    )

    story = []
    story.append(Paragraph("Facial Image Warping - Quantitative Evaluation Report", title_style))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(f"Operation: <b>{operation}</b>", meta_style))
    story.append(Paragraph(f"Generated (UTC): <b>{datetime.now(timezone.utc).isoformat()}</b>", meta_style))
    story.append(Spacer(1, 0.4 * cm))

    original_img = RLImage(_encode_png_for_report(original_image), width=7.5 * cm, height=7.5 * cm)
    transformed_img = RLImage(_encode_png_for_report(transformed_image), width=7.5 * cm, height=7.5 * cm)

    image_table = Table(
        [[Paragraph("Original", styles["Heading4"]), Paragraph("Transformed", styles["Heading4"])], [original_img, transformed_img]],
        colWidths=[8.2 * cm, 8.2 * cm],
        hAlign="LEFT",
    )
    image_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ]
        )
    )
    story.append(image_table)
    story.append(Spacer(1, 0.5 * cm))

    metric_table_data = [["Metric", "Value", "Purpose / Acceptable Range"]]
    metric_table_data.extend([[row["metric"], row["value"], row["purpose"]] for row in rows])

    metric_table = Table(metric_table_data, colWidths=[3.0 * cm, 3.3 * cm, 9.6 * cm], hAlign="LEFT")
    metric_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(metric_table)

    doc.build(story)
    return buffer.getvalue()
