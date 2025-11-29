// Payment System for ElectriTrack
// Handles bill payment with QR code generation and payment method selection

import { auth, database } from './firebase-config.js';
import { ref, push, set, get, query, orderByChild, update } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

export function renderPaymentSection() {
    return `
        <div class="payment-container">
            <div class="payment-header">
                <h2>⚡ Bill Payment System</h2>
                <p>Pay your bills easily with PayMaya and GCash</p>
            </div>
            
            <!-- Bill Status Card -->
            <div class="bill-status-card card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <div style="padding: 1.5rem;">
                    <h3 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; justify-content: space-between;">
                        <span>📊 Bill Status</span>
                        <button id="toggle-calendar-btn" style="
                            background: rgba(255,255,255,0.2);
                            color: white;
                            border: 1px solid rgba(255,255,255,0.3);
                            padding: 0.35rem 0.75rem;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 0.85rem;
                        ">📅 Show Calendar</button>
                    </h3>
                    <div id="bill-status-info" style="font-size: 0.95rem;">
                        <p id="bill-status-text" style="margin: 0.5rem 0;">Loading bill status...</p>
                    </div>
                    <div id="monthly-calendar" style="display: none; margin-top: 1rem;">
                        <div id="calendar-content" style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px;">
                            <!-- Calendar content will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="payment-content">
                <div class="payment-form-section">
                    <div class="form-card compact-card">
                        <h3 class="compact-title">📋 Bill Information</h3>
                        <p class="form-subtitle compact-subtitle">Enter your bill details to generate payment</p>
                        
                        <form id="payment-form" class="payment-form compact-form">
                             <div class="form-group">
                                <label for="bill-type">Bill Type</label>
                                <select id="bill-type" required>
                                    <option value="electric" selected>⚡ Electric Bill</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="account-number">Meter Number</label>
                                <input type="text" id="account-number" placeholder="Loading meter number..." readonly>
                            </div>
                            
                            <div class="form-group">
                                <label for="customer-name">Customer Name</label>
                                <input type="text" id="customer-name" placeholder="Enter customer name" required>
                            </div>
                            
                             <div class="form-group">
                                <label for="amount">Amount (PHP)</label>
                                <input type="number" id="amount" placeholder="0.00" step="0.01" min="0" readonly>
                            </div>
                            
                            <!-- Payment Method Selection inside form -->
                            <div class="form-group">
                                <label>Payment Method</label>
                                <div class="payment-options">
                                    <div class="payment-option" id="gcash-option">
                                        <div class="payment-card gcash-card">
                                            <div class="payment-logo">
                                                <span class="payment-name">GCash</span>
                                            </div>
                                            <p>Digital wallet payment</p>
                                        </div>
                                    </div>
                                    
                                    <div class="payment-option" id="paymaya-option">
                                        <div class="payment-card paymaya-card">
                                            <div class="payment-logo">
                                                <span class="payment-name">PayMaya</span>
                                            </div>
                                            <p>Digital wallet payment</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group" id="gcash-number-group" style="display: none;">
                                <label for="gcash-number">GCash Number</label>
                                <input type="text" id="gcash-number" placeholder="Enter your GCash number" required>
                            </div>
                            
                            <div class="form-group" id="paymaya-number-group" style="display: none;">
                                <label for="paymaya-number">PayMaya Number</label>
                                <input type="text" id="paymaya-number" placeholder="Enter your PayMaya number" required>
                            </div>
                            
                            <button type="submit" class="generate-qr-btn">Confirm Payment</button>
                        </form>
                    </div>
                </div>
                
                 <div class="qr-section">
                    <div class="qr-card">
                        <div id="qr-display" class="qr-display">
                            <div class="qr-placeholder">
                                <p>Fill in bill details and select payment method to generate payment</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="payment-success" class="payment-success hidden">
                <div class="success-card">
                    <div class="success-icon">✅</div>
                    <h3>Payment Details Generated!</h3>
                    <p>Your QR code is ready. Scan with your preferred payment app to complete the transaction.</p>
                </div>
            </div>
            
            <!-- Bill History Section -->
            <div class="bill-history-section" style="margin-top: 2rem;">
                <div class="card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>📜 Payment History</h3>
                        <div style="display: flex; gap: 0.5rem;">
                            <button id="download-history-btn" style="
                                background: #3b82f6;
                                color: white;
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 600;
                            ">📥 Download</button>
                            <button id="clear-all-history-btn" style="
                                background: #ef4444;
                                color: white;
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 600;
                            ">🗑️ Clear All</button>
                        </div>
                    </div>
                    <div id="bill-history-list" style="padding: 1rem;">
                        <p style="text-align: center; color: #666;">Loading payment history...</p>
                    </div>
                </div>
            </div>
        </div>
        
    `;
}

