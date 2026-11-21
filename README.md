# obd2scanner

App móvil ([Expo](https://expo.dev) + React Native + TypeScript) para leer datos
OBD-II de un vehículo con un adaptador **ELM327** por Bluetooth (BLE o SPP).

- **Dashboard**: valores en vivo (RPM, velocidad, temperatura de refrigerante,
  carga de motor, MAF, trims, nivel de combustible, voltaje…).
- **Conexión**: escaneo BLE y Bluetooth clásico (SPP, sólo Android).
- **Códigos de falla**: lectura de DTC (modo 03) y permanentes (modo 0A) con
  descripción, y borrado bajo petición explícita del usuario (modo 04).

## Requisitos

- Node.js 20+
- Un adaptador ELM327 (BLE o Bluetooth clásico) y el vehículo con el contacto
  en posición ON.
- Para BLE/SPP hace falta un **development build** o un APK propio: no funciona
  en Expo Go.

## APK standalone (recomendado para usar la app)

El APK `release` lleva el JavaScript embebido: abre directo al dashboard, **sin
Metro ni pantalla de Expo**, y funciona en cualquier teléfono Android.

Requisitos de compilación: JDK 17 y Android SDK (compileSdk 36 + NDK 27.1).

```bash
npm install
npx expo prebuild --platform android      # genera android/ (una vez)
cd android
./gradlew assembleRelease                 # Windows: .\gradlew.bat assembleRelease
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Notas:

- Para una sola arquitectura (build mucho más rápido):
  `.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a`.
- La plantilla firma el `release` con el keystore de depuración; eso alcanza para
  instalar en un teléfono, pero para publicar hay que generar un keystore propio
  (`eas credentials`) o usar `eas build --profile production`.
- Si antes había otra compilación de la app con distinta firma, el instalador
  falla con `INSTALL_FAILED_UPDATE_INCOMPATIBLE`: hay que desinstalar la anterior
  (`adb uninstall com.obd2scanner.app`). La app no guarda datos locales.

## Desarrollo (con recarga en caliente)

```bash
npm install
npm run android     # expo run:android: compila el dev client y lo instala
npm start           # Metro
```

El dev client **sí** depende de Metro: si el servidor está apagado, la app queda
en la pantalla de Expo pidiendo la URL. Para usar la app sin PC, instalá el APK
standalone de la sección anterior.

Validación:

```bash
npm test        # vitest
npm run lint    # expo lint (requiere ESLint configurado)
```

## Arquitectura

```
src/app/         pantallas (expo-router): dashboard, conexión, códigos
src/store/       estado global Zustand y sondeo de PIDs
src/obd/         protocolo puro (sin React): comandos, respuestas, PIDs, DTC
src/transport/   BLE y SPP, más descubrimiento de dispositivos
src/data/        descripciones de DTC y respuestas grabadas (modo demo)
```

La capa `src/obd` no depende de React Native, por lo que está cubierta por
pruebas unitarias con `vitest`.

## Adaptador V011 (clon ELM327 v2.2)

Protocolo verificado (ver [V011_protocolo.md](./V011_protocolo.md)):

| Elemento | Valor |
| --- | --- |
| Nombre BLE | `V011` |
| Servicio | `0xFFE0` |
| Notificaciones (respuestas) | `0xFFE1` |
| Escritura (comandos) | `0xFFE2` (`write` + `write without response`) |
| Firmware (`ATI`) | `ELM327 v2.2` |
| Protocolo (`ATDP`) | `ISO 14230-4 (KWP FAST)` |

Detalles que implementa el código:

- Los comandos se envían terminados en `\r` y se lee hasta el prompt `>`.
- El adaptador **hace eco** del comando: se descarta antes de parsear
  ([`tokenizeResponse`](./src/obd/response.ts)).
- Las respuestas llegan **sin cabecera ni byte de tamaño** (`41 05 40`,
  `43 01 32 00 00 00 00`), así que el parser se ancla en el byte de servicio y
  también acepta el formato CAN con cabecera (`7E8 04 41 0C 3B 2E`).
- Las notificaciones BLE tardan en activarse: la conexión reintenta `ATI` antes
  de dar el enlace por bueno.
- `ATZ`, `ATE`, `ATS` y `ATSP` **no se envían** en la inicialización porque no
  están verificados en este clon; sólo se envía `ATSPn` si se pide un protocolo
  explícito.
- Sólo se usan comandos de lectura (modos 01/03/0A y AT de consulta). El modo 04
  (borrar códigos) se ejecuta únicamente cuando el usuario pulsa el botón.

## Solución de problemas

- **No aparece el adaptador en BLE**: revisa que Bluetooth esté activo, que el
  adaptador esté encendido y que la app tenga los permisos de Bluetooth
  (Android 12+ no necesita ubicación para BLE).
- **Conecta pero no hay datos**: el contacto del vehículo debe estar en ON. Tras
  conectar se muestra la versión y el protocolo detectado (`ATI`/`ATDP`).
- **Todo devuelve NO DATA**: el vehículo puede no soportar ese PID; el dashboard
  filtra los PIDs declarados en el bitmask de `0100`.
- **El adaptador cierra la conexión**: suele ser alimentación o el contacto
  apagado; vuelve a conectar.

