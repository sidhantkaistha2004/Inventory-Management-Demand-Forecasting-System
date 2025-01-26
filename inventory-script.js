let newItemDate, newItemStoreID, newItemProductID, newItemCategory, newItemInventoryLevel, newItemUnitsSold, newItemUnitsOrdered, newItemPrice, newItemSeasonality;
let activeTab = null;
let itemsPerPage = 100; 
let currentPage = 1;
let purchases = [];
let sales = [];
let inventory = [];
let filteredInventory = [];
let originalInventory = [];
let isSearchMode = false;
let currentPreviewData = null;
let pendingRestocks = [];
let confirmedRestocks = [];

// Initialize inventory items with new properties
function initializeInventory() {
    inventory.push({
        date: newItemDate ? new Date(newItemDate.trim()) : null,
        storeID: newItemStoreID ? newItemStoreID.trim() : '',
        productID: newItemProductID ? newItemProductID.trim() : '',
        category: newItemCategory ? newItemCategory.trim() : '',
        inventoryLevel: newItemInventoryLevel ? parseInt(newItemInventoryLevel.trim()) : 0,
        unitsSold: newItemUnitsSold ? parseInt(newItemUnitsSold.trim()) : 0,
        unitsOrdered: newItemUnitsOrdered ? parseInt(newItemUnitsOrdered.trim()) : 0,
        price: newItemPrice ? parseFloat(newItemPrice.trim()) : 0,
        seasonality: newItemSeasonality ? newItemSeasonality.trim() : ''
    });
}

function addItem() {
    newItemDate = document.getElementById("newItemDate").value;
    newItemStoreID = document.getElementById("newItemStoreID").value;
    newItemProductID = document.getElementById("newItemProductID").value;
    newItemCategory = document.getElementById("newItemCategory").value;
    newItemInventoryLevel = document.getElementById("newItemInventoryLevel").value;
    newItemUnitsSold = document.getElementById("newItemUnitsSold").value;
    newItemUnitsOrdered = document.getElementById("newItemUnitsOrdered").value;
    newItemPrice = document.getElementById("newItemPrice").value;
    newItemSeasonality = document.getElementById("newItemSeasonality").value;

    if (typeof newItemProductID === 'string' && newItemProductID.trim()) {
        newItemProductID = newItemProductID.trim();
    } else {
        console.error("Invalid product ID:", newItemProductID);
        return;
    }

    const newItem = {
        date: new Date(newItemDate.trim()),
        storeID: newItemStoreID.trim(),
        productID: newItemProductID.trim(),
        category: newItemCategory.trim(),
        inventoryLevel: parseInt(newItemInventoryLevel.trim()),
        unitsSold: parseInt(newItemUnitsSold.trim()),
        unitsOrdered: parseInt(newItemUnitsOrdered.trim()),
        price: parseFloat(newItemPrice.trim()),
        seasonality: newItemSeasonality.trim()
    };

    // Find existing record for the same day, store, product, and category
    const existingIndex = inventory.findIndex(item => 
        formatDate(item.date) === formatDate(newItem.date) &&
        item.storeID === newItem.storeID &&
        item.productID === newItem.productID &&
        item.category === newItem.category
    );

    if (existingIndex !== -1) {
        // Merge with existing record
        const existing = inventory[existingIndex];
        existing.inventoryLevel = newItem.inventoryLevel;
        existing.unitsSold += newItem.unitsSold;
        existing.unitsOrdered += newItem.unitsOrdered;
    } else {
        // Add new record
        inventory.push(newItem);
    }

    clearInputFields();
    displayFilteredInventory(inventory);
}

function clearInputFields() {
    document.getElementById("newItemDate").value = '';
    document.getElementById("newItemStoreID").value = '';
    document.getElementById("newItemProductID").value = '';
    document.getElementById("newItemCategory").value = '';
    document.getElementById("newItemInventoryLevel").value = '';
    document.getElementById("newItemUnitsSold").value = '';
    document.getElementById("newItemUnitsOrdered").value = '';
    document.getElementById("newItemPrice").value = '';
    document.getElementById("newItemSeasonality").value = '';
}

function toggleTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById(tabName).style.display = 'block';
    activeTab = tabName;

    if (tabName === 'dashboard') {
        // Hide inventory table and pagination when showing dashboard
        document.getElementById('inventoryTable').style.display = 'none';
        document.getElementById('pagination').style.display = 'none';
        document.getElementById('searchResultsTable').style.display = 'none';
        
        // Show dashboard stats and charts
        displayInventoryStats();
        displayDashboardCharts();
    } else if (tabName === 'sales') {
        filterSales();
    } else if (tabName === 'purchases') {
        filterPurchases();
    } else {
        displayFilteredInventory(inventory);
    }
}

function predictRestock() {
    const storeId = document.getElementById('restockStore').value;
    const category = document.getElementById('restockCategory').value;
    const productId = document.getElementById('restockProduct').value;
    const threshold = parseInt(document.getElementById('restockThreshold').value) || 100;

    fetch('http://127.0.0.1:5000/predict-restock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inventory: inventory,
            storeId: storeId,
            category: category,
            productId: productId,
            threshold: threshold
        })
    })
    .then(response => response.json())
    .then(data => {
        // Store the prediction data and type
        localStorage.setItem('predictionData', JSON.stringify(data));
        localStorage.setItem('predictType', 'restock');
        
        // Open results in new window
        window.open('prediction-results.html', '_blank', 'width=1000,height=800');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error making prediction. Check console for details.');
    });
}

function calculateRestock(item) {
    // Placeholder logic for calculating restock quantity
    return Math.max(0, 10 - item.inventoryLevel); // Example: restock to a minimum of 10 available
}

function displayRestockData(data) {
    const restockTableBody = document.getElementById("restockTableBody");
    restockTableBody.innerHTML = ''; // Clear previous data

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.productID}</td>
            <td>${item.category}</td>
            <td>${item.predictedRestock}</td>
        `;
        restockTableBody.appendChild(row);
    });
}

// Add event listener for the Predict tab button
document.getElementById("predictTabButton").addEventListener("click", predictRestock);

// Update the loadItems function to handle the date format correctly
function loadItems() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                complete: function(results) {
                    // Store the original data
                    originalInventory = results.data;
                    
                    // Filter out any empty rows
                    inventory = results.data
                        .filter(item => item['Date'] && item['Store ID'] && item['Product ID'])
                        .map(item => {
                            // Parse date from DD-MM-YYYY format
                            const [day, month, year] = item['Date'].split('-');
                            return {
                                date: new Date(`${year}-${month}-${day}`),
                                storeID: item['Store ID'],
                                productID: item['Product ID'],
                                category: item['Category'],
                                inventoryLevel: parseInt(item['Inventory Level']) || 0,
                                unitsSold: parseInt(item['Units Sold']) || 0,
                                unitsOrdered: parseInt(item['Units Ordered']) || 0,
                                price: parseFloat(item['Price']) || 0,
                                seasonality: item['Seasonality'],
                                isRestock: item['Is Restock'] === 'true',
                                restockDate: item['Restock Date'] || ''
                            };
                        });

                    // Load pending restocks from localStorage
                    const savedRestocks = localStorage.getItem('pendingRestocks');
                    if (savedRestocks) {
                        pendingRestocks = JSON.parse(savedRestocks);
                        applyPendingRestocks();
                    }

                    // Merge records before sorting
                    inventory = mergeInventoryRecords(inventory);

                    // Sort inventory by date in descending order
                    inventory.sort((a, b) => b.date - a.date);
                    
                    currentPage = 1; // Reset to first page
                    displayFilteredInventory(inventory); // Call without arguments to use default inventory

                    // Initialize dropdowns after loading data
                    initializeDropdowns();
                    initializeAddSalesDropdowns();
                    initializeAddPurchaseDropdowns();
                    initializePredictionDropdowns(); // Add this line
                    
                    // Initial display of sales and purchases
                    filterSales();
                    filterPurchases();
                }
            });
        }
    };
    input.click();
}

// Update displayItem function to format the date correctly
function displayItem(items = inventory) {
    isSearchMode = false; // Reset search mode when displaying full inventory
    // Hide all tab content first
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.style.display = 'none';
    });

    // Hide predict div and any other content that might be visible
    document.getElementById('predictedRestockInfo').style.display = 'none';
    document.getElementById('predictedDemandInfo').style.display = 'none';
    document.getElementById('searchResultsTable').style.display = 'none';

    if (!items || items.length === 0) {
        console.log("No items to display");
        return;
    }

    // Show only pagination and inventory table
    document.getElementById('pagination').style.display = 'block';
    document.getElementById('inventoryTable').style.display = 'table';

    // Rest of the existing displayItem code...
    const groupedItems = {};
    // ...existing grouping and processing code...

    // Group items by store and category
    items.forEach(item => {
        const key = `${item.storeID}-${item.category}`;
        if (!groupedItems[key]) {
            groupedItems[key] = [];
        }
        groupedItems[key].push(item);
    });

    // Process each group to get the latest data
    let processedItems = [];
    Object.entries(groupedItems).forEach(([key, groupItems]) => {
        const [storeID, category] = key.split('-');
        
        // Group by product ID and get latest entry
        const productGroups = {};
        groupItems.forEach(item => {
            if (!productGroups[item.productID] || 
                item.date > (productGroups[item.productID].date)) {
                productGroups[item.productID] = item;
            }
        });

        // Process each product's data
        Object.values(productGroups).forEach(item => {
            const lastSaleDate = groupItems
                .filter(i => i.productID === item.productID && i.unitsSold > 0)
                .sort((a, b) => b.date - a.date)[0]?.date || 'No sales';

            processedItems.push({
                storeID: item.storeID,
                category: item.category,
                productID: item.productID,
                inventoryLevel: item.inventoryLevel,
                price: item.price,
                lastSaleDate: lastSaleDate
            });
        });
    });

    // Sort the processed items
    processedItems.sort((a, b) => {
        if (a.storeID !== b.storeID) return a.storeID.localeCompare(b.storeID);
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.productID.localeCompare(b.productID);
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = processedItems.slice(startIndex, endIndex);
    const maxPage = Math.ceil(processedItems.length / itemsPerPage);

    // Update table
    const tableBody = document.getElementById('inventoryTableBody');
    tableBody.innerHTML = '';

    paginatedData.forEach((item, index) => {
        const row = document.createElement('tr');
        const formattedDate = item.lastSaleDate instanceof Date ? 
            `${item.lastSaleDate.getDate().toString().padStart(2, '0')}-${(item.lastSaleDate.getMonth() + 1).toString().padStart(2, '0')}-${item.lastSaleDate.getFullYear()}` : 
            item.lastSaleDate;

        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${item.storeID}</td>
            <td>${item.category}</td>
            <td>${item.productID}</td>
            <td>${item.inventoryLevel}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>${formattedDate}</td>
        `;
        tableBody.appendChild(row);
    });

    // Update pagination display and controls
    document.getElementById('currentPage').innerText = `Page ${currentPage} of ${maxPage}`;
    document.querySelector('button[onclick="prevPage()"]').disabled = currentPage === 1;
    document.querySelector('button[onclick="nextPage()"]').disabled = currentPage === maxPage;

    // Show the inventory table
    document.getElementById('inventoryTable').style.display = 'table';
    document.getElementById('searchResultsTable').style.display = 'none';
}

// Save items to store.csv
function saveItems() {
    // Merge records before saving
    const mergedInventory = mergeInventoryRecords(inventory);
    
    // Create data to save including restocks
    const itemsToSave = mergedInventory.map(item => ({
        'Date': formatDate(item.date),
        'Store ID': item.storeID,
        'Product ID': item.productID,
        'Category': item.category,
        'Inventory Level': item.inventoryLevel,
        'Units Sold': item.unitsSold,
        'Units Ordered': item.unitsOrdered,
        'Price': item.price,
        'Seasonality': item.seasonality,
        'Is Restock': item.isRestock || false,
        'Restock Date': item.restockDate || ''
    }));

    // Add pending and confirmed restocks to the data
    const restockItems = [...pendingRestocks, ...confirmedRestocks].map(restock => ({
        'Date': formatDate(new Date(restock.restockDate)),
        'Store ID': restock.storeId,
        'Product ID': restock.productId,
        'Category': restock.category,
        'Inventory Level': restock.currentStock,
        'Units Sold': 0,
        'Units Ordered': restock.suggestedOrder,
        'Price': restock.price || 0,
        'Seasonality': restock.seasonality || '',
        'Is Restock': true,
        'Restock Date': restock.restockDate,
        'Status': restock.status
    }));

    // Combine all items
    const allItems = [...itemsToSave, ...restockItems];

    // Save to CSV
    const csv = Papa.unparse(allItems);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'store.csv';
    link.click();

    // Save restocks to localStorage
    localStorage.setItem('pendingRestocks', JSON.stringify(pendingRestocks));
    localStorage.setItem('confirmedRestocks', JSON.stringify(confirmedRestocks));
}

