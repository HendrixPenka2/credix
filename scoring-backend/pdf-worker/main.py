"""
PDF Worker -- service WeasyPrint
Reçoit les donnees de decision et genere un PDF via HTML + SVG inline.
"""
from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel
from datetime import datetime
from weasyprint import HTML
import json

app = FastAPI(title="PDF Worker", docs_url=None)


class PDFRequest(BaseModel):
    demande_id: str
    decision: dict
    client: dict
    agent_id: str
    generated_at: str


def decision_color(decision: str) -> str:
    return {"ACCORDE": "#16a34a", "REFUSE": "#dc2626", "REVUE_MANUELLE": "#d97706"}.get(decision, "#64748b")


def decision_label(decision: str) -> str:
    return {"ACCORDE": "ACCORDÉ", "REFUSE": "REFUSÉ", "REVUE_MANUELLE": "REVUE MANUELLE"}.get(decision, decision)


def score_gauge_svg(score: int) -> str:
    pct = max(0, min(1, (score - 300) / 550))
    x = 20 + pct * 260
    color = "#16a34a" if score >= 600 else ("#dc2626" if score < 500 else "#d97706")
    return f"""<svg viewBox="0 0 300 60" width="300" height="60">
  <rect x="20" y="20" width="260" height="16" rx="8" fill="#e5e7eb"/>
  <rect x="20" y="20" width="{pct*260:.0f}" height="16" rx="8" fill="{color}"/>
  <circle cx="{x:.0f}" cy="28" r="10" fill="{color}" stroke="white" stroke-width="2"/>
  <text x="20" y="54" font-size="10" fill="#6b7280">300</text>
  <text x="145" y="54" text-anchor="middle" font-size="10" fill="#6b7280">Score PDO</text>
  <text x="280" y="54" text-anchor="end" font-size="10" fill="#6b7280">850</text>
</svg>"""


def rho_circle_svg(rho: float) -> str:
    pct = max(0, min(1, rho))
    color = "#16a34a" if rho >= 0.70 else ("#d97706" if rho >= 0.40 else "#dc2626")
    angle = pct * 360
    large = 1 if angle > 180 else 0
    r = 40
    cx, cy = 50, 50
    rad = 3.14159 * angle / 180
    import math
    ex = cx + r * math.sin(math.radians(angle))
    ey = cy - r * math.cos(math.radians(angle))
    arc = f"M {cx} {cy-r} A {r} {r} 0 {large} 1 {ex:.2f} {ey:.2f}"
    return f"""<svg viewBox="0 0 100 100" width="100" height="100">
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#e5e7eb" stroke-width="10"/>
  <path d="{arc}" fill="none" stroke="{color}" stroke-width="10" stroke-linecap="round"/>
  <text x="{cx}" y="{cy+5}" text-anchor="middle" font-size="18" font-weight="bold" fill="{color}">{int(rho*100)}%</text>
  <text x="{cx}" y="{cy+20}" text-anchor="middle" font-size="9" fill="#6b7280">ρc</text>
</svg>"""


