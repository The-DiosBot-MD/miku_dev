#!/bin/bash

# ==============================================================================
#   MikuDev Application Deployment Script
#   Author: Rety (con ayuda de IA)
#   Version: 1.8.1 (Production Ready - Minor Fixes and Consistency)
#
#   This script automates the setup of the MikuDev Node.js application
#   on a Linux server (Debian-based or Alpine). It's designed to be
#   idempotent, verifying existing configurations before making changes.
#
#   CHANGELOG v1.8.1:
#   - Ensured `openssl` package is installed for JWT secret generation.
#   - Corrected slight duplication in `CORS_ALLOWED_ORIGINS` for new .env generation.
#   - Updated Nginx `index` directive to include `app.html` for SPA roots.
#   - Updated script version and default app name for consistency.
#   - Confirmed all previous enhancements (printf, .env generation, idempotency,
#     interactive PM2 startup, src/server.js entry point).
# ==============================================================================

# --- Helper Functions for Colored Output (Using printf for safety) ---
c_red() { printf "\033[0;31m%s\033[0m\n" "$1"; }
c_green() { printf "\033[0;32m%s\033[0m\n" "$1"; }
c_yellow() { printf "\033[0;33m%s\033[0m\n" "$1"; }
c_blue() { printf "\033[0;34m%s\033[0m\n" "$1"; }

print_info() { c_blue "=> $1"; }
print_success() { c_green "✓ $1"; }
print_warning() { c_yellow "⚠️ $1"; }

# --- Helper Functions for Script Logic ---
print_header() {
    echo ""
    c_blue "===================================================================="
    c_blue "  $1"
    c_blue "===================================================================="
}

check_critical() {
    # Runs a command and exits if it fails.
    "$@"
    local status=$?
    if [ $status -ne 0 ]; then
        c_red "¡ERROR CRÍTICO! El comando '$*' falló con el código de estado $status."
        c_red "Saliendo del script. Por favor, revisa el error anterior."
        exit 1
    fi
}

command_exists() {
    command -v "$1" &> /dev/null
}

# --- Script Start ---
clear
print_header "Iniciando el Despliegue de la Aplicación MikuDev (v1.8.1)"

# --- 1. Verificación de Permisos y Detección de OS ---
print_header "Paso 1: Verificación del Sistema"

if [ "$EUID" -eq 0 ]; then
    c_red "¡ERROR CRÍTICO! No ejecutes este script como root. Ejecútalo como un usuario con privilegios sudo."
    exit 1
fi

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    c_red "No se pudo detectar el sistema operativo. Este script soporta sistemas basados en Debian (Ubuntu) y Alpine."
    exit 1
fi

if [[ "$OS" == "alpine" ]]; then
    PKG_MANAGER="apk"
    print_info "Sistema Alpine detectado."
