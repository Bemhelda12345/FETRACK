// Payment System for ElectriTrack
// Handles bill payment with QR code generation and payment method selection

export function renderPaymentSection() {
    return `
        <div class="payment-container">
            <div class="payment-header">
                <h2>⚡ Bill Payment System</h2>
                <p>Pay your bills easily with PayMaya and GCash</p>
            </div>
            
            <div class="payment-content">
                <div class="payment-form-section">
                    <div class="form-card compact-card">
                        <h3 class="compact-title">📋 Bill Information</h3>
                        <p class="form-subtitle compact-subtitle">Enter your bill details to generate payment QR code</p>
                        
                        <form id="payment-form" class="payment-form compact-form">
                             <div class="form-group">
                                <label for="bill-type">Bill Type</label>
                                <select id="bill-type" required>
                                    <option value="electric" selected>⚡ Electric Bill</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="account-number">Meter Number</label>
                                <input type="text" id="account-number" placeholder="Enter meter number" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="customer-name">Customer Name</label>
                                <input type="text" id="customer-name" placeholder="Enter customer name" required>
                            </div>
                            
                             <div class="form-group">
                                <label for="amount">Amount (PHP)</label>
                                <input type="number" id="amount" placeholder="0.00" step="0.01" min="0" required>
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
                            
                            <button type="submit" class="generate-qr-btn">Generate Payment QR Code</button>
                        </form>
                    </div>
                </div>
                
                 <div class="qr-section">
                    <div class="qr-card">
                        <h3>📱 Payment QR Code</h3>
                        <p class="qr-subtitle">Scan the QR code with your selected payment app</p>
                        
                        <div id="qr-display" class="qr-display">
                            <div class="qr-placeholder">
                                <div class="qr-icon">📱</div>
                                <p>QR Code will appear here</p>
                                <span>Fill in bill details and select payment method to generate QR code</span>
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
        </div>
    `;
}

export function initializePaymentSystem() {
    // Add CSS for compact bill information card and QR code
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

    // Payment method selection
    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all options
            paymentOptions.forEach(opt => opt.classList.remove('active'));
            // Add active class to selected option
            option.classList.add('active');
            
            // Update selected payment method
            selectedPaymentMethod = option.id.replace('-option', '');
            
            // Regenerate QR code if we have bill data
            if (currentBillData) {
                generateQRCode();
            }
        });
    });

     // Set default selection
    document.getElementById('gcash-option').classList.add('active');
    
    // Set default bill type to electric
    document.getElementById('bill-type').value = 'electric';

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
                <div class="qr-code-visual">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=ElectriTrack-Payment-${paymentMethodName}-${billData.accountNumber}-${billData.amount}" 
                         alt="QR Code for ${paymentMethodName} payment" 
                         class="qr-code-image">
                </div>
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
                        Scan this QR code using your ${paymentMethodName} app and enter the amount to pay
                    </p>
                    <button class="simulate-payment-btn" id="simulate-btn">
                        Simulate Payment Complete
                    </button>
                </div>
            </div>
         `;
        
        // Add event listener to simulate button
        setTimeout(() => {
            const simulateBtn = document.getElementById('simulate-btn');
            if (simulateBtn) {
                simulateBtn.addEventListener('click', () => simulatePayment());
            }
        }, 100);
    }

    function simulatePayment() {
        if (!currentBillData) return;
        
        const paymentMethodName = currentBillData.paymentMethod === 'gcash' ? 'GCash' : 'PayMaya';
        const billTypeDisplay = currentBillData.billType.charAt(0).toUpperCase() + currentBillData.billType.slice(1);
        
        // Generate transaction ID
        const transactionId = generateTransactionId();
        
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
                        <h2>Payment Successful!</h2>
                    </div>
                    <p class="success-message">
                        Your ${billTypeDisplay} Bill payment of ₱${currentBillData.amount.toFixed(2)} has been processed successfully.
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
                            <span class="receipt-label">Status:</span>
                            <span class="receipt-value status-completed">COMPLETED</span>
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
                    </div>
                </div>
                
                <div class="receipt-footer">
                    <p>Thank you for using ElectriTrack Payment System!</p>
                    <p>Keep this receipt for your records.</p>
                </div>
             </div>
        `;
        
        // Add event listeners to receipt buttons
        setTimeout(() => {
            const anotherPaymentBtn = document.getElementById('another-payment-btn');
            const downloadBtn = document.getElementById('download-receipt-btn');
            
            if (anotherPaymentBtn) {
                anotherPaymentBtn.addEventListener('click', () => {
                    // Instead of reloading, render the payment form again
                    container.innerHTML = renderPaymentSection();
                    // Re-initialize the payment system
                    setTimeout(() => {
                        initializePaymentSystem();
                    }, 100);
                });
            }
            
             if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    downloadReceipt(currentBillData, paymentMethodName, transactionId, currentDate);
                });
            }
        }, 100);
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
}

// Utility function to format currency
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}