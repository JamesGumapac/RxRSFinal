/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search) => {
  const SUBLIST_TO_HIDE_IN_RCL = [
    "custpage_internalid",
    "custpage_verified",
    //"custpage_mfgprocessing",
    "custpage_bag_tag_label",
    "custpage_nonreturnable_reason",
    "custpage_settononreturnable",
  ];
  const SUBLIST_TO_ENTRY = [
    "custpage_nonreturnable_reason",
    "custpage_amount",
    "custpage_settononreturnable",
  ];

  /**
   * Get customer information
   * @param {number} customerId
   */
  function getCustomerInfo(customerId) {
    try {
      let customerInfo = {};
      const entitySearchObj = search.create({
        type: "entity",
        filters: [["internalid", "anyof", customerId]],
        columns: [
          search.createColumn({ name: "altname", label: "Name" }),
          search.createColumn({ name: "address1", label: "Address 1" }),
          search.createColumn({ name: "state", label: "State/Province" }),
          search.createColumn({ name: "zipcode", label: "Zip Code" }),
          search.createColumn({
            name: "custentity_mfgprimarycontact",
            label: "Manufacturer Primary Contact",
          }),
          search.createColumn({ name: "phone", label: "Phone" }),
          search.createColumn({ name: "fax", label: "Fax" }),
          search.createColumn({
            name: "custentity_kd_license_number",
            label: "DEA License #",
          }),
        ],
      });
      entitySearchObj.run().each(function (result) {
        customerInfo.name = result.getValue("altname");
        customerInfo.addr1 = result.getValue("address1");
        customerInfo.state = result.getValue("state");
        customerInfo.zipcode = result.getValue("zipcode");
        customerInfo.contact = result.getValue("custentity_mfgprimarycontact");
        customerInfo.phone = result.getValue("phone");
        customerInfo.fax = result.getValue("fax");
        customerInfo.dea = result.getValue("custentity_kd_license_number");
        return true;
      });
      return customerInfo;
    } catch (e) {
      log.error("getCustomerInfo", e.message);
    }
  }

  /**
   * Get the returnable and non-returnable total amount
   * @param {number} options.rrId - return request Id
   * @return {number} total amount
   */
  function getItemReturnScanTotal(options) {
    let { rrId } = options;
    let totalAmount = [];

    try {
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [
          ["custrecord_cs_ret_req_scan_rrid", "anyof", rrId],
          "AND",
          ["custrecord_cs__rqstprocesing", "anyof", "1", "2"],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_irc_total_amount",
            summary: "SUM",
            label: "Amount",
          }),
          search.createColumn({
            name: "custrecord_cs__mfgprocessing",
            summary: "GROUP",
            label: "Mfg Processing",
          }),
        ],
      });

      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        let amount = result.getValue({
          name: "custrecord_irc_total_amount",
          summary: "SUM",
        });

        totalAmount.push(amount);
        return true;
      });

      return {
        nonReturnableAmount: totalAmount[0],
        returnableAmount: totalAmount[1],
      };
    } catch (e) {
      log.error("getItemReturnScanTotal: ", e.message);
    }
  }

  /**
   * Create custom payment Schedule
   * @param {string} options.paymentName
   * @param {string} options.dueDate
   * @param {number} options.minDays
   * @param {number} options.maxDays
   */
  function createPaymentSched(options) {
    let { paymentName, dueDate, minDays, maxDays } = options;
    try {
      const paymentRec = record.create({
        type: "customrecord_kd_payment_schedule",
      });
      paymentName &&
        paymentRec.setValue({
          fieldId: "name",
          value: paymentName,
        });
      dueDate &&
        paymentRec.setValue({
          fieldId: "custrecord_psf_due_date",
          value: dueDate,
        });
      minDays &&
        paymentRec.setValue({
          fieldId: "custrecord_kd_paysched_min_days",
          value: minDays,
        });
      maxDays &&
        paymentRec.setValue({
          fieldId: "custrecord_kd_paysched_max_days",
          value: maxDays,
        });

      paymentRec.setValue({
        fieldId: "custrecord_psf_custom_payment",
        value: true,
      });
      return paymentRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("createPaymentSched", e.message);
    }
  }

  /**
   * Get the Customer total Credit amount
   * @param {number}rrId
   * @return {currency} return the sum of the item return scan with Payment Sched
   */
  function getCustomerTotalCreditAmount(rrId) {
    let totalAmount = 0;
    try {
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [
          ["custrecord_cs_ret_req_scan_rrid", "anyof", rrId],
          "AND",
          ["custrecord_scan_paymentschedule", "noneof", "@NONE@"],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_wac_amount",
            summary: "SUM",
            label: "Amount",
          }),
        ],
      });

      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        totalAmount = result.getValue({
          name: "custrecord_wac_amount",
          summary: "SUM",
        });
        log.error("totalAmount", totalAmount);
      });
      return totalAmount;
    } catch (e) {
      log.error("getCustomerTotalCreditAmount", e.message);
    }
  }

  /**
   * Hide Sublist
   *@param {array}options.sublistToHide - list of sublist to hide
   *@param {array}options.sublist - orignal sublist
   *@param {boolean}options.showSelect
   * @return {array} return sublist with hidden fields
   */
  function hideSublist(options) {
    try {
      let { sublistToHide, sublist, showSelect } = options;
      sublistToHide.forEach((id) => {
        const index = sublist.findIndex((object) => {
          return object.id === id;
        });
        if (index !== -1) {
          if (showSelect === true && id == "custpage_verified") {
            sublist[index].label = "SELECT";
          } else {
            sublist[index].updateDisplayType = "HIDDEN";
          }
        }
      });
      return sublist;
    } catch (e) {
      log.error("hideSublist", e.message);
    }
  }

  /**
   * Set Type to Entry
   *@param {array}options.sublistToEntry - list of sublist to e
   *@param {array}options.sublist - orignal sublist
   *@param {boolean}options.showSelect
   * @return {array} return sublist with hidden fields
   */
  function setSublistToEntry(options) {
    log.audit("setSublistToEntry", options);
    try {
      let { sublistToEntry, sublist, showSelect } = options;
      sublistToEntry.forEach((id) => {
        const index = sublist.findIndex((object) => {
          return object.id === id;
        });
        if (index !== -1) {
          if (showSelect === true && id == "custpage_verified") {
            sublist[index].label = "SELECT";
          } else {
            sublist[index].updateDisplayType = "ENTRY";
          }
        }
      });
      return sublist;
    } catch (e) {
      log.error("setSublistToEntry", e.message);
    }
  }

  /**
   * Get the payment name using
   * @param {string} paymentLink
   */
  function getPaymentId(paymentLink) {
    try {
      let paymentId;
      paymentId = paymentLink.split("&");
      paymentId = paymentId[3];
      paymentId = paymentId.split("=");
      paymentId = paymentId[1].replaceAll("+", " ");
      // log.debug("paymentName", paymentId);
      return paymentId;
    } catch (e) {
      log.error("getPaymentId", e.message);
    }
  }

  /**
   * Update the return cover letter record
   * @param masterReturnId
   */
  function updateReturnCoverRecord(masterReturnId) {
    try {
      search
        .create({
          type: "customrecord_return_cover_letter",
          filters: [["custrecord_rcl_master_return", "anyof", masterReturnId]],
        })
        .run()
        .getRange(0, 1000)
        .map((r) => {
          const rclRec = record.load({
            type: "customrecord_return_cover_letter",
            id: r.id,
            isDynamic: true,
          });
          rclRec.save({ ignoreMandatoryFields: true });
        });
    } catch (e) {
      log.error("updateReturnCoverRecord", e.message);
    }
  }

  /**
   * Get the return cover letter record
   * @param masterReturnId
   */
  function getRCLRecord(masterReturnId) {
    try {
      let rclId;
      search
        .create({
          type: "customrecord_return_cover_letter",
          filters: [["custrecord_rcl_master_return", "anyof", masterReturnId]],
        })
        .run()
        .getRange(0, 1000)
        .map((r) => {
          rclId = r.id;
        });
      return rclId;
    } catch (e) {
      log.error("getRCLRecord", e.message);
    }
  }

  /**
   * Get the Final payment schedule
   * @param {number} options.rclId
   */
  function getRCLFinalPayment(options) {
    let payments = [];
    log.audit("getRCLFinalPayment", options);
    let { rclId } = options;
    try {
      let rec = record.load({
        type: "customrecord_return_cover_letter",
        id: rclId,
      });

      for (let i = 0; i < rec.getLineCount("custpage_items_sublist") - 1; i++) {
        let paymentTypeLink = rec.getSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_payment_type",
          line: i,
        });

        payments.push(getPaymentId(paymentTypeLink));
      }
      return payments;
    } catch (e) {
      log.error("getRCLFinalPayment", e.message);
    }
  }

  /**
   * Creates a return cover letter record with the provided options.
   *
   * @param {Object} options - The options for creating the return cover letter.
   * @param {string} options.mrrId - The master return record ID to associate with the cover letter.
   *
   * @return {string} A message indicating the result of creating the return cover letter.
   */
  function createReturnCoverLetter(options) {
    let res = "";
    try {
      log.audit("createReturnCoverLetter", options);
      let { mrrId } = options;
      const rclRec = record.create({
        type: "customrecord_return_cover_letter",
      });
      rclRec.setValue({
        fieldId: "custrecord_rcl_master_return",
        value: mrrId,
      });
      const rclId = rclRec.save({
        ignoreMandatoryFields: true,
      });
      if (rclId) {
        res = "SUCCESSFULLY CREATED ID: " + rclId;
      }
    } catch (e) {
      log.error("createReturnCoverLetter", e.message);
      res = "ERROR: " + e.message;
    }
    return res;
  }

  return {
    getCustomerInfo,
    getItemReturnScanTotal,
    getCustomerTotalCreditAmount,
    getRCLFinalPayment,
    createPaymentSched,
    hideSublist,
    updateReturnCoverRecord,
    createReturnCoverLetter,
    getRCLRecord,
    SUBLIST_TO_HIDE_IN_RCL,
    SUBLIST_TO_ENTRY,
    setSublistToEntry,
  };
});
