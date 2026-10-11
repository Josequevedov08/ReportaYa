# Moderación automática de contenido para ReportaYa
"""
Módulo de filtrado automático de contenido explícito/NSFW/violencia en imágenes
procesadas por la cámara antes de guardarse en la base de datos espacial.
"""

import re
from typing import Optional, Tuple

# Patrones y palabras clave para detección de contenido inapropiado
NSFW_PATTERNS = [
    r"\b(pene|vagina|pene|coño|mierda|puta|cabrón)\b",
    r"\b(explicit|nsfw|porn|sex)\b",
]

VIOLENCE_PATTERNS = [
    r"\b(agresión|agresivo|violencia|arma|fuego|disparo)\b",
]

# Palabras clave urbanas permitidas (vías, alcantarillas, entornos urbanos)
ALLOWED_URBAN_KEYWORDS = [
    "calle", "avenida", "carrera", "plaza", "parque",
    "alcantarillado", "acueducto", "semaforo", "cruce",
    "carretera", "kilómetro", "sentido", "carril",
    "urbanización", "barrio", "manzana", "lote",
]


def analyze_image_content(image_data: bytes, description: str = "") -> Tuple[bool, str, Optional[str]]:
    """
    Analiza el contenido de una imagen y su descripción de texto.
    
    Returns:
        Tuple[bool, str, Optional[str]]: 
        - first element: True si la imagen es apropiada, False si debe ser rechazada
        - second element: Motivo del resultado (aprobado, nsfw, violencia, urbano_no_coincide)
        - third element: URL sugerida si la imagen fue aceptada (o None si fue rechazada)
    """
    # Analizar descripción de texto
    text_analysis = analyze_text(description)
    
    # Analizar imagen (en un caso real usaríamos una API de visión por computadora)
    # Por ahora, solo validamos el texto descriptivo
    
    if not text_analysis["is_appropriate"]:
        return False, text_analysis["reason"], None
    
    # Verificar que tenga algunas palabras clave urbanas si es un reporte de vía pública
    if not has_urban_keywords(description):
        return False, "urban_environment_required", None
    
    return True, "approved", None


def analyze_text(text: str) -> dict:
    """Analiza texto en busca de contenido inapropiado."""
    if not text:
        return {"is_appropriate": True, "reason": "empty"}
    
    text_lower = text.lower()
    
    # Verificar patrones NSFW
    for pattern in NSFW_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return {"is_appropriate": False, "reason": "nsfw_content"}
    
    # Verificar patrones de violencia
    for pattern in VIOLENCE_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return {"is_appropriate": False, "reason": "violence_content"}
    
    # Verificar palabras clave urbanas
    has_urban = any(keyword in text_lower for keyword in ALLOWED_URBAN_KEYWORDS)
    
    return {
        "is_appropriate": has_urban or len(text) < 200,  # Texto corto puede ser válido
        "reason": "urban_environment_required" if not has_urban and len(text) > 50 else "ok",
    }


def has_urban_keywords(description: str) -> bool:
    """Verifica si la descripción contiene palabras clave de entorno urbano."""
    if not description:
        return False
    
    text_lower = description.lower()
    return any(keyword in text_lower for keyword in ALLOWED_URBAN_KEYWORDS)