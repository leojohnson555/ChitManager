
//Screen UI
function showSection(id, event) {
	  console.log("Switching to:", id);
	  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active-section'));
	  document.getElementById(id).classList.add('active-section');
	  document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
	  if (event && event.target) {
		event.target.classList.add('active');
	  }
	}

function showSection(sectionId, event) {
  // Hide all sections
  document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active-section", "fade-in"));
  
  // Show selected section with animation
  const section = document.getElementById(sectionId);
  section.classList.add("active-section", "fade-in");

  // Remove active from all bottom-nav buttons
  document.querySelectorAll(".bottom-nav button").forEach(btn => btn.classList.remove("active"));

  // Add active to the clicked button
  if (event) {
    event.target.classList.add("active");
  }
}

const PASSWORD = "PGSChitManager"; // password
    const KEY = "chit_access_granted";

    function checkPassword() {
      const entered = document.getElementById("appPassword").value;
      if (entered === PASSWORD) {
        localStorage.setItem(KEY, "1");
        document.getElementById("loginBox").classList.add("hidden");
        document.getElementById("appContainer").classList.remove("hidden");
      } else {
        document.getElementById("wrongPass").classList.remove("d-none");
      }
    }

    window.onload = function () {
      if (localStorage.getItem(KEY) === "1") {
        document.getElementById("loginBox").classList.add("hidden");
        document.getElementById("appContainer").classList.remove("hidden");
      }
    };
	

//Register service-worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("Service Worker registered with scope:", registration.scope);
      })
      .catch((error) => {
        console.log("Service Worker registration failed:", error);
      });
  });
}




const dbName = 'ChitFinanceDB';
const dbVersion = 1;
let db;
// ========== INIT ==========
function initDB() {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = function (e) {
        db = e.target.result;

        if (!db.objectStoreNames.contains('customers')) {
            db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('lendings')) {
            db.createObjectStore('lendings', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('transactions')) {
            db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
        }
    };
    request.onsuccess = function (e) {
        db = e.target.result;
        loadCustomers();
        loadTransactions();
        loadSettings();
		loadCustomerDropdowns();
		loadPaymentCustomers();
    };
    request.onerror = function (e) {
        console.error("DB error", e);
    };
}

function getStore(name, mode = 'readonly') {
    return db.transaction(name, mode).objectStore(name);
}

function getToday() {
    return new Date().toISOString().split("T")[0];
}

function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}


// ========== CUSTOMERS ==========
function saveCustomer() {
  const name = document.getElementById('customerName').value.trim();
  const contact = document.getElementById('customerContact').value.trim();
  const editIndex = parseInt(document.getElementById('editCustomerIndex').value);

  if (!name || !contact) {
    alert("Please enter both Name and Contact.");
    return;
  }

  const customer = { name, contact };
  const transaction = db.transaction(['customers'], 'readwrite');
  const store = transaction.objectStore('customers');

  if (editIndex === -1) {
    store.add(customer);
  } else {
    customer.id = editIndex;
    store.put(customer);
    document.getElementById('editCustomerIndex').value = -1;
  }

  transaction.oncomplete = () => {
    document.getElementById('customerName').value = '';
    document.getElementById('customerContact').value = '';
    loadCustomers();
    loadCustomerDropdowns();
  };
}

