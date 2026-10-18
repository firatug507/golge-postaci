#!/bin/bash
# Builds signed release APK without Gradle: aapt2 + javac + d8 + zipalign + apksigner.
set -euo pipefail
cd "$(dirname "$0")"
VERSION_NAME=${VERSION_NAME:-0.1}; VERSION_CODE=${VERSION_CODE:-1}
SDK=/workspace/android-sdk; BT=$SDK/build-tools/35.0.0; JAR=$SDK/platforms/android-35/android.jar
OUT=build; rm -rf $OUT; mkdir -p $OUT/res $OUT/gen $OUT/classes $OUT/assets/www $OUT/dex dist
cp -r www/index.html www/style.css www/game.js $OUT/assets/www/
$BT/aapt2 compile --dir android/res -o $OUT/res/res.zip
$BT/aapt2 link -I $JAR --manifest android/AndroidManifest.xml -A $OUT/assets -o $OUT/base.apk \
  --java $OUT/gen --min-sdk-version 24 --target-sdk-version 35 --version-code $VERSION_CODE --version-name $VERSION_NAME $OUT/res/res.zip
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath $JAR -d $OUT/classes $(find android/src $OUT/gen -name '*.java')
$BT/d8 --release --min-api 24 --lib $JAR --output $OUT/dex $(find $OUT/classes -name '*.class')
cp $OUT/base.apk $OUT/unsigned.apk; python3 -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],'a',zipfile.ZIP_DEFLATED); z.write(sys.argv[2],'classes.dex'); z.close()" $OUT/unsigned.apk $OUT/dex/classes.dex
$BT/zipalign -f -p 4 $OUT/unsigned.apk $OUT/aligned.apk
set -a; source <(grep -E '^(storePassword|keyAlias)=' keys/keystore.properties); set +a
APK=dist/golge-postaci-v$VERSION_NAME.apk
$BT/apksigner sign --ks keys/golge-postaci-release.jks --ks-key-alias "$keyAlias" --ks-pass env:storePassword --key-pass env:storePassword --out $APK $OUT/aligned.apk
echo "built $APK"
