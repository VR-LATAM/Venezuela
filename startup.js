// Wrapper de startup — registra handlers ANTES de cargar la app
// Esto permite capturar errores de módulos nativos (sharp, etc.)
process.on('uncaughtException', (err) => {
  process.stdout.write('FATAL: ' + err.message + '\n' + (err.stack || '') + '\n');
  setTimeout(() => process.exit(1), 500);
});
process.on('unhandledRejection', (reason) => {
  process.stdout.write('REJECTION: ' + String(reason) + '\n');
  setTimeout(() => process.exit(1), 500);
});

require('./backend/dist/index.js');
