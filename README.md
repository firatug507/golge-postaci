# Gölge Postacı

Gece yarısından sonra çalışan gizli bir postacısın. İnsanların söyleyemediği mektupları, güneş doğmadan çatıdan çatıya halatla sallanarak sahiplerine ulaştırıyorsun.

**İndir (Android):** [Releases](../../releases/latest) sayfasından `golge-postaci-v0.1.apk` dosyasını indirip telefona kur.
(Kurarken "bilinmeyen kaynaklardan yükleme" izni istenebilir.)

## Nasıl oynanır
- Ekrana **basılı tut**: halat önündeki en yakın antene/direğe takılır, sallanırsın.
- **Bırak**: hızınla birlikte uçarsın. Çatıya kon, devam et.
- Çatıların altına düşersen tur biter. Güneş doğunca (2 dakika) gece biter.
- Posta kutularına ulaş: mektup teslim et, pul kazan, yeni mektuplar aç.
- Pullarla mağazadan pelerin ve halat renkleri al.

## v0.1
- Tek mahalle: Yağmurlu Çatılar (kaygan çatılar, yağmur)
- 10 mektup (Zein'in yazdığı metinlerden çevrildi)
- Mağaza: 4 pelerin + 4 halat rengi. Reklam yok, ödeme yok.
- Tüm grafikler kodla çizildi, sesler WebAudio ile sentezlendi. Tamamen özgün.

## Derleme
HTML5 canvas oyunu (`www/`), Gradle'sız minimal WebView kabuğu (`android/`).
`./build.sh` → aapt2 + javac + d8 + zipalign + apksigner (Android SDK build-tools 35, JDK 21).
