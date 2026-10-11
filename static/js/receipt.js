/**
 * DS Maintenance Suite - 80mm & 58mm POS Thermal Receipt & Printer Engine
 */

window.DSReceipt = {
  renderGasReceipt: function(deliveryData, buildingData, viewMode = 'customer') {
    const cp = window.State?.companyProfile || {};
    const companyName = cp.company_name || "DS MAINTENANCE";
    const helpline = cp.helpline_phone || "+92 21 111-DS-MAINT";

    const d = deliveryData || window.CurrentGasReceiptData || {};
    const isNewPurchase = d.transaction_type === 'NEW_PURCHASE';
    const itemDesc = isNewPurchase ? 'LPG 45.4 KG Cylinder Bottle + Gas (New Purchase)' : 'LPG 45.4 KG Gas Cylinder (Refill Exchange)';

    const bName = buildingData?.name || (d.building_name || "AQ HEIGHTS");
    const bAddress = buildingData?.address || (d.building_address || (cp.office_address || "Plot A-19, Jinnah Avenue BTK"));
    const recNum = d.receipt_number || "REC-GAS-20260816-9B21";
    const flatNum = d.flat_number || "---";
    const dateStr = d.delivery_date ? d.delivery_date.split(' ')[0] : new Date().toISOString().slice(0, 10);
    const qty = Number(d.quantity) || 1;
    const unitPriceNum = parseFloat(d.unit_price || 3500);
    const unitPrice = unitPriceNum.toLocaleString();
    const totalAmountNum = parseFloat(d.total_amount || (qty * unitPriceNum));
    const totalAmount = totalAmountNum.toLocaleString();
    const payMode = d.payment_mode === 'HAND_CASH' ? 'HAND CASH' : 'ONLINE BANK TRANSFER';
    const receptionist = d.receptionist_name || (window.State?.currentUser?.full_name || 'Master System Administrator');

    const refillCostPerCylinder = parseFloat(d.refill_purchase_cost || 2800);
    const totalCostNum = qty * refillCostPerCylinder;
    const totalCost = totalCostNum.toLocaleString();
    const netProfitNum = totalAmountNum - totalCostNum;
    const netProfit = netProfitNum.toLocaleString();

    const isOfficeCopy = (viewMode === 'office');
    const titleText = isOfficeCopy ? '🏢 OFFICE INTERNAL AUDIT & PROFIT VOUCHER' : '🔥 CLIENT GAS DELIVERY RECEIPT';

    const residentName = d.tenant_name || (d.occupancy_mode === 'Owner Occupied' ? d.owner_name : (d.customer_name || 'Resident'));
    const residentPhone = d.tenant_phone || (d.occupancy_mode === 'Owner Occupied' ? d.owner_phone : (d.customer_phone || ''));
    const custDisplay = residentPhone ? `${residentName.toUpperCase()} (${residentPhone})` : residentName.toUpperCase();

    return `
      <div class="thermal-receipt-container">
        <div class="thermal-header">
          <div class="thermal-logo">${companyName}</div>
          <div class="thermal-sub" style="font-weight: 800; text-transform: uppercase;">${bName}</div>
          <div class="thermal-sub">${bAddress}</div>
          <div class="thermal-sub">Helpline: ${helpline}</div>
          <div style="margin-top: 6px; font-weight: 800; font-size: 10.5px; text-transform: uppercase; border: 1.5px solid #000; padding: 2px 8px; display: inline-block;">
            ${titleText}
          </div>
        </div>

        <div class="thermal-divider"></div>

        <div class="thermal-row">
          <span>Receipt Number:</span>
          <span style="font-weight: 800;">${recNum}</span>
        </div>
        <div class="thermal-row">
          <span>Delivery Date:</span>
          <span>${dateStr}</span>
        </div>
        <div class="thermal-row">
          <span>Location / Unit:</span>
          <span style="font-weight: 900; font-size: 13px;">FLAT ${flatNum}</span>
        </div>
        <div class="thermal-row">
          <span>Customer:</span>
          <span style="font-weight: 700;">${custDisplay}</span>
        </div>
        <div class="thermal-row">
          <span>Transaction:</span>
          <span style="font-weight: 700;">${isNewPurchase ? 'New Bottle Purchase' : 'Gas Refill Exchange'}</span>
        </div>

        <div class="thermal-divider"></div>

        <div style="font-size: 11px; margin: 3px 0;">
          <div style="font-weight: 800;">Item / Order:</div>
          <div style="margin-top: 2px; color: #111;">${itemDesc}</div>
        </div>

        <div class="thermal-divider"></div>

        <div class="thermal-row">
          <span>Delivered Quantity:</span>
          <span>${qty} Cylinder(s)</span>
        </div>
        <div class="thermal-row">
          <span>Resident Rate:</span>
          <span>PKR ${unitPrice} / Cyl</span>
        </div>

        ${isOfficeCopy ? `
        <div class="thermal-divider"></div>
        <div class="thermal-row" style="color: #333;">
          <span>Refinery Purchase Cost:</span>
          <span>PKR ${totalCost} (${qty} x PKR ${refillCostPerCylinder.toLocaleString()})</span>
        </div>
        <div class="thermal-row" style="font-weight: 800; color: #047857;">
          <span>NET COMMERCIAL PROFIT:</span>
          <span>+ PKR ${netProfit}</span>
        </div>
        ` : ''}

        <div class="thermal-divider"></div>

        <div class="thermal-row thermal-total">
          <span>TOTAL BILLED:</span>
          <span style="font-size: 14.5px;">PKR ${totalAmount}</span>
        </div>
        <div class="thermal-row">
          <span>Payment Mode:</span>
          <span style="font-weight: 800;">${payMode}</span>
        </div>
        <div class="thermal-row">
          <span>Payment Status:</span>
          <span style="font-weight: 800;">PAID & DELIVERED</span>
        </div>

        <div class="thermal-divider"></div>

        <div class="thermal-footer">
          <div>Desk Operator: <strong>${receptionist}</strong></div>
          <div style="margin-top: 4px; font-weight: 800; letter-spacing: 0.5px;">
            ${isOfficeCopy ? 'INTERNAL OFFICE ACCOUNTS & AUDIT COPY' : 'THANK YOU FOR CHOOSING DS SERVICES'}
          </div>
          <div style="margin-top: 2px;">Official Computerized Cash/Payment Receipt</div>
        </div>
      </div>
    `;
  },

  renderRepairReceipt: function(jobData, buildingData, viewMode = 'customer') {
    const cp = window.State?.companyProfile || {};
    const companyName = cp.company_name || "DS MAINTENANCE";
    const helpline = cp.helpline_phone || "+92 21 111-DS-MAINT";

    const j = jobData || window.CurrentRepairReceiptData || {};
    const bName = buildingData?.name || (j.building_name || "AQ HEIGHTS");
    const bAddress = buildingData?.address || (j.building_address || (cp.office_address || "Plot A-19, Jinnah Avenue BTK"));
    const recNum = j.receipt_number || ('REC-JOB-' + (j.id ? j.id.slice(0, 6).toUpperCase() : '1A95'));
    const flatNum = j.flat_number || "---";
    const dateStr = j.job_date || new Date().toISOString().slice(0, 10);
    const billed = parseFloat(j.billed_amount || 0).toLocaleString();
    const parts = parseFloat(j.parts_cost || 0).toLocaleString();
    const labor = parseFloat(j.labor_cost || 0).toLocaleString();
    const netProfit = (parseFloat(j.billed_amount || 0) - (parseFloat(j.parts_cost || 0) + parseFloat(j.labor_cost || 0))).toLocaleString();
    const payMode = j.payment_mode === 'HAND_CASH' ? 'HAND CASH' : 'ONLINE BANK TRANSFER';
    const tech = j.assigned_technician || 'RAHOOL';
    const custName = j.customer_name ? j.customer_name.toUpperCase() : `FLAT ${flatNum} RESIDENT`;
    const custPhone = j.customer_phone ? `(${j.customer_phone})` : '';
    const custDisplay = `${custName} ${custPhone}`.trim();
    const receptionist = j.receptionist_name || (window.State?.currentUser?.full_name || 'Master System Administrator');

    const isOfficeCopy = (viewMode === 'office');
    const titleText = isOfficeCopy ? '🏢 OFFICE INTERNAL AUDIT & PROFIT VOUCHER' : '🛠️ CLIENT SERVICE & PAYMENT RECEIPT';

    return `
      <div class="thermal-receipt-container">
        <div class="thermal-header">
          <div class="thermal-logo">${companyName}</div>
          <div class="thermal-sub" style="font-weight: 800; text-transform: uppercase;">${bName}</div>
          <div class="thermal-sub">${bAddress}</div>
          <div class="thermal-sub">Helpline: ${helpline}</div>
          <div style="margin-top: 6px; font-weight: 800; font-size: 10.5px; text-transform: uppercase; border: 1.5px solid #000; padding: 2px 8px; display: inline-block;">
            ${titleText}
          </div>
        </div>

        <div class="thermal-divider"></div>

        <div class="thermal-row">
          <span>Receipt Number:</span>
          <span style="font-weight: 800;">${recNum}</span>
        </div>
        <div class="thermal-row">
          <span>Service Date:</span>
          <span>${dateStr}</span>
        </div>
        <div class="thermal-row">
          <span>Location / Unit:</span>
          <span style="font-weight: 900; font-size: 13px;">FLAT ${flatNum}</span>
        </div>
        <div class="thermal-row">
          <span>Customer:</span>
          <span style="font-weight: 700;">${custDisplay}</span>
        </div>
        <div class="thermal-row">
          <span>Category:</span>
          <span style="font-weight: 800;">${j.category || 'General Maintenance'}</span>
        </div>
        <div class="thermal-row">
          <span>Technician:</span>
          <span style="font-weight: 700;">${tech}</span>
        </div>

        <div class="thermal-divider"></div>

        <div style="font-size: 11px; margin: 3px 0;">
          <div style="font-weight: 800;">Work Order / Service Description:</div>
          <div style="margin-top: 2px; color: #111;">${j.issue_description || 'Maintenance and technical facility service completed.'}</div>
        </div>

        ${isOfficeCopy ? `
        <div class="thermal-divider"></div>
        <div class="thermal-row" style="color: #333;">
          <span>Materials & Parts Cost:</span>
          <span>PKR ${parts}</span>
        </div>
        <div class="thermal-row" style="color: #333;">
          <span>Labour / Technical Cost:</span>
          <span>PKR ${labor}</span>
        </div>
        <div class="thermal-row" style="font-weight: 800; color: #047857;">
          <span>NET PROFIT MARGIN:</span>
          <span>+ PKR ${netProfit}</span>
        </div>
        ` : ''}

        <div class="thermal-divider"></div>

        <div class="thermal-row thermal-total">
          <span>TOTAL PAYMENT:</span>
          <span style="font-size: 14.5px;">PKR ${billed}</span>
        </div>
        <div class="thermal-row">
          <span>Payment Mode:</span>
          <span style="font-weight: 800;">${payMode}</span>
        </div>
        <div class="thermal-row">
          <span>Payment Status:</span>
          <span style="font-weight: 800;">PAID & COMPLETED</span>
        </div>

        <div class="thermal-divider"></div>

        <div class="thermal-footer">
          <div>Desk Operator: <strong>${receptionist}</strong></div>
          <div style="margin-top: 4px; font-weight: 800; letter-spacing: 0.5px;">
            ${isOfficeCopy ? 'INTERNAL OFFICE ACCOUNTS & AUDIT COPY' : 'THANK YOU FOR CHOOSING DS SERVICES'}
          </div>
          <div style="margin-top: 2px;">Official Computerized Cash/Payment Receipt</div>
        </div>
      </div>
    `;
  },

  triggerThermalPrint: function(htmlContent) {
    if (window.DSSound) window.DSSound.playClick();
    let container = document.getElementById('printableReceiptContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'printableReceiptContainer';
      document.body.appendChild(container);
    }
    container.innerHTML = htmlContent;
    document.body.classList.add('is-printing-thermal');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('is-printing-thermal');
      }, 500);
    }, 120);
  },

  printReceipt: function(deliveryData, viewMode = null) {
    const d = deliveryData || window.CurrentGasReceiptData || {};
    const curB = window.CurrentGasReceiptBuilding || window.State?.currentBuilding;
    const mode = viewMode || window.CurrentGasReceiptViewMode || 'customer';
    const html = this.renderGasReceipt(d, curB, mode);
    this.triggerThermalPrint(html);
  },

  printRepairReceipt: function(jobData, viewMode = null) {
    const j = jobData || window.CurrentRepairReceiptData || {};
    const curB = window.CurrentRepairReceiptBuilding || window.State?.currentBuilding;
    const mode = viewMode || window.CurrentRepairReceiptViewMode || 'customer';
    const html = this.renderRepairReceipt(j, curB, mode);
    this.triggerThermalPrint(html);
  }
};