def build_html(data: PDFRequest) -> str:
    d = data.decision
    c = data.client
    profile = c.get("profile", {})
    score = d.get("score_pdo", 0)
    pd_c = d.get("pd_c", 0)
    rho_c = d.get("rho_c", 0)
    decision = d.get("decision_finale", {}).get("valeur", "INCONNU")
    shap_top = d.get("shap_top5", [])
    reco = d.get("recommandation_rho", {})
    percentile = d.get("percentile", {})

    shap_rows = ""
    for item in shap_top:
        direction = item.get("direction", "")
        color = "#dc2626" if direction == "aggravant" else "#16a34a"
        badge = "↑ Aggravant" if direction == "aggravant" else "↓ Atténuant"
        phrase = item.get("explication_naturelle", "")
        libelle = item.get("libelle_agent", item.get("feature", ""))
        val = item.get("shap_value", 0)
        bar_w = min(120, int(abs(val) * 200))
        shap_rows += f"""
        <tr>
          <td style="padding:8px;font-size:12px;color:#1e293b">{libelle}</td>
          <td style="padding:8px;text-align:center">
            <span style="background:{color};color:white;padding:2px 8px;border-radius:12px;font-size:11px">{badge}</span>
          </td>
          <td style="padding:8px">
            <div style="background:#e5e7eb;border-radius:4px;height:12px;width:150px">
              <div style="background:{color};border-radius:4px;height:12px;width:{bar_w}px"></div>
            </div>
          </td>
          <td style="padding:8px;font-size:11px;color:#64748b;max-width:250px">{phrase}</td>
        </tr>"""

    docs_html = ""
    if reco.get("afficher"):
        docs_list = "".join([f"<li style='margin:4px 0;font-size:12px'><strong>{d['libelle']}</strong> — {d['document']} <span style='color:#64748b;font-size:11px'>({d.get('gain_rho_estime','')})</span></li>"
                             for d in reco.get("documents_recommandes", [])[:5]])
        docs_html = f"""
        <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0">
          <p style="font-weight:bold;color:#92400e;margin:0 0 8px">{reco.get('niveau_urgence','')} — {reco.get('message','')}</p>
          <p style="font-size:12px;color:#78350f;margin:0 0 8px">Documents recommandés pour enrichir le dossier :</p>
          <ul style="margin:0;padding-left:20px">{docs_list}</ul>
          <p style="font-size:11px;color:#92400e;margin:8px 0 0">ρc potentiel si documents fournis : {reco.get('rho_potentiel_max','')}</p>
        </div>"""

    percentile_html = ""
    if percentile.get("percentile") is not None:
        percentile_html = f"""
        <div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:8px;padding:12px;margin-top:12px">
          <p style="font-size:12px;color:#0369a1;margin:0"><strong>Comparaison au profil moyen :</strong> {percentile.get('message','')}</p>
        </div>"""

    nom_client = f"{profile.get('prenom', '')} {profile.get('nom', '')}".strip() or data.client.get("client_id", "N/A")

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  body {{font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 13px;}}
  .header {{background: #1e293b; color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center;}}
  .header h1 {{margin: 0; font-size: 18px; font-weight: 600;}}
  .header .meta {{font-size: 11px; color: #94a3b8; text-align: right;}}
  .content {{padding: 24px 32px;}}
  .section {{margin-bottom: 24px;}}
  .section-title {{font-size: 14px; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;}}
  .decision-badge {{display: inline-block; padding: 10px 24px; border-radius: 8px; font-size: 20px; font-weight: 700; color: white; background: {decision_color(decision)};}}
  .grid-2 {{display: grid; grid-template-columns: 1fr 1fr; gap: 16px;}}
  .card {{background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;}}
  .card-label {{font-size: 11px; color: #64748b; margin-bottom: 4px;}}
  .card-value {{font-size: 16px; font-weight: 600; color: #1e293b;}}
  table {{width: 100%; border-collapse: collapse; font-size: 12px;}}
  th {{background: #f1f5f9; padding: 8px; text-align: left; font-weight: 600; font-size: 11px; color: #64748b;}}
  tr:nth-child(even) {{background: #f8fafc;}}
  .footer {{background: #f1f5f9; padding: 16px 32px; margin-top: 32px; font-size: 10px; color: #64748b;}}
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>Rapport de Scoring de Risque de Crédit</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1">Application IA de Prédiction du Comportement de Solvabilité</p>
  </div>
  <div class="meta">
    <p>Dossier : {data.demande_id[:8].upper()}</p>
    <p>Généré le : {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
    <p>Agent : {data.agent_id[:16]}</p>
  </div>
</div>

<div class="content">

  <!-- DÉCISION PRINCIPALE -->
  <div class="section">
    <div class="section-title">Décision</div>
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <div class="decision-badge">{decision_label(decision)}</div>
      <div>
        <p style="margin:0;font-size:12px;color:#64748b">Client</p>
        <p style="margin:0;font-size:16px;font-weight:600">{nom_client}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b">ID : {data.client.get('client_id', 'N/A')}</p>
      </div>
    </div>
  </div>

  <!-- INDICATEURS CLÉS -->
  <div class="section">
    <div class="section-title">Indicateurs clés</div>
    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
      <div>
        <p style="margin:0 0 4px;font-size:11px;color:#64748b">Score PDO</p>
        <p style="margin:0 0 8px;font-size:32px;font-weight:700;color:{decision_color(decision)}">{score}</p>
        {score_gauge_svg(score)}
        <p style="margin:8px 0 0;font-size:11px;color:#64748b">Probabilité de défaut : <strong>{pd_c:.1%}</strong></p>
      </div>
      <div style="margin-left:32px">
        <p style="margin:0 0 4px;font-size:11px;color:#64748b">Indice de couverture ρc</p>
        {rho_circle_svg(rho_c)}
        <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-align:center">Richesse du dossier</p>
      </div>
    </div>
    {percentile_html}
  </div>

  <!-- RECOMMANDATION DOCUMENTAIRE -->
  {docs_html}

  <!-- PROFIL CLIENT -->
  <div class="section">
    <div class="section-title">Profil client</div>
    <div class="grid-2">
      <div class="card"><div class="card-label">Situation familiale</div><div class="card-value">{profile.get('situation_familiale','N/A')}</div></div>
      <div class="card"><div class="card-label">Type d'emploi</div><div class="card-value">{profile.get('type_emploi','N/A')}</div></div>
      <div class="card"><div class="card-label">Type de revenu</div><div class="card-value">{profile.get('type_revenu','N/A')}</div></div>
      <div class="card"><div class="card-label">Niveau d'éducation</div><div class="card-value">{profile.get('niveau_education','N/A')}</div></div>
    </div>
  </div>

  <!-- EXPLICATIONS SHAP -->
  <div class="section">
    <div class="section-title">Facteurs explicatifs (Top {len(shap_top)})</div>
    <table>
      <thead><tr><th>Variable</th><th>Direction</th><th>Importance</th><th>Explication</th></tr></thead>
      <tbody>{shap_rows}</tbody>
    </table>
  </div>

</div>

<div class="footer">
  <p style="margin:0">Demande ID : {data.demande_id} | Modèle : {d.get('model_version','N/A')} | Généré le : {data.generated_at}</p>
  <p style="margin:4px 0 0">Ce rapport est généré automatiquement. La décision finale reste sous la responsabilité de l'agent de crédit. Le système assiste la décision sans s'y substituer.</p>
</div>

</body>
</html>"""


@app.post("/generate-pdf")
async def generate_pdf(body: PDFRequest):
    html_content = build_html(body)
    pdf_bytes = HTML(string=html_content).write_pdf()
    return Response(content=pdf_bytes, media_type="application/pdf")


@app.get("/health")
async def health():
    return {"status": "ok"}
