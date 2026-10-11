# ReportaYa - Plataforma Civicana Anonima

Plataforma web PWA para reportar problemas viales, aseo urbano y alumbrado publico en Maracaibo, Venezuela. Anonima, ligera y extensible a nivel nacional.

## Caracteristicas

### PWA Instalable
- Instalable directamente desde el navegador
- Funciona offline con Service Worker
- Manifest configurado para instalacion movil

### Captura con Camara
- Camara en vivo obligatoria para reportes
- Bloqueo de uploads desde galeria
- Geolocalizacion automatica

### Moderacion Automatica
- Filtro de contenido NSFW previo al guardado
- Estado de revisions condicional
- Control ciudadana con denuncias anonimas

### Dashboard Administrativo
- Heatmap interactivo
- Filtros por estado/categoria
- Metricas de gestion
- Purga con un solo clic

## Tecnologias

### Backend
- FastAPI - API RESTful
- SQLAlchemy - ORM
- SQLite (dev) / PostgreSQL + PostGIS (prod)
- JWT - Autenticacion

### Frontend
- React - Interfaz
- Vite - Build tool
- React Router - Navegacion
- Leaflet - Mapas interactivos
- Service Worker - PWA offline

## Instalacion

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
│   │   ├── ui/
│   │   ├── componentes/
│   │   ├── components/
│   │   └── services/
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   └── legal/
│   └── package.json
└── README.md
```

## API Endpoints

### Autenticacion
- POST /api/v1/auth/login - Iniciar sesion

### Incidentes
- POST /api/v1/incidents - Crear reporte
- GET /api/v1/incidents/geojson - Mapa de incidentes
- GET /api/v1/incidents/{id} - Detalles
- POST /api/v1/incidents/{id}/validate - Validar
- POST /api/v1/incidents/{id}/flag - Denunciar
- GET /api/v1/incidents/all - Admin

### Moderacion (Admin)
- GET /api/v1/moderation/pending - Pendientes
- POST /api/v1/moderation/approve/{id} - Aprobar
- POST /api/v1/moderation/reject/{id} - Rechazar
- POST /api/v1/moderation/purge/{id} - Eliminar + bloquear
- GET /api/v1/moderation/blocked - Dispositivos bloqueados
- GET /api/v1/moderation/stats - Estadisticas

## Politicas Legales

- Terminos y Condiciones
- Politica de Privacidad
- Politica de Cookies
- Descargo de Responsabilidad

## Licencia

MIT - Desarrollado para la Alcaldia de Maracaibo.
