# Используем официальный образ Node.js
FROM node:18

# Устанавливаем рабочую директорию
WORKDIR /usr/src/app

# Копируем файлы проекта
COPY package*.json ./
COPY . .

# Устанавливаем зависимости
RUN npm install

# Указываем порт
EXPOSE 3001

# Команда запуска
CMD ["node", "index.js"]