// Edit item functionality
function editItem(index) {
    const item = inventory[index];
    document.getElementById("editItemDate").value = item.date.toISOString().split('T')[0];
    document.getElementById("editItemStoreID").value = item.storeID;
    document.getElementById("editItemProductID").value = item.productID;
    document.getElementById("editItemCategory").value = item.category;
    document.getElementById("editItemInventoryLevel").value = item.inventoryLevel;
    document.getElementById("editItemUnitsSold").value = item.unitsSold;
    document.getElementById("editItemUnitsOrdered").value = item.unitsOrdered;
    document.getElementById("editItemPrice").value = item.price;
    document.getElementById("editItemSeasonality").value = item.seasonality;
    document.getElementById("updateItemButton").onclick = function() {
        updateItem(index);
    };
    toggleTab('editItemInputs');
}

// Update item functionality
function updateItem(index) {
    const item = inventory[index];
    item.date = new Date(document.getElementById("editItemDate").value);
    item.storeID = document.getElementById("editItemStoreID").value;
    item.productID = document.getElementById("editItemProductID").value;
    item.category = document.getElementById("editItemCategory").value;
    item.inventoryLevel = parseInt(document.getElementById("editItemInventoryLevel").value);
    item.unitsSold = parseInt(document.getElementById("editItemUnitsSold").value);
    item.unitsOrdered = parseInt(document.getElementById("editItemUnitsOrdered").value);
    item.price = parseFloat(document.getElementById("editItemPrice").value);
    item.seasonality = document.getElementById("editItemSeasonality").value;
    displayFilteredInventory(inventory);
    toggleTab('dashboard');
}

// Delete item functionality
function deleteItem(index) {
    inventory.splice(index, 1);
    displayFilteredInventory(inventory);
}

// Modify the search function
function searchItems() {
    const searchCategory = document.getElementById("searchCategory").value;
    
    if (!searchCategory) {
        alert("Please select a category to search");
        return;
    }

    // Filter inventory based on category
    const searchResults = inventory.filter(item => 
        item.category === searchCategory
    );

    if (searchResults.length === 0) {
        alert("No items found in this category");
        return;
    }

    displaySearchResults(searchResults);
}

// Add new function to display search results
function displaySearchResults(items) {
    isSearchMode = true; // Set search mode when displaying search results
    // Hide the original inventory table and show search results table
    document.getElementById('inventoryTable').style.display = 'none';
    document.getElementById('pagination').style.display = 'block'; // Show pagination
    const searchTable = document.getElementById('searchResultsTable');
    searchTable.style.display = 'table';

    // Sort items by date in descending order
    items.sort((a, b) => b.date - a.date);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);
    const maxPage = Math.ceil(items.length / itemsPerPage);

    const tableBody = document.getElementById('searchResultsBody');
    tableBody.innerHTML = ''; // Clear previous results

    paginatedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        const date = item.date;
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${formattedDate}</td>
            <td>${item.storeID}</td>
            <td>${item.productID}</td>
            <td>${item.category}</td>
            <td>${item.inventoryLevel}</td>
            <td>${item.unitsSold}</td>
            <td>${item.unitsOrdered}</td>
            <td>${item.price}</td>
            <td>${item.seasonality}</td>
        `;
        tableBody.appendChild(row);
    });

    // Update pagination display
    document.getElementById('currentPage').innerText = `Page ${currentPage} of ${maxPage}`;

    // Update pagination button states
    const prevButton = document.querySelector('button[onclick="prevPage()"]');
    const nextButton = document.querySelector('button[onclick="nextPage()"]');
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === maxPage;

    // Store the filtered items for pagination
    filteredInventory = items;

    // Add a button to return to full inventory view
    const searchDiv = document.getElementById('searchCategoryInputs');
    if (!document.getElementById('returnButton')) {
        const returnButton = document.createElement('button');
        returnButton.innerHTML = '<i class="fas fa-undo"></i> Return to Full Inventory';
        returnButton.className = 'medium-button';
        returnButton.onclick = displayAllItems;
        returnButton.id = 'returnButton';
        searchDiv.appendChild(returnButton);
    }
}

function displayAllItems() {
    isSearchMode = false; // Reset search mode when returning to full inventory
    filteredInventory = []; // Clear filtered inventory
    currentPage = 1; // Reset to first page
    // Show original inventory table and hide search results
    document.getElementById('searchResultsTable').style.display = 'none';
    document.getElementById('inventoryTable').style.display = 'table';
    document.getElementById('pagination').style.display = 'block';
    document.getElementById('searchCategory').value = ''; // Reset dropdown selection
    
    // Remove the return button if it exists
    const returnButton = document.getElementById('returnButton');
    if (returnButton) {
        returnButton.remove();
    }
    
    // Display full inventory
    displayFilteredInventory(inventory);
}

function initializeEventListeners() {
    document.addEventListener("DOMContentLoaded", function() {
        populateStoreDropdown();
        document.getElementById("searchCategoryInputs").querySelector("button").addEventListener("click", searchItems);
        document.getElementById("displayAllButton").addEventListener("click", displayAllItems);
        document.getElementById("predictTabButton").addEventListener("click", predictRestock);
    });
}

function populateStoreDropdown() {
    const storeSelect = document.getElementById("salesStoreSelect");
    const uniqueStores = [...new Set(inventory.map(item => item.storeID))];
    uniqueStores.forEach(storeID => {
        const option = document.createElement("option");
        option.value = storeID;
        option.text = storeID;
        storeSelect.appendChild(option);
    });
}

function addSales() {
    if (!validateSaleInput()) return;
    
    const salesData = {
        productID: document.getElementById('salesProductSelect').value,
        category: document.getElementById('salesCategorySelect').value,
        quantity: parseInt(document.getElementById('salesQuantity').value),
        date: new Date(),
        storeID: document.getElementById('salesStoreSelect').value
    };
    
    sales.push(salesData);
    updateInventoryAfterSale(salesData.productID, salesData.quantity);
    displaySales();
}

function displaySales() {
    const storeID = document.getElementById("salesStoreSelect").value;
    const salesTableBody = document.getElementById("salesTable").getElementsByTagName('tbody')[0];
    salesTableBody.innerHTML = ''; // Clear previous data

    if (!storeID) {
        return;
    }

    const storeSales = sales.filter(sale => sale.storeID === storeID);
    storeSales.forEach((sale, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${sale.productID}</td>
            <td>${sale.category}</td>
            <td>${sale.quantity}</td>
            <td>${sale.date.toISOString().split('T')[0]}</td>
        `;
        salesTableBody.appendChild(row);
    });
}

// Add purchase functionality
function addPurchase() {
    if (!validatePurchaseInput()) return;
    
    const purchaseData = {
        productID: document.getElementById('purchaseProductSelect').value,
        category: document.getElementById('purchaseCategorySelect').value,
        quantity: parseInt(document.getElementById('purchaseQuantity').value),
        date: new Date(),
        storeID: document.getElementById('purchaseStoreSelect').value
    };
    
    purchases.push(purchaseData);
    updateInventoryAfterPurchase(purchaseData.productID, purchaseData.quantity);
    displayPurchases();
}

