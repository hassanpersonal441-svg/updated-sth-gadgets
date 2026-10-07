const fs = require('fs');
let text = fs.readFileSync('src/components/admin/OrderActionModal.tsx', 'utf-8');

const replace1 = `                    const codFee = Math.max(0, parseFloat(String(editCodCourierFees)) || 0);
                    const taxFee = Math.max(0, parseFloat(String(editTaxDeductions)) || 0);
                    const amountReceived = Math.max(0, parseFloat(String(editSettlementAmount)) || 0);

                    let settlementDeductions = 0;
                    if (amountReceived > 0) {
                      if (codFee === 0 && taxFee === 0) {
                        settlementDeductions = Math.max(0, currentTotal - amountReceived);
                      } else {
                        settlementDeductions = codFee + taxFee;
                      }
                    } else {
                      settlementDeductions = codFee + taxFee;
                    }

                    const currentProfit = currentProductRevenue - totalItemCost - currentStoreExpense - settlementDeductions;`;

const replace2 = `                          <span>Store Courier Expense: <strong className="text-orange-300 font-mono">PKR {currentStoreExpense.toLocaleString('en-PK')}</strong></span>
                          {settlementDeductions > 0 && (
                            <span className="text-rose-400 mt-1 block w-full border-t border-cyan-500/20 pt-1">
                              COD/Tax Deductions: <strong className="font-mono">PKR {settlementDeductions.toLocaleString('en-PK')}</strong>
                            </span>
                          )}
                        </div>`;

text = text.replace(/                    const currentProfit = currentProductRevenue - totalItemCost - currentStoreExpense;/, replace1);
text = text.replace(/                          <span>Store Courier Expense: <strong className="text-orange-300 font-mono">PKR \{currentStoreExpense\.toLocaleString\('en-PK'\)\}<\/strong><\/span>\s*<\/div>/, replace2);

fs.writeFileSync('src/components/admin/OrderActionModal.tsx', text, 'utf-8');
console.log('Success!');
