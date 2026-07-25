# TỔNG HỢP HƯỚNG DẪN CÀI ĐẶT, NÂNG CẤP VÀ VÁ LỖI HOSKT (TỪ V15 ĐẾN V22.3.1)

Tài liệu này tổng hợp toàn bộ các hướng dẫn cấu hình, cài đặt, nâng cấp, xử lý sự cố và lịch sử đầy đủ 100% các bản vá (patch) cho bộ công cụ HOSKT từ phiên bản V15 đến V22.3.1. Tất cả quy trình đều hướng dẫn thao tác an toàn trên môi trường Panel Test trước khi áp dụng lên Panel Thật (Production).

---

## 1. Lịch Sử Các Bản Vá Lỗi & Nâng Cấp Hệ Thống (Từ V15 đến V20.1)

Phần này tổng hợp chi tiết tất cả các sửa đổi chuyên sâu về giao diện di động, tính năng tiện ích, hệ thống Backend API, định tuyến Route và Version Manager trước khi nâng cấp lên phiên bản lớn V22.

### 1.1. Các bản vá giao diện di động & Hệ thống tiện ích Minecraft (V15 - V17)
* **V15 (Mobile Native Sidebar + Logo Target Fix):** Sửa triệt để lỗi logic chèn logo tự động vào các công cụ tiện ích (như Classic Colors, Rainbow Builder, Placeholder API). Script không quét toàn bộ thẻ `div/span` trong body nữa mà chỉ nhận diện chính xác logo native của header/sidebar; hủy bỏ chèn innerHTML sai vị trí và nâng cấp query cache bust lên `?v=23-safe`.
* **V16 (Mobile Copy/Input Crash Fix):** Khắc phục tính năng nút Copy không hoạt động khi truy cập Panel Test qua kết nối HTTP (Port 8081). Tự động dùng fallback `document.execCommand('copy')` đồng bộ khi không có SSL/navigator.clipboard. Sửa lỗi crash React ErrorBoundary trong MOTD Creator khi nhập ký tự `&` đơn lẻ; nút Reset MOTD chèn đúng một ký tự `&r`.
* **V17 (Preset Aspect Contrast Fix):** Cải thiện khả năng đọc chữ (độ tương phản sáng/tối). Ép chữ tên preset được chọn trong Rainbow Builder luôn hiển thị màu sáng rõ ràng. Trong MOTD Creator, tự động tính toán độ sáng từng ô màu để chọn chữ màu đen hoặc trắng cho các mã format `&0..&f`. Giữ nguyên parser an toàn cho các chuỗi `&`, `&&`, `&r`, `Hello &` và giữ nguyên cấu trúc sidebar, logo gốc.

### 1.2. Các bản vá Backend API & Định tuyến Route (V18 - V19)
* **V18 (Manager / Provider Fix):** Bổ sung Backend API đầy đủ cho 3 trình quản lý chính:
  * **Mod Manager:** Bổ sung class `Pterodactyl\Services\Mods\ModSearchService` để giao diện HOSKT không còn báo lỗi *"This addon is not installed"*. Nguồn Modrinth hoạt động mượt mà không cần API Key.
  * **World Manager:** Sửa service CurseForge đọc API Key từ HOSKT Theme Settings hoặc biến `CURSEFORGE_API_KEY` trong file `.env`, hiển thị thông báo lỗi chính xác thay vì nuốt lỗi thành danh sách rỗng.
  * **Version Manager:** Bổ sung catalogue native không phụ thuộc API ngoài cho Vanilla, Snapshot, Paper, Purpur, Velocity, Fabric và Bungeecord.
* **V19 (Modpack Route Shadow Fix):** Giải quyết dứt điểm lỗi `/modpacks` vẫn hiện *"Feature Not Available / This addon is not installed"* sau khi đã cài V18. Nguyên nhân do route cũ của theme chèn đè lên route native mới. V19 xóa đúng route `/modpacks` cũ bị trùng trước khi gắn `NativeHOSKTModpacksContainer`.