// Display purchases functionality
function displayPurchases() {
    const purchasesTableBody = document.getElementById("purchasesTable").getElementsByTagName('tbody')[0];
    purchasesTableBody.innerHTML = ''; // Clear previous data

    purchases.forEach((purchase, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${purchase.productID}</td>
            <td>${purchase.category}</td>
            <td>${purchase.quantity}</td>
            <td>${purchase.date.toISOString().split('T')[0]}</td>
        `;
        purchasesTableBody.appendChild(row);
    });
}

function displayInventoryStats() {
    // Calculate total items, sales, and purchases
    const totalItems = inventory.length;
    const totalSales = inventory.reduce((sum, item) => sum + item.unitsSold, 0);
    const totalPurchases = inventory.reduce((sum, item) => sum + item.unitsOrdered, 0);
    const totalSalesValue = inventory.reduce((sum, item) => sum + (item.unitsSold * item.price), 0);
    const totalPurchaseValue = inventory.reduce((sum, item) => sum + (item.unitsOrdered * item.price), 0);

    document.getElementById('totalItems').innerText = `${totalItems}`;
    document.getElementById('totalSalesValue').innerText = `${totalSales} units ($${totalSalesValue.toFixed(2)})`;
    document.getElementById('totalStockValue').innerText = `${totalPurchases} units ($${totalPurchaseValue.toFixed(2)})`;
}

function displayDashboardCharts() {
    displayInventoryStatusChart();
    displayRevenueChart();
    displayStorePerformanceChart();
    initializeCategoryTrendChart();
}

// Replace the displayRevenueChart function
function displayRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const monthlyRevenue = new Map();

    // Calculate revenue by month and store in Map to maintain order
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(month => monthlyRevenue.set(month, 0));

    inventory.forEach(item => {
        const month = months[item.date.getMonth()];
        const revenue = item.unitsSold * item.price;
        monthlyRevenue.set(month, monthlyRevenue.get(month) + revenue);
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from(monthlyRevenue.keys()),
            datasets: [{
                label: 'Monthly Revenue',
                data: Array.from(monthlyRevenue.values()),
                borderColor: '#4BC0C0',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Revenue Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Revenue ($)'
                    }
                }
            }
        }
    });
}

function displayInventoryStatusChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const productStatus = {
        'Low Stock (< 100)': 0,
        'Medium Stock (100-300)': 0,
        'High Stock (> 300)': 0
    };

    inventory.forEach(item => {
        if (item.inventoryLevel < 100) {
            productStatus['Low Stock (< 100)']++;
        } else if (item.inventoryLevel <= 300) {
            productStatus['Medium Stock (100-300)']++;
        } else {
            productStatus['High Stock (> 300)']++;
        }
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(productStatus),
            datasets: [{
                data: Object.values(productStatus),
                backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Inventory Status Distribution'
                }
            }
        }
    });
}

// Replace the displayStorePerformanceChart function
function displayStorePerformanceChart() {
    const ctx = document.getElementById('storePerformanceChart').getContext('2d');
    const storeMetrics = {};

    // Calculate store metrics
    inventory.forEach(item => {
        if (!storeMetrics[item.storeID]) {
            storeMetrics[item.storeID] = {
                revenue: 0,
                sales: 0,
                margin: 0,
                growth: 0
            };
        }
        
        const metrics = storeMetrics[item.storeID];
        metrics.revenue += item.unitsSold * item.price;
        metrics.sales += item.unitsSold;
        metrics.margin += (item.price - (item.price * 0.7)) * item.unitsSold; // Assuming 30% cost
    });

    // Calculate growth (comparing first half vs second half of data)
    Object.values(storeMetrics).forEach(metrics => {
        metrics.averageOrderValue = metrics.revenue / metrics.sales;
    });

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Revenue', 'Sales Volume', 'Profit Margin', 'Avg Order Value'],
            datasets: Object.entries(storeMetrics).map(([storeId, metrics]) => ({
                label: `Store ${storeId}`,
                data: [
                    metrics.revenue / 1000, // Scale down for better visualization
                    metrics.sales,
                    metrics.margin / 1000, // Scale down for better visualization
                    metrics.averageOrderValue
                ],
                fill: true,
                backgroundColor: `hsla(${Math.random() * 360}, 70%, 60%, 0.2)`,
                borderColor: `hsla(${Math.random() * 360}, 70%, 60%, 1)`,
                pointBackgroundColor: `hsla(${Math.random() * 360}, 70%, 60%, 1)`,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: `hsla(${Math.random() * 360}, 70%, 60%, 1)`
            }))
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Store Performance Comparison'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const metrics = storeMetrics[context.dataset.label.split(' ')[1]];
                            const value = context.raw;
                            const label = context.chart.data.labels[context.dataIndex];
                            if (label === 'Revenue' || label === 'Profit Margin') {
                                return `${label}: $${(value * 1000).toFixed(2)}`; // Scale back up
                            } else if (label === 'Avg Order Value') {
                                return `${label}: $${value.toFixed(2)}`;
                            } else {
                                return `${label}: ${value.toFixed(0)} units`;
                            }
                        }
                    }
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0
                }
            }
        }
    });

    // Update top metrics display
    displayTopMetrics(storeMetrics);
}

function displayTopMetrics(storeMetrics) {
    const topMetricsDiv = document.getElementById('topMetrics');
    const sortedStores = Object.entries(storeMetrics)
        .sort((a, b) => b[1].revenue - a[1].revenue);
    
    const topStore = sortedStores[0];
    topMetricsDiv.innerHTML = `
        <div class="metric">
            <strong>Top Store:</strong> ${topStore[0]}<br>
            Revenue: $${topStore[1].revenue.toFixed(2)}<br>
            Sales: ${topStore[1].totalSales}
        </div>
    `;
}

function initializeCategoryTrendChart() {
    // Populate store dropdown
    const storeSelect = document.getElementById('storeTrendSelect');
    const stores = [...new Set(inventory.map(item => item.storeID))];
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store;
        option.textContent = `Store ${store}`;
        storeSelect.appendChild(option);
    });

    // Initial empty chart
    const ctx = document.getElementById('categoryTrendChart').getContext('2d');
    window.categoryTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Category Performance by Store'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Units Sold'
                    }
                }
            }
        }
    });

    // Add event listener for store selection
    storeSelect.addEventListener('change', updateCategoryTrendChart);
}

function updateCategoryTrendChart(event) {
    const selectedStore = event.target.value;
    if (!selectedStore) return;

    const storeData = inventory.filter(item => item.storeID === selectedStore);
    const categoryData = {};

    // Aggregate data by category
    storeData.forEach(item => {
        if (!categoryData[item.category]) {
            categoryData[item.category] = {
                unitsSold: 0,
                revenue: 0
            };
        }
        categoryData[item.category].unitsSold += item.unitsSold;
        categoryData[item.category].revenue += item.unitsSold * item.price;
    });

    // Update chart
    window.categoryTrendChart.data = {
        labels: Object.keys(categoryData),
        datasets: [{
            label: 'Units Sold',
            data: Object.values(categoryData).map(d => d.unitsSold),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }, {
            label: 'Revenue ($)',
            data: Object.values(categoryData).map(d => d.revenue),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            yAxisID: 'revenue'
        }]
    };

    window.categoryTrendChart.options.scales.revenue = {
        position: 'right',
        title: {
            display: true,
            text: 'Revenue ($)'
        }
    };

    window.categoryTrendChart.update();
}

function predictDemand() {
    // Show loading overlay
    document.getElementById('loadingOverlay').style.display = 'flex';

    const storeId = document.getElementById('forecastStore').value;
    const category = document.getElementById('forecastCategory').value;
    const productId = document.getElementById('forecastProduct').value;
    const period = parseInt(document.getElementById('forecastPeriod').value) || 7;

    // Validate inputs
    if (period < 1 || period > 90) {
        alert('Please enter a valid forecast period (1-90 days)');
        document.getElementById('loadingOverlay').style.display = 'none';
        return;
    }

    // Filter and validate inventory data
    const validInventory = inventory.filter(item => 
        item.date instanceof Date && 
        !isNaN(item.date) && 
        item.unitsSold >= 0 &&
        (!storeId || item.storeID === storeId) &&
        (!category || item.category === category) &&
        (!productId || item.productID === productId)
    );

    if (!validInventory.length) {
        alert('No valid data found for the selected criteria');
        document.getElementById('loadingOverlay').style.display = 'none';
        return;
    }

    const requestData = {
        inventory: validInventory.map(item => ({
            date: formatDate(item.date),
            storeID: item.storeID,
            productID: item.productID,
            category: item.category,
            inventoryLevel: item.inventoryLevel,
            unitsSold: item.unitsSold,
            price: item.price,
            seasonality: item.seasonality
        })),
        storeId: storeId,
        category: category,
        productId: productId,
        forecastPeriod: period
    };

    fetch('http://127.0.0.1:5000/predict-demand', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Store prediction data with metadata
        localStorage.setItem('predictionData', JSON.stringify({
            predictions: data,
            filters: {
                storeId: storeId,
                category: category,
                productId: productId,
                period: period
            }
        }));
        
        // Open results in new window
        window.open('demand-forecast.html', '_blank', 'width=1000,height=800');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error generating demand forecast: ' + error.message);
    })
    .finally(() => {
        document.getElementById('loadingOverlay').style.display = 'none';
    });
}

function nextPage() {
    const items = isSearchMode ? filteredInventory : inventory;
    const maxPage = Math.ceil(items.length / itemsPerPage);
    if (currentPage < maxPage) {
        currentPage++;
        if (isSearchMode) {
            displaySearchResults(filteredInventory);
        } else {
            displayFilteredInventory(items);
        }
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        if (isSearchMode) {
            displaySearchResults(filteredInventory);
        } else {
            displayFilteredInventory(inventory);
        }
    }
}

initializeEventListeners();

function initializeDropdowns() {
    // Get unique values from inventory
    const uniqueStores = [...new Set(inventory.map(item => item.storeID))].sort();
    const uniqueProducts = [...new Set(inventory.map(item => item.productID))].sort();
    const uniqueCategories = [...new Set(inventory.map(item => item.category))].sort();

    // Populate sales dropdowns
    populateDropdown('salesStoreSelect', uniqueStores);
    populateDropdown('salesProductSelect', uniqueProducts);
    populateDropdown('salesCategorySelect', uniqueCategories);

    // Populate purchase dropdowns
    populateDropdown('purchaseStoreSelect', uniqueStores);
    populateDropdown('purchaseProductSelect', uniqueProducts);
    populateDropdown('purchaseCategorySelect', uniqueCategories);

    // Populate search category dropdown
    populateDropdown('searchCategory', uniqueCategories);

    // Set default date ranges
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('salesStartDate').valueAsDate = lastMonth;
    document.getElementById('salesEndDate').valueAsDate = today;
    document.getElementById('purchaseStartDate').valueAsDate = lastMonth;
    document.getElementById('purchaseEndDate').valueAsDate = today;

    // Add event listeners for cascading dropdowns
    document.getElementById('purchaseStoreSelect').addEventListener('change', updatePurchaseProductDropdown);
    document.getElementById('purchaseProductSelect').addEventListener('change', updatePurchaseCategoryDropdown);
    
    // Initialize dropdowns with initial data
    updatePurchaseProductDropdown();
}

function populateDropdown(elementId, values) {
    const dropdown = document.getElementById(elementId);
    dropdown.innerHTML = '<option value="">All</option>';
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        dropdown.appendChild(option);
    });
}

function filterSales() {
    const storeId = document.getElementById('salesStoreSelect').value;
    const productId = document.getElementById('salesProductSelect').value;
    const category = document.getElementById('salesCategorySelect').value;
    const startDate = new Date(document.getElementById('salesStartDate').value);
    const endDate = new Date(document.getElementById('salesEndDate').value);

    // Filter inventory data instead of sales array
    let filteredData = [...inventory];

    if (storeId) {
        filteredData = filteredData.filter(item => item.storeID === storeId);
    }
    if (productId) {
        filteredData = filteredData.filter(item => item.productID === productId);
    }
    if (category) {
        filteredData = filteredData.filter(item => item.category === category);
    }
    if (!isNaN(startDate.getTime())) {
        filteredData = filteredData.filter(item => item.date >= startDate);
    }
    if (!isNaN(endDate.getTime())) {
        filteredData = filteredData.filter(item => item.date <= endDate);
    }

    // Only include items with units sold > 0
    filteredData = filteredData.filter(item => item.unitsSold > 0);

    displayFilteredSales(filteredData);
}

function displayFilteredSales(filteredData) {
    const salesTableBody = document.getElementById("salesTable").getElementsByTagName('tbody')[0];
    salesTableBody.innerHTML = ''; // Clear previous data

    filteredData.forEach((item) => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.date);
        const totalValue = item.unitsSold * item.price;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.storeID}</td>
            <td>${item.productID}</td>
            <td>${item.category}</td>
            <td>${item.unitsSold}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${totalValue.toFixed(2)}</td>
            <td>${item.inventoryLevel}</td>
        `;
        salesTableBody.appendChild(row);
    });
}

function filterPurchases() {
    const storeId = document.getElementById('purchaseStoreSelect').value;
    const productId = document.getElementById('purchaseProductSelect').value;
    const category = document.getElementById('purchaseCategorySelect').value;
    const startDate = new Date(document.getElementById('purchaseStartDate').value);
    const endDate = new Date(document.getElementById('purchaseEndDate').value);

    // Filter inventory data instead of purchases array
    let filteredData = [...inventory];

    if (storeId) {
        filteredData = filteredData.filter(item => item.storeID === storeId);
    }
    if (productId) {
        filteredData = filteredData.filter(item => item.productID === productId);
    }
    if (category) {
        filteredData = filteredData.filter(item => item.category === category);
    }
    if (!isNaN(startDate.getTime())) {
        filteredData = filteredData.filter(item => item.date >= startDate);
    }
    if (!isNaN(endDate.getTime())) {
        filteredData = filteredData.filter(item => item.date <= endDate);
    }

    // Only include items with units ordered > 0
    filteredData = filteredData.filter(item => item.unitsOrdered > 0);

    displayFilteredPurchases(filteredData);
}