export function initializePaymentSystem() {
    // Add CSS for enhanced bill information form
    const compactStyles = document.createElement('style');
    compactStyles.textContent = `

        
        /* QR Code Styles */
        .qr-code-visual {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 15px;
        }
        .qr-code-image {
            max-width: 100%;
            height: auto;
            border: 2px solid #000;
            border-radius: 10px;
        }
        
        /* Payment Success Card Styles */
        .payment-success {
            transform: scale(0.25);
            transform-origin: center top;
            margin: -150px auto -150px auto;
        }
        .success-card {
            padding: 5px !important;
        }
        .success-icon {
            font-size: 1.5em !important;
        }
        .success-card h3 {
            font-size: 0.9em !important;
            margin: 5px 0 !important;
        }
        .success-card p {
            font-size: 0.8em !important;
            margin: 5px 0 !important;
        }
        
        /* Compact Card Styles */
        .compact-card {
            padding: 9px !important;
        }
        .compact-title {
            margin-top: 0 !important;
            margin-bottom: 0.5px !important;
            font-size: 1.1em !important;
        }
        .compact-subtitle {
            margin-top: 0 !important;
            margin-bottom: 0.5px !important;
            font-size: 0.8em !important;
        }
        .compact-form .form-group {
            margin-bottom: 0 !important;
            margin-top: 0 !important;
            padding-bottom: 0 !important;
            padding-top: 0 !important;
        }
        .compact-form label {
            margin-bottom: 0 !important;
            display: inline-block;
            font-size: 0.9em !important;
        }
        .compact-form input, 
        .compact-form select {
            padding: 1px 4px !important;
            height: 28px !important;
            margin-bottom: 0 !important;
        }
        .compact-form .payment-options {
            margin-top: 1px !important;
        }
        .compact-form .generate-qr-btn {
            margin-top: 5px !important;
            padding: 6px 10px !important;
        }
        
        /* Transaction ID Dialog Styles */
        .transaction-id-container {
            max-width: 500px;
            margin: 2rem auto;
            padding: 1rem;
        }
        .transaction-id-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .transaction-id-header .success-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .transaction-id-header h2 {
            color: #10b981;
            margin: 0.5rem 0;
            font-size: 1.8rem;
        }
        .transaction-id-header .success-message {
            color: #666;
            font-size: 1rem;
            margin: 0.5rem 0;
        }
        .transaction-id-card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .transaction-id-card h3 {
            color: #1f2937;
            margin-bottom: 0.5rem;
            font-size: 1.3rem;
        }
        .submit-transaction-btn {
            width: 100%;
            padding: 0.875rem 1.5rem;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 1rem;
        }
        .submit-transaction-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
        }
        .submit-transaction-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
        }
    `;
    document.head.appendChild(compactStyles);

    const form = document.getElementById('payment-form');
    const qrDisplay = document.getElementById('qr-display');
    const paymentOptions = document.querySelectorAll('.payment-option');
    let selectedPaymentMethod = 'gcash'; // default
    let currentBillData = null;

    // Form submission handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        generateQRCode();
    });

    // Payment method selection - Add both click and touch support
    paymentOptions.forEach(option => {
        const handleSelection = () => {
            // Remove active class from all options
            paymentOptions.forEach(opt => opt.classList.remove('active'));
            // Add active class to selected option
            option.classList.add('active');
            
            // Update selected payment method
            selectedPaymentMethod = option.id.replace('-option', '');
            
            // Show/hide payment number inputs
            const gcashNumberGroup = document.getElementById('gcash-number-group');
            const paymayaNumberGroup = document.getElementById('paymaya-number-group');
            
            if (selectedPaymentMethod === 'gcash') {
                gcashNumberGroup.style.display = 'block';
                paymayaNumberGroup.style.display = 'none';
                document.getElementById('gcash-number').required = true;
                document.getElementById('paymaya-number').required = false;
            } else if (selectedPaymentMethod === 'paymaya') {
                gcashNumberGroup.style.display = 'none';
                paymayaNumberGroup.style.display = 'block';
                document.getElementById('gcash-number').required = false;
                document.getElementById('paymaya-number').required = true;
            }
            
            // Regenerate QR code if we have bill data
            if (currentBillData) {
                generateQRCode();
            }
        };

        option.addEventListener('click', handleSelection);
        option.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleSelection();
        });
    });

     // Set default selection
    document.getElementById('gcash-option').classList.add('active');
    selectedPaymentMethod = 'gcash';
    // Don't show payment number inputs by default - only show when clicked
    
    // Set default bill type to electric
    document.getElementById('bill-type').value = 'electric';

    // Auto-populate meter number and amount from profile and dashboard
    const autoPopulatePaymentForm = async () => {
        const accountNumberInput = document.getElementById('account-number');
        const amountInput = document.getElementById('amount');
        
        // Temporarily remove readonly to allow setting value
        const wasReadonly = amountInput.readOnly;
        amountInput.readOnly = false;
        
        // Get meter number from profile
        try {
            const user = auth.currentUser;
            if (user) {
                const profileRef = ref(database, `users/${user.uid}/profile`);
                const profileSnapshot = await get(profileRef);
                if (profileSnapshot.exists()) {
                    const profileData = profileSnapshot.val();
                    console.log('Profile data:', profileData);
                    
                    // Get meter number from "phone" field in profile
                    const meterNumber = profileData.phone;
                    
                    if (meterNumber && !accountNumberInput.value) {
                        accountNumberInput.value = meterNumber;
                        console.log('✓ Set meter number to:', meterNumber);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
        
        // Get amount from dashboard data or device data
        if (!amountInput.value || amountInput.value === '0.00') {
            // First try window.currentConsumedAmount (from dashboard)
            if (window.currentConsumedAmount && window.currentConsumedAmount > 0) {
                amountInput.value = window.currentConsumedAmount.toFixed(2);
                console.log('✓ Set amount from dashboard:', window.currentConsumedAmount.toFixed(2));
            } else {
                // Fallback: fetch from device data directly
                try {
                    const user = auth.currentUser;
                    if (user) {
                        const profileRef = ref(database, `users/${user.uid}/profile`);
                        const profileSnapshot = await get(profileRef);
                        if (profileSnapshot.exists()) {
                            const profileData = profileSnapshot.val();
                            let phoneNumber = profileData.phone;
                            
                            // Ensure phoneNumber has +63 prefix
                            if (phoneNumber && !phoneNumber.startsWith('+63')) {
                                phoneNumber = '+63' + phoneNumber;
                            }
                            
                            const devicesRef = ref(database, `devices/${phoneNumber}`);
                            const devicesSnapshot = await get(devicesRef);
                            
                            if (devicesSnapshot.exists()) {
                                const devicesData = devicesSnapshot.val();
                                console.log('Device data fetched:', devicesData);
                                // Get first meter
                                for (const meterKey in devicesData) {
                                    if (typeof devicesData[meterKey] === 'object' && devicesData[meterKey] !== null) {
                                        const deviceData = devicesData[meterKey];
                                        const kwh = parseFloat(deviceData.kwh) || 0;
                                        const rate = parseFloat(deviceData.price || deviceData.Price) || 12;
                                        const pastUsage = parseFloat(deviceData.previousUsage || deviceData.past_usage) || 0;
                                        const amount = Math.max(0, (kwh - pastUsage)) * rate;
                                        
                                        if (amount > 0) {
                                            amountInput.value = amount.toFixed(2);
                                            console.log('✓ Set amount from device:', amount.toFixed(2), 'kwh:', kwh, 'rate:', rate);
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching device data:', error);
                }
            }
        }
        
        // Restore readonly state
        amountInput.readOnly = wasReadonly;
    };
    
    // Call immediately and after delay to catch data
    autoPopulatePaymentForm();
    setTimeout(autoPopulatePaymentForm, 500);
    setTimeout(autoPopulatePaymentForm, 1000);
    setTimeout(autoPopulatePaymentForm, 1500);

    function generateQRCode() {
        const billType = document.getElementById('bill-type').value || 'electric';
        const accountNumber = document.getElementById('account-number').value;
        const customerName = document.getElementById('customer-name').value;
        const amount = document.getElementById('amount').value;

        if (!billType || !accountNumber || !customerName || !amount) {
            alert('Please fill in all required fields');
            return;
        }

        currentBillData = {
            billType,
            accountNumber,
            customerName,
            amount: parseFloat(amount),
            paymentMethod: selectedPaymentMethod
        };

        // Generate QR code data
        const qrData = generateQRData(currentBillData);
        
        // Display QR code
        displayQRCode(qrData, currentBillData);
        
        // Save bill to history
        saveBillToHistory(currentBillData);
        
        // Show success message
        showPaymentSuccess();
    }

    function generateQRData(billData) {
        // Create a payment data string that would be used in real QR code generation
        const paymentData = {
            type: 'payment',
            method: billData.paymentMethod,
            billType: billData.billType,
            accountNumber: billData.accountNumber,
            customerName: billData.customerName,
            amount: billData.amount,
            currency: 'PHP',
            timestamp: Date.now()
        };
        
        return JSON.stringify(paymentData);
    }

    function displayQRCode(qrData, billData) {
        const paymentMethodName = billData.paymentMethod === 'gcash' ? 'GCash' : 'PayMaya';
        const billTypeDisplay = billData.billType.charAt(0).toUpperCase() + billData.billType.slice(1);
        
        qrDisplay.innerHTML = `
            <div class="qr-code-container">
                <div class="qr-details">
                    <h4>Payment Details</h4>
                    <div class="detail-row">
                        <span>Bill Type:</span>
                        <strong>${billTypeDisplay}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Meter Number:</span>
                        <strong>${billData.accountNumber}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Customer:</span>
                        <strong>${billData.customerName}</strong>
                    </div>
                    <div class="detail-row amount">
                        <span>Amount:</span>
                        <strong>₱${billData.amount.toFixed(2)}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Payment Method:</span>
                        <strong>${paymentMethodName}</strong>
                    </div>
                </div>
                 <div class="qr-actions">
                    <p class="qr-instruction">
                        Proceed with your ${paymentMethodName} payment
                    </p>
                    <button class="simulate-payment-btn" id="simulate-btn">
                        Confirm
                    </button>
                </div>
            </div>
         `;
        
        // Add event listener to simulate button with both click and touch support
        setTimeout(() => {
            const simulateBtn = document.getElementById('simulate-btn');
            if (simulateBtn) {
                const handleSimulate = (e) => {
                    e.preventDefault();
                    simulatePayment();
                };
                simulateBtn.addEventListener('click', handleSimulate);
                simulateBtn.addEventListener('touchend', handleSimulate);
            }
        }, 50);
    }

    async function simulatePayment() {
        if (!currentBillData) return;
        
        const paymentMethodName = currentBillData.paymentMethod === 'gcash' ? 'GCash' : 'PayMaya';
        const billTypeDisplay = currentBillData.billType.charAt(0).toUpperCase() + currentBillData.billType.slice(1);
        
        // Generate transaction ID
        const generatedTransactionId = generateTransactionId();
        
        // Save to Firebase first with paymentStatus: false
        const user = auth.currentUser;
        if (!user) {
            alert('Please sign in to complete payment');
            return;
        }
        
        try {
            const timestamp = Date.now();
            
            // Get user's phone number from profile
            let phoneNumber = null;
            try {
                const profileRef = ref(database, `users/${user.uid}/profile`);
                const profileSnapshot = await get(profileRef);
                if (profileSnapshot.exists()) {
                    phoneNumber = profileSnapshot.val().phone?.trim();
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
            
            // Fallback to other methods if phone not found in profile
            if (!phoneNumber) {
                phoneNumber = user.phoneNumber || user.email?.replace('@', '_').replace('.', '_') || user.uid;
            }
            
            // Ensure phoneNumber has +63 prefix
            if (phoneNumber && !phoneNumber.startsWith('+63')) {
                phoneNumber = '+63' + phoneNumber;
            }
            
            // Show transaction ID confirmation dialog
            const container = document.querySelector('.payment-container');
            container.innerHTML = `
                <div class="transaction-id-container">
                    <div class="transaction-id-header">
                        <div class="success-icon">✅</div>
                        <h2>Payment Successful!</h2>
                        <p class="success-message">
                            Your payment of ₱${currentBillData.amount.toFixed(2)} has been processed via ${paymentMethodName}.
                        </p>
                    </div>
                    
                    <div class="transaction-id-card">
                        <h3>Transaction ID Generated</h3>
                        <p style="color: #666; margin-bottom: 1rem; font-size: 0.9rem;">
                            Your transaction ID has been generated. Please copy this ID and enter it below to confirm your payment.
                        </p>
                        
                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Generated Transaction ID</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input 
                                    type="text" 
                                    id="generated-transaction-id" 
                                    value="${generatedTransactionId}"
                                    readonly
                                    style="flex: 1; padding: 0.75rem; border: 2px solid #10b981; border-radius: 8px; font-size: 1rem; font-weight: 600; background: #f0fdf4; color: #059669; text-align: center;"
                                >
                                <button 
                                    id="copy-transaction-btn"
                                    style="padding: 0.75rem 1rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;"
                                    title="Copy Transaction ID"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="confirm-transaction-id-input" style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Confirm Transaction ID</label>
                            <input 
                                type="text" 
                                id="confirm-transaction-id-input" 
                                placeholder="Paste or enter the transaction ID" 
                                style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; text-transform: uppercase; color: #10b981;"
                                required
                            >
                        </div>
                        
                        <button class="submit-transaction-btn" id="confirm-transaction-btn" data-phone-number="${phoneNumber}" data-meter-number="${currentBillData.accountNumber}" data-timestamp="${timestamp}" data-transaction-id="${generatedTransactionId}">
                            Confirm Payment
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listeners
            setTimeout(() => {
                const copyBtn = document.getElementById('copy-transaction-btn');
                const confirmBtn = document.getElementById('confirm-transaction-btn');
                const confirmInput = document.getElementById('confirm-transaction-id-input');
                
                // Copy button functionality
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        const generatedId = document.getElementById('generated-transaction-id').value;
                        navigator.clipboard.writeText(generatedId).then(() => {
                            copyBtn.textContent = '✓ Copied!';
                            setTimeout(() => {
                                copyBtn.textContent = '📋 Copy';
                            }, 2000);
                        });
                    });
                }
                
                // Auto-uppercase confirmation input
                if (confirmInput) {
                    confirmInput.addEventListener('input', (e) => {
                        e.target.value = e.target.value.toUpperCase();
                    });
                }
                
                // Confirm button functionality
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', async () => {
                        const enteredId = confirmInput.value.trim();
                        const correctId = confirmBtn.dataset.transactionId;
                        const phoneNumber = confirmBtn.dataset.phoneNumber;
                        const meterNumber = confirmBtn.dataset.meterNumber;
                        const timestamp = confirmBtn.dataset.timestamp;
                        
                        if (!enteredId) {
                            alert('Please enter the transaction ID to confirm');
                            return;
                        }
                        
                        if (enteredId !== correctId) {
                            alert('Transaction ID does not match. Please check and try again.');
                            confirmInput.style.borderColor = '#ef4444';
                            return;
                        }
                        
                        // Disable button to prevent double submission
                        confirmBtn.disabled = true;
                        confirmBtn.textContent = 'Processing...';
                        
                        try {
                            // Update Firebase payment status to Paid and add transaction ID
                            await updatePaymentStatus(phoneNumber, meterNumber, generatedTransactionId);
                            
                            // Show success receipt
                            showPaymentReceipt(generatedTransactionId);
                        } catch (error) {
                            console.error('Error confirming payment:', error);
                            alert('Error confirming payment. Please try again.');
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = 'Confirm Payment';
                        }
                    });
                }
            }, 100);
            
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Error processing payment. Please try again.');
        }
    }
    
    async function updatePaymentStatus(phoneNumber, meterNumber, transactionId) {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        try {
            // Update payment status directly under phone number (not under meter number)
            const deviceRef = ref(database, `devices/${phoneNumber}`);
            await update(deviceRef, {
                payment: "paid",
                transaction_id: transactionId
            });
            
            console.log(`Updated devices/${phoneNumber}: payment = paid, transaction_id = ${transactionId}`);
        } catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    }
    
    function showPaymentReceipt(transactionId) {
        const paymentMethodName = currentBillData.paymentMethod === 'gcash' ? 'GCash' : 'PayMaya';
        const billTypeDisplay = currentBillData.billType.charAt(0).toUpperCase() + currentBillData.billType.slice(1);
        
        // Get current date and time
        const currentDate = new Date().toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });

        // Show payment receipt
        const container = document.querySelector('.payment-container');
        container.innerHTML = `
            <div class="receipt-container">
                <div class="receipt-header">
                    <div class="success-badge">
                        <div class="success-icon">✅</div>
                        <h2>Payment Recorded!</h2>
                    </div>
                    <p class="success-message">
                        Your ${billTypeDisplay} Bill payment of ₱${currentBillData.amount.toFixed(2)} has been saved successfully.
                    </p>
                </div>
                
                <div class="receipt-card">
                    <h3>Transaction Details</h3>
                    <div class="receipt-details">
                        <div class="receipt-row">
                            <span class="receipt-label">Bill Type:</span>
                            <span class="receipt-value">${billTypeDisplay} Bill</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Account:</span>
                            <span class="receipt-value">${currentBillData.accountNumber}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Customer:</span>
                            <span class="receipt-value">${currentBillData.customerName}</span>
                        </div>
                        <div class="receipt-row amount-row">
                            <span class="receipt-label">Amount:</span>
                            <span class="receipt-value">₱${currentBillData.amount.toFixed(2)}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Payment Method:</span>
                            <span class="receipt-value">${paymentMethodName}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Transaction ID:</span>
                            <span class="receipt-value transaction-id">${transactionId}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Payment Status:</span>
                            <span class="receipt-value status-completed">✓ PAID</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Date:</span>
                            <span class="receipt-value">${currentDate}</span>
                        </div>
                    </div>
                    
                     <div class="receipt-actions">
                        <button class="make-another-payment-btn" id="another-payment-btn">
                            Make Another Payment
                        </button>
                        <button class="download-receipt-btn" id="download-receipt-btn">
                            Download Receipt
                        </button>
                        <button class="back-to-dashboard-btn" id="back-to-dashboard-btn" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 1rem;
                            width: 100%;
                            margin-top: 0.75rem;
                        ">
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
                
                <div class="receipt-footer">
                    <p>Thank you for using ElectriTrack Payment System!</p>
                    <p>Keep this receipt for your records.</p>
                </div>
             </div>
        `;
        
        // Reload bill history to show new payment
        loadBillHistory();
        
        // Add event listeners to receipt buttons with both click and touch support
        setTimeout(() => {
            const anotherPaymentBtn = document.getElementById('another-payment-btn');
            const downloadBtn = document.getElementById('download-receipt-btn');
            const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
            
            if (anotherPaymentBtn) {
                const handleAnotherPayment = (e) => {
                    e.preventDefault();
                    // Instead of reloading, render the payment form again
                    container.innerHTML = renderPaymentSection();
                    // Re-initialize the payment system
                    setTimeout(() => {
                        initializePaymentSystem();
                    }, 100);
                };
                anotherPaymentBtn.addEventListener('click', handleAnotherPayment);
                anotherPaymentBtn.addEventListener('touchend', handleAnotherPayment);
            }
            
            if (downloadBtn) {
                const handleDownload = (e) => {
                    e.preventDefault();
                    downloadReceipt(currentBillData, paymentMethodName, transactionId, currentDate);
                };
                downloadBtn.addEventListener('click', handleDownload);
                downloadBtn.addEventListener('touchend', handleDownload);
            }
            
            if (backToDashboardBtn) {
                const handleBackToDashboard = (e) => {
                    e.preventDefault();
                    // Navigate back to dashboard
                    window.location.hash = '#dashboard';
                };
                backToDashboardBtn.addEventListener('click', handleBackToDashboard);
                backToDashboardBtn.addEventListener('touchend', handleBackToDashboard);
            }
        }, 50);
    }

     // Make makeAnotherPayment globally accessible
    window.makeAnotherPayment = function() {
        // Reset form and go back to payment form
        location.reload(); // Simple reload to reset the entire payment form
    };

     // Download receipt function
    function downloadReceipt(billData, paymentMethod, transactionId, date) {
        const billTypeDisplay = billData.billType.charAt(0).toUpperCase() + billData.billType.slice(1);
        
        // Create receipt content
        const receiptContent = `
ELECTRITRACK PAYMENT RECEIPT
================================

Payment Successful!
Your ${billTypeDisplay} Bill payment has been processed.

TRANSACTION DETAILS
--------------------------------
Bill Type: ${billTypeDisplay} Bill
Account: ${billData.accountNumber}
Customer: ${billData.customerName}
Amount: ₱${billData.amount.toFixed(2)}
Payment Method: ${paymentMethod}
Transaction ID: ${transactionId}
Status: COMPLETED
Date: ${date}

--------------------------------
Thank you for using ElectriTrack!
Keep this receipt for your records.

Generated on: ${new Date().toLocaleString()}
        `;

        // Create downloadable file
        const blob = new Blob([receiptContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `ElectriTrack_Receipt_${transactionId}.txt`;
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Show success message
        setTimeout(() => {
            alert('Receipt downloaded successfully! Check your downloads folder.');
        }, 100);
    }

    // Make downloadReceipt globally accessible
    window.downloadReceipt = function() {
        alert('Please complete a payment first to download a receipt.');
    };

    function generateTransactionId() {
        // Generate realistic transaction ID similar to the example
        const prefix = 'TXN';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const suffix = Math.random().toString(36).substring(2, 3).toUpperCase();
        return `${prefix}${timestamp}${random}${suffix}`;
    }

    function showPaymentSuccess() {
        const successElement = document.getElementById('payment-success');
        successElement.classList.remove('hidden');
        
        // Hide after 3 seconds
        setTimeout(() => {
            successElement.classList.add('hidden');
        }, 3000);
    }

    // Real-time amount formatting
    const amountInput = document.getElementById('amount');
    amountInput.addEventListener('input', (e) => {
        let value = e.target.value;
        if (value && !isNaN(value)) {
            // Format to 2 decimal places when user stops typing
            setTimeout(() => {
                if (document.activeElement !== e.target) {
                    e.target.value = parseFloat(value).toFixed(2);
                }
            }, 1000);
        }
    });
    
    // Setup bill status and calendar, then bill history
    setupBillStatus();
    setupBillHistory();
}

// Utility function to format currency
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

// Save bill to history (no longer used - payments saved via simulatePayment)
async function saveBillToHistory(billData) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const billHistoryRef = ref(database, `bill_history/${user.uid}`);
        const newBillRef = push(billHistoryRef);
        
        await set(newBillRef, {
            ...billData,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            status: 'completed',
            paymentStatus: false,
            userId: user.uid
        });
        
        console.log('Bill saved to history');
        await loadBillHistory();
    } catch (error) {
        console.error('Error saving bill:', error);
    }
}

// Load payment history
async function loadBillHistory() {
    const user = auth.currentUser;
    if (!user) {
        document.getElementById('bill-history-list').innerHTML = '<p style="text-align: center; color: #666;">Please sign in to view payment history</p>';
        return;
    }
    
    try {
        // Get user's phone number from profile
        let phoneNumber = null;
        try {
            const profileRef = ref(database, `users/${user.uid}/profile`);
            const profileSnapshot = await get(profileRef);
            if (profileSnapshot.exists()) {
                phoneNumber = profileSnapshot.val().phone?.trim();
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
        
        // Fallback to other methods if phone not found in profile
        if (!phoneNumber) {
            phoneNumber = user.phoneNumber || user.email?.replace('@', '_').replace('.', '_') || user.uid;
        }
        
        // Ensure phoneNumber has +63 prefix
        if (phoneNumber && !phoneNumber.startsWith('+63')) {
            phoneNumber = '+63' + phoneNumber;
        }
        
        // Read from devices/{phoneNumber}/paymentHistory path
        const paymentHistoryRef = ref(database, `devices/${phoneNumber}/paymentHistory`);
        const snapshot = await get(paymentHistoryRef);
        
        const historyList = document.getElementById('bill-history-list');
        
        if (!snapshot.exists()) {
            historyList.innerHTML = '<p style="text-align: center; color: #666;">No payment history yet</p>';
            return;
        }
        
        const payments = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            payments.push({ 
                timestamp: childSnapshot.key, 
                phoneNumber: phoneNumber,
                ...data 
            });
        });
        
        // Sort by timestamp (newest first)
        payments.sort((a, b) => b.timestamp - a.timestamp);
        
        // Display payments
        historyList.innerHTML = payments.map(payment => {
            const statusColor = payment.status === 'Paid' ? '#10b981' : '#f59e0b';
            const statusIcon = payment.status === 'Paid' ? '✓' : '⏳';
            
            // Get transaction ID from the correct field name
            const transactionId = payment.transaction_id || 'N/A';
            
            return `
            <div class="bill-history-item" style="
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s;
            ">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1e3c72; margin-bottom: 0.25rem;">
                        ${new Date(parseInt(payment.timestamp)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">
                        ⚡ kWh: ${payment.kwhConsumed || 0}
                    </div>
                    ${transactionId !== 'N/A' ? `
                    <div style="font-size: 0.75rem; color: #888; font-family: monospace;">
                        ID: ${transactionId}
                    </div>
                    ` : ''}
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                    <span style="
                        background: ${statusColor};
                        color: white;
                        padding: 0.25rem 0.75rem;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        font-weight: 600;
                    ">${statusIcon} ${payment.status}</span>
                    <button onclick="clearIndividualHistory('${phoneNumber}', '${payment.timestamp}')" style="
                        background: #ef4444;
                        color: white;
                        border: none;
                        padding: 0.4rem 0.75rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.8rem;
                    ">🗑️ Delete</button>
                </div>
            </div>
        `}).join('');
        
    } catch (error) {
        console.error('Error loading bill history:', error);
        document.getElementById('bill-history-list').innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading history</p>';
    }
}

// Download bill history
async function downloadBillHistory() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please sign in to download history');
        return;
    }
    
    try {
        const billHistoryRef = ref(database, `bill_history/${user.uid}`);
        const snapshot = await get(billHistoryRef);
        
        if (!snapshot.exists()) {
            alert('No payment history to download');
            return;
        }
        
        const bills = [];
        snapshot.forEach((childSnapshot) => {
            bills.push(childSnapshot.val());
        });
        
        bills.sort((a, b) => b.timestamp - a.timestamp);
        
        let csvContent = 'Date,Amount,Payment Method,Status\n';
        bills.forEach(bill => {
            csvContent += `${new Date(bill.date).toLocaleDateString()},${bill.amount},${bill.paymentMethod},${bill.status}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ElectriTrack_BillHistory_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        alert('Bill history downloaded successfully!');
    } catch (error) {
        console.error('Error downloading history:', error);
        alert('Error downloading history');
    }
}

// Setup bill status card with calendar toggle
export async function setupBillStatus() {
    const toggleCalendarBtn = document.getElementById('toggle-calendar-btn');
    const monthlyCalendar = document.getElementById('monthly-calendar');
    const billStatusText = document.getElementById('bill-status-text');
    const user = auth.currentUser;
    
    if (!user) {
        billStatusText.textContent = 'Please sign in to view bill status';
        return;
    }
    
    try {
        // Get user's phone number from profile
        let phoneNumber = null;
        try {
            const profileRef = ref(database, `users/${user.uid}/profile`);
            const profileSnapshot = await get(profileRef);
            if (profileSnapshot.exists()) {
                phoneNumber = profileSnapshot.val().phone?.trim();
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
        
        // Fallback to other methods if phone not found in profile
        if (!phoneNumber) {
            phoneNumber = user.phoneNumber || user.email?.replace('@', '_').replace('.', '_') || user.uid;
        }
        
        // Ensure phoneNumber has +63 prefix
        if (phoneNumber && !phoneNumber.startsWith('+63')) {
            phoneNumber = '+63' + phoneNumber;
        }
        
        // Load all devices under the phone number
        const devicesRef = ref(database, `devices/${phoneNumber}`);
        const devicesSnapshot = await get(devicesRef);
        
        let currentMonthStatus = 'Not Paid';
        let currentMonthColor = '#ef4444'; // Red for not paid
        let currentMonthIcon = '✗';
        
        const currentDate = new Date();
        const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format
        
        // Initialize payment history for all months
        window.paymentHistory = [];
        window.currentPhoneNumber = phoneNumber;
        
        if (devicesSnapshot.exists()) {
            const devicesData = devicesSnapshot.val();
            
            // Check payment status directly from phone number data (not from meter)
            if (devicesData.payment && devicesData.payment.toLowerCase() === 'paid') {
                currentMonthStatus = 'Paid ✓';
                currentMonthColor = '#10b981'; // Green for paid
                currentMonthIcon = '✓';
                
                // Store current month as paid for calendar
                window.paymentHistory.push({
                    date: currentMonth,
                    status: 'Paid'
                });
            }
            
            // Find first meter number for reference (if needed)
            for (const meterNumber in devicesData) {
                if (typeof devicesData[meterNumber] === 'object' && !meterNumber.startsWith('_') && meterNumber !== 'payment' && meterNumber !== 'transaction_id') {
                    window.currentMeterNumber = meterNumber;
                    break;
                }
            }
        }
        
        // Update bill status display
        billStatusText.innerHTML = `
            <div style="padding: 0.5rem; background: rgba(255,255,255,0.1); border-radius: 6px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${currentMonthIcon}</div>
                <div style="font-size: 1.1rem; font-weight: 600;">November Status: <span style="color: ${currentMonthColor};">${currentMonthStatus}</span></div>
            </div>
        `;
        
        // Setup calendar toggle button with both click and touch support
        if (toggleCalendarBtn) {
            const handleToggleCalendar = (e) => {
                e.preventDefault();
                if (monthlyCalendar.style.display === 'none') {
                    monthlyCalendar.style.display = 'block';
                    toggleCalendarBtn.textContent = '📅 Hide Calendar';
                    renderMonthlyCalendar(currentDate.getFullYear(), currentDate.getMonth());
                } else {
                    monthlyCalendar.style.display = 'none';
                    toggleCalendarBtn.textContent = '📅 Show Calendar';
                }
            };
            toggleCalendarBtn.addEventListener('click', handleToggleCalendar);
            toggleCalendarBtn.addEventListener('touchend', handleToggleCalendar);
        }
    } catch (error) {
        console.error('Error loading bill status:', error);
        billStatusText.textContent = 'Error loading bill status';
    }
}

// Render monthly calendar with payment status
function renderMonthlyCalendar(year, month) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const calendarContent = document.getElementById('calendar-content');
    let html = `<h4 style="margin: 0 0 1.5rem 0; color: white; text-align: center;">Payment Status - ${year}</h4>`;
    html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">';
    
    // Display all 12 months
    for (let m = 0; m < 12; m++) {
        const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
        let paymentStatus = 'No Data';
        let bgColor = 'rgba(255,255,255,0.1)'; // Gray for no data
        let icon = '○';
        let hasData = false;
        
        // Check if this month has payment history
        if (window.paymentHistory) {
            const payment = window.paymentHistory.find(p => p.date === monthStr);
            if (payment) {
                hasData = true;
                if (payment.status === 'Paid') {
                    paymentStatus = 'Paid';
                    bgColor = '#10b981'; // Green for paid
                    icon = '✓';
                }
            }
        }
        
        html += `
            <div style="
                background: ${bgColor};
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
                color: white;
                transition: transform 0.2s ease;
            ">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">${icon}</div>
                <div style="font-weight: 600; margin-bottom: 0.3rem;">${monthNames[m]}</div>
                <div style="font-size: 0.9rem; opacity: 0.9;">${paymentStatus}</div>
            </div>
        `;
    }
    
    html += '</div>';
    calendarContent.innerHTML = html;
}

// Setup download history button
export function setupBillHistory() {
    const downloadBtn = document.getElementById('download-history-btn');
    const clearAllBtn = document.getElementById('clear-all-history-btn');
    
    if (downloadBtn) {
        const handleDownload = (e) => {
            e.preventDefault();
            downloadBillHistory();
        };
        downloadBtn.addEventListener('click', handleDownload);
        downloadBtn.addEventListener('touchend', handleDownload);
    }
    
    if (clearAllBtn) {
        const handleClearAll = (e) => {
            e.preventDefault();
            clearAllHistory();
        };
        clearAllBtn.addEventListener('click', handleClearAll);
        clearAllBtn.addEventListener('touchend', handleClearAll);
    }
    
    loadBillHistory();
}

// Make print function global
window.printBillReceipt = async function(billId) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const billRef = ref(database, `bill_history/${user.uid}/${billId}`);
        const snapshot = await get(billRef);
        
        if (snapshot.exists()) {
            const bill = snapshot.val();
            const receiptContent = `
==================================
        ELECTRITRACK
    Electric Bill Receipt
==================================

Date: ${new Date(bill.date).toLocaleDateString()}
Amount: ${formatCurrency(bill.amount)}
Payment Method: ${bill.paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}
Status: ${bill.status.toUpperCase()}

Meter Number: ${bill.accountNumber}
Customer: ${bill.customerName}

==================================
    Thank you for your payment!
==================================
            `;
            
            const printWindow = window.open('', '', 'height=600,width=400');
            printWindow.document.write('<html><head><title>Receipt</title>');
            printWindow.document.write('<style>body { font-family: monospace; white-space: pre; padding: 20px; }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(receiptContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        }
    } catch (error) {
        console.error('Error printing receipt:', error);
        alert('Error printing receipt');
    }
}

// Clear individual payment history
window.clearIndividualHistory = async function(phoneNumber, timestamp) {
    if (!confirm('Are you sure you want to delete this payment record?')) {
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please sign in to delete payment history');
        return;
    }
    
    try {
        // Delete from devices/{phoneNumber}/paymentHistory/{timestamp} path
        const paymentRef = ref(database, `devices/${phoneNumber}/paymentHistory/${timestamp}`);
        await set(paymentRef, null); // Delete the entry
        
        console.log('Payment record deleted');
        await loadBillHistory(); // Reload the list
        
        // Show success message
        alert('Payment record deleted successfully');
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error deleting payment record. Please try again.');
    }
}

// Clear all payment history
async function clearAllHistory() {
    if (!confirm('Are you sure you want to delete ALL payment records? This action cannot be undone!')) {
        return;
    }
    
    // Double confirmation for critical action
    if (!confirm('This will permanently delete all your payment history. Are you absolutely sure?')) {
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please sign in to clear payment history');
        return;
    }
    
    try {
        // Get user's phone number from profile
        let phoneNumber = null;
        try {
            const profileRef = ref(database, `users/${user.uid}/profile`);
            const profileSnapshot = await get(profileRef);
            if (profileSnapshot.exists()) {
                phoneNumber = profileSnapshot.val().phone?.trim();
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
        
        // Fallback to other methods if phone not found in profile
        if (!phoneNumber) {
            phoneNumber = user.phoneNumber || user.email?.replace('@', '_').replace('.', '_') || user.uid;
        }
        
        // Ensure phoneNumber has +63 prefix
        if (phoneNumber && !phoneNumber.startsWith('+63')) {
            phoneNumber = '+63' + phoneNumber;
        }
        
        // Delete from devices/{phoneNumber}/paymentHistory path
        const paymentHistoryRef = ref(database, `devices/${phoneNumber}/paymentHistory`);
        await set(paymentHistoryRef, null); // Delete all entries
        
        console.log('All payment records deleted');
        await loadBillHistory(); // Reload the list
        
        // Show success message
        alert('All payment records deleted successfully');
    } catch (error) {
        console.error('Error clearing all payments:', error);
        alert('Error clearing payment history. Please try again.');
    }
}