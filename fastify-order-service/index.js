// order-service/server.js
const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const logRequest = async (service, level, message) => {
  try {
    await axios.post(process.env.LOGGING_URL || 'http://0.0.0.0:3003/logs', { // change on service name in docker-compose
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
  await logRequest('Order Service', 'info', `Incoming request: ${request.method} ${request.url}`);
});

fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = Date.now() - request.startTime;
  await logRequest('Order Service', 'info', `Response sent. Processing time: ${responseTime}ms`);
});

const ordersFile = path.join(__dirname, 'orders.json');

// Инициализация orders.json
if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(ordersFile, JSON.stringify([]));
}

// Эндпоинт для создания заказа
fastify.post('/orders', async (request, reply) => {
  const { id, product, status } = request.body;
  const orders = JSON.parse( await fs.readFileSync(ordersFile));
  orders.push({ id, product, status });
  await fs.writeFileSync(ordersFile, JSON.stringify(orders));
  // logToMonitoringService('Order Service', 'Order created successfully');
  return { message: 'Order created', id };
});

// Эндпоинт для получения всех заказов
fastify.get('/orders', async (request, reply) => {
  const orders = JSON.parse(fs.readFileSync(ordersFile));
  // logToMonitoringService('Order Service', 'Orders get successfully');
  return orders;
});

// Эндпоинт для обновления статуса заказа
fastify.put('/orders/:id', async (request, reply) => {
  const { id } = request.params;
  const { status } = request.body;
  const orders = JSON.parse(await fs.readFileSync(ordersFile));
  const order = orders.find((o) => o.id === id);
  if (order) {
    order.status = status;
    await fs.writeFileSync(ordersFile, JSON.stringify(orders));
    // logToMonitoringService('Order Service', 'Order changed successfully');
    return { message: 'Order updated', id };
  } else {
    return reply.code(404).send({ message: 'Order not found' });
  }
});

fastify.setErrorHandler(async (error, request, reply) => {
  await logRequest('Order Service', 'error', `Error: ${error.message}`);
  reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: error.message,
  });
});

// Запуск сервера
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Order Service is running on http://0.0.0.0:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
