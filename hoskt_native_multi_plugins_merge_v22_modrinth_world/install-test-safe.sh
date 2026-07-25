#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
PANEL_DIR=""
PORT="8081"
YES=0
ALLOW_MAIN=0
SKIP_NGINX_CHECK=0
RUN_BUILD=1
RUN_MIGRATE=1
ALLOW_SHARED_DB=0
RUN_RESTART=0
DRY_RUN=0

usage() {
    cat <<'EOF'
Cài HOSKT Native Multi Plugins V19 vào panel test, có chặn cài nhầm panel chính.

Cách dùng:
  bash install-test-safe.sh --panel=/var/www/pterodactyl-test --port=8081 --yes

Tùy chọn:
  --panel=PATH         Thư mục panel test (bắt buộc).
  --port=PORT          Cổng Nginx của panel test, mặc định 8081.
  --yes, -y            Xác nhận chạy.
  --no-build           Không build frontend.
  --no-migrate         Không chạy migration.
  --restart             Cho phép restart Nginx/PHP-FPM sau cài (mặc định không).
  --dry-run             Chỉ kiểm tra panel/Nginx/database, không cài.
  --allow-shared-db     Cho phép panel test dùng cùng DB với panel chính (nguy hiểm).
  --skip-nginx-check   Bỏ kiểm tra root Nginx (chỉ dùng khi cấu hình đặc biệt).
  --allow-main         Cho phép PATH đúng bằng /var/www/pterodactyl (nguy hiểm).
EOF
}

for arg in "$@"; do
    case "$arg" in
        --panel=*) PANEL_DIR="${arg#--panel=}" ;;
        --port=*) PORT="${arg#--port=}" ;;
        --yes|-y) YES=1 ;;
        --no-build) RUN_BUILD=0 ;;
        --no-migrate) RUN_MIGRATE=0 ;;
        --restart) RUN_RESTART=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --allow-shared-db) ALLOW_SHARED_DB=1 ;;
        --skip-nginx-check) SKIP_NGINX_CHECK=1 ;;
        --allow-main) ALLOW_MAIN=1 ;;
        --help|-h) usage; exit 0 ;;
        *) echo "ERROR: Tham số không hỗ trợ: $arg" >&2; usage; exit 1 ;;
    esac
done

if [[ -z "$PANEL_DIR" ]]; then
    echo "ERROR: Thiếu --panel=/duong/dan/panel-test" >&2
    usage
    exit 1
fi

if [[ "$YES" != "1" ]]; then
    echo "ERROR: Thêm --yes sau khi đã kiểm tra đúng đường dẫn panel test." >&2
    exit 1
fi

if [[ ! -d "$PANEL_DIR" ]]; then
    echo "ERROR: Không thấy thư mục: $PANEL_DIR" >&2
    exit 1
fi

PANEL_REAL="$(readlink -f "$PANEL_DIR")"
MAIN_REAL="$(readlink -f /var/www/pterodactyl 2>/dev/null || printf '%s' /var/www/pterodactyl)"

if [[ "$PANEL_REAL" == "$MAIN_REAL" && "$ALLOW_MAIN" != "1" ]]; then
    cat >&2 <<EOF
ERROR: Đường dẫn đã chọn là panel chính: $PANEL_REAL
Script dừng để tránh cài nhầm. Panel test phải có đường dẫn riêng, ví dụ:
  /var/www/pterodactyl-test
Chỉ dùng --allow-main khi bạn chủ động muốn cài panel chính.
EOF
    exit 1
fi

for required in artisan package.json resources/scripts public .env; do
    if [[ ! -e "$PANEL_REAL/$required" ]]; then
        echo "ERROR: $PANEL_REAL không giống mã nguồn Pterodactyl (thiếu $required)." >&2
        exit 1
    fi
done

