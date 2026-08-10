"""
Client HTTP vers le pdf-worker (service séparé port 8001).
FastAPI appelle ce service pour générer les rapports PDF.

CORRECTION SESSION 5 :
  Bug : json=payload échoue si le payload contient des objets datetime (venant de MongoDB).
  Fix : json.dumps(payload, default=str) convertit automatiquement les datetime en ISO string.
"""
import json
import httpx
from fastapi import HTTPException
from app.core.config import settings


async def generer_pdf(payload: dict) -> bytes:
    """
    Envoie les données de décision au pdf-worker et reçoit le PDF en bytes.

    Le payload peut contenir des objets datetime issus de MongoDB.
    On utilise json.dumps(default=str) pour les convertir en chaînes ISO
    avant l'envoi — httpx json= ne gère pas nativement les datetime.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.pdf_worker_url}/generate-pdf",
                # ── CORRECTION ────────────────────────────────────────────────
                # Ancien code : json=payload
                #   → échoue si payload contient des datetime (MongoDB timestamps)
                #   → erreur : "Object of type datetime is not JSON serializable"
                #
                # Nouveau code : sérialisation manuelle avec default=str
                #   → convertit datetime → "2026-06-05T04:37:25.404020+00:00"
                #   → convertit ObjectId → "64a1b2c3..." si présent
                # ─────────────────────────────────────────────────────────────
                content=json.dumps(payload, default=str),
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return response.content
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail="Service PDF indisponible (timeout)")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Erreur PDF Worker : {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"PDF Worker inaccessible : {str(e)}")