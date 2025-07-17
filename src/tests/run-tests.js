#!/usr/bin/env node

/**
 * Скрипт для автоматического запуска Postman тестов
 * Требует установки Newman: npm install -g newman
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Конфигурация
const config = {
  collectionPath: path.join(__dirname, 'postman_collection.json'),
  environmentPath: path.join(__dirname, 'postman_environment.json'),
  resultsDir: path.join(__dirname, 'results'),
  reportsDir: path.join(__dirname, 'reports')
};

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Утилиты для логирования
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

// Проверка зависимостей
function checkDependencies() {
  try {
    execSync('newman --version', { stdio: 'pipe' });
    log.success('Newman CLI найден');
  } catch (error) {
    log.error('Newman CLI не найден. Установите: npm install -g newman');
    process.exit(1);
  }
}

// Проверка файлов
function checkFiles() {
  const files = [
    { path: config.collectionPath, name: 'Postman Collection' },
    { path: config.environmentPath, name: 'Postman Environment' }
  ];

  files.forEach(file => {
    if (fs.existsSync(file.path)) {
      log.success(`${file.name} найден: ${file.path}`);
    } else {
      log.error(`${file.name} не найден: ${file.path}`);
      process.exit(1);
    }
  });
}

// Создание директорий для результатов
function createDirectories() {
  const dirs = [config.resultsDir, config.reportsDir];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.info(`Создана директория: ${dir}`);
    }
  });
}

// Запуск тестов
function runTests() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(config.resultsDir, `test-results-${timestamp}.json`);
  const htmlReport = path.join(config.reportsDir, `report-${timestamp}.html`);

  log.header('🚀 Запуск автоматизированных тестов Postman');

  const command = [
    'newman',
    'run', config.collectionPath,
    '--environment', config.environmentPath,
    '--reporters', 'cli,json,html',
    '--reporter-json-export', resultsFile,
    '--reporter-html-export', htmlReport,
    '--bail'
  ].join(' ');

  try {
    log.info('Выполняется команда:');
    console.log(`  ${command}\n`);
    
    const result = execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf8'
    });

    log.success('Тесты выполнены успешно!');
    log.info(`Результаты сохранены в: ${resultsFile}`);
    log.info(`HTML отчет: ${htmlReport}`);

    return true;
  } catch (error) {
    log.error('Тесты завершились с ошибками');
    return false;
  }
}

// Анализ результатов
function analyzeResults() {
  const resultsFiles = fs.readdirSync(config.resultsDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .reverse();

  if (resultsFiles.length === 0) {
    log.warning('Файлы результатов не найдены');
    return;
  }

  const latestResultsFile = path.join(config.resultsDir, resultsFiles[0]);
  
  try {
    const results = JSON.parse(fs.readFileSync(latestResultsFile, 'utf8'));
    
    log.header('📊 Анализ результатов тестов');
    
    const stats = results.run.stats;
    const failedTests = stats.assertions.failed;

    if (failedTests > 0) {
      log.warning('Обнаружены проваленные тесты. Проверьте отчеты для деталей.');
    } else {
      log.success('Все тесты прошли успешно!');
    }

  } catch (error) {
    log.error('Ошибка при анализе результатов:', error.message);
  }
}

// Основная функция
function main() {
  log.header('🧪 Автоматизированные тесты Postman');
  
  try {
    checkDependencies();
    checkFiles();
    createDirectories();
    
    const success = runTests();
    
    if (success) {
      analyzeResults();
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    log.error('Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  analyzeResults,
  config
}; 