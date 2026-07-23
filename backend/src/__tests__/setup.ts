// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Variables de entorno mínimas para tests unitarios (sin DB ni Redis reales)
process.env.JWT_SECRET          = 'test-jwt-secret-32-chars-minimum!!';
process.env.JWT_REFRESH_SECRET  = 'test-refresh-secret-32-chars-min!';
process.env.GOOGLE_MAPS_API_KEY = 'test-google-key';
process.env.STRIPE_SECRET_KEY   = 'sk_test_placeholder';
process.env.NODE_ENV            = 'test';