function displayFilteredPurchases(filteredData) {
    const purchasesTableBody = document.getElementById("purchasesTable").getElementsByTagName('tbody')[0];
    purchasesTableBody.innerHTML = ''; // Clear previous data

    filteredData.forEach((item) => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.date);
        const totalValue = item.unitsOrdered * item.price;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.storeID}</td>
            <td>${item.productID}</td>
            <td>${item.category}</td>
            <td>${item.unitsOrdered}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${totalValue.toFixed(2)}</td>
            <td>${item.inventoryLevel + item.unitsOrdered}</td>
        `;
        purchasesTableBody.appendChild(row);
    });
}

// After the page loads, initialize all dropdowns
document.addEventListener('DOMContentLoaded', function() {
    initializeDropdowns();
    
    // Also initialize date ranges with default values
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('salesStartDate').valueAsDate = lastMonth;
    document.getElementById('salesEndDate').valueAsDate = today;
    document.getElementById('purchaseStartDate').valueAsDate = lastMonth;
    document.getElementById('purchaseEndDate').valueAsDate = today;
    
    // Initial display of sales and purchases
    filterSales();
    filterPurchases();
});

// Add these functions for handling sales and purchases data
function updateInventoryAfterSale(productId, quantity) {
    const product = inventory.find(item => item.productID === productId);
    if (product) {
        product.inventoryLevel -= quantity;
        product.unitsSold += quantity;
        displayFilteredInventory(inventory);
        displayFilteredSales(sales);
    }
}

function updateInventoryAfterPurchase(productId, quantity) {
    const product = inventory.find(item => item.productID === productId);
    if (product) {
        product.inventoryLevel += quantity;
        product.unitsOrdered += quantity;
        displayFilteredInventory(inventory);
        displayFilteredPurchases(purchases);
    }
}

// Add these helper functions for data validation
function validateSaleInput() {
    const quantity = parseInt(document.getElementById('salesQuantity').value);
    const productId = document.getElementById('salesProductID').value;
    const product = inventory.find(item => item.productID === productId);
    
    if (!product) {
        alert('Product not found');
        return false;
    }
    
    if (quantity > product.inventoryLevel) {
        alert('Not enough inventory available');
        return false;
    }
    
    if (quantity <= 0) {
        alert('Please enter a valid quantity');
        return false;
    }
    
    return true;
}

function validatePurchaseInput() {
    const selectedStore = document.getElementById('purchaseStoreSelect').value;
    const selectedProduct = document.getElementById('purchaseProductSelect').value;
    const selectedCategory = document.getElementById('purchaseCategorySelect').value;
    const quantity = parseInt(document.getElementById('purchaseQuantity').value);

    if (!selectedStore || !selectedProduct || !selectedCategory) {
        alert('Please select all required fields');
        return false;
    }

    if (isNaN(quantity) || quantity <= 0) {
        alert('Please enter a valid quantity');
        return false;
    }

    const item = inventory.find(i => 
        i.storeID === selectedStore && 
        i.productID === selectedProduct && 
        i.category === selectedCategory
    );

    if (!item) {
        alert('Product not found in inventory');
        return false;
    }

    return true;
}

// Update the addSales and addPurchase functions to use validation
function addSales() {
    if (!validateSaleInput()) return;
    
    const salesData = {
        productID: document.getElementById('salesProductID').value,
        category: document.getElementById('salesCategory').value,
        quantity: parseInt(document.getElementById('salesQuantity').value),
        date: new Date(),
        storeID: document.getElementById('salesStoreSelect').value
    };
    
    sales.push(salesData);
    updateInventoryAfterSale(salesData.productID, salesData.quantity);
    displaySales();
}

function addPurchase() {
    if (!validatePurchaseInput()) return;
    
    const purchaseData = {
        productID: document.getElementById('purchaseProductID').value,
        category: document.getElementById('purchaseCategory').value,
        quantity: parseInt(document.getElementById('purchaseQuantity').value),
        date: new Date(),
        storeID: document.getElementById('purchaseStoreSelect').value
    };
    
    purchases.push(purchaseData);
    updateInventoryAfterPurchase(purchaseData.productID, purchaseData.quantity);
    displayPurchases();
}

// Function to toggle dropdowns
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId + 'Dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function sortSales(criteria) {
    const salesTable = document.getElementById('salesTable');
    const tbody = salesTable.getElementsByTagName('tbody')[0];
    const rows = Array.from(tbody.getElementsByTagName('tr'));

    rows.sort((a, b) => {
        let aValue, bValue;
        
        switch(criteria) {
            case 'date':
                // Date is in first column (0), format: DD-MM-YYYY
                aValue = parseDate(a.cells[0].textContent);
                bValue = parseDate(b.cells[0].textContent);
                break;
            case 'quantity':
                // Units sold is in fifth column (4)
                aValue = parseInt(a.cells[4].textContent);
                bValue = parseInt(b.cells[4].textContent);
                break;
            case 'value':
                // Total value is in seventh column (6), format: $XX.XX
                aValue = parseFloat(a.cells[6].textContent.replace('$', ''));
                bValue = parseFloat(b.cells[6].textContent.replace('$', ''));
                break;
        }
        return bValue - aValue; // Descending order
    });

    // Clear and repopulate tbody
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

function sortPurchases(criteria) {
    const purchasesTable = document.getElementById('purchasesTable');
    const tbody = purchasesTable.getElementsByTagName('tbody')[0];
    const rows = Array.from(tbody.getElementsByTagName('tr'));

    rows.sort((a, b) => {
        let aValue, bValue;
        
        switch(criteria) {
            case 'date':
                // Date is in first column (0), format: DD-MM-YYYY
                aValue = parseDate(a.cells[0].textContent);
                bValue = parseDate(b.cells[0].textContent);
                break;
            case 'quantity':
                // Units ordered is in fifth column (4)
                aValue = parseInt(a.cells[4].textContent);
                bValue = parseInt(b.cells[4].textContent);
                break;
            case 'value':
                // Total value is in seventh column (6), format: $XX.XX
                aValue = parseFloat(a.cells[6].textContent.replace('$', ''));
                bValue = parseFloat(b.cells[6].textContent.replace('$', ''));
                break;
        }
        return bValue - aValue; // Descending order
    });

    // Clear and repopulate tbody
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

// Helper function to parse date string in DD-MM-YYYY format
function parseDate(dateString) {
    const [day, month, year] = dateString.split('-');
    return new Date(year, month - 1, day);
}

// Update displayFilteredSales to store sortable values properly
function displayFilteredSales(filteredData) {
    const salesTableBody = document.getElementById("salesTable").getElementsByTagName('tbody')[0];
    salesTableBody.innerHTML = ''; // Clear previous data

    filteredData.forEach((item) => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.date);
        const totalValue = item.unitsSold * item.price;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.storeID}</td>
            <td>${item.productID}</td>
            <td>${item.category}</td>
            <td>${item.unitsSold}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${totalValue.toFixed(2)}</td>
            <td>${item.inventoryLevel}</td>
        `;
        salesTableBody.appendChild(row);
    });
}

