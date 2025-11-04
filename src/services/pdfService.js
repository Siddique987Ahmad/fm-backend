// // ===============================================
// // services/pdfService.js - PDF Generation Service
// // ===============================================
// const PDFDocument = require('pdfkit');
// const fs = require('fs');
// const path = require('path');

// class PDFService {
//   constructor() {
//     this.doc = null;
//     this.currentY = 0;
//     this.pageWidth = 595.28; // A4 width in points
//     this.pageHeight = 841.89; // A4 height in points
//     this.margin = 50;
//     this.contentWidth = this.pageWidth - (this.margin * 2);
//   }

//   // Initialize PDF document
//   initDocument(title, orientation = 'portrait') {
//     this.doc = new PDFDocument({
//       size: 'A4',
//       layout: orientation,
//       margin: this.margin,
//       info: {
//         Title: title,
//         Author: 'Al Hamad Oil Factory',
//         Creator: 'Al Hamad Oil Factory Management System',
//         CreationDate: new Date()
//       }
//     });
//     this.currentY = this.margin;
//     return this.doc;
//   }

//   // Add company header
//   addHeader(title, subtitle = null) {
//     const doc = this.doc;
    
//     // Company name
//     doc.fontSize(20)
//        .font('Helvetica-Bold')
//        .text('Al Hamad Oil Factory', this.margin, this.currentY, { align: 'center' });
    
//     this.currentY += 30;
    
//     // Report title
//     doc.fontSize(16)
//        .font('Helvetica-Bold')
//        .text(title, this.margin, this.currentY, { align: 'center' });
    
//     this.currentY += 25;
    
//     // Subtitle if provided
//     if (subtitle) {
//       doc.fontSize(12)
//          .font('Helvetica')
//          .text(subtitle, this.margin, this.currentY, { align: 'center' });
//       this.currentY += 20;
//     }
    
//     // Date and time
//     doc.fontSize(10)
//        .font('Helvetica')
//        .text(`Generated on: ${new Date().toLocaleString('en-PK')}`, this.margin, this.currentY, { align: 'center' });
    
//     this.currentY += 30;
    
//     // Add line separator
//     doc.moveTo(this.margin, this.currentY)
//        .lineTo(this.pageWidth - this.margin, this.currentY)
//        .stroke();
    
//     this.currentY += 20;
//   }

//   // Add summary statistics
//   addSummaryStats(stats) {
//     const doc = this.doc;
//     const boxWidth = (this.contentWidth - 30) / 4; // 4 columns with spacing
//     const boxHeight = 60;
//     const startX = this.margin;
    
//     doc.fontSize(12).font('Helvetica-Bold').text('Summary Statistics', startX, this.currentY);
//     this.currentY += 25;
    
//     const statBoxes = [
//       { label: 'Total Records', value: stats.totalRecords || 0, color: '#3B82F6' },
//       { label: 'Total Amount', value: `Rs.${(stats.totalAmount || 0).toLocaleString()}`, color: '#10B981' },
//       { label: 'Paid Amount', value: `Rs.${(stats.paidAmount || 0).toLocaleString()}`, color: '#06B6D4' },
//       { label: 'Pending Amount', value: `Rs.${(stats.pendingAmount || 0).toLocaleString()}`, color: '#F59E0B' }
//     ];
    
//     statBoxes.forEach((stat, index) => {
//       const x = startX + (index * (boxWidth + 10));
      
//       // Draw box
//       doc.rect(x, this.currentY, boxWidth, boxHeight).stroke();
      
//       // Add label
//       doc.fontSize(8)
//          .font('Helvetica')
//          .text(stat.label, x + 5, this.currentY + 5, { width: boxWidth - 10, align: 'center' });
      
//       // Add value
//       doc.fontSize(14)
//          .font('Helvetica-Bold')
//          .text(stat.value, x + 5, this.currentY + 25, { width: boxWidth - 10, align: 'center' });
//     });
    
//     this.currentY += boxHeight + 30;
//   }

//   // Add table with data
//   addTable(headers, rows, options = {}) {
//     const doc = this.doc;
//     const tableTop = this.currentY;
//     const itemHeight = options.itemHeight || 25;
//     const headerHeight = options.headerHeight || 30;
//     const fontSize = options.fontSize || 8;
//     const headerFontSize = options.headerFontSize || 9;
    
