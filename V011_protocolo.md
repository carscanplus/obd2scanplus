# Instrucciones: comunicarse con adaptador OBD-II BLE "V011" (clon ELM327)

## Identificación del dispositivo (verificado)
- Nombre BLE: "V011"
- Servicio GATT: 0xFFE0
- Características:
  - 0xFFE1: read + notify (respuestas del adaptador)
  - 0xFFE2: write + write-without-response (comandos al adaptador)
- Firmware reportado con ATI: "ELM327 v2.2" (posible clon)
- AT@1: "OBDII to RS232 Interpreter"
- Protocolo detectado con ATDP: "ISO 14230-4 (KWP FAST)"
- Advertising: flags 0x06, Appearance 0x0240, TX power 0, UUID 16-bit completo FFE0, nombre "V011"

## Flujo de conexión
1. Escanear BLE filtrando por nombre "V011" o servicio FFE0.
2. Conectar y descubrir servicios FFE0 → características FFE1 y FFE2.
3. Suscribirse a notificaciones de FFE1 ANTES de enviar comandos.
4. Enviar comandos a FFE2 con write-without-response.

## Formato de comandos (verificado)
- Cada comando DEBE terminar en carriage return "\r" (0x0D).
  Sin "\r" el adaptador no responde. Esto se confirmó en pruebas.
- Ejemplos verificados: "ATI\r", "AT@1\r", "ATDP\r", "0100\r", "03\r", "0105\r", "010C\r".

## Formato de respuestas (verificado)
- Las respuestas llegan fragmentadas en varias notificaciones de FFE1.
- Acumular bytes hasta recibir el prompt ">" (0x3E). Ese marcador indica fin de respuesta.
- El adaptador hace eco del comando enviado (ej. "0105\r" devuelve primero "0105").
  Ignorar el eco antes de parsear.
- Las respuestas OBD incluyen una cabecera: modo de petición + 0x40.
  Ejemplos:
  - "0100" → "41 00 BE 3E B0 11"
  - "03" → "43 01 32 00 00 00 00" (un DTC: 0x0132 = P0132)
  - "0105" → "41 05 40" (temperatura = 0x40 − 40 = 24 °C)
  - "010C" → "41 0C 00 00" (RPM = 0, motor apagado)

## Decodificación
- Bitmask de PIDs (0100): cada bit = un PID soportado, bit más significativo = PID más bajo del bloque (01 para 0100).
- DTC (modo 03): cada código ocupa 2 bytes. Los dos primeros bits indican la letra (00=P, 01=C, 10=B, 11=U).
- PIDs estándar: RPM = (A*256+B)/4; temperatura refrigerante = A−40.

## Restricciones de seguridad
- SOLO comandos de lectura: modos 01, 03, 07, AT de consulta (ATI, AT@1, ATDP, ATDPN).
- NO enviar modo 04 (borrar DTC), ni comandos AT de configuración (ATZ, ATE, ATS, ATSP, AT+NAME, AT+RESET) sin confirmación explícita del usuario.
  Nota: ATZ/ATE0 son comandos ELM327 estándar y no se han probado en este dispositivo.

## Pendiente de verificar
- Si el adaptador acepta secuencia de inicio estándar (ATE0, ATL0, ATS0, ATSP0). No probado.
- Comportamiento ante "NO DATA", "?", "BUS INIT", "UNABLE TO CONNECT".
- PIDs adicionales soportados (0120, 0140, etc.) y respuestas de otros modos.
- Latencia y tiempo de espera recomendado entre comandos (se usaron ~5 s en pruebas, sobredimensionado).

## Validación
- Con el motor apagado, 010C devuelve 0 RPM y 0105 devuelve temperatura ambiente.
- Probar con el motor encendido para validar RPM > 0.