// Update displayFilteredPurchases to store sortable values properly
function displayFilteredPurchases(filteredData) {
    const purchasesTableBody = document.getElementById("purchasesTable").getElementsByTagName('tbody')[0];
    purchasesTableBody.innerHTML = ''; // Clear previous data

    filteredData.forEach((item) => {
        const row = document.createElement('tr');
        const formattedDate = formatDate(item.date);
        const totalValue = item.unitsOrdered * item.price;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.storeID}</td>
            <td>${item.productID}</td>
            <td>${item.category}</td>
            <td>${item.unitsOrdered}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${totalValue.toFixed(2)}</td>
            <td>${item.inventoryLevel + item.unitsOrdered}</td>
        `;
        purchasesTableBody.appendChild(row);
    });
}

// Helper function to format date consistently
function formatDate(date) {
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
}

function updatePurchaseProductDropdown() {
    const selectedStore = document.getElementById('purchaseStoreSelect').value;
    if (!selectedStore) {
        populateDropdown('purchaseProductSelect', [...new Set(inventory.map(item => item.productID))].sort());
        return;
    }

    const storeProducts = [...new Set(
        inventory
            .filter(item => item.storeID === selectedStore)
            .map(item => item.productID)
    )].sort();

    populateDropdown('purchaseProductSelect', storeProducts);
    updatePurchaseCategoryDropdown();
}

function updatePurchaseCategoryDropdown() {
    const selectedStore = document.getElementById('purchaseStoreSelect').value;
    const selectedProduct = document.getElementById('purchaseProductSelect').value;

    let filteredCategories;
    if (selectedStore && selectedProduct) {
        filteredCategories = [...new Set(
            inventory
                .filter(item => 
                    item.storeID === selectedStore && 
                    item.productID === selectedProduct
                )
                .map(item => item.category)
        )].sort();
    } else if (selectedStore) {
        filteredCategories = [...new Set(
            inventory
                .filter(item => item.storeID === selectedStore)
                .map(item => item.category)
        )].sort();
    } else {
        filteredCategories = [...new Set(inventory.map(item => item.category))].sort();
    }

    populateDropdown('purchaseCategorySelect', filteredCategories);
}

function initializePurchaseForm() {
    // Initialize store dropdown
    const storeSelect = document.getElementById('purchaseStoreSelect');
    const uniqueStores = [...new Set(inventory.map(item => item.storeID))].sort();
    storeSelect.innerHTML = '<option value="">Select Store</option>';
    uniqueStores.forEach(store => {
        storeSelect.innerHTML += `<option value="${store}">${store}</option>`;
    });

    // Add event listeners for cascade behavior
    storeSelect.addEventListener('change', function() {
        updatePurchaseProductDropdown();
        updatePurchasePreview();
    });

    const productSelect = document.getElementById('purchaseProductSelect');
    productSelect.addEventListener('change', function() {
        updatePurchaseCategoryDropdown();
        updatePurchasePreview();
    });

    const categorySelect = document.getElementById('purchaseCategorySelect');
    categorySelect.addEventListener('change', updatePurchasePreview);

    const quantityInput = document.getElementById('purchaseQuantity');
    quantityInput.addEventListener('input', updatePurchasePreview);
}

function updatePurchasePreview() {
    const storeId = document.getElementById('purchaseStoreSelect').value;
    const productId = document.getElementById('purchaseProductSelect').value;
    const category = document.getElementById('purchaseCategorySelect').value;
    const quantity = document.getElementById('purchaseQuantity').value;

    const previewDiv = document.getElementById('purchaseDetails');
    
    if (storeId && productId && category && quantity) {
        const item = inventory.find(i => 
            i.storeID === storeId && 
            i.productID === productId && 
            i.category === category
        );

        if (item) {
            const totalCost = item.price * quantity;
            previewDiv.innerHTML = `
                <strong>Store:</strong> ${storeId}<br>
                <strong>Product:</strong> ${productId}<br>
                <strong>Category:</strong> ${category}<br>
                <strong>Quantity:</strong> ${quantity}<br>
                <strong>Price per Unit:</strong> $${item.price.toFixed(2)}<br>
                <strong>Total Cost:</strong> $${totalCost.toFixed(2)}<br>
                <strong>Current Inventory:</strong> ${item.inventoryLevel}
            `;
        }
    } else {
        previewDiv.innerHTML = 'Please fill in all fields to see purchase preview';
    }
}

// Add this to your existing event listeners
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    initializePurchaseForm();
});

function initializeSalesForm() {
    const storeSelect = document.getElementById('salesStoreSelect');
    const productSelect = document.getElementById('salesProductSelect');
    const categorySelect = document.getElementById('salesCategorySelect');

    // Get unique values from inventory
    const uniqueStores = [...new Set(inventory.map(item => item.storeID))].sort();
    const uniqueProducts = [...new Set(inventory.map(item => item.productID))].sort();
    const uniqueCategories = [...new Set(inventory.map(item => item.category))].sort();

    // Clear and populate dropdowns
    storeSelect.innerHTML = '<option value="">Select Store</option>';
    uniqueStores.forEach(store => {
        storeSelect.innerHTML += `<option value="${store}">${store}</option>`;
    });

    // Add change event listeners for cascade selection
    storeSelect.addEventListener('change', function() {
        const selectedStore = this.value;
        if (selectedStore) {
            // Filter products for selected store
            const storeProducts = [...new Set(
                inventory
                    .filter(item => item.storeID === selectedStore)
                    .map(item => item.productID)
            )].sort();

            productSelect.innerHTML = '<option value="">Select Product</option>';
            storeProducts.forEach(product => {
                productSelect.innerHTML += `<option value="${product}">${product}</option>`;
            });
            productSelect.disabled = false;
        } else {
            productSelect.innerHTML = '<option value="">Select Product</option>';
            productSelect.disabled = true;
            categorySelect.disabled = true;
        }
        updateSalePreview();
    });

    productSelect.addEventListener('change', function() {
        const selectedStore = storeSelect.value;
        const selectedProduct = this.value;
        if (selectedStore && selectedProduct) {
            // Filter categories for selected store and product
            const categories = [...new Set(
                inventory
                    .filter(item => 
                        item.storeID === selectedStore && 
                        item.productID === selectedProduct
                    )
                    .map(item => item.category)
            )].sort();

            categorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
            });
            categorySelect.disabled = false;
        }
        updateSalePreview();
    });
}

function updateSalesProductDropdown() {
    const selectedStore = document.getElementById('salesStoreSelect').value;
    const productSelect = document.getElementById('salesProductSelect');
    
    if (!selectedStore) {
        populateDropdown('salesProductSelect', [...new Set(inventory.map(item => item.productID))].sort());
        return;
    }

    const storeProducts = [...new Set(
        inventory
            .filter(item => item.storeID === selectedStore)
            .map(item => item.productID)
    )].sort();

    populateDropdown('salesProductSelect', storeProducts);
    updateSalesCategoryDropdown();
}

function updateSalesCategoryDropdown() {
    const selectedStore = document.getElementById('salesStoreSelect').value;
    const selectedProduct = document.getElementById('salesProductSelect').value;
    
    let filteredCategories;
    if (selectedStore && selectedProduct) {
        filteredCategories = [...new Set(
            inventory
                .filter(item => 
                    item.storeID === selectedStore && 
                    item.productID === selectedProduct
                )
                .map(item => item.category)
        )].sort();
    } else {
        filteredCategories = [...new Set(inventory.map(item => item.category))].sort();
    }

    populateDropdown('salesCategorySelect', filteredCategories);
}

function updateSalePreview() {
    const storeId = document.getElementById('salesStoreSelect').value;
    const productId = document.getElementById('salesProductSelect').value;
    const category = document.getElementById('salesCategorySelect').value;
    const quantity = document.getElementById('salesQuantity').value;

    const previewDiv = document.getElementById('saleDetails');
    
    if (storeId && productId && category && quantity) {
        const item = inventory.find(i => 
            i.storeID === storeId && 
            i.productID === productId && 
            i.category === category
        );

        if (item) {
            const totalValue = item.price * quantity;
            previewDiv.innerHTML = `
                <strong>Store:</strong> ${storeId}<br>
                <strong>Product:</strong> ${productId}<br>
                <strong>Category:</strong> ${category}<br>
                <strong>Quantity:</strong> ${quantity}<br>
                <strong>Price per Unit:</strong> $${item.price.toFixed(2)}<br>
                <strong>Total Value:</strong> $${totalValue.toFixed(2)}<br>
                <strong>Current Inventory:</strong> ${item.inventoryLevel}
            `;
        }
    } else {
        previewDiv.innerHTML = 'Please fill in all fields to see sale preview';
    }
}

// Update the initialization code
document.addEventListener('DOMContentLoaded', function() {
    initializeDropdowns();
    initializeSalesForm();
    initializePurchaseForm();
    
    // Set default date ranges
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('salesStartDate').valueAsDate = lastMonth;
    document.getElementById('salesEndDate').valueAsDate = today;
    document.getElementById('purchaseStartDate').valueAsDate = lastMonth;
    document.getElementById('purchaseEndDate').valueAsDate = today;
    
    // Initial display
    filterSales();
    filterPurchases();
});

function initializeAddSalesDropdowns() {
    const addSalesStoreSelect = document.getElementById('addSalesStore');
    const addSalesProductSelect = document.getElementById('addSalesProduct');
    const addSalesCategorySelect = document.getElementById('addSalesCategory');
    const quantityInput = document.getElementById('addSalesQuantity');

    // Get unique values
    const uniqueStores = [...new Set(inventory.map(item => item.storeID))].sort();

    // Initialize store dropdown
    addSalesStoreSelect.innerHTML = '<option value="">Select Store</option>';
    uniqueStores.forEach(store => {
        addSalesStoreSelect.innerHTML += `<option value="${store}">${store}</option>`;
    });

    // Store selection changes
    addSalesStoreSelect.addEventListener('change', function() {
        const selectedStore = this.value;
        
        // Filter products for selected store
        const storeProducts = [...new Set(
            inventory
                .filter(item => item.storeID === selectedStore)
                .map(item => item.productID)
        )].sort();

        // Update product dropdown
        addSalesProductSelect.innerHTML = '<option value="">Select Product</option>';
        storeProducts.forEach(product => {
            addSalesProductSelect.innerHTML += `<option value="${product}">${product}</option>`;
        });
        addSalesProductSelect.disabled = false;
        addSalesCategorySelect.disabled = true;
        addSalesCategorySelect.innerHTML = '<option value="">Select Category</option>';
        updateSalePreview();
    });

    // Product selection changes
    addSalesProductSelect.addEventListener('change', function() {
        const selectedStore = addSalesStoreSelect.value;
        const selectedProduct = this.value;
        
        if (selectedStore && selectedProduct) {
            // Filter categories
            const categories = [...new Set(
                inventory
                    .filter(item => 
                        item.storeID === selectedStore && 
                        item.productID === selectedProduct
                    )
                    .map(item => item.category)
            )].sort();

            // Update category dropdown
            addSalesCategorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                addSalesCategorySelect.innerHTML += `<option value="${category}">${category}</option>`;
            });
            addSalesCategorySelect.disabled = false;
        }
        updateSalePreview();
    });

    // Category and quantity changes
    addSalesCategorySelect.addEventListener('change', updateSalePreview);
    quantityInput.addEventListener('input', updateSalePreview);
}

function initializeAddPurchaseDropdowns() {
    const addPurchaseStoreSelect = document.getElementById('addPurchaseStore');
    const addPurchaseProductSelect = document.getElementById('addPurchaseProduct');
    const addPurchaseCategorySelect = document.getElementById('addPurchaseCategory');
    const quantityInput = document.getElementById('addPurchaseQuantity');

    // Get unique values
    const uniqueStores = [...new Set(inventory.map(item => item.storeID))].sort();

    // Initialize store dropdown
    addPurchaseStoreSelect.innerHTML = '<option value="">Select Store</option>';
    uniqueStores.forEach(store => {
        addPurchaseStoreSelect.innerHTML += `<option value="${store}">${store}</option>`;
    });

    // Store selection changes
    addPurchaseStoreSelect.addEventListener('change', function() {
        const selectedStore = this.value;
        
        // Filter products for selected store
        const storeProducts = [...new Set(
            inventory
                .filter(item => item.storeID === selectedStore)
                .map(item => item.productID)
        )].sort();

        // Update product dropdown
        addPurchaseProductSelect.innerHTML = '<option value="">Select Product</option>';
        storeProducts.forEach(product => {
            addPurchaseProductSelect.innerHTML += `<option value="${product}">${product}</option>`;
        });
        addPurchaseProductSelect.disabled = false;
        addPurchaseCategorySelect.disabled = true;
        addPurchaseCategorySelect.innerHTML = '<option value="">Select Category</option>';
        updatePurchasePreview();
    });

    // Product selection changes
    addPurchaseProductSelect.addEventListener('change', function() {
        const selectedStore = addPurchaseStoreSelect.value;
        const selectedProduct = this.value;
        
        if (selectedStore && selectedProduct) {
            // Filter categories
            const categories = [...new Set(
                inventory
                    .filter(item => 
                        item.storeID === selectedStore && 
                        item.productID === selectedProduct
                    )
                    .map(item => item.category)
            )].sort();

            // Update category dropdown
            addPurchaseCategorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                addPurchaseCategorySelect.innerHTML += `<option value="${category}">${category}</option>`;
            });
            addPurchaseCategorySelect.disabled = false;
        }
        updatePurchasePreview();
    });

    // Category and quantity changes
    addPurchaseCategorySelect.addEventListener('change', updatePurchasePreview);
    quantityInput.addEventListener('input', updatePurchasePreview);
}

function previewSale() {
    const storeId = document.getElementById('addSalesStore').value;
    const productId = document.getElementById('addSalesProduct').value;
    const category = document.getElementById('addSalesCategory').value;
    const quantity = parseInt(document.getElementById('addSalesQuantity').value);

    if (!storeId || !productId || !category || !quantity) {
        alert('Please fill in all fields');
        return;
    }

    const item = inventory.find(i => 
        i.storeID === storeId && 
        i.productID === productId && 
        i.category === category
    );

    if (!item) {
        alert('Product not found in inventory');
        return;
    }

    if (quantity > item.inventoryLevel) {
        alert('Not enough inventory available');
        return;
    }

    const totalValue = item.price * quantity;
    const newInventoryLevel = item.inventoryLevel - quantity;

    currentPreviewData = {
        type: 'sale',
        storeId,
        productId,
        category,
        quantity,
        price: item.price,
        totalValue,
        currentInventory: item.inventoryLevel,
        newInventoryLevel
    };

    // Update preview display
    document.getElementById('saleImpact').innerHTML = `
        <h4>Impact on Inventory:</h4>
        <p>Current Inventory Level: ${item.inventoryLevel}</p>
        <p>After Sale: ${newInventoryLevel}</p>
        <p>Total Sale Value: $${totalValue.toFixed(2)}</p>
    `;

    // Show confirm/cancel buttons, hide preview button
    document.querySelector('#addSales .preview-actions').style.display = 'flex';
    document.getElementById('previewSaleButton').style.display = 'none';
}

function confirmSale() {
    if (!currentPreviewData || currentPreviewData.type !== 'sale') return;

    const currentDate = new Date();
    const newInventoryEntry = {
        date: currentDate,
        storeID: currentPreviewData.storeId,
        productID: currentPreviewData.productId,
        category: currentPreviewData.category,
        inventoryLevel: currentPreviewData.newInventoryLevel,
        unitsSold: currentPreviewData.quantity,
        unitsOrdered: 0,
        price: currentPreviewData.price,
        seasonality: currentPreviewData.seasonality || getSeasonality(currentDate)
    };

    // Find and merge with existing record if it exists
    const existingIndex = inventory.findIndex(item => 
        formatDate(item.date) === formatDate(currentDate) &&
        item.storeID === currentPreviewData.storeId &&
        item.productID === currentPreviewData.productId &&
        item.category === currentPreviewData.category
    );

    if (existingIndex !== -1) {
        const existing = inventory[existingIndex];
        existing.inventoryLevel = newInventoryEntry.inventoryLevel;
        existing.unitsSold += newInventoryEntry.unitsSold;
    } else {
        inventory.unshift(newInventoryEntry);
    }

    // Add to sales history
    sales.push({
        date: currentDate,
        ...currentPreviewData
    });

    // Reset form and preview
    resetSaleForm();
    
    // Refresh all displays
    displayFilteredInventory(inventory);
    filterSales();  // Refresh sales table
    displayDashboardCharts();  // Update dashboard if visible
    
    alert('Sale completed successfully');
}

function cancelSale() {
    resetSaleForm();
}

function previewPurchase() {
    const storeId = document.getElementById('addPurchaseStore').value;
    const productId = document.getElementById('addPurchaseProduct').value;
    const category = document.getElementById('addPurchaseCategory').value;
    const quantity = parseInt(document.getElementById('addPurchaseQuantity').value);

    if (!storeId || !productId || !category || !quantity) {
        alert('Please fill in all fields');
        return;
    }

    const item = inventory.find(i => 
        i.storeID === storeId && 
        i.productID === productId && 
        i.category === category
    );

    if (!item) {
        alert('Product not found in inventory');
        return;
    }

    const totalCost = item.price * quantity;
    const newInventoryLevel = item.inventoryLevel + quantity;

    currentPreviewData = {
        type: 'purchase',
        storeId,
        productId,
        category,
        quantity,
        price: item.price,
        totalCost,
        currentInventory: item.inventoryLevel,
        newInventoryLevel
    };

    // Update preview display
    document.getElementById('purchaseImpact').innerHTML = `
        <h4>Impact on Inventory:</h4>
        <p>Current Inventory Level: ${item.inventoryLevel}</p>
        <p>After Purchase: ${newInventoryLevel}</p>
        <p>Total Purchase Cost: $${totalCost.toFixed(2)}</p>
    `;

    // Show confirm/cancel buttons, hide preview button
    document.querySelector('#addPurchase .preview-actions').style.display = 'flex';
    document.getElementById('previewPurchaseButton').style.display = 'none';
}

function confirmPurchase() {
    if (!currentPreviewData || currentPreviewData.type !== 'purchase') return;

    const currentDate = new Date();
    const newInventoryEntry = {
        date: currentDate,
        storeID: currentPreviewData.storeId,
        productID: currentPreviewData.productId,
        category: currentPreviewData.category,
        inventoryLevel: currentPreviewData.newInventoryLevel,
        unitsSold: 0,
        unitsOrdered: currentPreviewData.quantity,
        price: currentPreviewData.price,
        seasonality: currentPreviewData.seasonality || getSeasonality(currentDate)
    };

    // Find and merge with existing record if it exists
    const existingIndex = inventory.findIndex(item => 
        formatDate(item.date) === formatDate(currentDate) &&
        item.storeID === currentPreviewData.storeId &&
        item.productID === currentPreviewData.productId &&
        item.category === currentPreviewData.category
    );

    if (existingIndex !== -1) {
        const existing = inventory[existingIndex];
        existing.inventoryLevel = newInventoryEntry.inventoryLevel;
        existing.unitsOrdered += newInventoryEntry.unitsOrdered;
    } else {
        inventory.unshift(newInventoryEntry);
    }

    // Add to purchases history
    purchases.push({
        date: currentDate,
        ...currentPreviewData
    });

    // Reset form and preview
    resetPurchaseForm();
    
    // Refresh all displays
    displayFilteredInventory(inventory);
    filterPurchases();  // Refresh purchases table
    displayDashboardCharts();  // Update dashboard if visible
    
    alert('Purchase completed successfully');
}

function cancelPurchase() {
    resetPurchaseForm();
}

function resetSaleForm() {
    document.getElementById('addSalesStore').value = '';
    document.getElementById('addSalesProduct').value = '';
    document.getElementById('addSalesCategory').value = '';
    document.getElementById('addSalesQuantity').value = '';
    document.getElementById('saleImpact').innerHTML = '';
    document.querySelector('#addSales .preview-actions').style.display = 'none';
    document.getElementById('previewSaleButton').style.display = 'block';
    currentPreviewData = null;
}

function resetPurchaseForm() {
    document.getElementById('addPurchaseStore').value = '';
    document.getElementById('addPurchaseProduct').value = '';
    document.getElementById('addPurchaseCategory').value = '';
    document.getElementById('addPurchaseQuantity').value = '';
    document.getElementById('purchaseImpact').innerHTML = '';
    document.querySelector('#addPurchase .preview-actions').style.display = 'none';
    document.getElementById('previewPurchaseButton').style.display = 'block';
    currentPreviewData = null;
}

function getSeasonality(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Autumn';
    return 'Winter';
}

// Add this new function to merge inventory records
function mergeInventoryRecords(records) {
    const mergedRecords = {};
    
    records.forEach(record => {
        const key = `${formatDate(record.date)}-${record.storeID}-${record.productID}-${record.category}`;
        
        if (!mergedRecords[key]) {
            mergedRecords[key] = { ...record };
        } else {
            // Merge the records
            const existing = mergedRecords[key];
            existing.inventoryLevel = record.inventoryLevel; // Use latest inventory level
            existing.unitsSold += record.unitsSold;
            existing.unitsOrdered += record.unitsOrdered;
            // Price and seasonality remain from the first record
        }
    });

    return Object.values(mergedRecords);
}

// Update the loadItems function
function loadItems() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                complete: function(results) {
                    // Store the original data
                    originalInventory = results.data;
                    
                    // Filter out any empty rows
                    inventory = results.data
                        .filter(item => item['Date'] && item['Store ID'] && item['Product ID'])
                        .map(item => {
                            // Parse date from DD-MM-YYYY format
                            const [day, month, year] = item['Date'].split('-');
                            return {
                                date: new Date(`${year}-${month}-${day}`),
                                storeID: item['Store ID'],
                                productID: item['Product ID'],
                                category: item['Category'],
                                inventoryLevel: parseInt(item['Inventory Level']) || 0,
                                unitsSold: parseInt(item['Units Sold']) || 0,
                                unitsOrdered: parseInt(item['Units Ordered']) || 0,
                                price: parseFloat(item['Price']) || 0,
                                seasonality: item['Seasonality'],
                                isRestock: item['Is Restock'] === 'true',
                                restockDate: item['Restock Date'] || ''
                            };
                        });

                    // Load pending restocks from localStorage
                    const savedRestocks = localStorage.getItem('pendingRestocks');
                    if (savedRestocks) {
                        pendingRestocks = JSON.parse(savedRestocks);
                        applyPendingRestocks();
                    }

                    // Merge records before sorting
                    inventory = mergeInventoryRecords(inventory);

                    // Sort inventory by date in descending order
                    inventory.sort((a, b) => b.date - a.date);
                    
                    currentPage = 1; // Reset to first page
                    displayFilteredInventory(inventory); // Call without arguments to use default inventory

                    // Initialize dropdowns after loading data
                    initializeDropdowns();
                    initializeAddSalesDropdowns();
                    initializeAddPurchaseDropdowns();
                    initializePredictionDropdowns(); // Add this line
                    
                    // Initial display of sales and purchases
                    filterSales();
                    filterPurchases();
                }
            });
        }
    };
    input.click();
}

// Update the saveItems function
function saveItems() {
    // Merge records before saving
    const mergedInventory = mergeInventoryRecords(inventory);
    
    // Create data to save including restocks
    const itemsToSave = mergedInventory.map(item => ({
        'Date': formatDate(item.date),
        'Store ID': item.storeID,
        'Product ID': item.productID,
        'Category': item.category,
        'Inventory Level': item.inventoryLevel,
        'Units Sold': item.unitsSold,
        'Units Ordered': item.unitsOrdered,
        'Price': item.price,
        'Seasonality': item.seasonality,
        'Is Restock': item.isRestock || false,
        'Restock Date': item.restockDate || ''
    }));

    // Add pending and confirmed restocks to the data
    const restockItems = [...pendingRestocks, ...confirmedRestocks].map(restock => ({
        'Date': formatDate(new Date(restock.restockDate)),
        'Store ID': restock.storeId,
        'Product ID': restock.productId,
        'Category': restock.category,
        'Inventory Level': restock.currentStock,
        'Units Sold': 0,
        'Units Ordered': restock.suggestedOrder,
        'Price': restock.price || 0,
        'Seasonality': restock.seasonality || '',
        'Is Restock': true,
        'Restock Date': restock.restockDate,
        'Status': restock.status
    }));

    // Combine all items
    const allItems = [...itemsToSave, ...restockItems];

    // Save to CSV
    const csv = Papa.unparse(allItems);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'store.csv';
    link.click();

    // Save restocks to localStorage
    localStorage.setItem('pendingRestocks', JSON.stringify(pendingRestocks));
    localStorage.setItem('confirmedRestocks', JSON.stringify(confirmedRestocks));
}

// Update the addItem function
function addItem() {
    newItemDate = document.getElementById("newItemDate").value;
    newItemStoreID = document.getElementById("newItemStoreID").value;
    newItemProductID = document.getElementById("newItemProductID").value;
    newItemCategory = document.getElementById("newItemCategory").value;
    newItemInventoryLevel = document.getElementById("newItemInventoryLevel").value;
    newItemUnitsSold = document.getElementById("newItemUnitsSold").value;
    newItemUnitsOrdered = document.getElementById("newItemUnitsOrdered").value;
    newItemPrice = document.getElementById("newItemPrice").value;
    newItemSeasonality = document.getElementById("newItemSeasonality").value;

    if (typeof newItemProductID === 'string' && newItemProductID.trim()) {
        newItemProductID = newItemProductID.trim();
    } else {
        console.error("Invalid product ID:", newItemProductID);
        return;
    }

    const newItem = {
        date: new Date(newItemDate.trim()),
        storeID: newItemStoreID.trim(),
        productID: newItemProductID.trim(),
        category: newItemCategory.trim(),
        inventoryLevel: parseInt(newItemInventoryLevel.trim()),
        unitsSold: parseInt(newItemUnitsSold.trim()),
        unitsOrdered: parseInt(newItemUnitsOrdered.trim()),
        price: parseFloat(newItemPrice.trim()),
        seasonality: newItemSeasonality.trim()
    };

    // Find existing record for the same day, store, product, and category
    const existingIndex = inventory.findIndex(item => 
        formatDate(item.date) === formatDate(newItem.date) &&
        item.storeID === newItem.storeID &&
        item.productID === newItem.productID &&
        item.category === newItem.category
    );

    if (existingIndex !== -1) {
        // Merge with existing record
        const existing = inventory[existingIndex];
        existing.inventoryLevel = newItem.inventoryLevel;
        existing.unitsSold += newItem.unitsSold;
        existing.unitsOrdered += newItem.unitsOrdered;
    } else {
        // Add new record
        inventory.push(newItem);
    }

    clearInputFields();
    displayFilteredInventory(inventory);
}

// Update confirmSale function
function confirmSale() {
    if (!currentPreviewData || currentPreviewData.type !== 'sale') return;

    const currentDate = new Date();
    const newInventoryEntry = {
        date: currentDate,
        storeID: currentPreviewData.storeId,
        productID: currentPreviewData.productId,
        category: currentPreviewData.category,
        inventoryLevel: currentPreviewData.newInventoryLevel,
        unitsSold: currentPreviewData.quantity,
        unitsOrdered: 0,
        price: currentPreviewData.price,
        seasonality: currentPreviewData.seasonality || getSeasonality(currentDate)
    };

    // Find and merge with existing record if it exists
    const existingIndex = inventory.findIndex(item => 
        formatDate(item.date) === formatDate(currentDate) &&
        item.storeID === currentPreviewData.storeId &&
        item.productID === currentPreviewData.productId &&
        item.category === currentPreviewData.category
    );

    if (existingIndex !== -1) {
        const existing = inventory[existingIndex];
        existing.inventoryLevel = newInventoryEntry.inventoryLevel;
        existing.unitsSold += newInventoryEntry.unitsSold;
    } else {
        inventory.unshift(newInventoryEntry);
    }

    // Add to sales history
    sales.push({
        date: currentDate,
        ...currentPreviewData
    });

    // Reset form and preview
    resetSaleForm();
    
    // Refresh all displays
    displayFilteredInventory(inventory);
    filterSales();  // Refresh sales table
    displayDashboardCharts();  // Update dashboard if visible
    
    alert('Sale completed successfully');
}

// Update confirmPurchase function similarly
function confirmPurchase() {
    if (!currentPreviewData || currentPreviewData.type !== 'purchase') return;

    const currentDate = new Date();
    const newInventoryEntry = {
        date: currentDate,
        storeID: currentPreviewData.storeId,
        productID: currentPreviewData.productId,
        category: currentPreviewData.category,
        inventoryLevel: currentPreviewData.newInventoryLevel,
        unitsSold: 0,
        unitsOrdered: currentPreviewData.quantity,
        price: currentPreviewData.price,
        seasonality: currentPreviewData.seasonality || getSeasonality(currentDate)
    };

    // Find and merge with existing record if it exists
    const existingIndex = inventory.findIndex(item => 
        formatDate(item.date) === formatDate(currentDate) &&
        item.storeID === currentPreviewData.storeId &&
        item.productID === currentPreviewData.productId &&
        item.category === currentPreviewData.category
    );

    if (existingIndex !== -1) {
        const existing = inventory[existingIndex];
        existing.inventoryLevel = newInventoryEntry.inventoryLevel;
        existing.unitsOrdered += newInventoryEntry.unitsOrdered;
    } else {
        inventory.unshift(newInventoryEntry);
    }

    // Add to purchases history
    purchases.push({
        date: currentDate,
        ...currentPreviewData
    });

    // Reset form and preview
    resetPurchaseForm();
    
    // Refresh all displays
    displayFilteredInventory(inventory);
    filterPurchases();  // Refresh purchases table
    displayDashboardCharts();  // Update dashboard if visible
    
    alert('Purchase completed successfully');
}

function displayRestockPredictions(predictions) {
    const container = document.getElementById('predictedRestockInfo');
    container.innerHTML = '<h3>Restock Predictions</h3>';
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Store</th>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Days Until Restock</th>
                <th>Restock Date</th>
                <th>Suggested Order</th>
            </tr>
        </thead>
        <tbody>
            ${predictions.map(p => `
                <tr>
                    <td>${p.storeId}</td>
                    <td>${p.productId}</td>
                    <td>${p.currentStock}</td>
                    <td>${p.daysUntilRestock}</td>
                    <td>${p.restockDate}</td>
                    <td>${p.suggestedOrder}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// Initialize prediction dropdowns when loading inventory
function initializePredictionDropdowns() {
    if (!inventory || inventory.length === 0) {
        console.log("No inventory data available");
        return;
    }

    // Get unique values from inventory
    const stores = [...new Set(inventory.map(item => item.storeID))].sort();
    const categories = [...new Set(inventory.map(item => item.category))].sort();

    // Restock dropdowns
    const restockStoreSelect = document.getElementById('restockStore');
    const restockCategorySelect = document.getElementById('restockCategory');
    
    // Forecast dropdowns
    const forecastStoreSelect = document.getElementById('forecastStore');
    const forecastCategorySelect = document.getElementById('forecastCategory');

    // Clear and populate store dropdowns
    restockStoreSelect.innerHTML = '<option value="">Select Store</option>';
    forecastStoreSelect.innerHTML = '<option value="">Select Store</option>';
    stores.forEach(store => {
        restockStoreSelect.innerHTML += `<option value="${store}">${store}</option>`;
        forecastStoreSelect.innerHTML += `<option value="${store}">${store}</option>`;
    });

    // Clear and populate category dropdowns
    restockCategorySelect.innerHTML = '<option value="">Select Category</option>';
    forecastCategorySelect.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(category => {
        restockCategorySelect.innerHTML += `<option value="${category}">${category}</option>`;
        forecastCategorySelect.innerHTML += `<option value="${category}">${category}</option>`;
    });

    // Add event listeners for prediction dropdowns
    restockStoreSelect.addEventListener('change', updateRestockPreview);
    restockCategorySelect.addEventListener('change', updateRestockPreview);
    forecastStoreSelect.addEventListener('change', updateForecastPreview);
    forecastCategorySelect.addEventListener('change', updateForecastPreview);
}

function updateRestockPreview() {
    const storeId = document.getElementById('restockStore').value;
    const category = document.getElementById('restockCategory').value;
    const threshold = parseInt(document.getElementById('restockThreshold').value) || 100;
    
    if (!storeId && !category) return;

    const filteredItems = inventory.filter(item => 
        (!storeId || item.storeID === storeId) &&
        (!category || item.category === category)
    );

    const preview = document.getElementById('predictedRestockInfo');
    preview.innerHTML = `
        <p><strong>Selected Filters:</strong></p>
        <p>Store: ${storeId || 'All'}</p>
        <p>Category: ${category || 'All'}</p>
        <p>Items to analyze: ${filteredItems.length}</p>
        <p>Click "Predict Restock" to see detailed predictions.</p>
    `;
}

// Add to your existing initialization code
document.addEventListener('DOMContentLoaded', function() {
    // ...existing initialization code...
    initializePredictionDropdowns();
});

function initializePredictionDropdowns() {
    if (!inventory || inventory.length === 0) {
        console.log("No inventory data available");
        return;
    }

    // Get unique values
    const stores = [...new Set(inventory.map(item => item.storeID))].sort();
    const categories = [...new Set(inventory.map(item => item.category))].sort();
    const products = [...new Set(inventory.map(item => item.productID))].sort();

    // Initialize all dropdowns
    populatePredictionDropdown('restockStore', stores);
    populatePredictionDropdown('restockCategory', categories);
    populatePredictionDropdown('restockProduct', products);
    populatePredictionDropdown('forecastStore', stores);
    populatePredictionDropdown('forecastCategory', categories);
    populatePredictionDropdown('forecastProduct', products);

    // Add cascade event listeners
    document.getElementById('restockStore').addEventListener('change', updateRestockDropdowns);
    document.getElementById('restockCategory').addEventListener('change', updateRestockDropdowns);
    document.getElementById('forecastStore').addEventListener('change', updateForecastDropdowns);
    document.getElementById('forecastCategory').addEventListener('change', updateForecastDropdowns);
}

function populatePredictionDropdown(elementId, values) {
    const dropdown = document.getElementById(elementId);
    // Add null check
    if (!dropdown) {
        console.warn(`Element with id '${elementId}' not found`);
        return;
    }
    
    dropdown.innerHTML = '<option value="">All</option>';
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        dropdown.appendChild(option);
    });
}

