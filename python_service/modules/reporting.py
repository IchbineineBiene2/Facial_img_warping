from __future__ import annotations

import csv
from dataclasses import dataclass
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


@dataclass
class ReportPayload:
    title: str
    operation: str
    intensity: float | None
    age_before: str | None
    age_after: str | None
    metrics: dict
    created_at: str
    original_image_bytes: bytes | None = None
    result_image_bytes: bytes | None = None


def build_report_payload(
    *,
    operation: str,
    intensity: float | None,
    age_before: str | None,
    age_after: str | None,
    metrics: dict,
    original_image_bytes: bytes | None = None,
    result_image_bytes: bytes | None = None,
) -> ReportPayload:
    return ReportPayload(
        title="Facial Image Warping Quantitative Report",
        operation=operation,
        intensity=intensity,
        age_before=age_before,
        age_after=age_after,
        metrics=metrics,
        created_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        original_image_bytes=original_image_bytes,
        result_image_bytes=result_image_bytes,
    )


def _payload_rows(payload: ReportPayload) -> list[list[str]]:
    age_before = payload.age_before or ""
    age_after = payload.age_after or ""
    age_delta = ""
    try:
        if age_before != "" and age_after != "":
            age_delta = str(float(age_after) - float(age_before))
    except Exception:
        age_delta = ""

    return [
        ["title", payload.title],
        ["created_at", payload.created_at],
        ["operation", payload.operation],
        ["intensity", "" if payload.intensity is None else f"{payload.intensity:.2f}"],
        ["age_before", age_before],
        ["age_after", age_after],
        ["age_delta", age_delta],
        ["mse", f"{payload.metrics.get('mse', '')}"],
        ["psnr", f"{payload.metrics.get('psnr', '')}"],
        ["ssim", f"{payload.metrics.get('ssim', '')}"],
    ]


def generate_csv_bytes(payload: ReportPayload) -> bytes:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["metric", "value"])
    for row in _payload_rows(payload):
        writer.writerow(row)
    return buffer.getvalue().encode("utf-8")


def metric_rows(metrics: dict) -> list[dict[str, str]]:
    mse = float(metrics.get("mse", 0.0))
    psnr = float(metrics.get("psnr", 0.0))
    ssim = float(metrics.get("ssim", 0.0))

    return [
        {"metric": "MSE", "value": f"{mse:.6f}", "purpose": "Pixel-level error (lower is better, ideal: 0)."},
        {"metric": "PSNR", "value": f"{psnr:.4f} dB", "purpose": "Signal quality (higher is better, generally > 30 dB)."},
        {"metric": "SSIM", "value": f"{ssim:.6f}", "purpose": "Perceptual similarity (closer to 1 is better, generally >= 0.80)."},
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


def _image_box(image_bytes: bytes | None, label: str, styles) -> list:
    if not image_bytes:
        return [Paragraph(f"<b>{label}</b>", styles["BodyText"]), Spacer(1, 6), Paragraph("Image unavailable", styles["Italic"])]

    image = RLImage(BytesIO(image_bytes))
    max_width = 230
    max_height = 240
    scale = min(max_width / float(image.drawWidth), max_height / float(image.drawHeight), 1.0)
    image.drawWidth = image.drawWidth * scale
    image.drawHeight = image.drawHeight * scale
    return [Paragraph(f"<b>{label}</b>", styles["BodyText"]), Spacer(1, 6), image]


def _render_pdf(original_image_bytes: bytes | None, result_image_bytes: bytes | None, metrics: dict, operation: str, created_at: str) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=1.6 * cm, rightMargin=1.6 * cm, topMargin=1.6 * cm, bottomMargin=1.6 * cm)
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    meta_style = ParagraphStyle("meta", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#334155"), leading=14)

    story = [
        Paragraph("Facial Image Warping - Quantitative Evaluation Report", title_style),
        Spacer(1, 0.2 * cm),
        Paragraph(f"Operation: <b>{operation}</b>", meta_style),
        Paragraph(f"Generated (UTC): <b>{created_at}</b>", meta_style),
        Spacer(1, 0.4 * cm),
    ]

    image_table = Table(
        [[_image_box(original_image_bytes, "Original", styles), _image_box(result_image_bytes, "Transformed", styles)]],
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
    metric_table_data.extend([[row["metric"], row["value"], row["purpose"]] for row in metric_rows(metrics)])

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


def generate_pdf_bytes(payload: ReportPayload) -> bytes:
    return _render_pdf(
        payload.original_image_bytes,
        payload.result_image_bytes,
        payload.metrics,
        payload.operation,
        payload.created_at,
    )


def generate_pdf_report(
    original_image: np.ndarray,
    transformed_image: np.ndarray,
    metrics: dict,
    operation: str = "unknown",
) -> bytes:
    return _render_pdf(
        _encode_png_for_report(original_image).getvalue(),
        _encode_png_for_report(transformed_image).getvalue(),
        metrics,
        operation,
        datetime.now(timezone.utc).isoformat(),
    )
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

>>>>>>> main
    doc.build(story)
    return buffer.getvalue()
