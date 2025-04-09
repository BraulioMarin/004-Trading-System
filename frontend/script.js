// API endpoints
const API_BASE_URL = 'http://localhost:8000/api';
const ENDPOINTS = {
    HEALTH: `${API_BASE_URL}/health`,
    ACCOUNT: `${API_BASE_URL}/account`,
    PRICE: `${API_BASE_URL}/price`,
    PRICE_HISTORY: `${API_BASE_URL}/price-history`,
    ORDER: `${API_BASE_URL}/order` // Note: This is not under /api prefix as specified
};

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const refreshBtn = document.getElementById('refresh-btn');
const accountId = document.getElementById('account-id');
const accountType = document.getElementById('account-type');
const btcBalance = document.getElementById('btc-balance');
const ethBalance = document.getElementById('eth-balance');
const usdtBalance = document.getElementById('usdt-balance');
const currentPrice = document.getElementById('current-price');
const priceUpdated = document.getElementById('price-updated');
const orderForm = document.getElementById('order-form');
const priceChart = document.getElementById('price-chart');
const orderStatus = document.getElementById('order-status');
const noOrder = document.getElementById('no-order');
const toast = document.getElementById('toast');
const intervalBtns = document.querySelectorAll('.interval-btn');

// Global variables
let chart;
let currentInterval = '1h';

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
    fetchInitialData();
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', fetchInitialData);

    // Order form submission
    orderForm.addEventListener('submit', handleOrderSubmit);

    // Interval buttons for the chart
    intervalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            intervalBtns.forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white');
                b.classList.add('bg-gray-300', 'text-gray-700');
            });
            btn.classList.remove('bg-gray-300', 'text-gray-700');
            btn.classList.add('bg-blue-500', 'text-white');
            currentInterval = btn.dataset.interval;
            fetchPriceHistory(currentInterval);
        });
    });
}

// Check API Status
async function checkAPIStatus() {
    try {
        const response = await fetch(ENDPOINTS.HEALTH);

        if (response.ok) {
            statusIndicator.classList.remove('bg-gray-400', 'bg-red-500');
            statusIndicator.classList.add('bg-green-500');
            statusText.textContent = 'Connected';
            statusText.classList.add('text-green-500');
            statusText.classList.remove('text-gray-500', 'text-red-500');
        } else {
            throw new Error('API is not responding correctly');
        }
    } catch (error) {
        statusIndicator.classList.remove('bg-gray-400', 'bg-green-500');
        statusIndicator.classList.add('bg-red-500');
        statusText.textContent = 'Disconnected';
        statusText.classList.add('text-red-500');
        statusText.classList.remove('text-gray-500', 'text-green-500');
        showToast('Cannot connect to API. Please check if the server is running.', 'error');
    }
}

// Fetch initial data
function fetchInitialData() {
    fetchAccountInfo();
    fetchCurrentPrice();
    fetchPriceHistory(currentInterval);
}

// Fetch Account Information
async function fetchAccountInfo() {
    try {
        const response = await fetch(ENDPOINTS.ACCOUNT);

        if (!response.ok) {
            throw new Error('Failed to fetch account information');
        }

        const data = await response.json();

        // Update UI with account information
        accountId.textContent = data.uid;
        accountType.textContent = data.account_type;
        btcBalance.textContent = `${data.btc_balance.balance} BTC`;
        ethBalance.textContent = `${data.eth_balance.balance} ETH`;
        usdtBalance.textContent = `${data.usdt_balance.balance} USDT`;
    } catch (error) {
        showToast('Error loading account information', 'error');
        console.error('Error fetching account info:', error);
    }
}

