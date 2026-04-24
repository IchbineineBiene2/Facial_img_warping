from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO, StringIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


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

    rows = [
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
    return rows


def generate_csv_bytes(payload: ReportPayload) -> bytes:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["metric", "value"])
    for row in _payload_rows(payload):
        writer.writerow(row)
    return buffer.getvalue().encode("utf-8")


def generate_pdf_bytes(payload: ReportPayload) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    def _make_image_box(image_bytes: bytes | None, label: str) -> list:
        if not image_bytes:
            return [Paragraph(label, styles["Italic"]), Spacer(1, 6)]

        image = RLImage(BytesIO(image_bytes))
        max_width = 230
        max_height = 240
        scale = min(max_width / float(image.drawWidth), max_height / float(image.drawHeight), 1.0)
        image.drawWidth = image.drawWidth * scale
        image.drawHeight = image.drawHeight * scale
        return [Paragraph(f"<b>{label}</b>", styles["BodyText"]), Spacer(1, 6), image]

    image_table = Table(
        [
            [
                _make_image_box(payload.original_image_bytes, "Original"),
                _make_image_box(payload.result_image_bytes, "Transformed"),
            ]
        ],
        colWidths=[250, 250],
    )
    image_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    metric_rows = [
        ["Metric", "Value", "Purpose / Acceptable Range"],
        ["MSE", f"{payload.metrics.get('mse', '')}", "Pixel-level error (lower is better, ideal: 0)."],
        ["PSNR", f"{payload.metrics.get('psnr', '')} dB", "Signal quality (higher is better, generally > 30 dB)."],
        ["SSIM", f"{payload.metrics.get('ssim', '')}", "Perceptual similarity (closer to 1 is better, generally >= 0.80)."],
    ]

    metric_table = Table(metric_rows, colWidths=[80, 110, 330])
    metric_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("PADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    story = [
        Paragraph(payload.title, styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"Operation: {payload.operation}", styles["Normal"]),
        Paragraph(f"Generated (UTC): {payload.created_at}", styles["Normal"]),
        Spacer(1, 12),
        image_table,
        Spacer(1, 14),
        metric_table,
    ]
    doc.build(story)
    return buffer.getvalue()
