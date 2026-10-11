# ReportaYa - Plataforma Cívica Anónima

Plataforma web PWA para reportar problemas viales, aseo urbano y alumbrado público en Maracaibo, Venezuela. Anónima, ligera y extensible a nivel nacional.

## Características

### PWA Instalable
- Instalable directamente desde el navegador
- Funciona offline con Service Worker
- Manifest configurado para instalación móvil

### Captura con Cámara
- Cámara en vivo obligatoria para reportes
- Bloqueo de uploads desde galería
- Geolocalización automática

### Moderación Automática
- Filtro de contenido NSFW previo al guardado
- Estado de revisión condicional
- Contraloría ciudadana con denuncias anónimas

### Dashboard Administrativo
- Heatmap interactivo
- Filtros por estado/categoría
- Métricas de gestión
- Purga con un solo clic
- Subida de foto de reparación y cierre

## Tecnologías

### Backend
- FastAPI - API RESTful
- SQLAlchemy - ORM
- SQLite (dev) / PostgreSQL + PostGIS (prod)
- JWT - Autenticación

### Frontend
- React - Interfaz
- Vite - Build tool
- React Router - Navegación
- Leaflet - Mapas interactivos
- Service Worker - PWA offline

## Instalación

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn src.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Estructura del Proyecto

```
ReportaYa/
├── backend/
│   ├── src/
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── endpoints/
│   │   └── security/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   ├── ui/
│   │   ├── componentes/
│   │   ├── components/
│   │   └── services/
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   ├── icons/
│   │   └── legal/
│   └── package.json
└── README.md
```

## API Endpoints

### Autenticación
- POST /api/v1/auth/login - Iniciar sesión

### Incidentes
- POST /api/v1/incidents - Crear reporte
- GET /api/v1/incidents/geojson - Mapa de incidentes
- GET /api/v1/incidents/{id} - Detalles
- POST /api/v1/incidents/{id}/validate - Validar
- POST /api/v1/incidents/{id}/flag - Denunciar
- GET /api/v1/incidents/all - Admin

### Moderación (Admin)
- GET /api/v1/moderation/pending - Pendientes
- POST /api/v1/moderation/approve/{id} - Aprobar
- POST /api/v1/moderation/reject/{id} - Rechazar
- POST /api/v1/moderation/purge/{id} - Eliminar + bloquear
- GET /api/v1/moderation/blocked - Dispositivos bloqueados
- GET /api/v1/moderation/stats - Estadísticas

## Panel Administrativo

El panel administrativo está oculto en la ruta secreta `/MunicipioMcbo` (no se muestra en el menú principal).

## Políticas Legales

- Términos y Condiciones
- Política de Privacidad
- Política de Cookies
- Descargo de Responsabilidad

## Licencia

MIT - Desarrollado para la Alcaldía de Maracaibo.