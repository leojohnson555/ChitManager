
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

function validatePassword() {
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

//==========##### APP FUNCTIONS #####==========
const dbName = 'ChitFinanceDB';
const dbVersion = 2;
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
		if (!db.objectStoreNames.contains('financeClosureDetails')) {
            db.createObjectStore('financeClosureDetails', { keyPath: 'id' });
        }
		
    };
    request.onsuccess = function (e) {
        db = e.target.result;
        loadCustomers();
        loadTransactions("Transaction");
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
  const InstallmentAmount = parseFloat(document.getElementById('InstallmentAmount').value);
  const editIndex = parseInt(document.getElementById('editCustomerIndex').value);

  if (!name) {
    alert("Enter Name");
    return;
  }

  const customer = { name, contact, InstallmentAmount };
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
    document.getElementById('InstallmentAmount').value = '';
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
      const { id, name, contact, InstallmentAmount } = cursor.value;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${id}</td>
        <td>${name}</td>
        <td>${contact}</td>
        <td>${InstallmentAmount}</td>
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
    document.getElementById('InstallmentAmount').value = customer.InstallmentAmount;
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
  const ChitDuration = parseInt(document.getElementById('ChitDuration').value);
  const ChitUnit = parseFloat(document.getElementById('ChitUnit').value);
  const chitYear = document.getElementById('chitYear').value;
  
  if (isNaN(weeklyInterest) || isNaN(interestCycle)) {
    alert('Please enter valid values for interest settings.');
    return;
  }

  const settings = {
    id: 'settings', // Static id for single record
    weeklyInterest,
    interestCycle,
	ChitDuration,
	ChitUnit,
	chitYear
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
  const request = store.get('settings'); // Constant key for Settings

  request.onsuccess = function () {
    const settings = request.result;
    if (settings) {
      document.getElementById("weeklyInterest").value = settings.weeklyInterest || "";
      document.getElementById("interestCycle").value = settings.interestCycle || "";
      document.getElementById("ChitDuration").value = settings.ChitDuration || "";
      document.getElementById("ChitUnit").value = settings.ChitUnit || "";
      document.getElementById("chitYear").value = settings.chitYear || "";
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
  let editIndex = document.getElementById('editLendIndex').value;

  if (!date || isNaN(customerId) || isNaN(amount) || amount <= 0) {
    alert("Please fill all fields correctly.");
    return;
  }
  
  const allLends = await getLendings();
  const existing = allLends.find(
    l => l.date === date && l.customerId === customerId 
	&& l.subName === subName && l.active===true
  );
  
 //Editing the Lend
if (editIndex !== "-1") {
    // Mark as editing existing lend
    editIndex = existing.id;
    existing.amount = amount;
    existing.dueAmount = amount;

    try {
      await saveLendingWithTransaction(existing, false);
      resetLendForm();
      loadLendings();
    } catch (err) {
      alert("Failed to update existing lending.");
      console.error(err);
    }
    return;
  }
  
  //Adding new amount to existing Lend
  if (existing) {
    // Mark as editing existing lend
    editIndex = existing.id;
    existing.amount += amount;
    existing.dueAmount += amount;

    try {
      await saveLendingWithTransaction(existing, true);
      resetLendForm();
      loadLendings();
    } catch (err) {
      alert("Failed to update existing lending.");
      console.error(err);
    }
    return;
  }

  const entry = {
    id: generateId(),
    date,
    customerId,
    subName,
    amount,
    dueAmount: amount,
    active: true,
    successor: null,
    predecessor: [],
  };

  try {
    await saveLendingWithTransaction(entry, false);
    resetLendForm();
    loadLendings();
  } catch (err) {
    alert("Failed to save new lending.");
    console.error(err);
  }
}

async function saveLendingWithTransaction(entry, isPaymentAdded = false) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['lendings', 'transactions'], 'readwrite');
    const lendStore = tx.objectStore('lendings');
    const transStore = tx.objectStore('transactions');

    try {
      // Save/Update lending
      lendStore.put(entry);
	  let amount;
      if(isPaymentAdded){
	  amount = parseFloat(document.getElementById('lendAmount').value);}
	  else{
		  amount=entry.amount;}
		  
      // Save/Update corresponding transaction
      const transEntry = {
        customerId: entry.customerId,
        subName: entry.subName,
        date: entry.date,
		state:"new",
		weeks: [],
        lendIds: [entry.id],
        amount: amount,
        interest: 0,
		total:amount,
        paidAmount: 0,
        dueAmount: amount,
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
          <td>${l.dueAmount.toFixed(2)}</td>
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
          <td>${l.dueAmount.toFixed(2)}</td>
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
    document.getElementById('lendAmount').value = lending.dueAmount;
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

  const lends = (await getLendings()).filter(l => l.customerId === customerId 
				&& l.subName === subName && l.active);

  const container = document.getElementById('activeLendsList');
  container.innerHTML = '';  

  lends.forEach((lend, index) => {
  const weeks = getWeeksBetween(lend.date, getPaymentDate());
  const labelText = `${lend.date} - ₹${lend.dueAmount} (${weeks} weeks)`;

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
      const interest = Math.round((l.dueAmount * interestRate * weeks) / 100);
      totalInterest += interest;
      totalPrincipal += l.dueAmount;
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
	const newId=generateId();
  // Save payment
  const payStore = getTransaction('transactions', 'readwrite');
  const newPayment = {
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
  
  // Ensure predecessor is always saved as an array, even with one item
	const predecessorArray = Array.isArray(currentPaymentCalc.lendIds)
	  ? currentPaymentCalc.lendIds
	  : [currentPaymentCalc.lendIds];
	  
  // Update lendings
  const allLends = await getLendings();
  const updatedLends = allLends.map(l => {
    if (currentPaymentCalc.lendIds.includes(l.id)) {
      l.active = false;
	  l.successor=newId;
    }
    return l;
  });

  const name = document.getElementById('paymentCustomerSelect').value;
  
  updatedLends.push({
    id: newId,
    date: currentPaymentCalc.date,
	customerId:currentPaymentCalc.customerId,
    subName:currentPaymentCalc.subName,
    amount: currentPaymentCalc.principal,
	dueAmount:currentPaymentCalc.currentDue,
    active: currentPaymentCalc.currentDue === 0 ? false : true,
	successor:null,
	predecessor:predecessorArray,
  });

  const lendStore = getTransaction('lendings', 'readwrite');
  updatedLends.forEach(l => lendStore.put(l));

  alert("Transaction added");
  document.getElementById('paymentAmount').value = '';
  await loadCustomerActiveLends();
  await loadTransactions("Transaction");
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

async function loadTransactions(screen) {
  let tbody;
  if(screen === "Transaction"){  
    tbody = document.getElementById('paymentTableBody');
  }else if(screen === "matured-renewal"){ 
     tbody = document.getElementById('renewedTableBody');
  } else if(screen === "closure"){ 
     tbody = document.getElementById('closureLendTableBody');
  }
  
  tbody.innerHTML = '';

  const transactions = await getTransactions();
  
  const selectedDate = document.getElementById(screen === "matured-renewal"? 'renewalDate' : 'closureDate').value;
  
  let renewTransactions;
  // Filter only "renew" transactions
  if(screen === "Transaction"){
	renewTransactions = transactions.filter(p => p.state === "renew")
	.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else {
		renewTransactions = transactions.filter(p => p.date == selectedDate);
		}

  // Enrich each transaction with customer name
  const enrichedTransactions = await Promise.all(
    renewTransactions.map(async p => {
      const customerName = await getLendCustomerName(p.customerId, p.subName);
      return { ...p, customerName };
    })
  );

  // Now render the enriched rows
  enrichedTransactions.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.customerName}</td>
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
      await loadTransactions("Transaction");
      await loadCustomerActiveLends();
      loadLendings();
      alert("transaction deleted and changes reverted.");
    };
  };
}

//========== MATURED - RENEWAL ==========

async function loadMaturedRenewals(reset = true, isClosure=false) {
  const container = document.getElementById(isClosure===true ? 'closureLendList':'maturedRenewalList');
  if (reset) {
  container.innerHTML = '';}

  const selectedDate = document.getElementById(isClosure===true ? 'closureDate' : 'renewalDate').value;
  if (!selectedDate) {
	  alert("⚠️ Select closure date");
	  return;
  }

  const [lendings, settings] = await Promise.all([getLendings(), getSettings()]);
  const matured = lendings.filter(l => {
			if (!l.active) return false;
			const weeks = getWeeksBetween(l.date, selectedDate);
			return weeks >= isClosure===true? 1: parseInt(settings.interestCycle);
		});
  
  if (reset) {
    for (const l of matured) {
      const name = await getLendCustomerName(l.customerId, l.subName);
      const lendweeks = getWeeksBetween(l.date, selectedDate);
      const div = document.createElement('div');
      div.textContent = `${name} - ₹${l.dueAmount} on ${formatDate(l.date)} (weeks-${lendweeks})`;
      container.appendChild(div);
    }
	
    if (matured.length > 0) {
      const btn = document.createElement('button');
      btn.textContent = isClosure===true? 'Calculate all Lends' : 'Renew All';
      btn.classList.add('btn', 'btn-success', 'mt-2');
      btn.id = isClosure===true? 'calculateAllLendsBtn' : 'renewAllBtn';
      btn.onclick = () => renewAllMaturedLends(matured, selectedDate,isClosure);
      container.appendChild(btn);
    } else {
      container.textContent = isClosure===true ? 'No pending lends for process':'No matured lendings on selected date.';
	  if(isClosure===true){
		const actionBtn = document.createElement('button');
		actionBtn.textContent ='Proceed Closure';
		actionBtn.classList.add('btn', 'btn-info', 'mt-2');
		actionBtn.onclick = () => performChitClosure();
		document.getElementById('closureLendList').appendChild(actionBtn);
		  }
    
	}
  }
}

function renewAllMaturedLends(lendings, selectedDate,isClosure) {
  if (!lendings || lendings.length === 0) {
    alert("⚠️ Load matured lends again.");
    return;
  }
  if (confirm("Are you sure want to continue for closure lend calculations?")) {
  }
  else{ return;}
  
  document.getElementById("loader").style.display = "block"; // Show loader

  getSettings().then(settings => {
    const interestRate = parseFloat(settings.weeklyInterest);
    let completedCount = 0;

    lendings.forEach(oldLend => {
      const weeksPassed = getWeeksBetween(oldLend.date, selectedDate);
      const newDate = new Date(oldLend.date);
      newDate.setDate(newDate.getDate() + weeksPassed * 7);
      const newDateStr = newDate.toISOString().split('T')[0];

      const interest = Math.round((oldLend.dueAmount * interestRate / 100) * weeksPassed);
      const newAmount = oldLend.dueAmount + interest;
	  
	  const newId=generateId();
      const newLend = {
        id: newId,
        date: newDateStr,
        customerId: oldLend.customerId,
        subName: oldLend.subName,
        amount: oldLend.amount,
        dueAmount: newAmount,
        active: true,
		successor:null,
		predecessor: [oldLend.id],
      };

      const lendWeeks = [{ lendId: oldLend.id, weeks: weeksPassed }];

      const transaction = {
        customerId: oldLend.customerId,
        subName: oldLend.subName,
        date: newDateStr,
        state: 'matured-Renew',
        weeks: lendWeeks,
        lendIds: [oldLend.id],
        amount: oldLend.dueAmount,
        interest: interest,
        total: newAmount,
        paidAmount: 0,
        dueAmount: newAmount,
      };

      const tx = db.transaction(['lendings', 'transactions'], 'readwrite');
      const lendStore = tx.objectStore('lendings');
      const transStore = tx.objectStore('transactions');

      oldLend.active = false;
	  oldLend.successor=newId;
      lendStore.put(oldLend);
      lendStore.add(newLend);
      transStore.add(transaction);

      tx.oncomplete = () => {
        completedCount++;
        if (completedCount === lendings.length) {
          document.getElementById("loader").style.display = "none"; // Hide loader
          
          const actionBtn = document.createElement('button');
		  if(isClosure===true){
			  document.getElementById("calculateAllLendsBtn").style.display = 'none';
			  actionBtn.textContent ='Proceed Closure';
			  actionBtn.classList.add('btn', 'btn-info', 'mt-2');
			  actionBtn.onclick = () => performChitClosure();
			  document.getElementById('closureLendList').appendChild(actionBtn);
		  }else{
			  document.getElementById("renewAllBtn").style.display = 'none';
			  actionBtn.textContent ='Clear';
			  actionBtn.classList.add('btn', 'btn-secondary', 'mt-2');
			  actionBtn.onclick = () => loadMaturedRenewals();
			  document.getElementById('maturedRenewalList').appendChild(actionBtn);
		  }
		  
          loadMaturedRenewals(false,isClosure);
          loadLendings();
          loadPaymentCustomers();
          loadTransactions(isClosure===true? "closure" : "matured-renewal");
          alert('Renewal completed');
        }
      };
    });
  });
}

//========== CHIT - CLOSURE ==========
async function performChitClosure() {
  
  const cashInHand = document.getElementById('cashInHand').value;
  const closureExpense = document.getElementById('closureExpense').value;
  if(!cashInHand){
	alert("⚠️ Enter Cash in Hand");
    return;
  }
  // Step 1: Load necessary data
  const [lends, customers, settings] = await Promise.all([
    getAllFromStore('lendings'),
    getAllFromStore('customers'),
    getFromStore('settings', 'settings')
  ]);

  // Filter active lends
  const activeLends = lends.filter(l => l.active);

  // Step 2: Total chit amount = sum of all active lend amounts + cash in hand
  const totalActiveLendAmount = activeLends.reduce((sum, l) => sum + Number(l.dueAmount), 0);
  const totalChitAmount = totalActiveLendAmount + Number(cashInHand);

  // Step 3: Total no. of chit units
  const totalInstallmentAmount = customers.reduce((sum, c) => sum + Number(c.InstallmentAmount), 0);
  const chitUnit = Number(settings.ChitUnit);
  const chitDuration=Number(settings.ChitDuration);
  const totalChitUnits = totalInstallmentAmount / chitUnit;

  // Step 4: Matured chit amount per unit
  const maturedPerUnit = Math.floor(totalChitAmount / totalChitUnits);

  // Step 5: Compute customer-wise results
  const perCustomerExpense = Math.floor(closureExpense / customers.length);
  const tableData = customers.map(c => {
    const customerLends = activeLends.filter(l => l.customerId === c.id);
    const totalLendAmount = customerLends.reduce((sum, l) => sum + Number(l.amount), 0);
    const chitUnitsPerCustomer = c.InstallmentAmount / chitUnit;
    const maturedAmount = Math.floor(chitUnitsPerCustomer * maturedPerUnit);
    const distributionAmount = maturedAmount - totalLendAmount;
    const finalAmount = distributionAmount - perCustomerExpense;
	const totalInstallmentAmount= c.InstallmentAmount*chitDuration;

    return {
      name: c.name,
	  installmentAmount: c.InstallmentAmount,
      chitUnits: chitUnitsPerCustomer,
      chitPaid: totalInstallmentAmount,
      maturedAmount,
	  lendAmount:totalLendAmount,
      distributionAmount,
      expense: perCustomerExpense,
      finalAmount
    };
  });
  const selectedDate = document.getElementById('closureDate').value;
  if (!selectedDate) {
	  alert("⚠️ Select closure date");
	  return;
  }
  formatDate
  const closureSummary={
	  id: `closure_${formatDate(selectedDate)}`,
      actionDate: getToday(),
	  closureDate: formatDate(selectedDate),
	  summary: {
      totalChitAmount,
      cashInHand,
	  totalActiveLendAmount,
      totalChitUnits,
      maturedPerUnit,
      closureExpense,
	  chitDuration
    },
    customerBreakup: tableData
  };
  // Step 6: Display labels and table (you can bind this to your UI)
  displayClosureSummary(closureSummary);

  // Optionally store for saving later
  window.financeClosureDetails = closureSummary;
}

// Save button handler
async function saveChitClosureDetails() {
  if (!window.financeClosureDetails) {
    alert("No closure details found. Please perform calculations first.");
    return;
  }

  await addToStore('financeClosureDetails', window.financeClosureDetails);
  alert("Closure details saved successfully.");
}

function displayClosureSummary(closureSummary) {
  document.getElementById('closureSummaryLabel').innerText =
    `Closure Date : ${closureSummary.closureDate}
	Total Chit Amount : ₹${closureSummary.summary.totalChitAmount} = ₹${closureSummary.summary.totalActiveLendAmount} + ₹${closureSummary.summary.cashInHand}
     Total Chit Units : ${closureSummary.summary.totalChitUnits}
     Matured Amount per Unit : ₹${Number(closureSummary.summary.maturedPerUnit).toFixed(2)}
	 Chit Duration : ${closureSummary.summary.chitDuration}`;

  const tbody = document.getElementById('closureTableBody');
  tbody.innerHTML = '';
  closureSummary.customerBreakup.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.installmentAmount}</td>
      <td>${row.chitUnits}</td>
      <td>${row.chitPaid}</td>
      <td>${row.maturedAmount}</td>
      <td>${row.lendAmount}</td>
      <td>${row.distributionAmount}</td>
      <td>${row.expense}</td>
      <td>${row.finalAmount}</td>`;
    tbody.appendChild(tr);
  });
}
async function checkAndShowClosureDetails() {
  const dbRequest = indexedDB.open(dbName);

  dbRequest.onsuccess = () => {
    const db = dbRequest.result;
    if (!db.objectStoreNames.contains('financeClosureDetails')) {
	    console.log("financeClosureDetails Not Created:");
        }
	  else{ console.log("financeClosureDetails is present:");}
	  
    const tx = db.transaction('financeClosureDetails', 'readonly');
    const store = tx.objectStore('financeClosureDetails');

    const getAllRequest = store.getAll(); 
    getAllRequest.onsuccess = () => {
      const records = getAllRequest.result;

      if (records.length > 0) {
        const latestClosure = records[records.length - 1];
		
        displayClosureSummary(latestClosure);
        document.getElementById('btnLoadClosureLends').style.display = 'none';
        document.getElementById('closureLendTable').style.display = 'none';
        document.getElementById('btnSaveClosureSummary').style.display = 'none';
		
      }
    };

    getAllRequest.onerror = () => {
      console.error('Error loading closure details:', getAllRequest.error);
    };
  };

  dbRequest.onerror = () => {
    console.error('Failed to open database.');
  };
}

//========== EXPORT - IMPORT ==========
function exportCustomer() {
  getAllFromStore('customers').then(data => {
    if (!data || data.length === 0) {
      alert('No customers found to export.');
      return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const yyyy = now.getFullYear();
    const dateStr = `${dd}${mm}${yyyy}`;

    a.download = `${dbName}_customers_backup_${dateStr}.json`;

    a.click();
    URL.revokeObjectURL(url);
  }).catch(error => {
    console.error('Error exporting customers:', error);
    alert('Failed to export customers.');
  });
}

function importCustomer(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
	  if (
        !Array.isArray(importedData) ||
        !importedData.every(item =>
          item &&
          typeof item.name === 'string' &&
          typeof item.contact === 'string' &&
          typeof item.InstallmentAmount === 'number'
        )
      ) {
        throw new Error('Invalid format');
      }
	  
	  await clearAndWriteStore('customers', importedData || []);
      alert('Customer data imported successfully!');
      location.reload(); // Optional: refresh to reflect data
    } catch (err) {
      alert('Invalid file or format. Expected: array of { name, contact, InstallmentAmount }.');
    }
  };
  reader.readAsText(file);
}
async function clearAllFromDB() {
  if (confirm("Are you sure you want to delete all data?")) {
    await clearAllData();
	  location.reload();
  }
}
// Export Data (Download)
function exportData() {
  getAllAppData().then(data => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
	
	const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const yyyy = now.getFullYear();
    const dateStr = `${dd}${mm}${yyyy}`;

    a.download = `${dbName}_backup_${dateStr}.json`;
	
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

//Save the table to db
async function addToStore(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = () => {
      console.error('Database failed to open');
      reject('Database error');
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const addRequest = store.add(data);

      addRequest.onsuccess = () => {
        resolve();
      };

      addRequest.onerror = () => {
        console.error('Add operation failed', addRequest.error);
        reject('Add operation failed');
      };

      tx.oncomplete = () => db.close();
    };
  });
}

// Reads all your app data (from IndexedDB)
async function getAllAppData() {
  const customers = await getAllFromStore('customers');
  const lendings = await getAllFromStore('lendings');
  const payments = await getAllFromStore('transactions');
  const settings = await getAllFromStore('settings');

  return { customers, lendings, payments, settings };
}

// Writes imported data to IndexedDB
async function restoreAppData(data) {
  if (!data) return;

  await clearAndWriteStore('customers', data.customers || []);
  await clearAndWriteStore('lendings', data.lendings || []);
  await clearAndWriteStore('transactions', data.payments || []);
  await clearAndWriteStore('settings', data.settings || []);
}

// Helper for reading a store
async function getAllFromStore(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
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
// Helper for reading a key record from store
async function getFromStore(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getRequest = store.get(key);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// Helper to clear and write store
async function clearAndWriteStore(storeName, items) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
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
async function clearAllData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onsuccess = () => {
      const db = request.result;

      const storeNames = [
        'customers',
        'lendings',
        'transactions',
        'settings',
        'financeClosureDetails'
      ];

      const tx = db.transaction(storeNames, 'readwrite');

      for (const storeName of storeNames) {
        tx.objectStore(storeName).clear();
      }

      tx.oncomplete = () => {
        db.close();
        alert('All data cleared from the database.');
        resolve();
      };

      tx.onerror = () => {
        console.error('Error clearing data:', tx.error);
        reject(tx.error);
      };
    };

    request.onerror = () => {
      console.error('Failed to open database.');
      reject(request.error);
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
  checkAndShowClosureDetails();
});
