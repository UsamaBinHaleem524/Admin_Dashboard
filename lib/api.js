// API utility functions for all CRUD operations

const API_BASE = '/api';

// Generic API call function
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API call failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Products API
export const productsAPI = {
  getAll: () => apiCall('/products'),
  create: (data) => apiCall('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/products', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/products?id=${id}`, { method: 'DELETE' }),
};

// Sales API
export const salesAPI = {
  getAll: () => apiCall('/sales'),
  create: (data) => apiCall('/sales', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/sales', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/sales?id=${id}`, { method: 'DELETE' }),
};

// Purchases API
export const purchasesAPI = {
  getAll: () => apiCall('/purchases'),
  create: (data) => apiCall('/purchases', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/purchases', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/purchases?id=${id}`, { method: 'DELETE' }),
};

// Expenses API
export const expensesAPI = {
  getAll: () => apiCall('/expenses'),
  create: (data) => apiCall('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/expenses', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (date) => apiCall(`/expenses?date=${date}`, { method: 'DELETE' }),
};

// Invoices API
export const invoicesAPI = {
  getAll: () => apiCall('/invoices'),
  create: (data) => apiCall('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/invoices', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/invoices?id=${id}`, { method: 'DELETE' }),
};

// Quotations API
export const quotationsAPI = {
  getAll: () => apiCall('/quotations'),
  create: (data) => apiCall('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/quotations', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/quotations?id=${id}`, { method: 'DELETE' }),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  getAll: () => apiCall('/purchase-orders'),
  create: (data) => apiCall('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/purchase-orders', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/purchase-orders?id=${id}`, { method: 'DELETE' }),
};

// Customer Transactions API
export const customerTransactionsAPI = {
  getAll: () => apiCall('/customer-transactions'),
  create: (data) => apiCall('/customer-transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/customer-transactions', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/customer-transactions?id=${id}`, { method: 'DELETE' }),
};

// Supplier Transactions API
export const supplierTransactionsAPI = {
  getAll: () => apiCall('/supplier-transactions'),
  create: (data) => apiCall('/supplier-transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/supplier-transactions', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/supplier-transactions?id=${id}`, { method: 'DELETE' }),
};

// Shop Expenses API
export const shopExpensesAPI = {
  getAll: () => apiCall('/shop-expenses'),
  create: (data) => apiCall('/shop-expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (data) => apiCall('/shop-expenses', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/shop-expenses?id=${id}`, { method: 'DELETE' }),
}; 