function updateRestockDropdowns() {
    const selectedStore = document.getElementById('restockStore').value;
    const selectedCategory = document.getElementById('restockCategory').value;
    let filteredProducts = [...new Set(inventory.map(item => item.productID))];

    if (selectedStore) {
        filteredProducts = [...new Set(inventory
            .filter(item => item.storeID === selectedStore)
            .map(item => item.productID))];
    }
    if (selectedCategory) {
        filteredProducts = [...new Set(inventory
            .filter(item => (!selectedStore || item.storeID === selectedStore) 
                && item.category === selectedCategory)
            .map(item => item.productID))];
    }

    populatePredictionDropdown('restockProduct', filteredProducts.sort());
    updateRestockPreview();
}

function updateForecastDropdowns() {
    const selectedStore = document.getElementById('forecastStore').value;
    const selectedCategory = document.getElementById('forecastCategory').value;
    let filteredProducts = [...new Set(inventory.map(item => item.productID))];

    if (selectedStore) {
        filteredProducts = [...new Set(inventory
            .filter(item => item.storeID === selectedStore)
            .map(item => item.productID))];
    }
    if (selectedCategory) {
        filteredProducts = [...new Set(inventory
            .filter(item => (!selectedStore || item.storeID === selectedStore) 
                && item.category === selectedCategory)
            .map(item => item.productID))];
    }

    populatePredictionDropdown('forecastProduct', filteredProducts.sort());
    updateForecastPreview();
}

