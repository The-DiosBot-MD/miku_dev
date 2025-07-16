@echo off
setlocal enabledelayedexpansion

:: ==============================================================================
::   Simulador de Flujo de Usuario para Script de Despliegue Node.js
::   VERSION SIMPLIFICADA: Se han eliminado las funciones internas (call :etiqueta)
::   para garantizar la maxima compatibilidad y evitar errores de sintaxis.
:: ==============================================================================

:: --- Inicio del Script ---
cls
echo.
echo ====================================================================
echo   Iniciando el Despliegue de la Aplicacion Node.js
echo ====================================================================
timeout /t 1 /nobreak > nul

:: --- 1. Verificacion de Permisos y Deteccion de OS ---
echo.
echo ====================================================================
echo   Paso 1: Verificacion del Sistema
echo ====================================================================
echo [SIM] Verificando que no se ejecute como root... OK.
timeout /t 1 /nobreak > nul
echo [SIM] Sistema basado en Debian/Ubuntu detectado. Usando 'apt-get'.
timeout /t 1 /nobreak > nul
echo.
echo Este script necesitara privilegios de superusuario para instalar paquetes y configurar servicios.
echo [SIM] Verificando privilegios de sudo...
timeout /t 1 /nobreak > nul
echo Privilegios de sudo verificados.
echo.

:: --- 2. Recopilacion de Informacion del Usuario ---
echo.
echo ====================================================================
echo   Paso 2: Configuracion del Proyecto
echo ====================================================================

set "APP_NAME="
set /p APP_NAME="Nombre de la aplicacion (para PM2, directorios, etc.) [mikudev-app]: "
if "%APP_NAME%"=="" set "APP_NAME=mikudev-app"

set "SYSTEM_USER="
set /p SYSTEM_USER="Usuario del sistema para ejecutar la aplicacion (se creara si no existe) [%APP_NAME%_user]: "
if "%SYSTEM_USER%"=="" set "SYSTEM_USER=%APP_NAME%_user"

set "NODE_PORT="
set /p NODE_PORT="Puerto en el que escuchara tu aplicacion Node.js [3001]: "
if "%NODE_PORT%"=="" set "NODE_PORT=3001"

set "SERVER_NAME="
set /p SERVER_NAME="Dominio(s) para Nginx, separados por espacio (ej. miku.com www.miku.com) [localhost]: "
if "%SERVER_NAME%"=="" set "SERVER_NAME=localhost"

set "DB_NAME="
set /p DB_NAME="Nombre de la base de datos [%APP_NAME%_db]: "
if "%DB_NAME%"=="" set "DB_NAME=%APP_NAME%_db"

set "DB_USER="
set /p DB_USER="Usuario de la base de datos [%APP_NAME%_db_user]: "
if "%DB_USER%"=="" set "DB_USER=%APP_NAME%_db_user"

:ask_db_password
echo.
set "DB_PASS="
set /p DB_PASS="Contrasena para el usuario de la base de datos: "
set "DB_PASS_CONFIRM="
set /p DB_PASS_CONFIRM="Confirma la contrasena: "
if not "%DB_PASS%"=="%DB_PASS_CONFIRM%" (
    echo Las contrasenas no coinciden. Intentalo de nuevo.
    goto :ask_db_password
)
echo.

set "ENV_CHOICE="
set /p ENV_CHOICE="Como quieres gestionar el archivo .env? (new, from_example, none) [none]: "
if "%ENV_CHOICE%"=="" set "ENV_CHOICE=none"

if /i "%ENV_CHOICE%"=="from_example" (
    set "ENV_EXAMPLE_PATH="
    set /p ENV_EXAMPLE_PATH="Ruta al archivo .env.example [./.env.example]: "
    if "%ENV_EXAMPLE_PATH%"=="" set "ENV_EXAMPLE_PATH=./.env.example"
)
echo.

:: --- 3. Instalacion de Dependencias ---
echo.
echo ====================================================================
echo   Paso 3: Instalando Dependencias del Sistema
echo ====================================================================
echo [SIM] Ejecutando: sudo apt-get update...
timeout /t 2 /nobreak > nul
echo [SIM] Ejecutando: sudo apt-get install -y nodejs npm mariadb-server nginx git curl...
timeout /t 3 /nobreak > nul
echo Dependencias basicas instaladas.
timeout /t 1 /nobreak > nul
echo.
echo Instalando NVM (Node Version Manager)...
timeout /t 2 /nobreak > nul
echo [SIM] Descargando e instalando NVM...
echo [SIM] Instalando version LTS de Node.js via NVM...
timeout /t 2 /nobreak > nul
echo NVM y Node.js LTS instalados.
timeout /t 1 /nobreak > nul
echo.
echo [SIM] Verificando si PM2 esta instalado...
echo Instalando PM2 globalmente...
timeout /t 2 /nobreak > nul
echo PM2 instalado globalmente.
echo.