function loadCustomers() {
  const tbody = document.getElementById('customerList');
  tbody.innerHTML = '';
  const transaction = db.transaction(['customers'], 'readonly');
  const store = transaction.objectStore('customers');

  store.openCursor().onsuccess = function (e) {
    const cursor = e.target.result;
    if (cursor) {
      const { id, name, contact } = cursor.value;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${id}</td>
        <td>${name}</td>
        <td>${contact}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editCustomer(${id})">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer(${id})">🗑️</button>
        </td>`;
      tbody.appendChild(tr);
      cursor.continue();
    }
  };
}

function editCustomer(id) {
  const transaction = db.transaction(['customers'], 'readonly');
  const store = transaction.objectStore('customers');
  const request = store.get(id);

  request.onsuccess = () => {
    const customer = request.result;
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerContact').value = customer.contact;
    document.getElementById('editCustomerIndex').value = customer.id;
  };
}

function deleteCustomer(id) {
  if (confirm("Are you sure you want to delete this customer?")) {
    const transaction = db.transaction(['customers'], 'readwrite');
    const store = transaction.objectStore('customers');
    store.delete(id);

    transaction.oncomplete = () => {
      loadCustomers();
      loadCustomerDropdowns();
    };
  }
}

function loadCustomerDropdowns() {
  const lendDropdown = document.getElementById('lendCustomer');
  lendDropdown.innerHTML = '<option value="">Select Customer</option>';

  const transaction = db.transaction(['customers'], 'readonly');
  const store = transaction.objectStore('customers');

  store.openCursor().onsuccess = function (e) {
    const cursor = e.target.result;
    if (cursor) {
      const { id, name } = cursor.value;
	  console.log('Loaded customer:', id, name);
      lendDropdown.innerHTML += `<option value="${id}">${name}</option>`;
      cursor.continue();
    }
  };
}

// ========== SETTINGS ==========
// Save settings to IndexedDB
function saveSettings() {
	if (!db) {
    alert("Database not initialized yet.");
    return;
  }
  const weeklyInterest = parseFloat(document.getElementById('weeklyInterest').value);
  const interestCycle = parseInt(document.getElementById('interestCycle').value);

  if (isNaN(weeklyInterest) || isNaN(interestCycle)) {
    alert('Please enter valid values for interest settings.');
    return;
  }

  const settings = {
    id: 'settings', // Static id for single record
    weeklyInterest,
    interestCycle
  };

  const transaction = db.transaction(['settings'], 'readwrite');
  const store = transaction.objectStore('settings');
  const request = store.put(settings);

  request.onsuccess = function () {
    alert('Settings saved.');
  };

  request.onerror = function (event) {
    console.error('Error saving settings:', event.target.error);
  };
}

// Load settings from IndexedDB
function loadSettings() {
  const tx = db.transaction('settings', 'readonly');
  const store = tx.objectStore('settings');
  const request = store.get('settings'); // 👈 Use the correct key

  request.onsuccess = function () {
    const settings = request.result;
    if (settings) {
      document.getElementById("weeklyInterest").value = settings.weeklyInterest || "";
      document.getElementById("interestCycle").value = settings.interestCycle || "";
    }
  };

  request.onerror = function () {
    console.warn("Settings not found.");
  };
}

function getSettings() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['settings'], 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('settings'); // 'settings' is the fixed id

    request.onsuccess = () => resolve(request.result || {});
    request.onerror = () => reject("Failed to load settings");
  });
}

// ========== LENDING (with IndexedDB) ==========
// Add or update lending
async function addLent() {
  const date = document.getElementById('lendDate').value;
  const customerId = parseInt(document.getElementById('lendCustomer').value);
  const subName = document.getElementById('lendSubName').value.trim();
  const amount = parseFloat(document.getElementById('lendAmount').value);
  const editIndex = document.getElementById('editLendIndex').value;

  if (!date || isNaN(customerId) || isNaN(amount) || amount <= 0) {
    alert("Please fill all fields correctly.");
    return;
  }

  const entry = {
    id: editIndex === "-1" ? generateId() : editIndex,
    date,
    customerId,
    subName,
    amount,
    dueAmount: amount,
    active: true
  };

  try {
    await saveLendingAndTransaction(entry, editIndex !== "-1");
    resetLendForm();
    loadLendings();
    //alert(editIndex === "-1" ? "Lending added" : "Lending updated");
  } catch (err) {
    alert("Failed to save lending and transaction.");
    console.error(err);
  }
}

async function saveLendingAndTransaction(entry, isEdit = false) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['lendings', 'transactions'], 'readwrite');
    const lendStore = tx.objectStore('lendings');
    const transStore = tx.objectStore('transactions');

    try {
      // Save/Update lending
      lendStore.put(entry);

      // Save/Update corresponding transaction
      const transEntry = {
        id: entry.id, // Same as lend ID for easy traceability
        customerId: entry.customerId,
        subName: entry.subName,
        date: entry.date,
		state:"new",
		weeks: [],
        lendIds: [entry.id],
        amount: entry.amount,
        interest: 0,
		total:entry.amount,
        paidAmount: 0,
        dueAmount: entry.amount,
      };
	
      transStore.put(transEntry);
	  loadPaymentCustomers();
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    } catch (err) {
      reject(err);
    }
  });
}


function resetLendForm() {
  document.getElementById('lendDate').value = '';
  document.getElementById('lendCustomer').value = '';
  document.getElementById('lendSubName').value = '';
  document.getElementById('lendAmount').value = '';
  document.getElementById('editLendIndex').value = '-1';
}

function loadLendings() {
  const tbody = document.getElementById('lendList');
  tbody.innerHTML = '';
  const selectedCustomerId = document.getElementById('lendCustomer').value;

  const tx = db.transaction(['lendings', 'customers'], 'readonly');
  const lendingStore = tx.objectStore('lendings');
  const customerStore = tx.objectStore('customers');

  lendingStore.getAll().onsuccess = function (e) {
    const lendings = e.target.result;

	// Filter by active and selected customer
    const filteredLendings = lendings.filter(l =>
      l.active==true && (!selectedCustomerId || l.customerId == selectedCustomerId)
    );
	
    filteredLendings.forEach((l, i) => {
      const row = document.createElement('tr');

      const customerRequest = customerStore.get(l.customerId);

      customerRequest.onsuccess = function () {
        const customer = customerRequest.result || { name: "N/A", contact: "" };

        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${formatDate(l.date)}</td>
          <td>${customer.name}</td>
          <td>${l.subName}</td>
          <td>${l.amount.toFixed(2)}</td>
          <td>
            ${l.active ? `<button class="btn btn-sm btn-outline-primary" onclick="editLent('${l.id}')">✏️</button>` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="deleteLent('${l.id}')">🗑️</button>
          </td>
        `;

        tbody.appendChild(row);
      };

      customerRequest.onerror = function () {
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${formatDate(l.date)}</td>
          <td>Error</td>
          <td>${l.subName || '-'}</td>
          <td>${l.amount.toFixed(2)}</td>
          <td>
            ${l.active ? `<button class="btn btn-sm btn-outline-primary" onclick="editLent('${l.id}')">✏️</button>` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="deleteLent('${l.id}')">🗑️</button>
          </td>
        `;
        tbody.appendChild(row);
      };
    });
  };
}

function editLent(id) {
  const tx = getTransaction('lendings');
  const req = tx.get(id);

  req.onsuccess = function () {
    const lending = req.result;
    document.getElementById('lendDate').value = lending.date;
    document.getElementById('lendCustomer').value = lending.customerId;
    document.getElementById('lendSubName').value = lending.subName;
    document.getElementById('lendAmount').value = lending.amount;
    document.getElementById('editLendIndex').value = lending.id;
  };
}

function deleteLent(id) {
  if (!confirm("Are you sure to delete this lending entry?")) return;

  const tx = db.transaction(['lendings', 'transactions'], 'readwrite');
  const lendStore = tx.objectStore('lendings');
  const transStore = tx.objectStore('transactions');

  lendStore.delete(id);
  transStore.delete(id); // transaction entry uses same ID as lending

  tx.oncomplete = () => {
    loadLendings();
    alert("Lending and related transaction deleted.");
  };

  tx.onerror = () => {
    alert("Failed to delete lending or its transaction.");
  };
}

// ========== PAYMENTS/ TRANSACTION ==========
// ---------- IndexedDB Helper ----------
function getTransaction(storeName, mode = 'readonly') {
  return db.transaction([storeName], mode).objectStore(storeName);
}

async function getLendCustomerName(id, subName) {
  const store = getTransaction('customers');
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const customer = request.result;
      if (customer) {
        const fullName = subName ? `${customer.name}(${subName})` : customer.name;
        resolve(fullName);
      } else {
        resolve("Unknown Customer");
      }
    };

    request.onerror = () => {
      reject("Error retrieving customer");
    };
  });
}

function getWeeksBetween(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return Math.floor((e - s) / (1000 * 60 * 60 * 24 * 7));
}

async function getLendings() {
  return new Promise((resolve, reject) => {
    const store = getTransaction('lendings');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

async function getTransactions() {
  return new Promise((resolve, reject) => {
    const store = getTransaction('transactions');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

async function loadPaymentCustomers() {
  const activeLends = (await getLendings()).filter(l => l.active == true);

  // Create a map with unique customerId + subName combination
  const uniqueKeys = new Set();
  const uniqueCombos = [];

  activeLends.forEach(l => {
    const key = `${l.customerId}_${l.subName || ''}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      uniqueCombos.push({ customerId: l.customerId, subName: l.subName });
    }
  });

  // Get full names
  const uniqueNames = await Promise.all(
    uniqueCombos.map(async ({ customerId, subName }) => {
      const customerName = await getLendCustomerName(customerId, subName);
      return { customerId, subName, fullName: customerName };
    })
  );
  
  // Sort names alphabetically
  uniqueNames.sort((a, b) => a.fullName.localeCompare(b.fullName));
  
  const select = document.getElementById('paymentCustomerSelect');
  select.innerHTML = '<option value="">-- Select --</option>';

  uniqueNames.forEach(({ customerId, subName, fullName }) => {
    const option = document.createElement('option');
    option.value = JSON.stringify({ customerId, subName });
    option.textContent = fullName;
    select.appendChild(option);
  });
}