### 1.3. Nâng cấp Version Manager & Catalogue Native Toàn Diện (V20.1)
* **Loại bỏ CDN ảnh ngoài:** Xóa hoàn toàn phụ thuộc ảnh `cdn.bagou450.com`, tích hợp sẵn 16 icon SVG local tại thư mục `public/extensions/hoskt-native-version-manager/icons`.
* **Hỗ trợ Catalogue Native rộng rãi:** Bổ sung nguồn tải chính thức cho Vanilla, Snapshot, Spigot, Paper, Purpur, SpongeVanilla, BungeeCord, Waterfall, Velocity, Forge, Fabric, Mohist, Magma và CatServer.
* **Cơ chế cài đặt đặc thù:** Spigot tự động chạy BuildTools chính thức ở lần khởi động server đầu tiên (yêu cầu Docker Java image có git). Forge dùng Installer chính thức để cài thư viện libraries ở lần khởi động đầu tiên.
* **Tự động chọn phiên bản Java chuẩn:** Tự động chọn Java 8/16/17/21/25 phù hợp theo đời Minecraft. Riêng Paper/Minecraft 26.1+ tự động chọn Java 25. Migration V20.1 bổ sung Docker image `java_25` cho các Egg sử dụng Pterodactyl Java Yolks (không dùng cờ `--no-migrate` nếu muốn dùng Java 25).

---

## 2. Các Tính Năng Chính Trên Các Bản V22 (V22 - V22.3.1)

* **Bảo toàn mã nguồn gốc 100%:** Giữ nguyên byte-for-byte toàn bộ 15 file runtime nhạy cảm và các bản vá V9 đến V20.1.
* **World Manager (Modrinth Integration):** Thêm Modrinth vào ô chọn Provider, tự động tải kết quả tìm kiếm với từ khóa mặc định "world" khi mở trang. Tiến trình tải map xử lý qua Queue worker (`pteroq`). Giải nén an toàn trong thư mục staging cô lập `.hoskt-world-install-*`, chỉ tiến hành cài đặt khi phát hiện file `level.dat` hoặc `uid.dat`. Hỗ trợ đầy đủ các định dạng ZIP, TAR, TAR.GZ, TGZ và MRPACK. Nếu tên world bị trùng, tự động dùng hậu tố `world-2`, `world-3`.
* **Cải tiến Giao diện Phân trang (Pagination):** Bổ sung thanh phân trang chi tiết dạng "Page X of Y" và ô nhập số trang nhảy trực tiếp trên Mod Manager, World Manager và Version Manager.
* **Version Manager (CDN & Fallback Icon):** Tích hợp URL CDN tĩnh (`https://cdn.nguyenhung401.id.vn/img/vanilla-icon.jpg`) cho phiên bản Vanilla. Xây dựng chuỗi dự phòng linh hoạt 4 lớp: CDN -> PNG local (`vanilla-icon.png`) -> SVG local (`vanilla.svg`) -> SVG mặc định (`default.svg`). Danh sách Modpack nhúng trực tiếp (inline) trong Version Manager mà không chuyển sang trang khác.
* **Sửa lỗi Dynamic Logo trên Panel Thật (V22.3.1):** Khắc phục triệt để lỗi patcher không tìm thấy vị trí chèn thẻ script trên các file `wrapper.blade.php` và `admin.blade.php` của Panel thật. Bộ cài V22.3.1 tự động quét và chèn đúng 1 thẻ script chuẩn hóa trước `</body>` hoặc `</html>`, chống nhân đôi thẻ script và cache-bust bằng query `?v=23-safe`.

---

## 3. Lưu Ý Quan Trọng Trước Khi Cài Đặt

* **Thử nghiệm bắt buộc:** Luôn cài đặt và kiểm tra đầy đủ tính năng trên Panel Test (Ví dụ: `/var/www/pterodactyl-test`, cổng Nginx 8081) trước khi áp dụng lên Panel thật.
* **Độc lập Cơ sở dữ liệu:** Panel Test bắt buộc phải sử dụng Database riêng biệt, tuyệt đối không dùng chung Database với Panel chính để tránh nguy cơ ghi đè dữ liệu.
* **Không giải nén đè trực tiếp:** KHÔNG giải nén thư mục payload/files đè thẳng vào mã nguồn Panel. Phải khởi chạy bộ cài bằng file script Bash tự động.
* **Biên dịch Frontend (Build):** KHÔNG sử dụng tham số `--no-build` vì các thay đổi về giao diện React/TypeScript (Modrinth, Icon CDN, Phân trang) yêu cầu Yarn build lại frontend bundle.
* **Queue Worker:** Trình xử lý hàng đợi `pteroq` bắt buộc phải đang chạy ổn định thì nút Download map/modpack mới có thể hoạt động.

