# 🌿 SIGFITO — Sistema de Gestión Fitosanitaria

**SIGFITO** es una plataforma digital nacional para el control, trazabilidad y gestión fitosanitaria en la producción agrícola de Colombia, diseñada específicamente para ayudar a los productores y exportadores a cumplir de manera simplificada con las normativas del **Instituto Colombiano Agropecuario (ICA)**.

---

## 👥 Roles del Sistema

El sistema cuenta con un control de accesos basado en tres roles principales:

1. **Administrador**
   * Gestión y aprobación global de usuarios.
   * Catálogo maestro de cultivos y plagas fitosanitarias.
   * Monitoreo y control de todas las inspecciones realizadas.
   * Generación de reportes globales y formatos oficiales.

2. **Productor**
   * Registro y control de predios y lotes (ej. variedad Aguacate Hass, etc.).
   * Creación y envío de solicitudes de inspección fitosanitaria.
   * Historial de trazabilidad y estado de cumplimiento de sus lotes.

3. **Técnico**
   * Consulta de inspecciones asignadas.
   * Registro de hallazgos y control de plagas en campo (incluso con capacidades offline).
   * Carga de reportes técnicos de inspección.

---

## 🛠️ Arquitectura y Tecnologías

El proyecto está diseñado bajo una arquitectura de **microservicios** escalable y contenedorizada con Docker:

### Backend (Microservicios)
* **`auth-service`** (Puerto `3001`): Gestión de usuarios, autenticación y sesiones seguras mediante JWT.
* **`production-service`** (Puerto `3002` / `58761`): Gestión de predios, lotes, terrenos y cultivos.
* **`inspection-service`** (Puerto `3003`): Gestión de solicitudes de inspección, asignación a técnicos y registros fitosanitarios.
* **Base de Datos**: Instancias independientes de MySQL/MariaDB (alojadas en Railway).

### Frontend
* **Tecnologías**: React + Vite (Puerto `80` en producción, `5173` en desarrollo).
* **Enrutamiento**: React Router v7.
* **Estilos**: Vanilla CSS con diseño moderno, responsivo y adaptado para dispositivos móviles en campo.

---

## 🚀 Instrucciones de Despliegue

### 1. Requisitos Previos
* **Node.js** (v18 o superior)
* **Docker** y **Docker Compose**

### 2. Configuración de Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto basándote en el archivo de configuración global:
```env
JWT_SECRET=tu_secreto_jwt

# Variables de conexión para bases de datos en Railway
AUTH_DB_HOST=...
AUTH_DB_USER=...
AUTH_DB_PASSWORD=...
AUTH_DB_NAME=...
AUTH_DB_PORT=...

PROD_DB_HOST=...
...
```

### 3. Levantar con Docker Compose
Para iniciar toda la infraestructura (Frontend + Backend + Microservicios):
```bash
docker-compose up --build -d
```
Esto dejará corriendo:
* Frontend en: [http://localhost](http://localhost)
* Servicios backend en sus respectivos puertos mapeados.

### 4. Desarrollo Local (Solo Frontend)
Si prefieres correr únicamente el frontend en modo de desarrollo:
```bash
cd frontend
npm install
npm run dev
```
El servidor de desarrollo iniciará en [http://localhost:5173](http://localhost:5173).

---

## 👥 Creado Por:
* **Miguel Buitrago**
* **Johan Caro**
* **Luis Álvarez**
* **Julián Torres**

---
*Proyecto Universitario Integrador — Todos los derechos reservados.*