async function loadCustomerActiveLends() {
  const selectedOption = document.getElementById('paymentCustomerSelect').value;

  if (!selectedOption) return;

  const { customerId, subName } = JSON.parse(selectedOption); // Retrieve customerId and subName from the selected option

  const lends = (await getLendings()).filter(l => l.customerId === customerId && l.subName === subName && l.active);

  const container = document.getElementById('activeLendsList');
  container.innerHTML = '';  

  lends.forEach((lend, index) => {
  const weeks = getWeeksBetween(lend.date, getPaymentDate());
  const labelText = `${lend.date} - ₹${lend.amount} (${weeks} weeks)`;

  const checkbox = document.createElement('input');
  const checkboxId = `lendCheckbox_${lend.id}_${index}`; // unique ID for each checkbox
  checkbox.type = 'checkbox';
  checkbox.value = lend.id;
  checkbox.id = checkboxId;
  checkbox.className = 'form-check-input me-2';
  checkbox.style.cursor = 'pointer';

  const label = document.createElement('label');
  label.className = 'form-check-label';
  label.style.cursor = 'pointer';
  label.htmlFor = checkboxId;
  label.textContent = labelText;

  const div = document.createElement('div');
  div.className = 'form-check';
  div.appendChild(checkbox);
  div.appendChild(label);

  container.appendChild(div);
});

  document.getElementById('paymentSummary').style.display = 'none';
}

