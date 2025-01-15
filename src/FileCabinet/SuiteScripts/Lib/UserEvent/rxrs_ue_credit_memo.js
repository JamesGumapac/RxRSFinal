/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "../rxrs_transaction_lib",
  "../rxrs_custom_rec_lib",
  "N/record",
  "../rxrs_item_lib",
], (tran_lib, customLib, record, itemlib) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (scriptContext) => {};

  /**
   * Defines the function definition that is executed before record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const beforeSubmit = (scriptContext) => {
    try {
      const rec = scriptContext.newRecord;
      if (rec.getValue("custrecord_is_government") == true) {
        const res = itemlib.getCurrentDiscountPercentage({
          displayName: "Government",
        });
        const grossCreditReceived = rec.getValue(
          "custrecord_gross_credit_received",
        );
        log.audit("amount", grossCreditReceived * res.totalPercent);
        rec.setValue({
          fieldId: "custrecord_amount",
          value: grossCreditReceived * res.totalPercent,
        });
      }
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const afterSubmit = (scriptContext) => {
    const rec = scriptContext.newRecord;
    let creditAdjustmentAmount = 0;
    try {
      const curRec = record.load({
        type: rec.type,
        id: rec.id,
      });
      const result = customLib.getCMParentInfo(rec.id);
      log.audit("result", result);
      let total = result.total;
      const oldAmount = curRec.getValue("custrecord_amount");
      if (rec.getValue("custrecord_is_government") == true) {
        const res = itemlib.getCurrentDiscountPercentage({
          displayName: "Government",
        });
        total *= res.totalPercent || 1;
      } else if (rec.getValue("custrecord_cm_istopco") == true) {
        const res = itemlib.getCurrentDiscountPercentage({
          displayName: "Top Co",
        });
        total *= res.totalPercent || 1;
      }
      let amount = curRec.getValue("custrecord_amount");
      const packingSlipAmount = curRec.getValue(
        "custrecord_packing_slip_amount",
      );
      // curRec.setValue({
      //   fieldId: "custrecord_amount",
      //   value: packingSlipAmount,
      // });
      let grossCreditReceived = rec.getValue(
        "custrecord_gross_credit_received",
      );
      log.audit("amount", { packingSlipAmount, total });
      if (Number(oldAmount) == Number(result.total)) return;
      let nsCMId = curRec.getValue("custrecord_ns_cm_id");
      if (packingSlipAmount !== amount) {
        creditAdjustmentAmount =
          Number(packingSlipAmount).toFixed(2) - Number(amount).toFixed(2);
        log.audit("nsCMId", nsCMId);
        creditAdjustmentAmount =
          creditAdjustmentAmount > 1 ? creditAdjustmentAmount : 0;
      }

      if (nsCMId == "") {
        try {
          const NSCmId = tran_lib.createCreditMemoFromInv({
            invId: curRec.getValue("custrecord_invoice_applied"),
            cmId: curRec.id,
            amount: amount,
            itemId: 923, // Credit Received
            creditType: 2,
            creditAdjustmentAmount: creditAdjustmentAmount,
            creditAdjustmentItem: 925,
          });
          NSCmId &&
            curRec.setValue({
              fieldId: "custrecord_ns_cm_id",
              value: NSCmId,
            });
        } catch (e) {
          log.error("Creating Native CM", e.message);
        }
      } else {
        try {
          log.audit("updating credit memo native");
          record.delete({
            type: record.Type.CREDIT_MEMO,
            id: nsCMId,
          });
          const NSCmId = tran_lib.createCreditMemoFromInv({
            invId: curRec.getValue("custrecord_invoice_applied"),
            cmId: curRec.id,
            amount: amount,
            itemId: 923, // Credit Received
            creditAdjustmentAmount: creditAdjustmentAmount,
            creditAdjustmentItem: 925,
            creditType: 2,
          });
          NSCmId &&
            curRec.setValue({
              fieldId: "custrecord_ns_cm_id",
              value: NSCmId,
            });
        } catch (e) {
          log.error("Updateing Native CM", e.message);
        }
      }

      curRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  function roundToTwoDecimalPlaces(number) {
    return parseFloat(number.toFixed(2));
  }

  return { beforeSubmit, afterSubmit };
});
