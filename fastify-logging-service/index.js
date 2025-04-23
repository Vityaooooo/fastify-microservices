// logging-monitoring-service/server.js
const fastify = require('fastify')({ logger: { level: 'info', transport: { target: 'pino-pretty' } } });
const fs = require('fs');
const path = require('path');

const logsFile = path.join(__dirname, 'logs.json');

// Инициализация файла для логов
if (!fs.existsSync(logsFile)) {
  fs.writeFileSync(logsFile, JSON.stringify([]));
}

// const latencyFile = path.join(__dirname, 'latency.json');

// // Инициализация файла с задержками, если он отсутствует
// if (!fs.existsSync(latencyFile)) {
//   fs.writeFileSync(latencyFile, JSON.stringify([]));
// }

// Эндпоинт для записи логов
fastify.post('/logs', async (request, reply) => {
  const { service, level, message, timestamp } = request.body;
  const logs = JSON.parse(await fs.readFileSync(logsFile));
  logs.push({ service, level, message, timestamp: timestamp || new Date().toISOString() });
  await fs.writeFileSync(logsFile, JSON.stringify(logs));
  return { message: 'Log recorded' };
});

// fastify.post('/logs', async (request, reply) => {
//   const { type, service, endpoint, method, latency } = request.body;

//   if (type === 'latency') {
//     const latencyLog = { timestamp: new Date().toISOString(), service, endpoint, method, latency };
//     const data = JSON.parse(fs.readFileSync(latencyFile, 'utf-8'));
//     data.push(latencyLog);
//     fs.writeFileSync(latencyFile, JSON.stringify(data, null, 2));
//     reply.code(201).send({ message: 'Latency log recorded' });
//   } else {
//     const log = { timestamp: new Date().toISOString(), ...request.body };
//     const data = JSON.parse(fs.readFileSync(logsFile, 'utf-8'));
//     data.push(log);
//     fs.writeFileSync(logsFile, JSON.stringify(data, null, 2));
//     reply.code(201).send({ message: 'Log recorded' });
//   }
// });

// Эндпоинт для получения логов
fastify.get('/logs', async (request, reply) => {
  const logs = JSON.parse(await fs.readFileSync(logsFile));
  return logs;
});

// Запуск сервера
const start = async () => {
  try {
    await fastify.listen({ port: 3003, host: '0.0.0.0' });
    console.log('Logging & Monitoring Service is running on http://0.0.0.0:3003');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