elif [[ "$ID_LIKE" == "debian" || "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    PKG_MANAGER="apt-get"
    print_info "Sistema basado en Debian/Ubuntu detectado."
else
    c_red "Sistema operativo no soportado: $OS. Este script está diseñado para Debian, Ubuntu o Alpine."
    exit 1
fi

c_yellow "Este script necesitará privilegios de superusuario para continuar."
check_critical sudo -v
print_success "Privilegios de sudo verificados."

# --- 2. Recopilación de Información del Usuario ---
print_header "Paso 2: Configuración del Proyecto"

read -p "Nombre de la aplicación (para PM2, directorios, etc.) [mikudev-app]: " APP_NAME
APP_NAME=${APP_NAME:-mikudev-app}

read -p "Usuario del sistema para ejecutar la aplicación [${APP_NAME}_user]: " SYSTEM_USER
SYSTEM_USER=${SYSTEM_USER:-${APP_NAME}_user}

read -p "Puerto en el que escuchará tu aplicación Node.js [3001]: " NODE_PORT
NODE_PORT=${NODE_PORT:-3001}

# --- Lógica mejorada para DOMINIO(S) y APP_URL ---
read -p "Dominio principal para Nginx (ej. mikudev.com). Escribe 'localhost' si es solo para uso local: [localhost]: " PRIMARY_SERVER_NAME
PRIMARY_SERVER_NAME=${PRIMARY_SERVER_NAME:-localhost}

ADDITIONAL_SERVER_NAMES=""
if [[ "$PRIMARY_SERVER_NAME" != "localhost" ]]; then
    read -p "Dominio(s) adicionales para Nginx, separados por espacio (ej. www.mikudev.com) [dejar en blanco si no hay]: " ADDITIONAL_SERVER_NAMES
fi
SERVER_NAME="$PRIMARY_SERVER_NAME $ADDITIONAL_SERVER_NAMES"

# Derivar APP_URL para el archivo .env
if [[ "$PRIMARY_SERVER_NAME" == "localhost" ]]; then
    APP_URL="http://localhost:$NODE_PORT"
else
    APP_URL="http://$PRIMARY_SERVER_NAME"
fi
print_info "La URL base de la aplicación (APP_URL) para el archivo .env será: $APP_URL"
# --- Fin lógica mejorada ---

read -p "Nombre de la base de datos [${APP_NAME}_db]: " DB_NAME
DB_NAME=${DB_NAME:-${APP_NAME}_db}

read -p "Usuario de la base de datos [${APP_NAME}_db_user]: " DB_USER
DB_USER=${DB_USER:-${APP_NAME}_db_user}

while true; do
    read -s -p "Contraseña para el usuario de la base de datos: " DB_PASS
    echo
    read -s -p "Confirma la contraseña: " DB_PASS_CONFIRM
    echo

    if [ -z "$DB_PASS" ]; then
        c_red "La contraseña no puede estar vacía."
    elif [ "$DB_PASS" != "$DB_PASS_CONFIRM" ]; then
        c_red "Las contraseñas no coinciden. Inténtalo de nuevo."
    else
        break
    fi
done

read -p "¿Cómo quieres gestionar el archivo .env? (new, from_example, none) [none]: " ENV_CHOICE
ENV_CHOICE=${ENV_CHOICE:-none}

if [[ "$ENV_CHOICE" == "from_example" ]]; then
    read -p "Ruta al archivo .env.example [./.env.example]: " ENV_EXAMPLE_PATH
    ENV_EXAMPLE_PATH=${ENV_EXAMPLE_PATH:-./.env.example}
fi

# --- 3. Instalación de Dependencias ---
print_header "Paso 3: Instalando Dependencias del Sistema"

print_info "Asegurando que las dependencias del sistema (nginx, mariadb, openssl, etc.) estén instaladas..."
if [[ "$PKG_MANAGER" == "apk" ]]; then
    check_critical sudo apk add --no-cache nodejs-lts npm mariadb mariadb-client nginx git curl sudo openssl
else # Debian/Ubuntu
    check_critical sudo apt-get update
    check_critical sudo apt-get install -y nodejs npm mariadb-server nginx git curl openssl
fi
print_success "Dependencias básicas del sistema verificadas."

if ! command_exists nvm; then
    print_info "Instalando NVM (Node Version Manager) v0.40.3..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    check_critical nvm install --lts
    print_success "NVM y Node.js LTS instalados."
else
    print_info "NVM ya está instalado. Saltando instalación."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

if ! command_exists pm2; then
    print_info "Instalando PM2 globalmente..."
    check_critical sudo npm install -g pm2
    print_success "PM2 instalado globalmente."
else
    print_info "PM2 ya está instalado. Saltando instalación."
fi

# --- 4. Configuración del Entorno ---
print_header "Paso 4: Configurando el Entorno"

if ! id "$SYSTEM_USER" &>/dev/null; then
    print_info "Creando usuario del sistema '$SYSTEM_USER'..."
    if [[ "$PKG_MANAGER" == "apk" ]]; then
        check_critical sudo adduser -S -G wheel "$SYSTEM_USER"
    else
        check_critical sudo useradd -r -m -s /bin/bash "$SYSTEM_USER"
    fi
    print_success "Usuario del sistema creado."
else
    print_info "El usuario del sistema '$SYSTEM_USER' ya existe."
fi

APP_PATH=$(pwd)
print_info "Asignando permisos del directorio de la aplicación '$APP_PATH' al usuario '$SYSTEM_USER'..."
check_critical sudo chown -R "$SYSTEM_USER":"$SYSTEM_USER" "$APP_PATH"
print_success "Permisos de directorio asignados."

print_info "Verificando y configurando el servicio MariaDB..."
if [[ "$PKG_MANAGER" == "apk" ]]; then
    if ! /etc/init.d/mariadb status &>/dev/null; then
        print_info "Iniciando servicio MariaDB en Alpine..."
        check_critical sudo /etc/init.d/mariadb setup
        check_critical sudo rc-service mariadb start
        check_critical sudo rc-update add mariadb default
    else
        print_info "El servicio MariaDB ya está en ejecución."
    fi
else # Debian/Ubuntu
    if ! sudo systemctl is-active --quiet mariadb; then
        print_info "Habilitando e iniciando el servicio MariaDB..."
        check_critical sudo systemctl enable mariadb
        check_critical sudo systemctl start mariadb
    else
        print_info "El servicio MariaDB ya está en ejecución."
    fi
fi

print_info "Configurando base de datos y usuario para la aplicación..."
print_warning "A continuación, se te podría pedir la contraseña de root de MariaDB (si la tiene configurada)."
SQL_COMMANDS="CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`; CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS'; GRANT SELECT, INSERT, UPDATE, DELETE ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;"
if ! sudo mariadb -u root -p -e "$SQL_COMMANDS"; then
    c_red "Falló el intento de configuración de DB. Intentando sin contraseña (instalación por defecto)..."
    if ! sudo mariadb -u root -e "$SQL_COMMANDS"; then
       c_red "¡ERROR CRÍTICO! Falló la configuración de la base de datos."
       exit 1
    fi
fi
print_success "Base de datos y usuario creados/verificados correctamente."

# --- Create/Manage .env file ---
case "$ENV_CHOICE" in
    new)
        print_info "Creando un nuevo archivo .env en el directorio actual con tus configuraciones."
        > .env # Clear existing .env or create new one

        # Server
        echo "# Server" >> .env
        echo "PORT=$NODE_PORT" >> .env
        echo "APP_URL=$APP_URL" >> .env
        echo "CORS_ALLOWED_ORIGINS=$APP_URL,http://localhost:5500,127.0.0.1:$NODE_PORT" >> .env # Adjusted CORS, removed duplicate
        echo "# ATENCION: Revisa y ajusta CORS_ALLOWED_ORIGINS segun tus necesidades de frontend (ej. multiples dominios, IPs)." >> .env
        echo "" >> .env

        # Database
        echo "# Database" >> .env
        echo "DB_HOST=localhost" >> .env
        echo "DB_USER=$DB_USER" >> .env
        echo "DB_PASSWORD=$DB_PASS" >> .env
        echo "DB_NAME=$DB_NAME" >> .env
        echo "DB_DIALECT=mariadb" >> .env
        echo "" >> .env

        # JWT
        echo "# JWT" >> .env
        JWT_SECRET=$(openssl rand -base64 64) # Generate 64 bytes for ~88 chars base64 for stronger secret
        echo "JWT_SECRET=$JWT_SECRET" >> .env
        print_info "Se ha generado un secreto JWT aleatorio (aprox. 88 caracteres)."
        echo "" >> .env

        # Google Auth
        echo "# Google Auth" >> .env
        read -p "Ingresa tu GOOGLE_CLIENT_ID (obligatorio si usas Google Auth, deja en blanco si no): " GOOGLE_CLIENT_ID
        read -p "Ingresa tu GOOGLE_CLIENT_SECRET (obligatorio si usas Google Auth, deja en blanco si no): " GOOGLE_CLIENT_SECRET
        echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> .env
        echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" >> .env
        echo "GOOGLE_CALLBACK_URL=$APP_URL/api/auth/google/callback" >> .env
        echo "" >> .env

        # Cloudflare
        echo "# Cloudflare" >> .env
        read -p "Ingresa tu CLOUDFLARE_SITE_KEY (opcional, deja en blanco si no usas): " CLOUDFLARE_SITE_KEY
        read -p "Ingresa tu CLOUDFLARE_SECRET_KEY (opcional, deja en blanco si no usas): " CLOUDFLARE_SECRET_KEY
        echo "CLOUDFLARE_SITE_KEY=$CLOUDFLARE_SITE_KEY" >> .env
        echo "CLOUDFLARE_SECRET_KEY=$CLOUDFLARE_SECRET_KEY" >> .env
        echo "" >> .env

        print_success "Archivo .env creado con las variables básicas."
        print_warning "¡IMPORTANTE! Revisa el archivo .env creado. Necesitas rellenar cualquier variable obligatoria que dejaste en blanco o ajustar según tus necesidades."
        ;;
    from_example)
        if [ -f "$ENV_EXAMPLE_PATH" ]; then
            print_info "Copiando '$ENV_EXAMPLE_PATH' a '.env'..."
            check_critical cp "$ENV_EXAMPLE_PATH" .env
            c_yellow "¡IMPORTANTE! El archivo .env ha sido creado desde el ejemplo. DEBES editarlo manualmente con tus secretos y configuraciones exactas."
        else
            c_red "Error: no se encontró el archivo '$ENV_EXAMPLE_PATH'. Saltando la creación del .env."
        fi
        ;;
    none)
        print_info "Saltando la creación del archivo .env según lo solicitado."
        ;;
