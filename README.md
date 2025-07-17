# Task Management Microservice

Микросервис для управления задачами с GraphQL и REST API, использующий MongoDB для хранения данных и RabbitMQ для асинхронной обработки сообщений.

## Архитектура

### Модули
- **Models** (`src/models/`) - Модели данных и типы
- **Services** (`src/services/`) - Бизнес-логика и интеграции с внешними сервисами
- **Controllers** (`src/controllers/`) - Обработчики HTTP запросов
- **Routes** (`src/routes/`) - Определение REST API маршрутов
- **GraphQL** (`src/graphql/`) - GraphQL схема и резолверы
- **Schemas** (`src/schemas/`) - Схемы валидации для Fastify

### RabbitMQ Архитектура

Используется **Direct Exchange** с именем `task.exchange` для маршрутизации сообщений:

- **Exchange**: `task.exchange` (тип: direct)
- **Queue**: `task.actions` (привязана к Exchange с routing key `task.action`)
- **Routing Key**: `task.action`

**Выбор Direct Exchange**: Direct Exchange обеспечивает точную маршрутизацию сообщений на основе routing key, что идеально подходит для системы уведомлений о действиях с задачами. Каждое действие (создание/обновление задачи) публикуется с одним routing key, что позволяет легко масштабировать систему, добавляя новые очереди для различных обработчиков.

## Установка и запуск

### Предварительные требования
- Node.js 18+
- Docker и Docker Compose

### 1. Клонирование и установка зависимостей
```bash
git clone <repository-url>
cd g.media-test
npm install
```

### 2. Настройка переменных окружения
```bash
# Скопируйте файл с примером переменных окружения
cp .env.example .env

# Отредактируйте .env файл под ваши настройки
# Основные переменные для изменения:
# - MONGODB_URI - URI подключения к MongoDB
# - RABBITMQ_URL - URL подключения к RabbitMQ
# - PORT - Порт сервера (по умолчанию 3000)
# - API_PREFIX - Префикс для REST API (по умолчанию /api/v1)
# - GRAPHQL_PATH - Путь к GraphQL endpoint (по умолчанию /graphql)
```

### 3. Запуск окружения с Docker Compose
```bash
docker-compose up -d
```

Это запустит:
- MongoDB на порту 27017
- RabbitMQ на порту 5672
- RabbitMQ Management UI на порту 15672

### 4. Генерация GraphQL типов
```bash
npm run codegen
```

### 5. Запуск сервера разработки
```bash
npm run dev
```

Сервер будет доступен на:
- REST API: http://localhost:3000
- GraphQL: http://localhost:3000/graphql

## Конфигурация

### Переменные окружения

Основные переменные окружения, которые можно настроить в файле `.env`:

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `PORT` | Порт сервера | 3000 |
| `NODE_ENV` | Окружение (development/production) | development |
| `MONGODB_URI` | URI подключения к MongoDB | mongodb://localhost:27017/task-management |
| `MONGODB_DB_NAME` | Имя базы данных MongoDB | task-management |
| `RABBITMQ_URL` | URL подключения к RabbitMQ | amqp://localhost:5672 |
| `RABBITMQ_EXCHANGE_NAME` | Имя Exchange в RabbitMQ | task-exchange |
| `RABBITMQ_QUEUE_NAME` | Имя очереди в RabbitMQ | task-queue |
| `RABBITMQ_ROUTING_KEY` | Routing key для RabbitMQ | task-actions |
| `LOG_LEVEL` | Уровень логирования | info |
| `LOG_FORMAT` | Формат логов | json |
| `CORS_ORIGIN` | Разрешенные CORS origins | http://localhost:3000 |
| `RATE_LIMIT_WINDOW_MS` | Окно для rate limiting (мс) | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Максимум запросов в окне | 100 |
| `GRAPHQL_PATH` | Путь к GraphQL endpoint | /graphql |
| `GRAPHQL_INTROSPECTION` | Включить introspection | true |
| `API_PREFIX` | Префикс для REST API | /api/v1 |
| `REQUEST_TIMEOUT` | Таймаут запросов (мс) | 30000 |

## API Endpoints

### REST API

#### Создание задачи
```http
POST /api/v1/tasks
Content-Type: application/json

{
  "title": "Название задачи",
  "description": "Описание задачи",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "status": "открыта"
}
```

#### Получение задачи по ID
```http
GET /api/v1/tasks/:id
```

#### Получение списка задач
```http
GET /api/v1/tasks?status=открыта
```

#### Обновление задачи
```http
PATCH /api/v1/tasks/:id
Content-Type: application/json

{
  "title": "Обновленное название",
  "status": "в процессе"
}
```

### GraphQL API

#### Создание задачи
```graphql
mutation CreateTask($input: CreateTaskInput!) {
  createTask(
    title: $input.title
    description: $input.description
    dueDate: $input.dueDate
    status: $input.status
  ) {
    id
    title
    description
    status
    dueDate
  }
}
```