function getPaymentDate() {
  const val = document.getElementById('paymentDate').value;
  return val ? val : new Date().toISOString().split('T')[0];
}

let currentPaymentCalc = null;

function computePaymentSummary(selectedLends, paymentAmount = 0, paymentDate = getPaymentDate()) {
  let totalPrincipal = 0, totalInterest = 0;
  const lendWeeks = [];

  return getSettings().then(settings => {
    const interestRate = parseFloat(settings.weeklyInterest || 0);

    selectedLends.forEach(l => {
      const weeks = getWeeksBetween(l.date, paymentDate);
      const interest = Math.round((l.amount * interestRate * weeks) / 100);
      totalInterest += interest;
      totalPrincipal += l.amount;
      lendWeeks.push({ lendId: l.id, weeks });
    });

    const totalPayable = totalPrincipal + totalInterest - paymentAmount;
    return {
      date: paymentDate,
      principal: totalPrincipal,
      interest: totalInterest,
      payment: paymentAmount,
      total: totalPayable,
	  currentDue:totalPayable,
      weeks: lendWeeks
    };
  });
}

async function calculatePaymentSummary() {
  const selectedIds = Array.from(document.querySelectorAll('#activeLendsList input:checked')).map(cb => cb.value);
  const date = document.getElementById('paymentDate').value;
  if(!date)
  {
	  alert("Select Date");
	  return;
  }
	  
  const allLends = await getLendings();
  const selectedLends = allLends.filter(l => selectedIds.includes(l.id));
  //const paymentAmount = currentPaymentCalc?.payment || 0;
  const paymentAmount=0;
  // Since all selected lends have the same customerId and subName, just get the subName from the first lend.
  const subName = selectedLends.length > 0 ? selectedLends[0].subName : null; // Return null if no lends are selected
  const custId = selectedLends.length > 0 ? selectedLends[0].customerId : null; // Return null if no lends are selected

  const summary = await computePaymentSummary(selectedLends, paymentAmount);
  currentPaymentCalc = { ...summary, lendIds: selectedIds, customerId:custId, subName:subName};
  console.log("current Payment Calc:", currentPaymentCalc);
  updatePaymentSummaryUI(summary);
}