esac

if [ -f ".env" ]; then
    print_info "Asegurando permisos del archivo .env..."
    check_critical sudo chown "$SYSTEM_USER":"$SYSTEM_USER" .env
    check_critical sudo chmod 600 .env # Permisos restrictivos: lectura/escritura solo para el propietario
    print_success "Permisos del archivo .env asegurados."
fi

print_info "Configurando Nginx como proxy inverso para la aplicación..."
if [[ "$PKG_MANAGER" == "apt-get" ]]; then
    NGINX_CONF_PATH="/etc/nginx/sites-available/${APP_NAME}"
else # Alpine
    NGINX_CONF_PATH="/etc/nginx/conf.d/${APP_NAME}.conf"
fi

WRITE_NGINX_CONF=true
if [ -f "$NGINX_CONF_PATH" ]; then
    print_warning "El archivo de configuración de Nginx '$NGINX_CONF_PATH' ya existe."
    read -p "¿Quieres sobreescribirlo? (Se creará una copia de seguridad) (s/N): " OVERWRITE_NGINX
    if [[ ! "$OVERWRITE_NGINX" =~ ^[Ss]$ ]]; then
        print_info "Se conservará la configuración de Nginx existente."
        WRITE_NGINX_CONF=false
    else
        BAK_FILE="${NGINX_CONF_PATH}.bak.$(date +%Y%m%d_%H%M%S)" # Timestamp for unique backup
        print_info "Creando copia de seguridad en ${BAK_FILE}..."
        sudo cp "$NGINX_CONF_PATH" "$BAK_FILE"
    fi
