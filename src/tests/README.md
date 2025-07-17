# Автоматизированные тесты Postman

## 📋 Обзор

Эта коллекция содержит полный набор автоматизированных тестов для микросервиса управления задачами, включая:

- **REST API тесты** - CRUD операции
- **GraphQL тесты** - мутации и запросы
- **Тесты безопасности** - XSS защита, валидация
- **Тесты производительности** - время отклика, нагрузка
- **Интеграционные тесты** - полные сценарии

## 🚀 Запуск тестов

### 1. Подготовка окружения

```bash
# Запуск инфраструктуры
docker-compose up -d

# Запуск сервера
npm run dev
```

### 2. Импорт коллекции

1. Откройте Postman
2. Импортируйте файл `postman_collection.json`
3. Проверьте переменные окружения:
   - `baseUrl`: http://localhost:3000
   - `apiPrefix`: /api/v1
   - `graphqlPath`: /graphql

### 3. Запуск тестов

#### Запуск всех тестов:
1. Откройте коллекцию в Postman
2. Нажмите "Run collection"
3. Выберите все тесты
4. Нажмите "Run"

#### Запуск отдельных групп:
- **Setup & Environment Tests** - проверка работоспособности сервера
- **REST API Tests** - тестирование CRUD операций
- **GraphQL API Tests** - тестирование GraphQL endpoints
- **Security Tests** - проверка безопасности
- **Integration Tests** - полные сценарии
- **Performance Tests** - тесты производительности

## 📊 Структура тестов

### 🔧 Setup & Environment Tests
- **Health Check** - проверка доступности сервера
- **CORS Headers** - проверка CORS настроек

### 📝 REST API - CRUD Operations
- **Create Task - Success Case** - успешное создание задачи
- **Create Task - Validation Tests** - тесты валидации:
  - Empty Title - пустой заголовок
  - Title Too Long - слишком длинный заголовок
  - Invalid Date Format - неверный формат даты
  - Invalid Status - неверный статус
- **Get Task by ID** - получение задачи по ID
- **Get Tasks - All Tasks** - получение всех задач
- **Get Tasks - Filter by Status** - фильтрация по статусу
- **Update Task** - обновление задачи

### 🔍 GraphQL API Tests
- **Create Task - GraphQL** - создание через GraphQL
- **Get Task - GraphQL** - получение через GraphQL
- **Get Tasks - GraphQL** - получение списка через GraphQL
- **Update Task - GraphQL** - обновление через GraphQL

### 🛡️ Security & Performance Tests
- **XSS Protection Test** - проверка защиты от XSS
- **Rate Limiting Test** - проверка ограничений запросов
- **Invalid Content-Type Test** - проверка валидации заголовков

### 🔗 Integration Tests
- **Full CRUD Workflow Test** - полный цикл CRUD операций:
  1. Create Task - создание задачи
  2. Read Task - чтение задачи
  3. Update Task - обновление задачи
  4. Verify in List - проверка в списке

### 📊 Performance & Load Tests
- **Response Time Test** - проверка времени отклика
- **Concurrent Requests Test** - тест конкурентных запросов

## 🎯 Интерпретация результатов

### Успешные тесты (зеленые):
- ✅ Все проверки пройдены
- ✅ API работает корректно
- ✅ Безопасность обеспечена

### Проваленные тесты (красные):
- ❌ Проблемы с валидацией
- ❌ Ошибки безопасности
- ❌ Проблемы производительности

### Типичные проблемы:

#### 1. Ошибки валидации
```
Status code is 400 for empty title
Error message mentions title
```
**Решение**: Проверьте схему валидации в `src/schemas/task.schema.ts`

#### 2. Ошибки безопасности
```
XSS content is sanitized
```
**Решение**: Проверьте санитайзинг в `src/services/task.service.ts`

#### 3. Ошибки производительности
```
Response time is under 500ms
```
**Решение**: Оптимизируйте запросы к БД, добавьте индексы

## 🔧 Настройка тестов

### Переменные окружения

Создайте файл `postman_environment.json`:

```json
{
  "name": "Task Management API - Local",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "enabled": true
    },
    {
      "key": "apiPrefix",
      "value": "/api/v1",
      "enabled": true
    },
    {
      "key": "graphqlPath",
      "value": "/graphql",
      "enabled": true
    }
  ]
}
```

### Настройка для CI/CD

Для автоматизации в CI/CD:

```bash
# Установка Newman (CLI для Postman)
npm install -g newman

# Запуск тестов
newman run src/tests/postman_collection.json \
  --environment src/tests/postman_environment.json \
  --reporters cli,json \
  --reporter-json-export test-results.json
```

## 📈 Метрики и отчеты

### Автоматические отчеты
- Время выполнения каждого теста
- Процент успешных тестов
- Детализация ошибок

### Мониторинг производительности
- Время отклика API
- Количество запросов в секунду
- Использование памяти

## 🐛 Отладка

### Логи сервера
```bash
# Просмотр логов в реальном времени
npm run dev | grep -E "(ERROR|WARN|INFO)"
```

### Логи тестов
- Проверьте консоль Postman
- Изучите детали ошибок в отчетах
- Проверьте переменные окружения

## 📝 Добавление новых тестов

### Структура теста:
```javascript
pm.test("Описание теста", function () {
    // Проверка статуса
    pm.response.to.have.status(200);
    
    // Проверка данных
    const response = pm.response.json();
    pm.expect(response).to.have.property('field');
    
    // Проверка значений
    pm.expect(response.field).to.eql("expected_value");
});
```

### Сохранение переменных:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.collectionVariables.set("taskId", response._id);
}
```

## 🎉 Заключение

Эта коллекция тестов обеспечивает:

- ✅ **Полное покрытие** API endpoints
- ✅ **Автоматическую проверку** безопасности
- ✅ **Мониторинг** производительности
- ✅ **Интеграционное тестирование** полных сценариев
- ✅ **Готовность к CI/CD** с Newman

Запускайте тесты регулярно для обеспечения качества API! 