function addPayment() {
  if (!currentPaymentCalc) return;

  let amount = parseFloat(document.getElementById('paymentAmount').value);
  if (isNaN(amount) || amount <= 0) amount = 0;

  currentPaymentCalc.payment = amount;
  currentPaymentCalc.currentDue=currentPaymentCalc.total-currentPaymentCalc.payment;

  updatePaymentSummaryUI(currentPaymentCalc);
}

function updatePaymentSummaryUI(summary) {
  document.getElementById('paymentSummary').style.display = 'block';
  document.getElementById('paymentSummary').innerHTML = `
    <strong>Interest:</strong> ₹${summary.interest}<br>
    <strong>Outstanding:</strong> ₹${summary.principal}<br>
    <strong>Payment:</strong> ₹${summary.payment}<br>
    <strong>Total Payable:</strong> ₹${summary.currentDue}
  `;
}

async function submitTransaction() {
  const amt = parseFloat(document.getElementById('paymentAmount').value);
  if (!currentPaymentCalc) {
    alert("Missing calculation.");
    return;
  }

  // Save payment
  const payStore = getTransaction('transactions', 'readwrite');
  const newPayment = {
    id: generateId(),
	customerId:currentPaymentCalc.customerId,
	subName:currentPaymentCalc.subName,
    date: currentPaymentCalc.date,
	state: currentPaymentCalc.currentDue === 0 ? "closed" : "renew",
	weeks:currentPaymentCalc.weeks,
    lendIds: currentPaymentCalc.lendIds,
	amount:currentPaymentCalc.principal,
    interest: currentPaymentCalc.interest,
	total:currentPaymentCalc.total,
    paidAmount: currentPaymentCalc.payment,
	dueAmount:currentPaymentCalc.currentDue
  };
  payStore.put(newPayment);

  // Update lendings
  const allLends = await getLendings();
  const updatedLends = allLends.map(l => {
    if (currentPaymentCalc.lendIds.includes(l.id)) {
      l.active = false;
    }
    return l;
  });

  const name = document.getElementById('paymentCustomerSelect').value;
  updatedLends.push({
    id: generateId(),
    date: currentPaymentCalc.date,
	customerId:currentPaymentCalc.customerId,
    subName:currentPaymentCalc.subName,
    amount: currentPaymentCalc.currentDue,
	dueAmount:currentPaymentCalc.currentDue,
    active: currentPaymentCalc.currentDue === 0 ? false : true
  });

  const lendStore = getTransaction('lendings', 'readwrite');
  updatedLends.forEach(l => lendStore.put(l));

  alert("Transaction added");
  document.getElementById('paymentAmount').value = '';
  await loadCustomerActiveLends();
  await loadTransactions();
  loadLendings();
  clearTransactionScreen();
}