---

## 4. Quy Trình Cài Đặt Chuẩn Lên Panel Test (Port 8081)

Hướng dẫn này áp dụng khi file bộ cài ZIP được upload ở thư mục gốc `/var/www/pterodactyl`, nhưng tiến hành giải nén và thực thi script tác động vào Panel Test `/var/www/pterodactyl-test`.

### Bước 4.1: Kiểm tra Nginx và file bộ cài ZIP
Đăng nhập SSH bằng quyền root/sudo và chạy lệnh kiểm tra:

```bash
# Kiểm tra Nginx nghe cổng 8081 trỏ đúng panel test:
sudo -i
nginx -T 2>/dev/null | grep -n -B8 -A25 "listen 8081"
# Phải xuất hiện dòng: root /var/www/pterodactyl-test/public;

# Khai báo đường dẫn và kiểm tra archive:
ZIP_FILE="/var/www/pterodactyl/hoskt_native_multi_plugins_merge_v22_2_vanilla_cdn_complete_install_guide.zip"
test -f "$ZIP_FILE" || { echo "ERROR: Không tìm thấy ZIP"; exit 1; }
unzip -t "$ZIP_FILE" # Dòng cuối cùng bắt buộc báo "No errors detected"
sha256sum "$ZIP_FILE"
```

### Bước 4.2: Sao lưu (Backup) Panel Test

```bash
BACKUP_FILE="/root/pterodactyl-test-before-hoskt-v22-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -C /var/www -czf "$BACKUP_FILE" pterodactyl-test
echo "Backup đã tạo thành công: $BACKUP_FILE"
```

### Bước 4.3: Khởi tạo thư mục bộ cài trong Panel Test

```bash
TEST_PANEL="/var/www/pterodactyl-test"
INSTALL_DIR="$TEST_PANEL/hoskt_native_multi_plugins_merge_v22_modrinth_world"

# Xóa thư mục bộ cài cũ (KHÔNG xóa mã nguồn panel test):
rm -rf "$INSTALL_DIR"

# Giải nén ZIP vào thư mục Panel Test:
unzip -o "$ZIP_FILE" -d "$TEST_PANEL"
cd "$INSTALL_DIR"
```

### Bước 4.4: Chạy giả lập (Dry-Run) kiểm tra an toàn
Lệnh Dry-Run chỉ kiểm tra điều kiện môi trường, cấu trúc file, database và cú pháp mà không ghi đè bất kỳ file nào lên panel:

```bash
bash install-v22-2-vanilla-cdn-complete.sh   --panel="$TEST_PANEL"   --port=8081   --yes   --dry-run
```

### Bước 4.5: Tiến hành Cài thật và Build Frontend
Chỉ chạy lệnh cài thật sau khi bước Dry-Run báo trạng thái OK hoàn toàn:

```bash
bash install-v22-2-vanilla-cdn-complete.sh   --panel="$TEST_PANEL"   --port=8081   --yes   --restart
```

### Bước 4.6: Dọn Cache, Restart Dịch vụ và Kiểm tra

```bash
cd /var/www/pterodactyl-test
php artisan optimize:clear
chown -R www-data:www-data storage bootstrap/cache

# Khởi động lại Queue và Nginx:
systemctl restart pteroq
systemctl restart nginx
systemctl status pteroq --no-pager
systemctl status nginx --no-pager

# Restart đúng phiên bản PHP-FPM đang chạy:
systemctl list-units --type=service | grep -E "php.*fpm"
systemctl restart php8.3-fpm # (Sửa tên service tương ứng)
```

---

## 5. Quy Trình Cài Đặt HOSKT V22.3.1 Lên Panel Thật (/var/www/pterodactyl)

Chỉ thực hiện bước này khi Panel Test đã hoạt động ổn định và đáp ứng đầy đủ yêu cầu test.

### Bước 5.1: Sao lưu Panel Thật và Giải nén bộ cài V22.3.1

