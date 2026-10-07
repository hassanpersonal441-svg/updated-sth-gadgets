const fs = require('fs');
let text = fs.readFileSync('src/components/admin/OrderActionModal.tsx', 'utf-8');

const target1 = 'const currentProfit = currentProductRevenue - totalItemCost - currentStoreExpense;';
console.log("Target 1 found: " + text.includes(target1));
console.log("Target 2 found: " + /<span>Store Courier Expense/.test(text));