function clearTransactionScreen() {
  document.getElementById('paymentCustomerSelect').selectedIndex = 0;
  document.getElementById('activeLendsList').innerHTML = '';
  document.getElementById('paymentDate').value = '';
  const summary = document.getElementById('paymentSummary');
  summary.style.display = 'none';
  summary.innerHTML = '';
  document.getElementById('paymentAmount').value = '';
}

async function loadTransactions() {
  const tbody = document.getElementById('paymentTableBody');
  tbody.innerHTML = '';
  const transactions = await getTransactions();

// Filter out transactions where the state is "renew"
  const renewTransactions = transactions.filter(p => p.state === "renew");

  renewTransactions.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(p.date)}</td>
      <td>${(p.lendIds || []).length} lend(s)</td>
      <td>₹${p.interest}</td>
      <td>₹${p.paidAmount}</td>
      <td>₹${p.dueAmount}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deletePayment('${p.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deletePayment(id) {
  if (!confirm("Delete this transaction?")) return;

  // Step 1: Get the payment record
  const txStore = getTransaction('transactions', 'readonly');
  const txReq = txStore.get(id);

  txReq.onsuccess = async () => {
    const payment = txReq.result;
    if (!payment) {
      alert("transaction not found.");
      return;
    }

    const { lendIds: originalLendIds, customerId, subName, date } = payment;

    // Step 2: Restore old lends (set active = true)
    const allLends = await getLendings();
    const updatedLends = allLends.map(l => {
      if (originalLendIds.includes(l.id)) {
        l.active = true;
      }
      return l;
    });

    // Step 3: Delete the new merged lend created after submit
    const mergedLend = allLends.find(
      l =>
        l.customerId === customerId &&
        l.subName === subName &&
        l.date === date &&
        !originalLendIds.includes(l.id)
    );

    const lendStore = getTransaction('lendings', 'readwrite');
    updatedLends.forEach(l => lendStore.put(l));

    if (mergedLend) {
      lendStore.delete(mergedLend.id);
    }

    // Step 4: Delete the transaction record
    const delTxStore = getTransaction('transactions', 'readwrite');
    delTxStore.delete(id).onsuccess = async () => {
      await loadTransactions();
      await loadCustomerActiveLends();
      loadLendings();
      alert("transaction deleted and changes reverted.");
    };
  };
}


//========== EXPORT - IMPORT ==========
// Export Data (Download)
function exportData() {
  getAllAppData().then(data => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${dbName}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Import Data (Upload)
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      await restoreAppData(importedData);
      alert('Data imported successfully!');
      location.reload(); // Optional: refresh to reflect data
    } catch (err) {
      alert('Invalid file or format.');
    }
  };
  reader.readAsText(file);
}

// Reads all your app data (from IndexedDB or localStorage)
async function getAllAppData() {
  const customers = await getAllFromStore('customers');
  const lendings = await getAllFromStore('lendings');
  const payments = await getAllFromStore('transactions');
  const settings = JSON.parse(localStorage.getItem('settings') || '{}');

  return { customers, lendings, payments, settings };
}

// Writes imported data to IndexedDB and localStorage
async function restoreAppData(data) {
  if (!data) return;

  await clearAndWriteStore('customers', data.customers || []);
  await clearAndWriteStore('lendings', data.lendings || []);
  await clearAndWriteStore('transactions', data.payments || []);
  localStorage.setItem('settings', JSON.stringify(data.settings || {}));
}

// Helper for reading a store
async function getAllFromStore(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChitAppDB');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// Helper to clear and write store
async function clearAndWriteStore(storeName, items) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChitAppDB');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear().onsuccess = () => {
        items.forEach(item => store.add(item));
        tx.oncomplete = resolve;
        tx.onerror = reject;
      };
    };
  });
}


// ========== START ==========
window.addEventListener('load', initDB);
document.addEventListener('DOMContentLoaded', function () {
  const paymentInput = document.getElementById('paymentAmount');
  if (paymentInput) {
    paymentInput.addEventListener('input', addPayment);
  }
});