//     // Calculate column widths
//     const totalWidth = this.contentWidth - 20;
//     const columnWidth = totalWidth / headers.length;
    
//     // Check if we need a new page
//     if (this.currentY + headerHeight + (rows.length * itemHeight) > this.pageHeight - this.margin) {
//       doc.addPage();
//       this.currentY = this.margin;
//     }
    
//     // Draw table header
//     doc.rect(this.margin, this.currentY, this.contentWidth, headerHeight).fill('#f3f4f6').stroke();
    
//     headers.forEach((header, index) => {
//       const x = this.margin + (index * columnWidth) + 5;
//       doc.fillColor('#000000')
//          .fontSize(headerFontSize)
//          .font('Helvetica-Bold')
//          .text(header, x, this.currentY + 8, { width: columnWidth - 10, ellipsis: true });
//     });
    
//     this.currentY += headerHeight;
    
//     // Draw table rows
//     rows.forEach((row, rowIndex) => {
//       const isEven = rowIndex % 2 === 0;
//       const rowY = this.currentY;
      
//       // Alternate row colors
//       if (!isEven) {
//         doc.rect(this.margin, rowY, this.contentWidth, itemHeight).fill('#f9fafb').stroke();
//       } else {
//         doc.rect(this.margin, rowY, this.contentWidth, itemHeight).stroke();
//       }
      
//       // Add row data
//       row.forEach((cell, cellIndex) => {
//         const x = this.margin + (cellIndex * columnWidth) + 5;
//         doc.fillColor('#000000')
//            .fontSize(fontSize)
//            .font('Helvetica')
//            .text(String(cell || ''), x, rowY + 6, { 
//              width: columnWidth - 10, 
//              ellipsis: true,
//              height: itemHeight - 12
//            });
//       });
      
//       this.currentY += itemHeight;
      
//       // Check if we need a new page
//       if (this.currentY > this.pageHeight - this.margin - 50) {
//         doc.addPage();
//         this.currentY = this.margin;
        
//         // Redraw headers on new page
//         doc.rect(this.margin, this.currentY, this.contentWidth, headerHeight).fill('#f3f4f6').stroke();
//         headers.forEach((header, index) => {
//           const x = this.margin + (index * columnWidth) + 5;
//           doc.fillColor('#000000')
//              .fontSize(headerFontSize)
//              .font('Helvetica-Bold')
//              .text(header, x, this.currentY + 8, { width: columnWidth - 10, ellipsis: true });
//         });
//         this.currentY += headerHeight;
//       }
//     });
    
//     this.currentY += 20;
//   }

//   // Add footer
//   addFooter() {
//     const doc = this.doc;
//     const pageCount = doc.bufferedPageRange().count;
    
//     for (let i = 0; i < pageCount; i++) {
//       doc.switchToPage(i);
      
//       // Add line
//       doc.moveTo(this.margin, this.pageHeight - 40)
//          .lineTo(this.pageWidth - this.margin, this.pageHeight - 40)
//          .stroke();
      
//       // Add footer text
//       doc.fontSize(8)
//          .font('Helvetica')
//          .text('Al Hamad Oil Factory Management System', this.margin, this.pageHeight - 30, { align: 'left' });
      
//       doc.text(`Page ${i + 1} of ${pageCount}`, this.margin, this.pageHeight - 30, { align: 'right' });
//     }
//   }

//   // Generate Expense Report
//   async generateExpenseReport(expenses, summary, filters) {
//     try {
//       const title = `Expense Report${filters.category ? ` - ${filters.category.toUpperCase()}` : ''}`;
//       const subtitle = this.getFilterSubtitle(filters);
      
//       this.initDocument(title);
//       this.addHeader(title, subtitle);
      
//       // Add summary statistics
//       const stats = {
//         totalRecords: expenses.length,
//         totalAmount: summary.totalAmount || 0,
//         paidAmount: summary.totalPaid || 0,
//         pendingAmount: summary.pendingAmount || 0
//       };
//       this.addSummaryStats(stats);
      
