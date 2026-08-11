# Fix: Login bloqueado por driverWizardActive flag

## Fecha
2026-08-07

## Síntoma
- El usuario presiona "Ingresar" en la app móvil y no pasa nada.
- No aparece spinner, no aparece error, no hay redirección.
- El backend responde correctamente (Railway OK).
- El botón SÍ está activo (isLoading = false).
- El login SÍ funciona internamente: los logs muestran que isAuthenticated pasa a true.
- Pero el celular no muestra nada.

## Causa raíz
En `mobile/src/store/authStore.ts`, la función `initialize()` lee un flag llamado `driverWizardActive` de AsyncStorage (clave `WIZARD_KEY`).

Este flag se guarda cuando un **conductor** inicia el proceso de registro pero no lo completa. El problema es que el flag quedaba guardado en el dispositivo de sesiones anteriores, y cuando un **pasajero** intentaba entrar en el mismo celular, `initialize()` lo leía y bloqueaba toda redirección:

```javascript
// CÓDIGO PROBLEMÁTICO (antes del fix)
if (wizardFlag === 'true') {
  set({
    user: user ?? null,
    isAuthenticated: false,      // ← bloquea el login
    emailVerificationPending: true,
    driverWizardActive: true,
    isLoading: false,
  });
}
```

Luego en `_layout.tsx`, la lógica de redirección quedaba atrapada:
```javascript
if (emailVerificationPending) {
  if (!driverWizardActive) {     // ← driverWizardActive = true, no redirige
    router.replace('/(auth)/verify-email');
  }
} else if (isAuthenticated && user) {
  // ← nunca llega aquí porque emailVerificationPending = true
}
```

Resultado: el usuario estaba autenticado (`isAuthenticated: true` después del login) pero el layout nunca lo redirigía a la pantalla correcta.

## Cómo se detectó
Se agregaron console.log en `_layout.tsx` para imprimir el estado en cada render del efecto de redirección. El log reveló:

```
[LAYOUT] effect: {"emailVerificationPending": true, "isAuthenticated": false, "role": "passenger"}
```

Esto aparecía **antes** de presionar el botón, es decir desde `initialize()`. Con `emailVerificationPending: true` y `role: "passenger"`, quedaba claro que el flag de conductor estaba contaminando la sesión del pasajero.

## Fix aplicado
En `mobile/src/store/authStore.ts`, función `initialize()`:

```javascript
// ANTES
if (wizardFlag === 'true') {
  set({ ..., emailVerificationPending: true, driverWizardActive: true, ... });
} else {
  set({ user, isAuthenticated: !!user, isLoading: false });
}

// DESPUÉS
if (wizardFlag === 'true' && user?.role === 'driver') {
  // Solo aplicar el wizard si el usuario activo ES conductor
  set({ ..., emailVerificationPending: true, driverWizardActive: true, ... });
} else {
  // Si hay un flag stale de conductor pero el usuario es pasajero, limpiarlo
  if (wizardFlag === 'true') AsyncStorage.removeItem(WIZARD_KEY).catch(() => {});
  set({ user, isAuthenticated: !!user, isLoading: false });
}
```

## Archivos modificados
- `mobile/src/store/authStore.ts` — fix principal
- `mobile/src/services/authService.ts` — Firebase Auth inicializado con AsyncStorage persistence para React Native (fix secundario, eliminaba warning)

## Cómo aplicar en la versión Venezuela
1. Abrir `mobile/src/store/authStore.ts`
2. Buscar la función `initialize()`
3. Encontrar la línea: `if (wizardFlag === 'true') {`
4. Cambiarla a: `if (wizardFlag === 'true' && user?.role === 'driver') {`
5. Agregar en el else: `if (wizardFlag === 'true') AsyncStorage.removeItem(WIZARD_KEY).catch(() => {});`

## Notas adicionales
- El flag `WIZARD_KEY` = `'driverWizardActive'` en AsyncStorage
- Este bug solo ocurre cuando en el mismo dispositivo se probó el registro de conductor antes de probar login como pasajero
- En producción con usuarios reales esto rara vez ocurre, pero en pruebas internas es muy común porque se usa el mismo celular para probar ambos roles