read_env_value() {
    local file="$1"
    local key="$2"
    local value first last
    value="$(grep -m1 -E "^[[:space:]]*${key}=" "$file" 2>/dev/null | sed -E "s/^[[:space:]]*${key}=//" || true)"
    value="${value%$'\r'}"
    if [[ ${#value} -ge 2 ]]; then
        first="${value:0:1}"
        last="${value: -1}"
        if [[ ( "$first" == '"' && "$last" == '"' ) || ( "$first" == "'" && "$last" == "'" ) ]]; then
            value="${value:1:${#value}-2}"
        fi
    fi
    printf '%s' "$value"
}

MAIN_ENV="$MAIN_REAL/.env"
if [[ "$PANEL_REAL" != "$MAIN_REAL" && -f "$MAIN_ENV" ]]; then
    test_db="$(read_env_value "$PANEL_REAL/.env" DB_DATABASE)"
    main_db="$(read_env_value "$MAIN_ENV" DB_DATABASE)"
    test_host="$(read_env_value "$PANEL_REAL/.env" DB_HOST)"
    main_host="$(read_env_value "$MAIN_ENV" DB_HOST)"
    test_port="$(read_env_value "$PANEL_REAL/.env" DB_PORT)"
    main_port="$(read_env_value "$MAIN_ENV" DB_PORT)"
    test_user="$(read_env_value "$PANEL_REAL/.env" DB_USERNAME)"
    main_user="$(read_env_value "$MAIN_ENV" DB_USERNAME)"

    if [[ -n "$test_db" && "$test_db" == "$main_db" && "$test_host" == "$main_host" && "$test_port" == "$main_port" && "$test_user" == "$main_user" && "$ALLOW_SHARED_DB" != "1" ]]; then
        cat >&2 <<EOF
ERROR: Panel test đang có cùng cấu hình database với panel chính.
DB_HOST=$test_host  DB_PORT=$test_port  DB_DATABASE=$test_db  DB_USERNAME=$test_user
Script dừng để tránh migration tác động database chính.
Hãy tạo database test riêng. Chỉ dùng --allow-shared-db khi bạn hiểu rõ rủi ro.
EOF
        exit 1
    fi
fi

if [[ "$SKIP_NGINX_CHECK" != "1" ]]; then
    python3 "$PACKAGE_DIR/tools/detect_nginx_panel_root.py" \
        --port "$PORT" \
        --expected "$PANEL_REAL/public"
else
    echo "WARNING: Đã bỏ kiểm tra Nginx theo yêu cầu."
fi

cat <<EOF
==> Xác nhận mục tiêu cài đặt
Panel test : $PANEL_REAL
Nginx port : $PORT
Gói cài    : $PACKAGE_DIR
Build      : $([[ "$RUN_BUILD" == "1" ]] && echo có || echo không)
Migration  : $([[ "$RUN_MIGRATE" == "1" ]] && echo có || echo không)
Restart    : $([[ "$RUN_RESTART" == "1" ]] && echo có || echo không)
Dry run    : $([[ "$DRY_RUN" == "1" ]] && echo có || echo không)
EOF

python3 "$PACKAGE_DIR/tools/check_v17_preservation.py"
python3 "$PACKAGE_DIR/tools/check_manager_services_fix.py"
python3 -m py_compile "$PACKAGE_DIR/tools/patch_hoskt_native_multi.py" "$PACKAGE_DIR/tools/check_modpack_route_shadow_fix.py" "$PACKAGE_DIR/tools/test_dynamic_logo_view_injection.py"
python3 "$PACKAGE_DIR/tools/check_dynamic_logo_target_fix.py" --package "$PACKAGE_DIR"
python3 "$PACKAGE_DIR/tools/test_dynamic_logo_view_injection.py"
python3 "$PACKAGE_DIR/tools/check_mcutils_interaction_fix.py"
python3 "$PACKAGE_DIR/tools/check_mcutils_contrast_fix.py"

if [[ "$DRY_RUN" == "1" ]]; then
    echo "OK: Kiểm tra an toàn V19 và xác nhận giữ nguyên runtime V9/V14/V15/V16/V17/V18 hoàn tất. Không có file nào được cài (--dry-run)."
    exit 0
fi

args=("--panel=$PANEL_REAL" "--yes")
[[ "$RUN_BUILD" == "1" ]] && args+=("--build")
[[ "$RUN_MIGRATE" != "1" ]] && args+=("--no-migrate")
[[ "$RUN_RESTART" != "1" ]] && args+=("--no-restart")

bash "$PACKAGE_DIR/install.sh" "${args[@]}"

cat <<EOF

CÀI ĐẶT HOÀN TẤT CHO PANEL TEST: $PANEL_REAL
Dấu kiểm tra giao diện Minecraft Utilities: data-hoskt-scroll-fix="v9-preserved-v14"
Dấu kiểm tra logo an toàn: window.__HOSKT_LOGO_TARGET_FIX__="v23-safe"
Copy HTTP + MOTD malformed-input: V16
Độ tương phản preset/aspect: V17
Mod/World/Version managers: V18
Modpack route-shadow fix: V19
Mở Chrome Android bằng tab ẩn danh tại cổng $PORT để kiểm tra lại.
EOF