//       // Prepare table data
//       const headers = ['Date', 'Category', 'Title', 'Amount', 'Paid', 'Status', 'Outstanding'];
//       const rows = expenses.map(expense => [
//         new Date(expense.expenseDate).toLocaleDateString('en-PK'),
//         this.capitalize(expense.expenseCategory),
//         expense.title || 'N/A',
//         `Rs.${expense.amount.toLocaleString()}`,
//         `Rs.${expense.amountPaid.toLocaleString()}`,
//         this.capitalize(expense.paymentStatus),
//         `Rs.${expense.outstandingAmount.toLocaleString()}`
//       ]);
      
//       this.addTable(headers, rows, { itemHeight: 25, fontSize: 8 });
//       this.addFooter();
      
//       return this.doc;
//     } catch (error) {
//       throw new Error(`Error generating expense report: ${error.message}`);
//     }
//   }

//   // Generate Product Report
//   async generateProductReport(transactions, summary, productType, filters) {
//     try {
//       const title = `${this.capitalize(productType.replace('-', ' '))} Transaction Report`;
//       const subtitle = this.getFilterSubtitle(filters);
      
//       this.initDocument(title);
//       this.addHeader(title, subtitle);
      
//       // Add summary statistics
//       const stats = {
//         totalRecords: transactions.length,
//         totalAmount: summary.totalValue || 0,
//         paidAmount: summary.totalReceived || 0,
//         pendingAmount: summary.totalOutstanding || 0
//       };
//       this.addSummaryStats(stats);
      
//       // Prepare table data
//       const headers = ['Date', 'Type', 'Client/Supplier', 'Weight (kg)', 'Rate', 'Total', 'Received/Paid', 'Status'];
//       const rows = transactions.map(transaction => [
//         new Date(transaction.createdAt).toLocaleDateString('en-PK'),
//         this.capitalize(transaction.transactionType),
//         transaction.clientName,
//         transaction.weight.toFixed(2),
//         `Rs.${transaction.rate}`,
//         `Rs.${transaction.totalBalance.toLocaleString()}`,
//         `Rs.${transaction.remainingAmount.toLocaleString()}`,
//         this.getPaymentStatus(transaction)
//       ]);
      
//       this.addTable(headers, rows, { itemHeight: 25, fontSize: 8 });
//       this.addFooter();
      
//       return this.doc;
//     } catch (error) {
//       throw new Error(`Error generating product report: ${error.message}`);
//     }
//   }

//   // Helper method to get payment status
//   getPaymentStatus(transaction) {
//     const total = transaction.totalBalance;
//     const received = transaction.remainingAmount;
    
//     if (received >= total) {
//       return received > total ? 'Advance' : 'Paid';
//     } else {
//       return 'Pending';
//     }
//   }

//   // Helper method to capitalize text
//   capitalize(text) {
//     if (!text) return '';
//     return text.replace(/\b\w/g, l => l.toUpperCase()).replace(/-/g, ' ');
//   }

//   // Helper method to generate filter subtitle
//   getFilterSubtitle(filters) {
//     const parts = [];
    
//     if (filters.startDate && filters.endDate) {
//       parts.push(`Period: ${new Date(filters.startDate).toLocaleDateString('en-PK')} - ${new Date(filters.endDate).toLocaleDateString('en-PK')}`);
//     } else if (filters.startDate) {
//       parts.push(`From: ${new Date(filters.startDate).toLocaleDateString('en-PK')}`);
//     } else if (filters.endDate) {
//       parts.push(`Until: ${new Date(filters.endDate).toLocaleDateString('en-PK')}`);
//     }
    
//     if (filters.transactionType) {
//       parts.push(`Type: ${this.capitalize(filters.transactionType)}`);
//     }
    
//     if (filters.paymentStatus) {
//       parts.push(`Status: ${this.capitalize(filters.paymentStatus)}`);
//     }
    
//     return parts.length > 0 ? parts.join(' | ') : null;
//   }

//   // Save PDF to file
//   async savePDF(filename) {
//     return new Promise((resolve, reject) => {
//       try {
//         const stream = fs.createWriteStream(filename);
//         this.doc.pipe(stream);
//         this.doc.end();
        
//         stream.on('finish', () => resolve(filename));
//         stream.on('error', reject);
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   // Get PDF as buffer
//   async getPDFBuffer() {
//     return new Promise((resolve, reject) => {
//       try {
//         const buffers = [];
//         this.doc.on('data', buffers.push.bind(buffers));
//         this.doc.on('end', () => {
//           const pdfBuffer = Buffer.concat(buffers);
//           resolve(pdfBuffer);
//         });
//         this.doc.on('error', reject);
//         this.doc.end();
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }
// }

