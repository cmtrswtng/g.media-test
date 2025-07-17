#!/usr/bin/env node

/**
 * Скрипт для генерации детальных отчетов по результатам тестов Postman
 */

const fs = require('fs');
const path = require('path');

// Конфигурация
const config = {
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

// Анализ результатов тестов
function analyzeTestResults(resultsFile) {
  try {
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    const stats = results.run.stats;
    const executions = results.run.executions || [];

    // Корректно вычисляем passedTests и successRate
    const totalTests = stats.assertions.total;
    const failedTests = stats.assertions.failed;
    const passedTests = typeof stats.assertions.passed === 'number'
      ? stats.assertions.passed
      : (typeof totalTests === 'number' && typeof failedTests === 'number'
          ? totalTests - failedTests
          : undefined);
    const successRate = (typeof totalTests === 'number' && totalTests > 0
      ? ((passedTests / totalTests) * 100).toFixed(1)
      : 'N/A');

    return {
      stats,
      executions,
      totalTests,
      passedTests,
      failedTests,
      successRate,
      totalRequests: stats.requests.total,
      failedRequests: stats.requests.failed,
      averageResponseTime: calculateAverageResponseTime(executions)
    };
  } catch (error) {
    log.error(`Ошибка при анализе файла ${resultsFile}: ${error.message}`);
    return null;
  }
}

// Расчет среднего времени отклика
function calculateAverageResponseTime(executions) {
  if (!executions || executions.length === 0) return 0;
  
  const totalTime = executions.reduce((sum, execution) => {
    return sum + (execution.response?.responseTime || 0);
  }, 0);
  
  return Math.round(totalTime / executions.length);
}

// Генерация HTML отчета
function generateHTMLReport(analysis, timestamp) {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет по тестам API - ${timestamp}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #007bff;
        }
        .stat-card.success {
            border-left-color: #28a745;
        }
        .stat-card.warning {
            border-left-color: #ffc107;
        }
        .stat-card.danger {
            border-left-color: #dc3545;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .success .stat-number { color: #28a745; }
        .warning .stat-number { color: #ffc107; }
        .danger .stat-number { color: #dc3545; }
        .info .stat-number { color: #007bff; }
        .summary {
            padding: 30px;
            border-top: 1px solid #e9ecef;
        }
        .summary h2 {
            color: #495057;
            margin-bottom: 20px;
        }
        .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        .summary-item:last-child {
            border-bottom: none;
        }
        .summary-label {
            font-weight: 500;
            color: #495057;
        }
        .summary-value {
            font-weight: bold;
        }
        .success-rate {
            color: ${analysis.successRate >= 90 ? '#28a745' : analysis.successRate >= 70 ? '#ffc107' : '#dc3545'};
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }
        .chart-container {
            padding: 30px;
            border-top: 1px solid #e9ecef;
        }
        .chart {
            height: 300px;
            background: #f8f9fa;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
        }
        .chart-text {
            font-size: 1.2em;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Отчет по тестам API</h1>
            <p>Автоматизированные тесты Postman - ${timestamp}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card ${analysis.successRate >= 90 ? 'success' : analysis.successRate >= 70 ? 'warning' : 'danger'}">
                <div class="stat-number">${analysis.successRate}%</div>
                <div class="stat-label">Процент успеха</div>
            </div>
            <div class="stat-card info">
                <div class="stat-number">${analysis.totalTests}</div>
                <div class="stat-label">Всего тестов</div>
            </div>
            <div class="stat-card success">
                <div class="stat-number">${analysis.passedTests}</div>
                <div class="stat-label">Успешных</div>
            </div>
            <div class="stat-card ${analysis.failedTests > 0 ? 'danger' : 'success'}">
                <div class="stat-number">${analysis.failedTests}</div>
                <div class="stat-label">Проваленных</div>
            </div>
            <div class="stat-card info">
                <div class="stat-number">${analysis.totalRequests}</div>
                <div class="stat-label">HTTP запросов</div>
            </div>
            <div class="stat-card info">
                <div class="stat-number">${analysis.averageResponseTime}ms</div>
                <div class="stat-label">Среднее время отклика</div>
            </div>
        </div>
        
        <div class="summary">
            <h2>📋 Детальная статистика</h2>
            <div class="summary-item">
                <span class="summary-label">Общее время выполнения</span>
                <span class="summary-value">${analysis.stats.timings && analysis.stats.timings.completed !== undefined ? analysis.stats.timings.completed + 'ms' : 'N/A'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Среднее время запроса</span>
                <span class="summary-value">${analysis.averageResponseTime}ms</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Процент успешных тестов</span>
                <span class="summary-value success-rate">${analysis.successRate}%</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Количество проваленных запросов</span>
                <span class="summary-value">${analysis.failedRequests}</span>
            </div>
        </div>
        
        <div class="chart-container">
            <h2>📈 Визуализация результатов</h2>
            <div class="chart">
                <div class="chart-text">
                    График успешности тестов: ${analysis.passedTests}/${analysis.totalTests} (${analysis.successRate}%)
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Отчет сгенерирован автоматически ${new Date().toLocaleString('ru-RU')}</p>
            <p>Микросервис управления задачами - GraphQL & REST API</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

// Основная функция
function generateReport() {
  log.header('📊 Генерация отчета по тестам');
  
  try {
    // Проверка директории результатов
    if (!fs.existsSync(config.resultsDir)) {
      log.error('Директория результатов не найдена');
      return;
    }
    
    // Поиск последнего файла результатов
    const resultsFiles = fs.readdirSync(config.resultsDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (resultsFiles.length === 0) {
      log.warning('Файлы результатов не найдены');
      return;
    }
    
    const latestResultsFile = path.join(config.resultsDir, resultsFiles[0]);
    log.info(`Анализ файла: ${latestResultsFile}`);
    
    // Анализ результатов
    const analysis = analyzeTestResults(latestResultsFile);
    if (!analysis) {
      log.error('Не удалось проанализировать результаты');
      return;
    }
    
    // Создание директории отчетов
    if (!fs.existsSync(config.reportsDir)) {
      fs.mkdirSync(config.reportsDir, { recursive: true });
    }
    
    // Генерация отчета
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(config.reportsDir, `detailed-report-${timestamp}.html`);
    const html = generateHTMLReport(analysis, timestamp);
    
    fs.writeFileSync(reportFile, html);
    
    log.success('Отчет сгенерирован успешно!');
    log.info(`Файл отчета: ${reportFile}`);
    
    // Вывод статистики в консоль
    console.log(`\n${colors.bright}Статистика тестов:${colors.reset}`);
    console.log(`  Процент успеха: ${colors.cyan}${analysis.successRate}%${colors.reset}`);
    console.log(`  Всего тестов: ${analysis.totalTests}`);
    console.log(`  Успешных: ${colors.green}${analysis.passedTests}${colors.reset}`);
    console.log(`  Проваленных: ${colors.red}${analysis.failedTests}${colors.reset}`);
    console.log(`  Среднее время отклика: ${analysis.averageResponseTime}ms`);
    
  } catch (error) {
    log.error('Ошибка при генерации отчета:');
    console.error(error);
    console.error('Stack trace:', error.stack);
  }
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
  generateReport();
}

module.exports = {
  generateReport,
  analyzeTestResults
}; 