fi

if [ "$WRITE_NGINX_CONF" = true ]; then
    print_info "Creando/Actualizando archivo de configuración de Nginx..."
    sudo bash -c "cat > $NGINX_CONF_PATH" <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;
    # Define la raíz para los archivos estáticos.
    root $APP_PATH/public; 
    index index.html app.html; # AÑADIDO: app.html para SPAs en la raíz

    location / {
        try_files \$uri \$uri/ @proxy_to_app;
    }
    
    location @proxy_to_app {
        proxy_pass http://localhost:$NODE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    print_success "Archivo de Nginx creado/actualizado."
fi

if [[ "$PKG_MANAGER" == "apt-get" ]]; then
    if [ ! -L "/etc/nginx/sites-enabled/${APP_NAME}" ]; then
        print_info "Habilitando el sitio de Nginx..."
        check_critical sudo ln -s "$NGINX_CONF_PATH" "/etc/nginx/sites-enabled/"
        [ -L "/etc/nginx/sites-enabled/default" ] && sudo rm "/etc/nginx/sites-enabled/default" && print_info "Sitio 'default' de Nginx deshabilitado."
    else
        print_info "El sitio de Nginx ya está habilitado."
    fi
fi

print_info "Verificando la sintaxis de Nginx y reiniciando el servicio..."
check_critical sudo nginx -t
if [[ "$PKG_MANAGER" == "apk" ]]; then
    check_critical sudo rc-service nginx restart
else
    check_critical sudo systemctl restart nginx
fi
print_success "Nginx configurado y reiniciado."

# --- 5. Despliegue Final ---
print_header "Paso 5: Iniciando la Aplicación con PM2"

print_info "Instalando dependencias de Node.js con npm (ejecutando 'npm install')..."
check_critical npm install
print_success "Dependencias de Node.js instaladas."

print_info "Iniciando/Reiniciando la aplicación con PM2 bajo el usuario '$SYSTEM_USER'..."
sudo -u "$SYSTEM_USER" -H bash -c "cd $APP_PATH && pm2 start-or-restart src/server.js --name $APP_NAME"

print_info "Configurando el inicio automático de PM2..."

PM2_STARTUP_CMD=$(sudo -u "$SYSTEM_USER" -H bash -c "pm2 startup | grep -m1 'sudo'")

if [ -n "$PM2_STARTUP_CMD" ]; then
    print_info "PM2 ha generado el siguiente comando para configurar el autoarranque:"
    echo ""
    echo "$PM2_STARTUP_CMD"
    echo ""
    print_warning "Este comando requiere privilegios y configurará PM2 para que arranque automáticamente al iniciar el sistema."

    read -p "¿Deseas ejecutarlo ahora? [s/N]: " EXEC_STARTUP
    if [[ "$EXEC_STARTUP" =~ ^[Ss]$ ]]; then
        print_info "Ejecutando configuración de inicio automático..."
        eval "$PM2_STARTUP_CMD"
        print_success "PM2 ha sido configurado correctamente para reiniciarse junto al sistema."
    else
        print_warning "No se ejecutó el comando. Puedes hacerlo manualmente más adelante si lo necesitas."
    fi
else
    c_red "PM2 no pudo generar un comando de inicio automático. Revisa la instalación y el entorno."
fi

print_info "Guardando la lista de procesos de PM2..."
sudo -u "$SYSTEM_USER" -H bash -c "pm2 save"
print_success "Aplicación iniciada/actualizada con PM2 y lista de procesos guardada."

# --- Conclusión ---
print_header "¡Despliegue Completado!"
c_green "Tu aplicación '$APP_NAME' está ahora corriendo y accesible."
echo "Puedes acceder a ella en: http://$PRIMARY_SERVER_NAME (o la IP de tu VM si no configuraste un dominio)"
echo "Gestiona la aplicación con los siguientes comandos de PM2:"
echo " - pm2 list"
echo " - pm2 logs $APP_NAME"
echo " - pm2 restart $APP_NAME"
echo " - pm2 stop $APP_NAME"
print_warning "Si elegiste no ejecutar el comando de 'pm2 startup' automáticamente, asegúrate de hacerlo manualmente para garantizar la persistencia de tu aplicación tras un reinicio."