// module.exports = new PDFService();



// ===============================================
// services/pdfService.js - Enhanced PDF Generation with Puppeteer
// ===============================================
const fs = require('fs');
const path = require('path');

// For Vercel/serverless environments, use puppeteer-core with Chromium binary
let puppeteer;
let chromium;
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (isServerless) {
  try {
    chromium = require('@sparticuz/chromium');
    puppeteer = require('puppeteer-core');
    // Configure Chromium for serverless
    chromium.setGraphicsMode(false);
    console.log('✅ PDFService: Using puppeteer-core with @sparticuz/chromium for serverless environment');
  } catch (e) {
    console.warn('⚠️ PDFService: Serverless dependencies not found, using default Puppeteer:', e.message);
    puppeteer = require('puppeteer');
  }
} else {
  puppeteer = require('puppeteer');
}

class PDFService {
  constructor() {
    this.browser = null;
  }

  // Initialize browser
  async initBrowser() {
    if (!this.browser) {
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--single-process'
        ]
      };
      
      // For Vercel/serverless, use Chromium binary with puppeteer-core
      if (chromium && isServerless) {
        try {
          chromium.setGraphicsMode(false);
          const executablePath = await chromium.executablePath();
          launchOptions.executablePath = executablePath;
          launchOptions.args = [
            ...chromium.args,
            '--hide-scrollbars',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ];
          console.log('✅ PDFService: Using Chromium executable for serverless:', executablePath);
        } catch (chromiumError) {
          console.error('❌ PDFService: Error getting Chromium executable path:', chromiumError.message);
          throw new Error(`Chromium setup failed: ${chromiumError.message}`);
        }
      }
      
