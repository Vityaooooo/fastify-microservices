// product-service/server.js
const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({ logger: true });
const axios = require('axios');

const logRequest = async (service, level, message) => {
  try {
    await axios.post(process.env.LOGGING_URL ||'http://0.0.0.0:3003/logs', { // change on service name in docker-compose
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
  await logRequest('Product Service', 'info', `Incoming request: ${request.method} ${request.url}`);
});

fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = Date.now() - request.startTime;
  await logRequest('Product Service', 'info', `Response sent. Processing time: ${responseTime}ms`);
});

const productsFile = path.join(__dirname, 'products.json');

// Инициализация файла products.json
if (!fs.existsSync(productsFile)) {
  fs.writeFileSync(productsFile, JSON.stringify([
    { id: '1', name: 'Laptop', price: 1200 },
    { id: '2', name: 'Phone', price: 800 },
  ]));
}

// Эндпоинт для получения всех продуктов
fastify.get('/products', async (request, reply) => {
  const products = JSON.parse(await fs.readFileSync(productsFile));
  // logToMonitoringService('Product Service', 'Products get successfully');
  return products;
});

// Эндпоинт для добавления нового продукта
fastify.post('/products', async (request, reply) => {
  const { id, name, price } = request.body;
  const products = JSON.parse(await fs.readFileSync(productsFile));
  products.push({ id, name, price });
  await fs.writeFileSync(productsFile, JSON.stringify(products));
  // logToMonitoringService('Product Service', 'Product added successfully');
  return { message: 'Product added', id };
});

// Эндпоинт для обновления продукта
fastify.put('/products/:id', async (request, reply) => {
  const { id } = request.params;
  const { name, price } = request.body;
  const products = JSON.parse(await fs.readFileSync(productsFile));
  const product = products.find((p) => p.id === id);
  if (product) {
    if (name) product.name = name;
    if (price) product.price = price;
    await fs.writeFileSync(productsFile, JSON.stringify(products));
    // logToMonitoringService('Product Service', 'Product modifided successfully');
    return { message: 'Product updated', id };
  } else {
    return reply.code(404).send({ message: 'Product not found' });
  }
});

// Обработчик ошибок
fastify.setErrorHandler(async (error, request, reply) => {
  await logRequest('Product Service', 'error', `Error: ${error.message}`);
  reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: error.message,
  });
});

// Запуск сервера
const start = async () => {
  try {
    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('Product Service is running on http://0.0.0.0:3002');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