```bash
cd /root
unzip -o hoskt_native_multi_plugins_merge_v22_3_1_dynamic_logo_real_panel_fix.zip
cd hoskt_native_multi_plugins_merge_v22_modrinth_world
chmod +x *.sh tools/*.py

# Kiểm tra bộ vạn năng trước khi cài:
python3 tools/check_dynamic_logo_target_fix.py --package .
python3 tools/check_v17_preservation.py
python3 tools/check_v22_3_all_version_icons_provider_stability.py
```

### Bước 5.2: Thực thi script cài đặt lên Panel Thật
*Lưu ý: Bắt buộc phải có tham số `--allow-main` để xác nhận cài đặt lên môi trường thật.*

```bash
bash install-v22-3-version-icons-provider-stability.sh   --panel=/var/www/pterodactyl   --port=80   --yes   --allow-main   --restart
```

*Ghi chú:* Nếu Nginx Panel thật sử dụng cấu hình Proxy đặc biệt khiến bộ dò root báo sai, dùng lệnh bổ sung tham số `--skip-nginx-check`:

```bash
bash install-v22-3-version-icons-provider-stability.sh   --panel=/var/www/pterodactyl   --port=80   --yes   --allow-main   --skip-nginx-check   --restart
```

### Bước 5.3: Kiểm tra sau khi cài lên Panel Thật

```bash
cd /var/www/pterodactyl

# Kiểm tra thẻ script đã được chèn chính xác trong 2 file Blade:
grep -n "hoskt-dynamic-logo-fix-v22.js?v=23-safe"   resources/views/templates/wrapper.blade.php   resources/views/layouts/admin.blade.php

python3 /root/hoskt_native_multi_plugins_merge_v22_modrinth_world/tools/check_dynamic_logo_target_fix.py   --panel=/var/www/pterodactyl

php artisan optimize:clear
systemctl restart pteroq
systemctl restart nginx
```

---

## 6. Giám Sát Hệ Thống & Khắc Phục Lỗi Thường Gặp

| Sự cố / Tác vụ | Dòng lệnh kiểm tra (Command) | Ý nghĩa & Cách xử lý |
| :--- | :--- | :--- |
| **Queue Worker pteroq dừng / Map không tải** | `systemctl status pteroq --no-pager`<br>`journalctl -u pteroq -f` | Đảm bảo trình xử lý hàng đợi tải map/modpack hoạt động ổn định. |
| **Lỗi chức năng / Trang trắng / HTTP 500** | `tail -f /var/www/pterodactyl/storage/logs/laravel.log` | Theo dõi log trực tiếp để phát hiện lỗi API, lỗi kết nối hoặc PHP backend. |
| **Giao diện không đổi / CDN báo CSP lỗi** | `php artisan optimize:clear && yarn build:production` | Do bộ nhớ đệm trình duyệt hoặc CDN bị chặn; hệ thống sẽ tự động dùng PNG local dự phòng. |
| **Thiếu CurseForge API Key** | Thêm key vào `.env`:<br>`CURSEFORGE_API_KEY=YOUR_KEY`<br>sau đó: `php artisan optimize:clear` | Cấu hình key trong `.env` hoặc tại HOSKT Theme Settings > Addons > Minecraft Mod/Plugin Installer. |

### Các nguyên nhân từ chối tệp tin & Khắc phục bổ sung:
1. **"cannot find or open":** Do lệnh unzip trỏ sai đường dẫn ZIP. Kiểm tra lại biến `ZIP_FILE`.
2. **Kết quả Modrinth bị từ chối:** Modrinth không phân loại project type riêng cho map. Bộ cài sẽ tự động từ chối các file ZIP không chứa `level.dat` hoặc `uid.dat` để tránh rác server.
3. **Xử lý khi Frontend build bị lỗi:** Chạy lại `export NODE_OPTIONS=--openssl-legacy-provider && yarn build:production`.

### Khôi phục hệ thống (Rollback):
Nếu cần khôi phục lại trạng thái cũ, xác định đúng thư mục backup có timestamp gần nhất trong `/root/` và thực hiện chép đè trả lại mã nguồn Panel, sau đó thực hiện Yarn build và `optimize:clear`. Tuyệt đối không dùng bản backup của Panel Test để ghi đè sang Panel Thật.
