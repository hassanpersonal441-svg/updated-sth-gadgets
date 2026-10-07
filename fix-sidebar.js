const fs = require('fs');
let text = fs.readFileSync('src/components/admin/AdminSidebar.tsx', 'utf-8');

const newLink = `  {
    href: '/admin/orders',
    label: 'COD Settlement',
    tourId: 'admin-cod',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
`;

const ordersRegex = /(href: '\/admin\/orders',[\s\S]*?\},)/;
text = text.replace(ordersRegex, "$1\n" + newLink);

fs.writeFileSync('src/components/admin/AdminSidebar.tsx', text, 'utf-8');
console.log("Replaced Sidebar");
