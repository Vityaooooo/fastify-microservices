// api-gateway/server.js
const fastify = require('fastify')({ logger: true });
const proxy = require('@fastify/http-proxy');
const axios = require('axios');
require('dotenv').config()

// Логирование запросов
const logRequest = async (service, level, message) => {
  try {
    await axios.post(`${process.env.LOGGING_URL}/logs` || 'http://0.0.0.0:3003/logs', { // change on service name in docker-compose
      service,
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log message:', err.message);
  }
};

fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
  await logRequest('API Gateway', 'info', `Incoming request: ${request.method} ${request.url}`);
});

fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = Date.now() - request.startTime;
  await logRequest('API Gateway', 'info', `Response sent. Processing time: ${responseTime}ms`);
});

// // Middleware для измерения времени обработки запросов
// fastify.addHook('onRequest', async (request, reply) => {
//   request.startTime = process.hrtime(); // Записываем время начала обработки запроса
// });

// fastify.addHook('onResponse', async (request, reply) => {
//   const [seconds, nanoseconds] = process.hrtime(request.startTime);
//   const durationMs = (seconds * 1e3 + nanoseconds / 1e6).toFixed(3); // Время в миллисекундах

//   // Логирование задержки в Logging Service
//   await axios.post('http://logging-service:4004/logs', {
//     type: 'latency',
//     service: 'API Gateway',
//     endpoint: request.routerPath,
//     method: request.method,
//     latency: durationMs,
//   });

//   fastify.log.info(
//     `Request to ${request.routerPath} (${request.method}) took ${durationMs} ms`
//   );
// });

// Прокси для Order Service
fastify.register(proxy, {
  upstream: process.env.ORDER_URL || 'http://0.0.0.0:3001',
  prefix: '/orders',
  rewritePrefix: '/orders',
});

// Прокси для Product Service
fastify.register(require('@fastify/http-proxy'), {
  upstream: process.env.PRODUCT_URL || 'http://0.0.0.0:3002', // change on service name in docker-compose
  prefix: '/products',
  rewritePrefix: '/products',
});

// Прокси для Logging Service
fastify.register(require('@fastify/http-proxy'), {
  upstream: process.env.LOGGING_URL || 'http://0.0.0.0:3003', // change on service name in docker-compose
  prefix: '/logs',
  rewritePrefix: '/logs',
});

// Обработчик ошибок
fastify.setErrorHandler(async (error, request, reply) => {
  await logRequest('API Gateway', 'error', `Error: ${error.message}`);
  reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: error.message,
  });
});

// Запуск сервера
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('API Gateway is running on http://0.0.0.0:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