function predictRestock() {
    const storeId = document.getElementById('restockStore').value;
    const category = document.getElementById('restockCategory').value;
    const productId = document.getElementById('restockProduct').value;
    const threshold = parseInt(document.getElementById('restockThreshold').value) || 100;

    fetch('http://127.0.0.1:5000/predict-restock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inventory: inventory,
            storeId: storeId,
            category: category,
            productId: productId,
            threshold: threshold
        })
    })
    .then(response => response.json())
    .then(data => {
        // Store the prediction data and type
        localStorage.setItem('predictionData', JSON.stringify(data));
        localStorage.setItem('predictType', 'restock');
        
        // Open results in new window
        window.open('prediction-results.html', '_blank', 'width=1000,height=800');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error making prediction. Check console for details.');
    });
}

// ...existing code...

function previewRestock() {
    const storeId = document.getElementById('restockStore').value;
    const category = document.getElementById('restockCategory').value;
    const productId = document.getElementById('restockProduct').value;
    const threshold = parseInt(document.getElementById('restockThreshold').value) || 100;

    fetch('http://127.0.0.1:5000/predict-restock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            inventory: inventory,
            storeId: storeId,
            category: category,
            productId: productId,
            threshold: threshold
        })
    })
    .then(response => response.json())
    .then(data => {
        displayRestockPreview(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function displayRestockPreview(predictions) {
    const container = document.getElementById('predictedRestockInfo');
    container.innerHTML = `
        <h3>Restock Preview</h3>
        <table>
            <thead>
                <tr>
                    <th>Store</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Suggested Order</th>
                    <th>Days Until Restock</th>
                </tr>
            </thead>
            <tbody>
                ${predictions.map(p => `
                    <tr>
                        <td>${p.storeId}</td>
                        <td>${p.productId}</td>
                        <td>${p.category}</td>
                        <td>${p.currentStock}</td>
                        <td>${p.suggestedOrder}</td>
                        <td>${p.daysUntilRestock}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <button onclick="confirmRestock(${JSON.stringify(predictions)})" class="medium-button">Confirm Restock</button>
    `;
}

function confirmRestock(predictions) {
    predictions.forEach(p => {
        const item = inventory.find(i => 
            i.storeID === p.storeId && 
            i.productID === p.productId
        );
        
        if (item) {
            // Add to pending restocks
            pendingRestocks.push({
                ...p,
                price: item.price,
                seasonality: item.seasonality
            });
        }
    });
    
    // Save pending restocks
    localStorage.setItem('pendingRestocks', JSON.stringify(pendingRestocks));
    alert('Restock predictions saved successfully');
    displayFilteredInventory(inventory);
}

// ...existing code...

// Add this new function to apply pending restocks
function applyPendingRestocks() {
    const today = new Date();
    const updatedPendingRestocks = [];

    pendingRestocks.forEach(restock => {
        const restockDate = new Date(restock.restockDate);
        
        // If restock date has passed, apply the restock
        if (restockDate <= today) {
            const item = inventory.find(i => 
                i.storeID === restock.storeId && 
                i.productID === restock.productId
            );
            
            if (item) {
                // Create new inventory entry for the restock
                const newInventoryEntry = {
                    date: restockDate,
                    storeID: restock.storeId,
                    productID: restock.productId,
                    category: restock.category,
                    inventoryLevel: restock.currentStock + restock.suggestedOrder,
                    unitsSold: 0,
                    unitsOrdered: restock.suggestedOrder,
                    price: item.price,
                    seasonality: item.seasonality,
                    isRestock: true,
                    restockDate: restock.restockDate
                };
                
                inventory.push(newInventoryEntry);
            }
        } else {
            // Keep future restocks in the pending list
            updatedPendingRestocks.push(restock);
        }
    });

    // Update pending restocks list
    pendingRestocks = updatedPendingRestocks;
    localStorage.setItem('pendingRestocks', JSON.stringify(pendingRestocks));
}

// Add this to the document ready event listener
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    
    // Check for confirmed restocks from prediction window
    const confirmedRestocks = localStorage.getItem('confirmedRestocks');
    if (confirmedRestocks) {
        const restocks = JSON.parse(confirmedRestocks);
        pendingRestocks = pendingRestocks.concat(restocks);
        localStorage.setItem('pendingRestocks', JSON.stringify(pendingRestocks));
        localStorage.removeItem('confirmedRestocks'); // Clear the confirmed restocks
        
        // Apply any restocks that are due
        applyPendingRestocks();
        
        // Refresh the display
        displayFilteredInventory(inventory);
    }
});

// Add message listener for window communication
window.addEventListener('message', function(event) {
    if (event.data.type === 'confirmRestock') {
        console.log('Received restock data:', event.data.data); // Debug log
        
        // Add new restocks to pending list
        pendingRestocks = [...pendingRestocks, ...event.data.data];
        
        // Save to localStorage
        localStorage.setItem('pendingRestocks', JSON.stringify(pendingRestocks));
        
        // Refresh displays
        if (activeTab === 'predict') {
            viewPendingRestocks();
        }
    }
});

function saveRestocksToLocalStorage() {
    localStorage.setItem('pendingRestocks', JSON.stringify(pendingRestocks));
    localStorage.setItem('confirmedRestocks', JSON.stringify(confirmedRestocks));
}

function loadRestocksFromLocalStorage() {
    const savedPending = localStorage.getItem('pendingRestocks');
    const savedConfirmed = localStorage.getItem('confirmedRestocks');
    
    if (savedPending) {
        pendingRestocks = JSON.parse(savedPending);
    }
    if (savedConfirmed) {
        confirmedRestocks = JSON.parse(savedConfirmed);
    }
}

function viewPendingRestocks() {
    console.log('Current pending restocks:', pendingRestocks); // Debug log
    
    const selectedStore = document.getElementById('pendingRestockStore').value;
    const selectedStatus = document.getElementById('pendingRestockStatus').value;
    
    let filteredRestocks = [...pendingRestocks];
    if (selectedStore) {
        filteredRestocks = filteredRestocks.filter(r => r.storeId === selectedStore);
    }
    if (selectedStatus) {
        filteredRestocks = filteredRestocks.filter(r => r.status === selectedStatus);
    }

    const table = document.getElementById('pendingRestocksTable');
    const tbody = document.getElementById('pendingRestocksBody');
    const container = document.getElementById('pendingRestocksInfo');
    
    if (!filteredRestocks.length) {
        container.innerHTML = '<p>No pending restocks found</p>';
        table.style.display = 'none';
        return;
    }

    tbody.innerHTML = '';
    filteredRestocks.forEach(restock => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${restock.storeId}</td>
            <td>${restock.productId}</td>
            <td>${restock.category}</td>
            <td>${restock.currentStock}</td>
            <td>${restock.suggestedOrder}</td>
            <td>${new Date(restock.restockDate).toLocaleDateString()}</td>
            <td>${restock.status}</td>
            <td>
                ${restock.status === 'pending' ? `
                    <button onclick="confirmRestockOrder('${restock.storeId}', '${restock.productId}')" 
                            class="small-button">Confirm</button>
                    <button onclick="cancelRestockOrder('${restock.storeId}', '${restock.productId}')" 
                            class="small-button">Cancel</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });

    table.style.display = 'table';
}

function confirmRestockOrder(storeId, productId) {
    const restockIndex = pendingRestocks.findIndex(r => 
        r.storeId === storeId && r.productId === productId);
    
    if (restockIndex !== -1) {
        const restock = pendingRestocks[restockIndex];
        
        // Create new inventory entry
        const newInventoryEntry = {
            date: new Date(),
            storeID: restock.storeId,
            productID: restock.productId,
            category: restock.category,
            inventoryLevel: restock.currentStock + restock.suggestedOrder,
            unitsSold: 0,
            unitsOrdered: restock.suggestedOrder,
            price: restock.price || 0,
            seasonality: restock.seasonality || ''
        };
        
        // Add to inventory
        inventory.unshift(newInventoryEntry);
        
        // Move to confirmed restocks
        restock.status = 'confirmed';
        restock.confirmationDate = new Date().toISOString();
        confirmedRestocks.push(restock);
        pendingRestocks.splice(restockIndex, 1);
        
        // Save changes
        saveRestocksToLocalStorage();
        
        // Refresh displays
        viewPendingRestocks();
        displayFilteredInventory(inventory);
        alert('Restock order confirmed successfully.');
    }
}

function cancelRestockOrder(storeId, productId) {
    const restockIndex = pendingRestocks.findIndex(r => 
        r.storeId === storeId && r.productId === productId);
    
    if (restockIndex !== -1) {
        pendingRestocks.splice(restockIndex, 1);
        saveRestocksToLocalStorage();
        viewPendingRestocks();
        alert('Restock order cancelled successfully.');
    }
}

// Modify the existing initialization code to load restocks
document.addEventListener('DOMContentLoaded', function() {
    // ... existing initialization code ...
    loadRestocksFromLocalStorage();
    
    // Initialize the pending restocks store dropdown
    const storeSelect = document.getElementById('pendingRestockStore');
    if (storeSelect) {
        const stores = [...new Set(inventory.map(item => item.storeID))].sort();
        storeSelect.innerHTML = '<option value="">All Stores</option>';
        stores.forEach(store => {
            storeSelect.innerHTML += `<option value="${store}">${store}</option>`;
        });
    }
});

// Modify the existing saveItems function to include restocks
function saveItems() {
    // Merge records before saving
    const mergedInventory = mergeInventoryRecords(inventory);
    
    // Create data to save including restocks
    const itemsToSave = mergedInventory.map(item => ({
        'Date': formatDate(item.date),
        'Store ID': item.storeID,
        'Product ID': item.productID,
        'Category': item.category,
        'Inventory Level': item.inventoryLevel,
        'Units Sold': item.unitsSold,
        'Units Ordered': item.unitsOrdered,
        'Price': item.price,
        'Seasonality': item.seasonality,
        'Is Restock': item.isRestock || false,
        'Restock Date': item.restockDate || ''
    }));

    // Add pending and confirmed restocks to the data
    const restockItems = [...pendingRestocks, ...confirmedRestocks].map(restock => ({
        'Date': formatDate(new Date(restock.restockDate)),
        'Store ID': restock.storeId,
        'Product ID': restock.productId,
        'Category': restock.category,
        'Inventory Level': restock.currentStock,
        'Units Sold': 0,
        'Units Ordered': restock.suggestedOrder,
        'Price': restock.price || 0,
        'Seasonality': restock.seasonality || '',
        'Is Restock': true,
        'Restock Date': restock.restockDate,
        'Status': restock.status
    }));

    // Combine all items
    const allItems = [...itemsToSave, ...restockItems];

    // Save to CSV
    const csv = Papa.unparse(allItems);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'store.csv';
    link.click();

    // Save restocks to localStorage
    localStorage.setItem('pendingRestocks', JSON.stringify(pendingRestocks));
    localStorage.setItem('confirmedRestocks', JSON.stringify(confirmedRestocks));
}

function displayFilteredInventory(items) {
    if (!items || items.length === 0) {
        console.log("No items to display");
        return;
    }

    // Group items by store and product to get latest inventory status
    const uniqueInventory = {};
    items.forEach(item => {
        const key = `${item.storeID}-${item.productID}-${item.category}`;
        if (!uniqueInventory[key] || item.date > uniqueInventory[key].date) {
            uniqueInventory[key] = {
                date: item.date,
                storeID: item.storeID,
                productID: item.productID,
                category: item.category,
                inventoryLevel: item.inventoryLevel,
                price: item.price,
                lastSaleDate: null,
                totalUnitsSold: 0,
                averageDailySales: 0
            };
        }
    });

    // Calculate sales metrics for each unique item
    items.forEach(item => {
        const key = `${item.storeID}-${item.productID}-${item.category}`;
        const invItem = uniqueInventory[key];
        
        if (item.unitsSold > 0) {
            // Update last sale date
            if (!invItem.lastSaleDate || item.date > invItem.lastSaleDate) {
                invItem.lastSaleDate = item.date;
            }
            // Accumulate total units sold
            invItem.totalUnitsSold += item.unitsSold;
        }
    });

    // Calculate average daily sales (using last 30 days of data)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    Object.values(uniqueInventory).forEach(item => {
        // Get all transactions for this item in the last 30 days
        const recentTransactions = items.filter(trans => 
            trans.storeID === item.storeID && 
            trans.productID === item.productID &&
            trans.category === item.category &&
            trans.date >= thirtyDaysAgo
        );
        
        // Calculate total sales for the period
        const totalSales = recentTransactions.reduce((sum, trans) => sum + trans.unitsSold, 0);
        
        // Calculate number of days in the period
        const daysInPeriod = Math.min(30, Math.ceil(
            (new Date() - thirtyDaysAgo) / (1000 * 60 * 60 * 24)
        ));
        
        // Calculate average daily sales
        item.averageDailySales = (totalSales / daysInPeriod).toFixed(2);
    });

    // Convert to array and sort
    const processedItems = Object.values(uniqueInventory).sort((a, b) => {
        if (a.storeID !== b.storeID) return a.storeID.localeCompare(b.storeID);
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.productID.localeCompare(b.productID);
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const maxPage = Math.ceil(processedItems.length / itemsPerPage);
    
    const tableBody = document.getElementById('inventoryTableBody');
    tableBody.innerHTML = '';

    // Update table headers to reflect inventory-focused view
    const headerRow = document.querySelector('#inventoryTable thead tr');
    headerRow.innerHTML = `
        <th>SNO</th>
        <th>Store ID</th>
        <th>Category</th>
        <th>Product ID</th>
        <th>Current Stock</th>
        <th>Price</th>
        <th>Avg Daily Sales</th>
        <th>Last Sale Date</th>
    `;

    // Display paginated items
    processedItems.slice(startIndex, endIndex).forEach((item, index) => {
        const row = document.createElement('tr');
        const stockLevel = parseInt(item.inventoryLevel);
        const stockClass = stockLevel < 100 ? 'low-stock' : 
                         stockLevel < 300 ? 'medium-stock' : 
                         'high-stock';

        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${item.storeID}</td>
            <td>${item.category}</td>
            <td>${item.productID}</td>
            <td class="${stockClass}">${stockLevel}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${parseFloat(item.averageDailySales) > 0 ? item.averageDailySales : '0.00'}</td>
            <td>${item.lastSaleDate ? formatDate(item.lastSaleDate) : 'No sales'}</td>
        `;
        tableBody.appendChild(row);
    });

    // Update pagination
    document.getElementById('currentPage').innerText = `Page ${currentPage} of ${maxPage}`;
    document.querySelector('button[onclick="prevPage()"]').disabled = currentPage === 1;
    document.querySelector('button[onclick="nextPage()"]').disabled = currentPage === maxPage;

    // Add CSS classes for stock level indicators
    const style = document.createElement('style');
    style.textContent = `
        .low-stock { color: red; }
        .medium-stock { color: orange; }
        .high-stock { color: green; }
    `;
    document.head.appendChild(style);

    // Show inventory table and hide search results
    document.getElementById('inventoryTable').style.display = 'table';
    document.getElementById('searchResultsTable').style.display = 'none';
}

function generateRestockPredictions() {
    // This can be an alias for predictRestock or have its own implementation
    predictRestock();
}

function initializeDemandForecastDropdowns() {
    // Get references to dropdowns
    const storeSelect = document.getElementById('forecastStore');
    const categorySelect = document.getElementById('forecastCategory');
    const productSelect = document.getElementById('forecastProduct');
    const periodInput = document.getElementById('forecastPeriod');
    const unitSelect = document.getElementById('forecastUnit');

    // Get unique values
    const stores = [...new Set(inventory.map(item => item.storeID))].sort();
    const categories = [...new Set(inventory.map(item => item.category))].sort();
    const products = [...new Set(inventory.map(item => item.productID))].sort();

    // Populate store dropdown
    storeSelect.innerHTML = '<option value="">All Stores</option>';
    stores.forEach(store => {
        storeSelect.innerHTML += `<option value="${store}">${store}</option>`;
    });

    // Populate category dropdown
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(category => {
        categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
    });

    // Event listeners for cascade selection
    storeSelect.addEventListener('change', updateForecastDropdowns);
    categorySelect.addEventListener('change', updateForecastDropdowns);

    // Set default period value
    periodInput.value = "7";
}

function updateForecastDropdowns() {
    const storeSelect = document.getElementById('forecastStore');
    const categorySelect = document.getElementById('forecastCategory');
    const productSelect = document.getElementById('forecastProduct');

    const selectedStore = storeSelect.value;
    const selectedCategory = categorySelect.value;

    let filteredInventory = inventory;

    if (selectedStore) {
        filteredInventory = filteredInventory.filter(item => item.storeID === selectedStore);
    }
    if (selectedCategory) {
        filteredInventory = filteredInventory.filter(item => item.category === selectedCategory);
    }

    const products = [...new Set(filteredInventory.map(item => item.productID))].sort();
    productSelect.innerHTML = '<option value="">All Products</option>';
    products.forEach(product => {
        productSelect.innerHTML += `<option value="${product}">${product}</option>`;
    });
}

function predictDemand() {
    // Show loading overlay
    document.getElementById('loadingOverlay').style.display = 'flex';

    const storeId = document.getElementById('forecastStore').value;
    const category = document.getElementById('forecastCategory').value;
    const productId = document.getElementById('forecastProduct').value;
    const period = parseInt(document.getElementById('forecastPeriod').value) || 7;

    // Validate inputs
    if (period < 1 || period > 90) {
        alert('Please enter a valid forecast period (1-90 days)');
        document.getElementById('loadingOverlay').style.display = 'none';
        return;
    }

    // Filter and validate inventory data
    const validInventory = inventory.filter(item => 
        item.date instanceof Date && 
        !isNaN(item.date) && 
        item.unitsSold >= 0 &&
        (!storeId || item.storeID === storeId) &&
        (!category || item.category === category) &&
        (!productId || item.productID === productId)
    );

    if (!validInventory.length) {
        alert('No valid data found for the selected criteria');
        document.getElementById('loadingOverlay').style.display = 'none';
        return;
    }

    const requestData = {
        inventory: validInventory.map(item => ({
            date: formatDate(item.date),
            storeID: item.storeID,
            productID: item.productID,
            category: item.category,
            inventoryLevel: item.inventoryLevel,
            unitsSold: item.unitsSold,
            price: item.price,
            seasonality: item.seasonality
        })),
        storeId: storeId,
        category: category,
        productId: productId,
        forecastPeriod: period
    };

    fetch('http://127.0.0.1:5000/predict-demand', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Store prediction data with metadata
        localStorage.setItem('predictionData', JSON.stringify({
            predictions: data,
            filters: {
                storeId: storeId,
                category: category,
                productId: productId,
                period: period
            }
        }));
        
        // Open results in new window
        window.open('demand-forecast.html', '_blank', 'width=1000,height=800');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error generating demand forecast: ' + error.message);
    })
    .finally(() => {
        document.getElementById('loadingOverlay').style.display = 'none';
    });
}

// Add to your initialization code
document.addEventListener('DOMContentLoaded', function() {
    // ...existing initialization code...
    initializeDemandForecastDropdowns();
});

function updateForecastPreview() {
    const storeId = document.getElementById('forecastStore').value;
    const category = document.getElementById('forecastCategory').value;
    const productId = document.getElementById('forecastProduct').value;
    const period = parseInt(document.getElementById('forecastPeriod').value) || 7;

    // Get filtered inventory
    const filteredInventory = inventory.filter(item => 
        (!storeId || item.storeID === storeId) &&
        (!category || item.category === category) &&
        (!productId || item.productID === productId)
    );

    // Calculate basic metrics for preview
    const totalItems = filteredInventory.length;
    const uniqueProducts = new Set(filteredInventory.map(item => item.productID)).size;
    const avgDailySales = filteredInventory.reduce((sum, item) => sum + item.unitsSold, 0) / 30; // Assuming 30 days

    const preview = document.getElementById('forecastPreview');
    if (preview) {
        preview.innerHTML = `
            <h4>Forecast Preview:</h4>
            <p>Items to analyze: ${totalItems}</p>
            <p>Unique products: ${uniqueProducts}</p>
            <p>Average daily sales: ${avgDailySales.toFixed(2)}</p>
            <p>Forecast period: ${period} days</p>
        `;
    }
}