// Fetch Current Price
async function fetchCurrentPrice() {
    try {
        const response = await fetch(ENDPOINTS.PRICE + '?symbol=BTCUSDT');

        if (!response.ok) {
            throw new Error('Failed to fetch current price');
        }

        const data = await response.json();

        // Update UI with price information
        currentPrice.textContent = `$${parseFloat(data.price).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
        priceUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        showToast('Error loading current price', 'error');
        console.error('Error fetching price:', error);
    }
}

// Fetch Price History
async function fetchPriceHistory(interval = '1h') {
    try {
        console.log(`Fetching interval ${interval}`);
        const response = await fetch(`${ENDPOINTS.PRICE_HISTORY}?interval=${interval}&symbol=BTCUSDT`);
        console.log(response);

        if (!response.ok) {
            throw new Error('Failed to fetch price history');
        }

        const data = await response.json();

        // Process the data for the chart
        updatePriceChart(data);
    } catch (error) {
        showToast('Error loading price history', 'error');
        console.error('Error fetching price history:', error);
    }
}

// Update Price Chart
function updatePriceChart(data) {
    const labels = data.map(candle => {
        const date = new Date(candle.open_time);
        return date.toISOString();
        // return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false});
    });

    const prices = data.map(candle => candle.close);

    if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('price-chart').getContext('2d');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'BTC/USDT',
                data: prices,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                pointRadius: 1,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `$${context.parsed.y.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    position: 'right',
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            });
                        }
                    }
                }
            }
        }
    });
}

// Handle Order Submission
async function handleOrderSubmit(event) {
    event.preventDefault();

    const orderData = {
        symbol: document.getElementById('symbol').value,
        side: document.getElementById('side').value,
        order_type: document.getElementById('order-type').value,
        quantity: parseFloat(document.getElementById('quantity').value),
        test: document.getElementById('test-order').checked
    };

    try {
        const response = await fetch(ENDPOINTS.ORDER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error('Failed to place order');
        }

        const data = await response.json();

        // Display order status
        displayOrderStatus(data, orderData.test);
        showToast('Order placed successfully!', 'success');
    } catch (error) {
        showToast('Error placing order', 'error');
        console.error('Error placing order:', error);
    }
}

// Display Order Status
function displayOrderStatus(order, isTest) {
    // Hide the no order message
    noOrder.classList.add('hidden');

    // Show the order status
    orderStatus.classList.remove('hidden');

    // Update order alert based on test status
    const orderAlert = document.getElementById('order-alert');
    const orderMessage = document.getElementById('order-message');

    if (isTest) {
        orderAlert.classList.remove('bg-green-100', 'border-green-500', 'text-green-700');
        orderAlert.classList.add('bg-yellow-100', 'border-yellow-500', 'text-yellow-700');
        orderMessage.textContent = 'This was a test order. No actual trade was executed.';
    } else {
        orderAlert.classList.remove('bg-yellow-100', 'border-yellow-500', 'text-yellow-700');
        orderAlert.classList.add('bg-green-100', 'border-green-500', 'text-green-700');
        orderMessage.textContent = 'Your order has been submitted to the market.';
    }

    // Update order details
    document.getElementById('order-id').textContent = order.orderId;
    document.getElementById('order-symbol').textContent = order.symbol;
    document.getElementById('order-side').textContent = order.side;
    document.getElementById('order-type-display').textContent = order.type;
    document.getElementById('order-qty').textContent = order.origQty;
    document.getElementById('order-price').textContent = order.price === '0.00000000' ? 'Market Price' : `$${parseFloat(order.price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    document.getElementById('order-status-text').textContent = order.status;
}

// Show Toast Notification
function showToast(message, type = 'info') {
    toast.textContent = message;

    // Set the appropriate background color based on the type
    toast.className = 'fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg transform transition-all duration-300 ease-in-out';

    if (type === 'error') {
        toast.classList.add('bg-red-600', 'text-white');
    } else if (type === 'success') {
        toast.classList.add('bg-green-600', 'text-white');
    } else {
        toast.classList.add('bg-gray-800', 'text-white');
    }

    // Show the toast
    toast.classList.remove('translate-y-20', 'opacity-0');

    // Hide the toast after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
