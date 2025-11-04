const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// For Vercel/serverless environments, use Chromium binary
let chromium;
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  try {
    chromium = require('@sparticuz/chromium');
    // Set Chromium path for serverless
    chromium.setGraphicsMode(false);
    console.log('✅ Using @sparticuz/chromium for serverless environment');
  } catch (e) {
    console.warn('⚠️ @sparticuz/chromium not found, using default Puppeteer:', e.message);
  }
}

class PDFReportService {
  constructor() {
    // Use /tmp for serverless environments, local reports folder for development
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      // Serverless environment - use /tmp (writable in serverless)
      this.outputDir = '/tmp/reports';
    } else {
      // Local development
      this.outputDir = path.join(__dirname, '../../reports');
    }
    // Don't create directory in constructor - create it lazily when needed
  }

  ensureOutputDir() {
    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
    } catch (error) {
      // If directory creation fails (e.g., in read-only filesystem), use /tmp
      if (error.code === 'EACCES' || error.code === 'EROFS' || error.code === 'ENOENT') {
        this.outputDir = '/tmp/reports';
        try {
          if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
          }
        } catch (tmpError) {
          console.error('Failed to create reports directory:', tmpError.message);
          // Continue anyway - the file write will handle the error
        }
      } else {
        console.error('Failed to create reports directory:', error.message);
        throw error;
      }
    }
  }

  // Format currency for display
  formatCurrency(amount) {
    return 'Rs. ' + new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Format date for display
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Generate HTML template for reports
  generateHTMLTemplate(data, reportType, options = {}) {
    const { startDate, endDate, productName } = options;
    const currentDate = new Date().toLocaleDateString('en-PK');
    
    let title = '';
    let subtitle = '';
    
    switch (reportType) {
      case 'sales':
        title = 'Sales Report';
        subtitle = productName ? `${productName} Sales` : 'All Sales';
        break;
      case 'purchases':
        title = 'Purchases Report';
        subtitle = productName ? `${productName} Purchases` : 'All Purchases';
        break;
      case 'expenses':
        title = 'Expenses Report';
        subtitle = 'All Expenses';
        break;
      case 'users':
        title = 'Users Report';
        subtitle = 'User Statistics';
        break;
      case 'employees':
        title = 'Employees Report';
        subtitle = 'Employee Statistics';
        break;
      default:
        title = 'Business Report';
        subtitle = 'Comprehensive Analytics';
    }

    const dateRange = startDate && endDate 
      ? `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`
      : 'All Time';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #fff;
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                margin-bottom: 30px;
            }
            
            .header h1 {
                font-size: 2.5em;
                margin-bottom: 10px;
                font-weight: 300;
            }
            
            .header h2 {
                font-size: 1.3em;
                opacity: 0.9;
                font-weight: 400;
            }
            
            .header .date-info {
                margin-top: 15px;
                font-size: 0.9em;
                opacity: 0.8;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            .summary-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            
            .summary-card {
                background: #f8f9fa;
                border-radius: 10px;
                padding: 25px;
                text-align: center;
                border-left: 4px solid #667eea;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .summary-card h3 {
                color: #666;
                font-size: 0.9em;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .summary-card .amount {
                font-size: 2.2em;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 5px;
            }
            
            .summary-card .count {
                color: #7f8c8d;
                font-size: 1.1em;
            }
            
            .section {
                margin-bottom: 40px;
            }
            
            .section h3 {
                color: #2c3e50;
                font-size: 1.5em;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #ecf0f1;
            }
            
            .table-container {
                overflow-x: auto;
                margin-bottom: 30px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            th {
                background: #34495e;
                color: white;
                padding: 15px 12px;
                text-align: left;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 0.85em;
                letter-spacing: 0.5px;
            }
            
            td {
                padding: 12px;
                border-bottom: 1px solid #ecf0f1;
            }
            
            tr:nth-child(even) {
                background: #f8f9fa;
            }
            
            tr:hover {
                background: #e8f4f8;
            }
            
            .amount-cell {
                text-align: right;
                font-weight: 600;
                color: #27ae60;
            }
            
            .count-cell {
                text-align: center;
                font-weight: 600;
                color: #3498db;
            }
            
            .chart-placeholder {
                background: #f8f9fa;
                border: 2px dashed #bdc3c7;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                color: #7f8c8d;
                margin: 20px 0;
            }
            
            .footer {
                margin-top: 50px;
                padding: 20px;
                background: #f8f9fa;
                text-align: center;
                color: #7f8c8d;
                border-top: 1px solid #ecf0f1;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            @media print {
                .header {
                    background: #667eea !important;
                    -webkit-print-color-adjust: exact;
                }
                
                .summary-card {
                    box-shadow: none;
                    border: 1px solid #ddd;
                }
                
                table {
                    box-shadow: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${title}</h1>
            <h2>${subtitle}</h2>
            <div class="date-info">
                <strong>Period:</strong> ${dateRange} | <strong>Generated:</strong> ${currentDate}
            </div>
        </div>
        
        <div class="container">
            ${this.generateSummaryCards(data, reportType, options)}
            ${this.generateDetailedSections(data, reportType, options)}
        </div>
        
        <div class="footer">
            <p>Generated by Factory Management System | ${currentDate}</p>
        </div>
    </body>
    </html>
    `;
  }

  generateSummaryCards(data, reportType, options = {}) {
    let cards = '';
    const { productName } = options;
    const isSpecificProduct = !!productName;
    
    switch (reportType) {
      case 'sales':
        cards = `
          <div class="summary-cards">
            <div class="summary-card">
              <h3>${isSpecificProduct ? `${productName} Sales` : 'Total Sales'}</h3>
              <div class="amount">${this.formatCurrency(data.totalAmount || 0)}</div>
              <div class="count">${data.totalCount || 0} transactions</div>
            </div>
            <div class="summary-card">
              <h3>Average Sale</h3>
              <div class="amount">${this.formatCurrency(data.totalCount > 0 ? data.totalAmount / data.totalCount : 0)}</div>
              <div class="count">per transaction</div>
            </div>
            ${!isSpecificProduct ? `
            <div class="summary-card">
              <h3>Products Sold</h3>
              <div class="amount">${data.productBreakdown?.length || 0}</div>
              <div class="count">different products</div>
            </div>
            ` : ''}
          </div>
        `;
        break;
        
      case 'purchases':
        cards = `
          <div class="summary-cards">
            <div class="summary-card">
              <h3>${isSpecificProduct ? `${productName} Purchases` : 'Total Purchases'}</h3>
              <div class="amount">${this.formatCurrency(data.totalAmount || 0)}</div>
              <div class="count">${data.totalCount || 0} transactions</div>
            </div>
            <div class="summary-card">
              <h3>Average Purchase</h3>
              <div class="amount">${this.formatCurrency(data.totalCount > 0 ? data.totalAmount / data.totalCount : 0)}</div>
              <div class="count">per transaction</div>
            </div>
            ${!isSpecificProduct ? `
            <div class="summary-card">
              <h3>Products Bought</h3>
              <div class="amount">${data.productBreakdown?.length || 0}</div>
              <div class="count">different products</div>
            </div>
            ` : ''}
          </div>
        `;
        break;
        
      case 'expenses':
        cards = `
          <div class="summary-cards">
            <div class="summary-card">
              <h3>Total Expenses</h3>
              <div class="amount">${this.formatCurrency(data.totalAmount || 0)}</div>
              <div class="count">${data.totalCount || 0} transactions</div>
            </div>
            <div class="summary-card">
              <h3>Average Expense</h3>
              <div class="amount">${this.formatCurrency(data.totalCount > 0 ? data.totalAmount / data.totalCount : 0)}</div>
              <div class="count">per transaction</div>
            </div>
            <div class="summary-card">
              <h3>Categories</h3>
              <div class="amount">${data.categoryBreakdown?.length || 0}</div>
              <div class="count">expense categories</div>
            </div>
          </div>
        `;
        break;
        
      case 'users':
        cards = `
          <div class="summary-cards">
            <div class="summary-card">
              <h3>Total Users</h3>
              <div class="amount">${data.totalUsers || 0}</div>
              <div class="count">registered users</div>
            </div>
            <div class="summary-card">
              <h3>Active Users</h3>
              <div class="amount">${data.activeUsers || 0}</div>
              <div class="count">currently active</div>
            </div>
            <div class="summary-card">
              <h3>Activity Rate</h3>
              <div class="amount">${data.totalUsers > 0 ? Math.round((data.activeUsers / data.totalUsers) * 100) : 0}%</div>
              <div class="count">active percentage</div>
            </div>
          </div>
        `;
        break;
        
      case 'employees':
        cards = `
          <div class="summary-cards">
            <div class="summary-card">
              <h3>Total Employees</h3>
              <div class="amount">${data.totalEmployees || 0}</div>
              <div class="count">registered employees</div>
            </div>
            <div class="summary-card">
              <h3>Active Employees</h3>
              <div class="amount">${data.activeEmployees || 0}</div>
              <div class="count">currently active</div>
            </div>
            <div class="summary-card">
              <h3>Active Rate</h3>
              <div class="amount">${data.totalEmployees > 0 ? Math.round((data.activeEmployees / data.totalEmployees) * 100) : 0}%</div>
              <div class="count">active percentage</div>
            </div>
          </div>
        `;
        break;
    }
    
    return cards;
  }

  generateDetailedSections(data, reportType, options = {}) {
    let sections = '';
    const { productName } = options;
    const isSpecificProduct = !!productName;
    
    // Only show relevant sections based on report type
    switch (reportType) {
      case 'sales':
        // Sales-specific sections
        // Only show product breakdown if NOT a specific product report
        if (!isSpecificProduct && data.productBreakdown && data.productBreakdown.length > 0) {
          sections += `
            <div class="section">
              <h3>Sales by Product</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Total Sales</th>
                      <th>Transactions</th>
                      <th>Average Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.productBreakdown.map(item => `
                      <tr>
                        <td>${item.product}</td>
                        <td class="amount-cell">${this.formatCurrency(item.amount)}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="amount-cell">${this.formatCurrency(item.count > 0 ? item.amount / item.count : 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        
        if (data.monthlyData && data.monthlyData.length > 0) {
          sections += `
            <div class="section ${isSpecificProduct ? '' : 'page-break'}">
              <h3>${isSpecificProduct ? `Monthly Sales Trends for ${productName}` : 'Monthly Sales Trends'}</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Sales Amount</th>
                      <th>Transactions</th>
                      <th>Average Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.monthlyData.map(item => `
                      <tr>
                        <td>${item.month}</td>
                        <td class="amount-cell">${this.formatCurrency(item.amount)}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="amount-cell">${this.formatCurrency(item.count > 0 ? item.amount / item.count : 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        break;
        
      case 'purchases':
        // Purchases-specific sections
        // Only show product breakdown if NOT a specific product report
        if (!isSpecificProduct && data.productBreakdown && data.productBreakdown.length > 0) {
          sections += `
            <div class="section">
              <h3>Purchases by Product</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Total Purchases</th>
                      <th>Transactions</th>
                      <th>Average Purchase</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.productBreakdown.map(item => `
                      <tr>
                        <td>${item.product}</td>
                        <td class="amount-cell">${this.formatCurrency(item.amount)}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="amount-cell">${this.formatCurrency(item.count > 0 ? item.amount / item.count : 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        
        if (data.monthlyData && data.monthlyData.length > 0) {
          sections += `
            <div class="section ${isSpecificProduct ? '' : 'page-break'}">
              <h3>${isSpecificProduct ? `Monthly Purchase Trends for ${productName}` : 'Monthly Purchase Trends'}</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Purchase Amount</th>
                      <th>Transactions</th>
                      <th>Average Purchase</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.monthlyData.map(item => `
                      <tr>
                        <td>${item.month}</td>
                        <td class="amount-cell">${this.formatCurrency(item.amount)}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="amount-cell">${this.formatCurrency(item.count > 0 ? item.amount / item.count : 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        break;
        
      case 'expenses':
        // Expenses-specific sections
        if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
          sections += `
            <div class="section">
              <h3>Expenses by Category</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Total Amount</th>
                      <th>Transactions</th>
                      <th>Average Expense</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.categoryBreakdown.map(item => `
                      <tr>
                        <td>${item.category}</td>
                        <td class="amount-cell">${this.formatCurrency(item.amount)}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="amount-cell">${this.formatCurrency(item.count > 0 ? item.amount / item.count : 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        
        if (data.monthlyData && data.monthlyData.length > 0) {
          sections += `
            <div class="section page-break">
              <h3>Monthly Expense Trends</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Expense Amount</th>
                      <th>Transactions</th>
                      <th>Average Expense</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.monthlyData.map(item => `
                      <tr>
                        <td>${item.month}</td>
                        <td class="amount-cell">${this.formatCurrency(item.amount)}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="amount-cell">${this.formatCurrency(item.count > 0 ? item.amount / item.count : 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        break;
        
      case 'users':
        // Users-specific sections
        if (data.usersByRole && data.usersByRole.length > 0) {
          sections += `
            <div class="section">
              <h3>Users by Role</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.usersByRole.map(item => `
                      <tr>
                        <td>${item.role}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="count-cell">${data.totalUsers > 0 ? Math.round((item.count / data.totalUsers) * 100) : 0}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        
        if (data.monthlyRegistrations && data.monthlyRegistrations.length > 0) {
          sections += `
            <div class="section page-break">
              <h3>Monthly User Registrations</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>New Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.monthlyRegistrations.map(item => `
                      <tr>
                        <td>${item.month}</td>
                        <td class="count-cell">${item.count}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        break;
        
      case 'employees':
        // Employees-specific sections
        if (data.employeesByType && data.employeesByType.length > 0) {
          sections += `
            <div class="section">
              <h3>Employees by Type</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.employeesByType.map(item => `
                      <tr>
                        <td>${item.type}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="count-cell">${data.totalEmployees > 0 ? Math.round((item.count / data.totalEmployees) * 100) : 0}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        
        if (data.employeesByDepartment && data.employeesByDepartment.length > 0) {
          sections += `
            <div class="section page-break">
              <h3>Employees by Department</h3>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.employeesByDepartment.map(item => `
                      <tr>
                        <td>${item.department}</td>
                        <td class="count-cell">${item.count}</td>
                        <td class="count-cell">${data.totalEmployees > 0 ? Math.round((item.count / data.totalEmployees) * 100) : 0}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        break;
    }
    
    return sections;
  }

  // Generate PDF from HTML
  async generatePDF(html, filename) {
    // Ensure output directory exists before creating PDF (lazy initialization)
    this.ensureOutputDir();
    
    // Configure Puppeteer for serverless environments
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    };
    
    // For Vercel/serverless, use Chromium binary
    if (chromium && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
      try {
        const executablePath = await chromium.executablePath();
        launchOptions.executablePath = executablePath;
        launchOptions.args = [
          ...chromium.args,
          '--hide-scrollbars',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ];
        console.log('✅ Using Chromium executable:', executablePath);
      } catch (chromiumError) {
        console.error('❌ Error getting Chromium executable path:', chromiumError.message);
        // Fall back to default Puppeteer
        console.log('⚠️ Falling back to default Puppeteer configuration');
      }
    }
    
    let browser;
    try {
      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const filePath = path.join(this.outputDir, filename);
      
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      return filePath;
    } catch (error) {
      console.error('❌ Error in PDF generation:', error.message);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Generate sales report PDF
  async generateSalesReport(data, options = {}) {
    const html = this.generateHTMLTemplate(data, 'sales', options);
    const filename = `sales-report-${Date.now()}.pdf`;
    return await this.generatePDF(html, filename);
  }

  // Generate purchases report PDF
  async generatePurchasesReport(data, options = {}) {
    const html = this.generateHTMLTemplate(data, 'purchases', options);
    const filename = `purchases-report-${Date.now()}.pdf`;
    return await this.generatePDF(html, filename);
  }

  // Generate expenses report PDF
  async generateExpensesReport(data, options = {}) {
    const html = this.generateHTMLTemplate(data, 'expenses', options);
    const filename = `expenses-report-${Date.now()}.pdf`;
    return await this.generatePDF(html, filename);
  }

  // Generate users report PDF
  async generateUsersReport(data, options = {}) {
    const html = this.generateHTMLTemplate(data, 'users', options);
    const filename = `users-report-${Date.now()}.pdf`;
    return await this.generatePDF(html, filename);
  }

  // Generate employees report PDF
  async generateEmployeesReport(data, options = {}) {
    const html = this.generateHTMLTemplate(data, 'employees', options);
    const filename = `employees-report-${Date.now()}.pdf`;
    return await this.generatePDF(html, filename);
  }

  // Generate comprehensive business report PDF
  async generateComprehensiveReport(allData, options = {}) {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprehensive Business Report</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 2.5em; margin-bottom: 10px; font-weight: 300; }
            .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
            .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .overview-card { background: #f8f9fa; border-radius: 10px; padding: 20px; text-align: center; border-left: 4px solid #667eea; }
            .overview-card h3 { color: #666; font-size: 0.9em; margin-bottom: 10px; text-transform: uppercase; }
            .overview-card .amount { font-size: 1.8em; font-weight: bold; color: #2c3e50; }
            .section { margin-bottom: 40px; page-break-inside: avoid; }
            .section h3 { color: #2c3e50; font-size: 1.5em; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #ecf0f1; }
            .page-break { page-break-before: always; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Comprehensive Business Report</h1>
            <h2>Complete Business Analytics</h2>
            <div style="margin-top: 15px; font-size: 0.9em; opacity: 0.8;">
                <strong>Generated:</strong> ${new Date().toLocaleDateString('en-PK')}
            </div>
        </div>
        
        <div class="container">
            <div class="overview-grid">
                <div class="overview-card">
                    <h3>Total Sales</h3>
                    <div class="amount">${this.formatCurrency(allData.sales?.totalAmount || 0)}</div>
                </div>
                <div class="overview-card">
                    <h3>Total Purchases</h3>
                    <div class="amount">${this.formatCurrency(allData.purchases?.totalAmount || 0)}</div>
                </div>
                <div class="overview-card">
                    <h3>Total Expenses</h3>
                    <div class="amount">${this.formatCurrency(allData.expenses?.totalAmount || 0)}</div>
                </div>
                <div class="overview-card">
                    <h3>Total Users</h3>
                    <div class="amount">${allData.users?.totalUsers || 0}</div>
                </div>
                <div class="overview-card">
                    <h3>Total Employees</h3>
                    <div class="amount">${allData.employees?.totalEmployees || 0}</div>
                </div>
                <div class="overview-card">
                    <h3>Net Profit</h3>
                    <div class="amount">${this.formatCurrency((allData.sales?.totalAmount || 0) - (allData.purchases?.totalAmount || 0) - (allData.expenses?.totalAmount || 0))}</div>
                </div>
            </div>
            
            ${allData.sales ? this.generateDetailedSections(allData.sales, 'sales') : ''}
            <div class="page-break"></div>
            ${allData.purchases ? this.generateDetailedSections(allData.purchases, 'purchases') : ''}
            <div class="page-break"></div>
            ${allData.expenses ? this.generateDetailedSections(allData.expenses, 'expenses') : ''}
            <div class="page-break"></div>
            ${allData.users ? this.generateDetailedSections(allData.users, 'users') : ''}
            <div class="page-break"></div>
            ${allData.employees ? this.generateDetailedSections(allData.employees, 'employees') : ''}
        </div>
    </body>
    </html>
    `;
    
    const filename = `comprehensive-business-report-${Date.now()}.pdf`;
    return await this.generatePDF(html, filename);
  }
}

module.exports = new PDFReportService();