:: --- 4. Configuracion del Entorno ---
echo.
echo ====================================================================
echo   Paso 4: Configurando el Entorno
echo ====================================================================
echo Creando usuario del sistema '%SYSTEM_USER%'...
timeout /t 1 /nobreak > nul
echo [SIM] Ejecutando: sudo useradd -r -m -s /bin/bash %SYSTEM_USER%
echo Usuario del sistema creado.
timeout /t 1 /nobreak > nul
echo.
echo El directorio de la aplicacion es: %cd%
echo [SIM] Asignando permisos con: sudo chown -R %SYSTEM_USER%:%SYSTEM_USER% %cd%
timeout /t 1 /nobreak > nul
echo Permisos de directorio asignados a '%SYSTEM_USER%'.
echo.
echo Configurando MariaDB...
echo [SIM] Habilitando y arrancando servicio MariaDB...
timeout /t 2 /nobreak > nul
echo.
echo A continuacion, se te pedira la contrasena de root de MariaDB.
echo (Esta es solo una simulacion, presiona una tecla para continuar)
pause > nul
echo [SIM] Ejecutando SQL: CREATE DATABASE IF NOT EXISTS `%DB_NAME%`; CREATE USER...
timeout /t 2 /nobreak > nul
echo Base de datos y usuario creados.
echo.

if /i "%ENV_CHOICE%"=="new" (
    echo Creando un nuevo archivo .env. Por favor, introduce los valores.
    echo [SIM] Creando archivo .env con: PORT, DB_HOST, DB_USER, DB_NAME, DB_PASSWORD...
    timeout /t 1 /nobreak > nul
    echo [SIM] Generando secreto para JWT...
    echo Puedes anadir mas variables manualmente al archivo .env.
)
if /i "%ENV_CHOICE%"=="from_example" (
    echo Copiando '%ENV_EXAMPLE_PATH%' a '.env'...
    timeout /t 1 /nobreak > nul
    echo ¡IMPORTANTE! El archivo .env ha sido creado desde el ejemplo. Debes editarlo manualmente.
)
if /i "%ENV_CHOICE%"=="none" (
    echo Saltando la creacion del archivo .env.
)

if not /i "%ENV_CHOICE%"=="none" (
    timeout /t 1 /nobreak > nul
    echo [SIM] Asegurando permisos del .env con: sudo chmod 600 .env
    echo Permisos del archivo .env asegurados.
)
echo.

echo Configurando Nginx como proxy inverso...
timeout /t 1 /nobreak > nul
echo [SIM] Creando archivo de configuracion en /etc/nginx/sites-available/%APP_NAME%...
timeout /t 2 /nobreak > nul
echo [SIM] Habilitando sitio y eliminando el sitio por defecto...
timeout /t 1 /nobreak > nul
echo [SIM] Verificando la sintaxis de Nginx (nginx -t)... OK.
echo [SIM] Reiniciando Nginx...
timeout /t 2 /nobreak > nul
echo Nginx configurado y reiniciado.
echo.

:: --- 5. Despliegue Final ---
echo.
echo ====================================================================
echo   Paso 5: Iniciando la Aplicacion con PM2
echo ====================================================================
echo Instalando dependencias de Node.js con npm...
echo [SIM] Ejecutando: npm install...
timeout /t 4 /nobreak > nul
echo Dependencias de Node.js instaladas.
echo.
echo Iniciando la aplicacion con PM2 bajo el usuario '%SYSTEM_USER%'...
timeout /t 1 /nobreak > nul
echo [SIM] Ejecutando: sudo -u %SYSTEM_USER% -H bash -c "cd %cd% && pm2 start src/server.js --name %APP_NAME%"
timeout /t 2 /nobreak > nul
echo.
echo ¡ACCION REQUERIDA! PM2 necesita que ejecutes el siguiente comando con sudo para configurar el inicio automatico:
echo sudo env PATH=$PATH:/home/user/.nvm/versions/node/vXX.X.X/bin /home/user/.nvm/versions/node/vXX.X.X/lib/node_modules/pm2/bin/pm2 startup systemd -u user --hp /home/user
echo.
timeout /t 1 /nobreak > nul
echo [SIM] Guardando lista de procesos de PM2...
echo Aplicacion iniciada con PM2.
echo.

:: --- Conclusion ---
echo.
echo ====================================================================
echo   ¡Despliegue Completado!
echo ====================================================================
echo Tu aplicacion '%APP_NAME%' esta ahora corriendo.
echo Puedes acceder a ella en: http://%SERVER_NAME% (o la IP de tu VM)
echo Gestiona la aplicacion con los siguientes comandos de PM2:
echo  - pm2 list
echo  - pm2 logs %APP_NAME%
echo  - pm2 restart %APP_NAME%
echo  - pm2 stop %APP_NAME%
echo Recuerda ejecutar el comando de 'pm2 startup' que se mostro arriba para asegurar que la app se reinicie con el sistema.
echo.
pause