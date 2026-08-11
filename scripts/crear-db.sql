-- Correr esto en el mismo server MariaDB donde vive la base de Caja Gospa (72.60.156.174),
-- con un cliente que tenga permisos de administrador (root o el usuario que uses en phpMyAdmin/Adminer/EasyPanel).
-- Reemplazá 'CAMBIAR_ESTA_PASSWORD' por una contraseña fuerte antes de correrlo.

CREATE DATABASE IF NOT EXISTS gospa_asistente
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'gospa_asistente'@'%' IDENTIFIED BY 'CAMBIAR_ESTA_PASSWORD';

GRANT ALL PRIVILEGES ON gospa_asistente.* TO 'gospa_asistente'@'%';

FLUSH PRIVILEGES;
