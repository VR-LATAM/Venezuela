/**
 * Expo config plugin — Certificate Pinning para Android
 * Genera network_security_config.xml que fuerza al sistema Android
 * a verificar el certificado del backend antes de cada conexión.
 *
 * IMPORTANTE: Si Railway renueva su certificado SSL, actualizar los hashes aquí
 * y hacer un nuevo build. Railway usa Let's Encrypt (rota cada ~90 días).
 * Hash actual obtenido: 2026-07-09
 * Próxima revisión recomendada: 2026-10-07
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RAILWAY_DOMAIN = 'vridebackend-production-00dd.up.railway.app';

// SHA-256 SPKI hashes del certificado de Railway (obtenidos 2026-07-09)
// Incluir siempre al menos 2 pins: leaf + backup de CA intermedia
const CERT_PINS = [
  'hORJtOUv6S5sVpxykVdj7ceRoUfeLhICfOGA0n68co0=', // leaf cert (Railway 2026-07)
];

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Bloquear HTTP en toda la app -->
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <!-- Certificate pinning para el backend de VeronaRide -->
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">${RAILWAY_DOMAIN}</domain>
    <pin-set expiration="2026-10-07">
      ${CERT_PINS.map(pin => `<pin digest="SHA-256">${pin}</pin>`).join('\n      ')}
    </pin-set>
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </domain-config>
</network-security-config>`;

module.exports = function withCertificatePinning(config) {
  // Paso 1: escribir el archivo network_security_config.xml
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(resDir, { recursive: true });
      fs.writeFileSync(path.join(resDir, 'network_security_config.xml'), NETWORK_SECURITY_CONFIG);
      return config;
    },
  ]);

  // Paso 2: referenciar el archivo en AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (manifest.application && manifest.application[0]) {
      manifest.application[0].$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return config;
  });

  return config;
};