      this.browser = await puppeteer.launch(launchOptions);
    }
    return this.browser;
  }

  // Close browser
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Generate base HTML template with modern styling
  getBaseTemplate(title, content) {
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        
        .page {
          background: white;
          margin: 0;
          padding: 40px;
          min-height: 100vh;
          position: relative;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 3px solid #667eea;
          position: relative;
        }
        
        .header::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 3px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 2px;
        }
        
        .company-logo {
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
          letter-spacing: -1px;
        }
        
        .report-title {
          font-size: 24px;
          color: #2d3748;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .report-subtitle {
          font-size: 14px;
          color: #718096;
          margin-bottom: 15px;
        }
        
        .generation-date {
          font-size: 12px;
          color: #a0aec0;
          padding: 8px 16px;
          background: #f7fafc;
          border-radius: 20px;
          display: inline-block;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          transform: translateY(0);
          transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
        }
        
        .stat-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 25px rgba(0, 0, 0, 0.1);
        }
        
        .data-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 18px 15px;
          text-align: left;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .data-table td {
          padding: 16px 15px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
        }
        
        .data-table tr:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .data-table tr:hover {
          background-color: #edf2f7;
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-paid {
          background: #d4edda;
          color: #155724;
        }
        
        .status-pending {
          background: #fff3cd;
          color: #856404;
        }
        
        .status-advance {
          background: #cce5ff;
          color: #004085;
        }
        
        .amount {
          font-weight: 700;
          color: #2d3748;
        }
        
        .amount.positive {
          color: #38a169;
        }
        
        .amount.negative {
          color: #e53e3e;
        }
        
        .footer {
          position: fixed;
          bottom: 30px;
          left: 40px;
          right: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #718096;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          color: rgba(102, 126, 234, 0.05);
          font-weight: 900;
          z-index: -1;
          white-space: nowrap;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        @media print {
          body {
            background: white;
          }
          
          .page {
            margin: 0;
            padding: 20px;
          }
          
          .stat-card:hover {
            transform: none;
          }
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .no-break {
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="watermark">AL HAMAD OIL</div>
      <div class="page">
        ${content}
      </div>
      <div class="footer">
        <span>Al Hamad Oil Factory Management System</span>
        <span>Generated on ${new Date().toLocaleString('en-PK')}</span>
      </div>
    </body>
    </html>
    `;
  }

  // Generate Expense Report
  async generateExpenseReport(expenses, summary, filters) {
    try {
      // Ensure expenses is an array
      const expensesArray = Array.isArray(expenses) ? expenses : [];
      console.log(`📄 PDFService: Generating expense report with ${expensesArray.length} expenses`);
      
      const title = `Expense Report${filters.category ? ` - ${filters.category.toUpperCase()}` : ''}`;
      const subtitle = this.getFilterSubtitle(filters);
      
      // Generate summary stats
      const stats = {
        totalRecords: expensesArray.length,
        totalAmount: summary.totalAmount || 0,
        paidAmount: summary.totalPaid || 0,
        pendingAmount: summary.pendingAmount || 0
      };
      
      console.log(`📄 PDFService: Stats - ${stats.totalRecords} records, Total: Rs.${stats.totalAmount}`);

      const content = `
        <div class="header">
          <div class="company-logo">Al Hamad Oil Factory</div>
          <div class="report-title">${title}</div>
          ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
          <div class="generation-date">Generated on ${new Date().toLocaleString('en-PK')}</div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Records</div>
            <div class="stat-value">${stats.totalRecords}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Amount</div>
            <div class="stat-value">Rs.${stats.totalAmount.toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Paid Amount</div>
            <div class="stat-value">Rs.${stats.paidAmount.toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pending Amount</div>
            <div class="stat-value">Rs.${stats.pendingAmount.toLocaleString()}</div>
          </div>
        </div>
        
        <div class="section-title">Expense Details</div>
        
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Title</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Status</th>
              <th>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            ${expensesArray && expensesArray.length > 0 ? expensesArray.map(expense => {
              // Ensure expense is a plain object
              const exp = expense && typeof expense === 'object' ? expense : {};
              const outstandingAmount = (Number(exp.amount) || 0) - (Number(exp.amountPaid) || 0);
              const expenseDate = exp.expenseDate ? (exp.expenseDate instanceof Date ? exp.expenseDate : new Date(exp.expenseDate)) : null;
              
              return `
                <tr>
                  <td>${expenseDate ? expenseDate.toLocaleDateString('en-PK') : 'N/A'}</td>
                  <td>${this.capitalize(exp.expenseCategory || 'N/A')}</td>
                  <td>${exp.title || 'N/A'}</td>
                  <td class="amount">Rs.${(Number(exp.amount) || 0).toLocaleString()}</td>
                  <td class="amount positive">Rs.${(Number(exp.amountPaid) || 0).toLocaleString()}</td>
                  <td>
                    <span class="status-badge status-${exp.paymentStatus || 'pending'}">
                      ${this.capitalize(exp.paymentStatus || 'pending')}
                    </span>
                  </td>
                  <td class="amount ${outstandingAmount > 0 ? 'negative' : 'positive'}">
                    Rs.${outstandingAmount.toLocaleString()}
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #718096;">
                  No expenses found for the selected filters
                </td>
              </tr>
            `}
          </tbody>
        </table>
      `;

      return this.generatePDF(title, content);
    } catch (error) {
      throw new Error(`Error generating expense report: ${error.message}`);
    }
  }

  // Generate Product Report
  async generateProductReport(transactions, summary, productType, filters) {
    try {
      // Ensure transactions is an array
      const transactionsArray = Array.isArray(transactions) ? transactions : [];
      console.log(`📄 PDFService: Generating product report with ${transactionsArray.length} transactions`);
      
      const title = `${this.capitalize(productType.replace('-', ' '))} Transaction Report`;
      const subtitle = this.getFilterSubtitle(filters);
      
      // Generate summary stats
      const stats = {
        totalRecords: transactionsArray.length,
        totalAmount: summary.totalValue || 0,
        paidAmount: summary.totalReceived || 0,
        pendingAmount: summary.totalOutstanding || 0
      };
      
      console.log(`📄 PDFService: Stats - ${stats.totalRecords} records, Total: Rs.${stats.totalAmount}`);

      const content = `
        <div class="header">
          <div class="company-logo">Al Hamad Oil Factory</div>
          <div class="report-title">${title}</div>
          ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
          <div class="generation-date">Generated on ${new Date().toLocaleString('en-PK')}</div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Transactions</div>
            <div class="stat-value">${stats.totalRecords}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Value</div>
            <div class="stat-value">Rs.${stats.totalAmount.toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Received/Paid</div>
            <div class="stat-value">Rs.${stats.paidAmount.toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Outstanding</div>
            <div class="stat-value">Rs.${stats.pendingAmount.toLocaleString()}</div>
          </div>
        </div>
        
        <div class="section-title">Transaction Details</div>
        
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Client/Supplier</th>
              <th>Weight (kg)</th>
              <th>Rate</th>
              <th>Total</th>
              <th>Received/Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${transactionsArray && transactionsArray.length > 0 ? transactionsArray.map(transaction => {
              // Ensure transaction is a plain object
              const txn = transaction && typeof transaction === 'object' ? transaction : {};
              const createdAt = txn.createdAt ? (txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)) : null;
              
              return `
              <tr>
                <td>${createdAt ? createdAt.toLocaleDateString('en-PK') : 'N/A'}</td>
                <td>
                  <span class="status-badge ${txn.transactionType === 'sale' ? 'status-paid' : 'status-pending'}">
                    ${this.capitalize(txn.transactionType || 'N/A')}
                  </span>
                </td>
                <td>${txn.clientName || 'N/A'}</td>
                <td>${txn.weight ? Number(txn.weight).toFixed(2) : '0.00'}</td>
                <td class="amount">Rs.${(Number(txn.rate) || 0).toLocaleString()}</td>
                <td class="amount">Rs.${(Number(txn.totalBalance) || 0).toLocaleString()}</td>
                <td class="amount positive">Rs.${(Number(txn.remainingAmount) || 0).toLocaleString()}</td>
                <td>
                  <span class="status-badge status-${this.getPaymentStatus(txn).toLowerCase()}">
                    ${this.getPaymentStatus(txn)}
                  </span>
                </td>
              </tr>
            `;
            }).join('') : `
              <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #718096;">
                  No transactions found for the selected filters
                </td>
              </tr>
            `}
          </tbody>
        </table>
      `;

      return this.generatePDF(title, content);
    } catch (error) {
      throw new Error(`Error generating product report: ${error.message}`);
    }
  }

  // Core PDF generation method
  async generatePDF(title, content) {
    let browser;
    let page;
    try {
      browser = await this.initBrowser();
      page = await browser.newPage();
      
      // Set longer timeouts for serverless
      await page.setDefaultNavigationTimeout(60000);
      await page.setDefaultTimeout(60000);
      
      const html = this.getBaseTemplate(title, content);
      
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        displayHeaderFooter: false
      });
      
      await page.close();
      // Don't close browser here - keep it for reuse
      
      return pdfBuffer;
    } catch (error) {
      console.error('❌ PDFService: Error in PDF generation:', error.message);
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error('⚠️ PDFService: Error closing page:', closeError.message);
        }
      }
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  // Save PDF to file
  async savePDF(filename, pdfBuffer) {
    return new Promise((resolve, reject) => {
      try {
        fs.writeFileSync(filename, pdfBuffer);
        resolve(filename);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper method to get payment status
  getPaymentStatus(transaction) {
    const total = transaction.totalBalance;
    const received = transaction.remainingAmount;
    
    if (received >= total) {
      return received > total ? 'Advance' : 'Paid';
    } else {
      return 'Pending';
    }
  }

  // Helper method to capitalize text
  capitalize(text) {
    if (!text) return '';
    return text.replace(/\b\w/g, l => l.toUpperCase()).replace(/-/g, ' ');
  }

  // Helper method to generate filter subtitle
  getFilterSubtitle(filters) {
    const parts = [];
    
    if (filters.startDate && filters.endDate) {
      parts.push(`Period: ${new Date(filters.startDate).toLocaleDateString('en-PK')} - ${new Date(filters.endDate).toLocaleDateString('en-PK')}`);
    } else if (filters.startDate) {
      parts.push(`From: ${new Date(filters.startDate).toLocaleDateString('en-PK')}`);
    } else if (filters.endDate) {
      parts.push(`Until: ${new Date(filters.endDate).toLocaleDateString('en-PK')}`);
    }
    
    if (filters.transactionType) {
      parts.push(`Type: ${this.capitalize(filters.transactionType)}`);
    }
    
    if (filters.paymentStatus) {
      parts.push(`Status: ${this.capitalize(filters.paymentStatus)}`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : null;
  }
}

module.exports = new PDFService();