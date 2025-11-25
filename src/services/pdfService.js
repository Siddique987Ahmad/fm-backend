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
          const executablePath = await chromium.executablePath();
          launchOptions.executablePath = executablePath;

          // Use Chromium's recommended args, merge with our additional ones
          const chromiumArgs = chromium.args || [];
          launchOptions.args = [
            ...chromiumArgs,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--single-process',
            '--hide-scrollbars',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ];
          console.log('✅ PDFService: Using Chromium executable for serverless:', executablePath);
          console.log('✅ PDFService: Chromium args count:', launchOptions.args.length);
        } catch (chromiumError) {
          console.error('❌ PDFService: Error getting Chromium executable path:', chromiumError.message);
          console.error('❌ PDFService: Chromium error stack:', chromiumError.stack);
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

  // Generate base HTML template with simple, clean styling
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
          font-family: 'Arial', 'Helvetica', sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        
        .page {
          background: white;
          margin: 0;
          padding: 40px;
          min-height: 100vh;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        
        .company-logo {
          font-size: 24px;
          font-weight: bold;
          color: #000;
          margin-bottom: 10px;
        }
        
        .report-title {
          font-size: 20px;
          color: #333;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .report-subtitle {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .generation-date {
          font-size: 11px;
          color: #999;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .stat-card {
          background: #f5f5f5;
          border: 1px solid #ddd;
          padding: 20px;
          text-align: center;
        }
        
        .stat-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 5px;
          text-transform: uppercase;
          font-weight: bold;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #000;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 1px solid #ddd;
        }
        
        .data-table th {
          background: #333;
          color: white;
          padding: 12px 10px;
          text-align: left;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
        }
        
        .data-table td {
          padding: 12px 10px;
          border-bottom: 1px solid #ddd;
          font-size: 12px;
        }
        
        .data-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .status-badge {
          padding: 4px 10px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-paid {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .status-pending {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }
        
        .status-advance {
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }
        
        .amount {
          font-weight: bold;
          color: #000;
        }
        
        .amount.positive {
          color: #28a745;
        }
        
        .amount.negative {
          color: #dc3545;
        }
        
        .footer {
          position: fixed;
          bottom: 20px;
          left: 40px;
          right: 40px;
          display: flex;
          justify-content: space-between;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #666;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #000;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #ddd;
        }
        
        @media print {
          .page {
            margin: 0;
            padding: 20px;
          }
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .no-break {
          page-break-inside: avoid;
        }
        
        .summary-box {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 5px;
        }
        
        .summary-box h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          color: #000;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: white;
          border-radius: 3px;
          border: 1px solid #e0e0e0;
        }
        
        .summary-label {
          font-weight: 600;
          color: #333;
        }
        
        .summary-value {
          font-weight: bold;
          color: #000;
        }
        
        .text-danger {
          color: #dc2626 !important;
        }
        
        .text-success {
          color: #16a34a !important;
        }
      </style>
    </head>
    <body>
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

  // Generate Single Transaction Invoice
  async generateTransactionInvoice(transaction, productType) {
    try {
      // Ensure transaction is a plain object
      if (!transaction || typeof transaction !== 'object') {
        throw new Error('Transaction data is invalid or missing');
      }

      const txn = transaction;

      // Log transaction details for debugging
      console.log(`📄 PDFService: Generating invoice for transaction`, {
        _id: txn._id,
        productType: txn.productType,
        transactionType: txn.transactionType,
        clientName: txn.clientName,
        weight: txn.weight,
        rate: txn.rate,
        totalBalance: txn.totalBalance,
        remainingAmount: txn.remainingAmount
      });

      // Handle date conversion - mongoose dates might be strings or Date objects
      let createdAt = null;
      if (txn.createdAt) {
        if (txn.createdAt instanceof Date) {
          createdAt = txn.createdAt;
        } else if (typeof txn.createdAt === 'string') {
          createdAt = new Date(txn.createdAt);
        } else {
          createdAt = new Date(txn.createdAt);
        }
      }

      const productName = this.capitalize(productType.replace('-', ' '));

      // Handle _id conversion - could be ObjectId or string
      let transactionId = 'N/A';
      if (txn._id) {
        if (typeof txn._id === 'object' && txn._id.toString) {
          transactionId = txn._id.toString();
        } else if (typeof txn._id === 'string') {
          transactionId = txn._id;
        } else {
          transactionId = String(txn._id);
        }
      }
      const invoiceNumber = `INV-${transactionId.slice(-8).toUpperCase()}`;
      const transactionType = txn.transactionType === 'sale' ? 'Sale Invoice' : 'Purchase Invoice';

      // Calculate payment status with safe defaults
      const total = Number(txn.totalBalance) || 0;
      const received = Number(txn.remainingAmount) || 0;
      const outstanding = total - received;
      let paymentStatus = 'Pending';
      let paymentStatusClass = 'status-pending';

      if (received >= total) {
        paymentStatus = received > total ? 'Advance Payment' : 'Paid';
        paymentStatusClass = received > total ? 'status-advance' : 'status-paid';
      }

      // Ensure all template variables have safe defaults
      const safeClientName = txn.clientName || 'N/A';
      const safeWeight = Number(txn.weight) || 0;
      const safeRate = Number(txn.rate) || 0;
      const safeNotes = txn.notes || '';
      const safeTransactionType = txn.transactionType || 'sale';

      const title = `${productName} ${transactionType}`;

      const content = `
        <div class="header">
          <div class="company-logo">Al Hamad Oil Factory</div>
          <div class="report-title">${transactionType}</div>
          <div class="report-subtitle">Invoice #${invoiceNumber}</div>
        </div>
        
        <table style="width: 100%; margin-bottom: 20px; font-size: 12px;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <strong>${safeTransactionType === 'sale' ? 'Bill To:' : 'Supplier:'}</strong><br>
              ${safeClientName}
            </td>
            <td style="width: 50%; vertical-align: top; text-align: right;">
              <strong>Date:</strong> ${createdAt ? createdAt.toLocaleDateString('en-PK') : 'N/A'}<br>
              <strong>Product:</strong> ${productName}<br>
              <strong>Type:</strong> ${this.capitalize(safeTransactionType)}
            </td>
          </tr>
        </table>
        
        <table class="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${productName} - ${safeTransactionType === 'sale' ? 'Sale' : 'Purchase'}</td>
              <td style="text-align: right;">${safeWeight.toFixed(2)} kg</td>
              <td style="text-align: right;">PKR ${safeRate.toLocaleString()}/kg</td>
              <td style="text-align: right;"><strong>PKR ${total.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <table style="width: 300px; margin-left: auto; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Subtotal:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>PKR ${total.toLocaleString()}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${safeTransactionType === 'sale' ? 'Amount Received:' : 'Amount Paid:'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">PKR ${received.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; background: #f5f5f5; font-weight: bold;">${safeTransactionType === 'sale' ? 'Outstanding:' : 'Remaining:'}</td>
              <td style="padding: 8px; background: #f5f5f5; text-align: right; font-weight: bold;">PKR ${outstanding.toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 20px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; font-size: 11px;">
          <strong>Status:</strong> <span class="status-badge ${paymentStatusClass}">${paymentStatus}</span>
          ${safeNotes ? `<br><strong>Notes:</strong> ${safeNotes}` : ''}
        </div>
      `;

      return this.generatePDF(title, content);
    } catch (error) {
      throw new Error(`Error generating transaction invoice: ${error.message}`);
    }
  }

  // Core PDF generation method
  async generatePDF(title, content) {
    let browser;
    let page;
    try {
      console.log('📄 PDFService: Starting PDF generation...');
      browser = await this.initBrowser();
      page = await browser.newPage();

      // Set longer timeouts for serverless
      await page.setDefaultNavigationTimeout(60000);
      await page.setDefaultTimeout(60000);

      const html = this.getBaseTemplate(title, content);
      console.log('📄 PDFService: HTML template generated, length:', html.length);

      // Use 'domcontentloaded' instead of 'networkidle0' for faster, more reliable loading
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log('📄 PDFService: Page content set');

      // Wait for fonts and styles to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify page loaded correctly
      const pageTitle = await page.title();
      console.log('📄 PDFService: Page title:', pageTitle);

      // Check if page has content
      const bodyContent = await page.evaluate(() => document.body ? document.body.innerHTML.length : 0);
      console.log('📄 PDFService: Body content length:', bodyContent);

      if (bodyContent === 0) {
        throw new Error('Page content is empty after loading');
      }

      console.log('📄 PDFService: Page loaded successfully, generating PDF...');

      console.log('📄 PDFService: Calling page.pdf()...');
      let pdfBuffer;
      try {
        // Use standard A4 format with automatic page breaks
        // This ensures all content is visible across multiple pages
        pdfBuffer = await page.pdf({
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
        console.log('📄 PDFService: page.pdf() completed');
      } catch (pdfError) {
        console.error('❌ PDFService: Error in page.pdf() call:', pdfError.message);
        console.error('❌ PDFService: PDF error stack:', pdfError.stack);
        throw new Error(`Failed to generate PDF from page: ${pdfError.message}`);
      }

      console.log(`📄 PDFService: PDF buffer received, type: ${typeof pdfBuffer}, isBuffer: ${Buffer.isBuffer(pdfBuffer)}`);

      // Ensure we have a Buffer
      let buffer;
      if (Buffer.isBuffer(pdfBuffer)) {
        buffer = pdfBuffer;
      } else if (pdfBuffer instanceof Uint8Array) {
        buffer = Buffer.from(pdfBuffer);
      } else if (typeof pdfBuffer === 'string') {
        // If it's a string, it might be an error message
        console.error('❌ PDFService: PDF generation returned a string instead of buffer:', pdfBuffer.substring(0, 200));
        throw new Error('PDF generation returned unexpected format: ' + pdfBuffer.substring(0, 100));
      } else {
        buffer = Buffer.from(pdfBuffer);
      }

      console.log(`📄 PDFService: PDF buffer size: ${buffer.length} bytes`);

      if (!buffer || buffer.length === 0) {
        throw new Error('Generated PDF buffer is empty');
      }

      // Verify it's a valid PDF (starts with %PDF)
      // Check both as string and as raw bytes
      const pdfHeaderStr = buffer.toString('utf8', 0, 4);
      const pdfHeaderBytes = buffer.slice(0, 4);
      const firstBytes = buffer.slice(0, 20).toString('hex');
      const firstBytesStr = buffer.toString('utf8', 0, 50);

      console.log(`📄 PDFService: PDF validation check:`);
      console.log(`  - First 4 chars (string): "${pdfHeaderStr}"`);
      console.log(`  - First 4 bytes (hex): ${pdfHeaderBytes.toString('hex')}`);
      console.log(`  - First 20 bytes (hex): ${firstBytes}`);
      console.log(`  - First 50 chars: "${firstBytesStr}"`);

      // Check if it starts with %PDF (both string and byte check)
      const isValidPdf = pdfHeaderStr === '%PDF' ||
        (pdfHeaderBytes[0] === 0x25 && pdfHeaderBytes[1] === 0x50 &&
          pdfHeaderBytes[2] === 0x44 && pdfHeaderBytes[3] === 0x46);

      if (!isValidPdf) {
        // Log more details about what we got
        const first200Chars = buffer.toString('utf8', 0, 200);
        console.error('❌ PDFService: Invalid PDF header. First 200 chars:', first200Chars);

        // Check if it's HTML (error page)
        const bufferStr = buffer.toString('utf8', 0, 500);
        if (bufferStr.includes('<html') || bufferStr.includes('<!DOCTYPE')) {
          console.error('❌ PDFService: Buffer appears to be HTML instead of PDF');
          throw new Error('PDF generation returned HTML instead of PDF. This might be an error page.');
        }

        throw new Error(`Generated PDF is not valid. Header: "${pdfHeaderStr}", First bytes: ${firstBytes}`);
      }

      console.log('✅ PDFService: PDF header validation passed');

      // Close page and browser for cleanup (important in serverless)
      try {
        await page.close();
      } catch (closeError) {
        console.warn('⚠️ PDFService: Error closing page:', closeError.message);
      }

      // Close browser to free resources (important in serverless environments)
      try {
        if (this.browser) {
          await this.browser.close();
          this.browser = null;
        }
      } catch (closeError) {
        console.warn('⚠️ PDFService: Error closing browser:', closeError.message);
      }

      return buffer;
    } catch (error) {
      console.error('❌ PDFService: Error in PDF generation:', error.message);
      console.error('❌ PDFService: Error name:', error.name);
      console.error('❌ PDFService: Error stack:', error.stack);

      // Cleanup on error
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error('⚠️ PDFService: Error closing page:', closeError.message);
        }
      }

      if (this.browser) {
        try {
          await this.browser.close();
          this.browser = null;
        } catch (closeError) {
          console.error('⚠️ PDFService: Error closing browser:', closeError.message);
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

  // Generate client transaction report
  async generateClientReport(transactions, productType, clientName) {
    try {
      console.log(`📄 Generating client report for ${clientName} with ${transactions.length} transactions`);

      // Calculate summary
      const summary = {
        totalWeight: 0,
        totalAmount: 0,
        totalReceived: 0,
        totalOutstanding: 0,
        salesCount: 0,
        purchasesCount: 0
      };

      transactions.forEach(txn => {
        summary.totalWeight += txn.weight || 0;
        summary.totalAmount += txn.totalBalance || 0;
        summary.totalReceived += txn.remainingAmount || 0;
        if (txn.transactionType === 'sale') summary.salesCount++;
        else summary.purchasesCount++;
      });

      summary.totalOutstanding = summary.totalAmount - summary.totalReceived;

      // Generate HTML content
      const content = `
        <div class="header">
          <h1>Client Transaction Report</h1>
          <h2>${clientName}</h2>
          <p>Product Type: ${this.capitalize(productType.replace(/-/g, ' '))}</p>
          <p>Report Date: ${new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Weight</th>
              <th>Rate</th>
              <th>Total Amount</th>
              <th>Received/Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(txn => {
        const status = this.getPaymentStatus(txn);
        const outstanding = txn.totalBalance - txn.remainingAmount;
        return `
                <tr>
                  <td>${new Date(txn.createdAt).toLocaleDateString('en-PK')}</td>
                  <td><span class="badge ${txn.transactionType === 'sale' ? 'badge-success' : 'badge-info'}">${this.capitalize(txn.transactionType)}</span></td>
                  <td>${txn.weight} kg</td>
                  <td>PKR ${txn.rate.toLocaleString()}/kg</td>
                  <td>PKR ${txn.totalBalance.toLocaleString()}</td>
                  <td>PKR ${txn.remainingAmount.toLocaleString()}</td>
                  <td>
                    <span class="badge badge-${status.toLowerCase()}">${status}</span>
                    ${outstanding > 0 ? `<br><small style="color: #dc2626; font-weight: bold;">PKR ${outstanding.toLocaleString()}</small>` : ''}
                  </td>
                </tr>
              `;
      }).join('')}
          </tbody>
          <tfoot>
            <tr class="summary-row">
              <td colspan="2"><strong>TOTAL</strong></td>
              <td><strong>${summary.totalWeight.toFixed(2)} kg</strong></td>
              <td>-</td>
              <td><strong>PKR ${summary.totalAmount.toLocaleString()}</strong></td>
              <td><strong>PKR ${summary.totalReceived.toLocaleString()}</strong></td>
              <td><strong>${summary.totalOutstanding > 0 ? 'Pending' : 'Paid'}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div class="summary-box">
          <h3>Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px;">
                <strong>Total Transactions:</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px; text-align: right;">
                <strong>${transactions.length}</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px;">
                <strong>Total Sales:</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px; text-align: right;">
                <strong>${summary.salesCount}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px;">
                <strong>Total Purchases:</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px; text-align: right;">
                <strong>${summary.purchasesCount}</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px;">
                <strong>Total Amount:</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px; text-align: right;">
                <strong>PKR ${summary.totalAmount.toLocaleString()}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px;">
                <strong>Amount Received/Paid:</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px; text-align: right;">
                <strong>PKR ${summary.totalReceived.toLocaleString()}</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px;">
                <strong>Outstanding Amount:</strong>
              </td>
              <td style="padding: 10px; background: white; border: 1px solid #e0e0e0; border-radius: 3px; text-align: right; color: ${summary.totalOutstanding > 0 ? '#dc2626' : '#16a34a'};">
                <strong>PKR ${summary.totalOutstanding.toLocaleString()}</strong>
              </td>
            </tr>
          </table>
        </div>
      `;

      const title = `${clientName} - Transaction Report`;
      return await this.generatePDF(title, content);
    } catch (error) {
      console.error('❌ Error generating client report:', error);
      throw error;
    }
  }
}

module.exports = new PDFService();