#### Получение задачи
```graphql
query GetTask($id: ID!) {
  getTask(id: $id) {
    id
    title
    description
    status
    dueDate
  }
}
```

#### Получение списка задач
```graphql
query GetTasks($status: TaskStatus) {
  getTasks(status: $status) {
    id
    title
    description
    status
    dueDate
  }
}
```

## Безопасность

### Валидация и санитайзинг
- Используется Fastify Validation для валидации входных данных
- Санитайзинг HTML с помощью `sanitize-html` для защиты от XSS
- Ограничения длины: заголовок (100 символов), описание (500 символов)
- Валидация формата даты и enum значений

### Защита от XSS
- Все пользовательские данные проходят через `sanitize-html`
- Удаляются все HTML теги и атрибуты
- Используются регулярные выражения для дополнительной фильтрации

## Тестирование

### Автоматизированные тесты Postman

Проект включает полный набор автоматизированных тестов Postman с покрытием всех API endpoints:

#### Установка и настройка
```bash
# Установка Newman CLI для автоматизации
npm run test:postman:setup

# Или вручную
npm install -g newman
```

#### Запуск тестов
```bash
# Запуск всех тестов
npm run test:postman

# Запуск тестов с генерацией отчета
npm run test:postman:full

# Только генерация отчета
npm run test:postman:report
```

#### Структура тестов
- **🔧 Setup & Environment Tests** - проверка работоспособности сервера
- **📝 REST API - CRUD Operations** - тестирование CRUD операций
- **🔍 GraphQL API Tests** - тестирование GraphQL endpoints  
- **🛡️ Security & Performance Tests** - проверка безопасности и производительности
- **🔗 Integration Tests** - полные сценарии интеграции
- **📊 Performance & Load Tests** - тесты производительности

#### Файлы тестов
- `src/tests/postman_collection.json` - основная коллекция тестов
- `src/tests/postman_environment.json` - переменные окружения
- `src/tests/test-data.json` - тестовые данные
- `src/tests/run-tests.js` - скрипт автоматизации
- `src/tests/generate-report.js` - генератор отчетов

#### Отчеты
Тесты генерируют:
- JSON отчеты в `src/tests/results/`
- HTML отчеты в `src/tests/reports/`
- Консольную статистику с цветным выводом

### Ручное тестирование

#### Postman Collection
Импортируйте файл `src/tests/postman_collection.json` в Postman для ручного тестирования.

#### GraphQL Playground
Откройте http://localhost:3000/graphql в браузере для интерактивного тестирования GraphQL API.

## RabbitMQ Интеграция

### Публикация событий
При создании или обновлении задачи автоматически публикуется сообщение в RabbitMQ:

```json
{
  "taskId": "task_id",
  "action": "created|updated",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Потребление событий
Сервис автоматически потребляет сообщения из очереди и логирует их в консоль.

## Тестирование

### Postman Collection
Создана коллекция тестов для всех API endpoints:
- Тесты успешного создания задачи
- Тесты валидации неверных данных
- Тесты получения и обновления задач
- Тесты фильтрации по статусу

**Публичный Workspace**: [Перейти в Postman Workspace](https://app.getpostman.com/join-team?invite_code=ed69d301e500f64527e8f8f2207380c74d9e90ad08be65dfd7a5dd72975f9bd2&target_code=023992f25a6c63bb56f477ad8e5c20d7)

## Использование LLM

### Сгенерированные компоненты
1. **Базовые сервисы** - MongoDB и RabbitMQ интеграции
2. **Схемы валидации** - Fastify JSON Schema
3. **GraphQL резолверы** - с использованием сгенерированных типов
4. **Контроллеры** - REST API обработчики
5. **Документация** - README и комментарии

### Проверка LLM кода
- Все сгенерированные файлы проходят TypeScript компиляцию
- Интеграционные тесты проверяют работу всей системы
- Ручная проверка критических компонентов (безопасность, бизнес-логика)

## Развертывание

### Продакшн сборка
```bash
npm run build
npm start
```

### Переменные окружения
- `MONGODB_URI` - URI подключения к MongoDB
- `RABBITMQ_URL` - URL подключения к RabbitMQ
- `PORT` - Порт сервера (по умолчанию 3000)

## Мониторинг и логирование

Используется Pino для структурированного логирования:
- Логи подключения к базам данных
- Логи RabbitMQ событий
- Логи HTTP запросов
- Логи ошибок

## Возможные улучшения

1. **Кэширование** - Redis для кэширования часто запрашиваемых данных
2. **Мониторинг** - Prometheus метрики, Grafana дашборды
3. **Контейнеризация** - Docker образ для микросервиса
4. **CI/CD** - Автоматическое тестирование и деплой
5. **Документация API** - Swagger/OpenAPI спецификация 