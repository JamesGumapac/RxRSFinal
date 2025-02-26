/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "../rxrs_transaction_lib",
  "../rxrs_verify_staging_lib",
  "../rxrs_util",
  "N/search",
  "N/record",
], (rxrs_tran_lib, rxrs_vs_lib, rxrs_util, search, record) => {
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
    if (scriptContext.type == "delete") return;
    let newRec = scriptContext.newRecord;
    try {
      const finalPaymentSchedule = newRec.getValue("custbody_kodpaymentsched");
      log.debug("finalPaymentSchedule", finalPaymentSchedule);
      if (!finalPaymentSchedule) return;

      let paymentScheduleText = getPaymentName(finalPaymentSchedule);
      log.error("paymentSchedule text", paymentScheduleText);
      let monthsToAdd = "";
      monthsToAdd = paymentScheduleText.split("-")[1];
      monthsToAdd = monthsToAdd.split(" ")[0];
      log.error("months to Add", monthsToAdd);
      let dueDate = rxrs_util.setBillDueDate({
        date: new Date(),
        isTopCo: false,
        monthsToAdd: monthsToAdd,
      });
      log.audit("due date", dueDate);
      newRec.setValue({
        fieldId: "duedate",
        value: new Date(dueDate),
      });

      const monthShort = dueDate.toLocaleString("en-US", { month: "short" });
      const year = dueDate.getFullYear();
      let postingPeriod = rxrs_util.getPeriodId(monthShort + " " + year);
      log.audit("postingPeriod", postingPeriod);
      newRec.setValue({
        fieldId: "postingperiod",
        value: postingPeriod,
      });

      const ACCRUEDPURCHASEITEM = 916;
      const RETURNABLE = 2;
      const NONRETURNABLE = 1;
      const RETURNABLESERVICEFEEITEM = 882;
      const NONRETURNABLESERVICEFEEITEM = 883;
      vbRec = rxrs_tran_lib.removeVBLine({
        vbRec: newRec,
        finalPaymentSchedule: finalPaymentSchedule,
        updateLine: false,
      });

      if (newRec) {
        let mrrId = newRec.getValue("custbody_kd_master_return_id");
        let returnableAmount = rxrs_vs_lib.getMrrIRSTotalAmount({
          mrrId: mrrId,
          pharmaProcessing: RETURNABLE,
          mfgProcessing: RETURNABLE,
        });
        let nonReturnableAmount = rxrs_vs_lib.getMrrIRSTotalAmount({
          mrrId: mrrId,
          pharmaProcessing: NONRETURNABLE,
          mfgProcessing: NONRETURNABLE,
        });
        const nonReturnableFeeRate =
          newRec.getValue("custbody_rxrs_non_returnable_rate") / 100;
        const returnableFeeRate =
          newRec.getValue("custbody_rxrs_returnable_fee") / 100;
        let accruedAmount = 0;
        const finalPaymentSchedule = newRec.getValue(
          "custbody_kodpaymentsched",
        );
        log.debug("finalPaymentSchedule", finalPaymentSchedule);
        newRec.setValue({
          fieldId: "custbody_kodpaymentsched",
          value: finalPaymentSchedule,
        });

        if (finalPaymentSchedule != 12) return;
        for (let i = 0; i < newRec.getLineCount("item"); i++) {
          const mfgProcessing = newRec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_kod_mfgprocessing",
            line: i,
          });
          const pharmaProcessing = newRec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_kod_rqstprocesing",
            line: i,
          });
          let quantity = newRec.getSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            line: i,
          });
          let rate = newRec.getSublistValue({
            sublistId: "item",
            fieldId: "rate",
            line: i,
          });

          if (
            pharmaProcessing == NONRETURNABLE &&
            mfgProcessing == RETURNABLE
          ) {
            let amount = newRec.getSublistValue({
              sublistId: "item",
              fieldId: "amount",
              line: i,
            });
            let item = newRec.getSublistValue({
              sublistId: "item",
              fieldId: "item",
              line: i,
            });
            if (item != 917) {
              amount = amount === 0 ? rate * quantity : amount;
              newRec.setSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: amount,
                line: i,
              });
              accruedAmount += newRec.getSublistValue({
                sublistId: "item",
                fieldId: "amount",
                line: i,
              });
            }

            log.debug("amount: ", { i, amount, accruedAmount });
          }

          if (pharmaProcessing == RETURNABLE) {
            let amount = newRec.getSublistValue({
              sublistId: "item",
              fieldId: "amount",
              line: i,
            });
            amount = amount === 0 ? rate * quantity : amount;

            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: amount,
              line: i,
            });
          }
        }
        if (nonReturnableFeeRate) {
          const serviceFeeAmount = +nonReturnableAmount * +nonReturnableFeeRate;
          log.debug("addBillProcessingFee values", {
            nonReturnableFeeRate,
            serviceFeeAmount,
            nonReturnableAmount,
          });
          let nonReturnableServiceFeeIndex = newRec.findSublistLineWithValue({
            sublistId: "item",
            fieldId: "item",
            value: NONRETURNABLESERVICEFEEITEM,
          });
          if (nonReturnableServiceFeeIndex != -1) {
            newRec.removeLine({
              sublistId: "item",
              line: nonReturnableServiceFeeIndex,
            });
            const lastIndex = newRec.getLineCount({ sublistId: "item" });
            newRec.insertLine({ sublistId: "item", line: lastIndex });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: NONRETURNABLESERVICEFEEITEM,
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
          } else {
            const lastIndex = newRec.getLineCount({ sublistId: "item" });
            newRec.insertLine({ sublistId: "item", line: lastIndex });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: NONRETURNABLESERVICEFEEITEM,
              line: lastIndex,
            });

            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
          }
        }
        if (returnableFeeRate) {
          const serviceFeeAmount = +returnableAmount * +returnableFeeRate;
          log.debug("addBillProcessingFee values", {
            returnableFeeRate,
            serviceFeeAmount,
            returnableAmount,
          });
          let returnableServiceFeeIndex = newRec.findSublistLineWithValue({
            sublistId: "item",
            fieldId: "item",
            value: RETURNABLESERVICEFEEITEM,
          });
          if (returnableServiceFeeIndex != -1) {
            newRec.removeLine({
              sublistId: "item",
              line: returnableServiceFeeIndex,
            });
            const lastIndex = newRec.getLineCount({ sublistId: "item" });
            newRec.insertLine({ sublistId: "item", line: lastIndex });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: RETURNABLESERVICEFEEITEM,
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
          } else {
            const lastIndex = newRec.getLineCount({ sublistId: "item" });
            newRec.insertLine({ sublistId: "item", line: lastIndex });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: RETURNABLESERVICEFEEITEM,
              line: lastIndex,
            });

            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
          }
        }
        if (accruedAmount > 0) {
          let accruedItemIndex = newRec.findSublistLineWithValue({
            sublistId: "item",
            fieldId: "item",
            value: ACCRUEDPURCHASEITEM,
          });
          if (accruedItemIndex != -1) {
            newRec.removeLine({
              sublistId: "item",
              line: accruedItemIndex,
            });
            const lastIndex = newRec.getLineCount({ sublistId: "item" });
            newRec.insertLine({ sublistId: "item", line: lastIndex });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: ACCRUEDPURCHASEITEM,
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(accruedAmount),
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(accruedAmount),
              line: lastIndex,
            });
          } else {
            const lastIndex = newRec.getLineCount({ sublistId: "item" });
            newRec.insertLine({ sublistId: "item", line: lastIndex });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: ACCRUEDPURCHASEITEM,
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(accruedAmount),
              line: lastIndex,
            });
            newRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(accruedAmount),
              line: lastIndex,
            });
          }
        }
      }
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

  /**
   *  Get payment name
   * @param paymentId
   * @returns {*}
   */
  function getPaymentName(paymentId) {
    log.audit("getPaymentName", paymentId);
    try {
      let name;
      const customrecord_kd_payment_scheduleSearchObj = search.create({
        type: "customrecord_kd_payment_schedule",
        filters: [["internalidnumber", "equalto", paymentId]],
        columns: [search.createColumn({ name: "name", label: "Name" })],
      });

      customrecord_kd_payment_scheduleSearchObj.run().each(function (result) {
        name = result.getValue("name");
        return true;
      });
      return name;
    } catch (e) {
      log.error("getPaymentName", e.message);
    }
  }

  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const afterSubmit = (scriptContext) => {};

  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      false ||
      (stValue.constructor === Array && stValue.length == 0) ||
      (stValue.constructor === Object &&
        (function (v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  return { beforeLoad, beforeSubmit };
});
