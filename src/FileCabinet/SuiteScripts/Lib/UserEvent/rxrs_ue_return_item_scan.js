/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/runtime",
  "N/record",
  "N/search",
  "N/url",
  "N/https",
  "../rxrs_verify_staging_lib",
  "../rxrs_payment_sched_lib",
  "../rxrs_transaction_lib",
  "../rxrs_return_cover_letter_lib",
  "../rxrs_custom_rec_lib",
  "../rxrs_util",
  "../rxrs_lib_bag_label",
  "../rxrs_item_lib",
], /**
 * @param{record} record
 * @param{search} search
 * @param url
 * @param https
 * @param rxrs_util
 * @param rxrsPayment_lib
 * @param rxrs_tranlib
 * @param rxrs_rcl_lib
 */ (
  runtime,
  record,
  search,
  url,
  https,
  rxrs_util,
  rxrsPayment_lib,
  rxrs_tranlib,
  rxrs_rcl_lib,
  rxrs_customRec,
  util,
  baglib,
  itemlib,
) => {
  const PACKAGESIZE = {
    PARTIAL: 2,
    FULL: 1,
  };
  const PHARMAPROCESSING = "custrecord_cs__rqstprocesing";
  const MFGPROCESSING = "custrecord_cs__mfgprocessing";
  const ACCRUEDPURCHASEITEM = 916;
  const beforeSubmit = (context) => {
    const rec = context.newRecord;
    const oldRec = context.oldRecord;
    log.audit("beforeSubmit", context.type);
    let fields = [
      "custrecord_scanpricelevel",
      "custrecord_scanrate",
      "custrecord_isc_overriderate",
      "custrecord_isc_inputrate",
      "custrecord_cs_qty",
      "custrecord_cs_full_partial_package",
      "custrecord_scanpartialcount",
    ];
    try {
      if (context.type == "create") {
        rxrs_customRec.updateIRSPrice(rec);
      } else if (context.type == "edit") {
        if (
          util.checkIfThereIsUpdate({
            oldRec: oldRec,
            newRec: rec,
            FIELDS: fields,
          }) == true ||
          runtime.executionContext == "USERINTERFACE"
        ) {
          log.emergency("updating price");
          rxrs_customRec.updateIRSPrice(rec);
        }
        if (
          rec.getValue("custrecord_itemscanbin") !=
          oldRec.getValue("custrecord_itemscanbin")
        ) {
          rxrs_tranlib.updateBinNumber({
            rrId: rec.getValue("custrecord_cs_ret_req_scan_rrid"),
            itemScanId: rec.id,
            binId: rec.getValue("custrecord_itemscanbin"),
          });
        }
        if (rec.getValue("custrecord_isc_overriderate") == true) {
          const MANUALINPUT = 12;
          rec.setValue({
            fieldId: "custrecord_scanpricelevel",
            value: MANUALINPUT,
          });
        }
        if (
          context.type == context.UserEventType.EDIT &&
          runtime.executionContext == "SUITELET"
        ) {
          log.audit("Updating price level");
          const newPriceLevel = rec.getValue("custrecord_scanpricelevel"),
            oldPriceLevel = oldRec.getValue("custrecord_scanpricelevel");
          log.audit("Price level", { oldPriceLevel, newPriceLevel });
          if (oldPriceLevel !== newPriceLevel) {
            rec.setValue({
              fieldId: "custrecord_scanrate",
              value: itemlib.getItemRateBasedOnPriceLevel({
                itemId: rec.getValue("custrecord_cs_return_req_scan_item"),
                priceLevel: newPriceLevel,
              }),
            });
            rxrs_customRec.updateIRSPrice(rec);
          }
        }
      }
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

  function percentToDecimal(percentStr) {
    return parseFloat(percentStr) / 100;
  }

  const afterSubmit = (context) => {
    try {
      const RETURNABLE = 2;
      const NONRETURNABLE = 1;
      const ADJUSTMENTITEM = 917;
      log.audit("runtime", runtime.executionContext);
      const DEFAULT = 12;
      const rec = context.newRecord;
      const oldRec = context.oldRecord;
      log.audit("old Rec", oldRec);
      let oldPharmaProcessing = null;
      let newPharmaProcessing = null;
      let oldMFGProcessing = null;
      let oldRecBin = null;
      newPharmaProcessing = rec.getValue("custrecord_cs__rqstprocesing");

      const newMFGProcessing = rec.getValue("custrecord_cs__mfgprocessing");

      log.audit("rec", rec, oldRec);
      const rrId = rec.getValue("custrecord_cs_ret_req_scan_rrid");
      if (rrId) {
        log.audit("For Processing");
        updateReturnRequestStatus({
          returnRequestId: rrId,
          isForProcessing: true,
        });
      }
      try {
        log.audit("reloading rr rec");
        let updateRelatedTranParam = {
          pharmaProcessing: rec.getValue("custrecord_cs__rqstprocesing"),
          irsId: rec.id,
          amount: rec.getValue("custrecord_irc_total_amount"),
          priceLevel: rec.getValue("custrecord_scanpricelevel"),
          rate: rec.getValue("custrecord_scanrate"),
        };
        rxrs_tranlib.setIRSRelatedTranLineProcessing(updateRelatedTranParam);
        const entityType = rec.getValue("custrecord_rxrs_entity_type");

        let rrType =
          entityType == "Customer"
            ? "customsale_kod_returnrequest"
            : "custompurchase_returnrequestpo";
        log.audit("values", { rrId, rrType, entityType });
        const rrRec = record.load({
          type: rrType,
          id: rrId,
          isDynamic: true,
        });
        rrRec.save({
          ignoreMandatoryFields: true,
        });
      } catch (e) {
        log.error("Reloading the RR", e.message);
      }
      const newRecBin = rec.getValue("custrecord_itemscanbin");

      /**
       * Send Email when new bin is assigned
       */
      if (context.type == "edit") {
        oldRecBin = oldRec.getValue("custrecord_itemscanbin");
        oldMFGProcessing = oldRec.getValue("custrecord_cs__mfgprocessing");
        const bagId = rec.getValue("custrecord_scanbagtaglabel");
        if (newRecBin != oldRecBin) {
          util.sendEmailMFGProcessingIsUpdated({
            newRec: rec,
            oldBag: rec.getValue("custrecord_prev_bag_assignement"),
            newBag: bagId,
            oldBin: rec.getText("custrecord_previous_bin"),
            newBin: rec.getText("custrecord_itemscanbin"),
          });
        }

        if (bagId) {
          log.audit("reloading bag");
          let functionSLURL = url.resolveScript({
            scriptId: "customscript_sl_cs_custom_function",
            deploymentId: "customdeploy_sl_cs_custom_function",
            returnExternalUrl: true,
            params: {
              action: "reload",
              id: bagId,
              type: "customrecord_kd_taglabel",
            },
          });
          let response = https.post({
            url: functionSLURL,
          });
        }
        if (oldMFGProcessing != newMFGProcessing) {
          log.audit("For reverification");
          updateReturnRequestStatus({
            returnRequestId: rrId,

            isForRevirefication: true,
          });
        }
      }

      /**
       * Update processing of the PO and Bill if there's changes in
       */
      const billId = rec.getValue("custrecord_rxrs_bill_internal_id");
      const masterReturnId = rec.getValue(
        "custrecord_irs_master_return_request",
      );
      const poId = rec.getValue("custrecord_rxrs_po_internal_id");
      let irsRec = record.load({
        type: "customrecord_cs_item_ret_scan",
        id: rec.id,
        isDefault: true,
      });
      let params = {};
      let adjustmentPercent;
      let billStatus;

      if (billId) {
        // log.debug("Update Processing");
        // params.id = billId;
        // params.type = record.Type.VENDOR_BILL;
        // rxrs_tranlib.updateProcessing(params);
        let rsSearch = search.lookupFields({
          type: "vendorbill",
          id: billId,
          columns: [
            "custbody_rxrs_returnable_fee",
            "custbody_rxrs_non_returnable_rate",
            "status",
          ],
        });
        billStatus = rsSearch.status[0].value;
        adjustmentPercent =
          percentToDecimal(rsSearch.custbody_rxrs_returnable_fee) -
          percentToDecimal(rsSearch.custbody_rxrs_non_returnable_rate);
        log.debug("adjustmentPercent", adjustmentPercent);
      }
      if (poId) {
        params.id = poId;
        params.type = record.Type.PURCHASE_ORDER;
        rxrs_tranlib.updateProcessing(params);
      }

      /**
       *  Update PO, Bill and IR processing
       */
      let updateRelatedTranParam = {
        mfgProcessing: newMFGProcessing,
        pharmaProcessing: newPharmaProcessing,
        irsId: rec.id,
        amount: rec.getValue("custrecord_irc_total_amount"),
        priceLevel: rec.getValue("custrecord_scanpricelevel"),
        action: "updateTranLineProcessing",
      };

      if (
        oldPharmaProcessing != newPharmaProcessing ||
        newMFGProcessing != newMFGProcessing
      ) {
        log.audit("updating related tran line processing");

        log.audit("updating related tran line processing", params);

        let functionSLURL = url.resolveScript({
          scriptId: "customscript_sl_cs_custom_function",
          deploymentId: "customdeploy_sl_cs_custom_function",
          returnExternalUrl: true,
          params: updateRelatedTranParam,
        });
        if (billStatus == "open") {
          let response = https.post({
            url: functionSLURL,
          });
        }
      }
      log.emergency("Pharma Processing", {
        oldPharmaProcessing,
        newPharmaProcessing,
      });
      let notEqualPharma;
      oldPharmaProcessing == RETURNABLE && newPharmaProcessing == NONRETURNABLE;

      if (notEqualPharma) {
        let defaultBillId = rxrs_tranlib.getBillId({
          paymentId: DEFAULT,
          masterReturnId: masterReturnId,
        });
        const billStatus = rxrs_tranlib.getCertainField({
          id: defaultBillId,
          type: "vendorbill",
          columns: "status",
        });
        let accruedAmount = 0;
        let adjustmentAmount =
          adjustmentPercent * rec.getValue("custrecord_irc_total_amount");
        log.debug("adjustmentAmount", adjustmentAmount);
        if (billStatus == "paidInFull") {
          log.debug("billId", defaultBillId != billId);
          if (defaultBillId != billId) {
            try {
              let vbRec = record.load({
                type: record.Type.VENDOR_BILL,
                id: billId,
              });
              for (let i = 0; i < vbRec.getLineCount("item"); i++) {
                const mfgProcessing = vbRec.getSublistValue({
                  sublistId: "item",
                  fieldId: "custcol_kod_mfgprocessing",
                  line: i,
                });
                const pharmaProcessing = vbRec.getSublistValue({
                  sublistId: "item",
                  fieldId: "custcol_kod_rqstprocesing",
                  line: i,
                });

                log.debug("processing", {
                  line: i,
                  pharma: pharmaProcessing,
                  mfg: mfgProcessing,
                });
                if (
                  pharmaProcessing == NONRETURNABLE &&
                  mfgProcessing == RETURNABLE
                ) {
                  log.debug("processing", {
                    line: i,
                    pharma: pharmaProcessing,
                    mfg: mfgProcessing,
                  });
                  let amount = vbRec.getSublistValue({
                    sublistId: "item",
                    fieldId: "amount",
                    line: i,
                  });

                  accruedAmount += amount;
                }
              }
              log.debug("accruedAmount", accruedAmount);
              let lastIndex = vbRec.getLineCount({ sublistId: "item" });
              vbRec = rxrs_tranlib.setAdjustmentFee({
                vbRec: vbRec,
                irsId: rec.id,
                adjustmentAmount: adjustmentAmount,
                lastIndex: lastIndex,
              });

              if (accruedAmount > 0) {
                let lastIndex = vbRec.getLineCount({ sublistId: "item" });
                vbRec = rxrs_tranlib.addAccruedPurchaseItem({
                  ACCRUEDPURCHASEITEM: ACCRUEDPURCHASEITEM,
                  vbRec: vbRec,
                  lastIndex: lastIndex,
                  accruedAmount: accruedAmount,
                });
              }
              rxrs_tranlib.addAcrruedAmountBasedonTransaction(vbRec);

              // vbRec.save({ ignoreMandatoryFields: true });
            } catch (e) {
              log.error("ADDING ADJUMENT AND ACCRUED PURCHASE", e.message);
            }
          }
        } else {
          log.emergency("Default Bill not paid in Full");
          let stSuiteletUrl = url.resolveScript({
            scriptId: "customscript_sl_cs_custom_function",
            deploymentId: "customdeploy_sl_cs_custom_function",
            returnExternalUrl: true,
            params: {
              action: "reloadBill",
              billId: "defaultBillId",
            },
          });
          let response = https.post({
            url: stSuiteletUrl,
          });
          log.emergency("reloadBill response", response);
          if (defaultBillId != billId) {
            log.debug("NOT DEFAULT BILL");
            let vbRec = record.load({
              type: record.Type.VENDOR_BILL,
              id: billId,
            });

            let vbRecDefault = record.load({
              type: record.Type.VENDOR_BILL,
              id: defaultBillId,
            });
            let lastIndex = vbRecDefault.getLineCount({ sublistId: "item" });
            vbRecDefault = rxrs_tranlib.setAdjustmentFee({
              vbRec: vbRecDefault,
              irsId: rec.id,
              adjustmentAmount: adjustmentAmount,
              lastIndex: lastIndex,
            });
            // vbRec = rxrs_tranlib.createAllServiceFees(
            //   record.load({
            //     type: record.Type.VENDOR_BILL,
            //     id: defaultBillId,
            //   })
            // );
            vbRecDefault.save({ ignoreMandatoryFields: true });
            rxrs_tranlib.addAcrruedAmountBasedonTransaction(vbRec);
          } else {
            log.audit("adjusting default bill");
            let vbRec = record.load({
              type: record.Type.VENDOR_BILL,
              id: defaultBillId,
            });
            let lastIndex = vbRec.getLineCount({ sublistId: "item" });
            vbRec = rxrs_tranlib.setAdjustmentFee({
              vbRec: vbRec,
              irsId: rec.id,
              adjustmentAmount: adjustmentAmount,
              lastIndex: lastIndex,
            });
            let vbId = vbRec.save({ ignoreMandatoryFields: true });

            rxrs_tranlib.createAllServiceFees(vbId);
          }
        }

        // log.emergency("defaultBillId", { defaultBillId, poId });
        // if (defaultBillId && poId) {
        //   let deletedBill = record.delete({
        //     type: record.Type.VENDOR_BILL,
        //     id: defaultBillId,
        //   });
        //   if (deletedBill) {
        //     let newDefaultBillId = rxrs_tranlib.createBill({
        //       poId: rec.getValue("custrecord_rxrs_po_internal_id"),
        //       finalPaymentSchedule: DEFAULT,
        //     });
        //     log.emergency("newDefaultBillId", newDefaultBillId);
        //   }
        // }
      }
      let isIndate = irsRec.getValue("custrecord_scanindated");

      // else {
      //   log.audit("Setting indated to false", rec.id);
      //   irsRec.setValue({
      //     fieldId: "custrecord_scanindated",
      //     value: false,
      //   });
      // }

      let pharmaProcessing = irsRec.getValue("custrecord_cs__rqstprocesing");
      if (context.type == "create") {
        if (isIndate == true) {
          let inDays = rxrs_util.getIndays(rec.id);
          let isDefault = Math.sign(inDays) == -1;
          let paymentSchedId =
            isDefault == true
              ? rxrsPayment_lib.getPaymentSched(Math.abs(inDays))
              : 12;
          log.audit("InDays and Payment Sched", {
            inDays,
            paymentSchedId,
            isDefault,
          });
          if (paymentSchedId && isDefault === true) {
            irsRec.setValue({
              fieldId: "custrecord_scan_paymentschedule",
              value: +paymentSchedId,
            });

            irsRec.setValue({
              fieldId: "custrecord_scanindated",
              value: true,
            });
          }
        } else {
          irsRec.setValue({
            fieldId: "custrecord_ret_start_date",
            value: "",
          });
        }
        if (
          (isIndate == false && pharmaProcessing == 2) ||
          pharmaProcessing == 1
        ) {
          irsRec.setValue({
            fieldId: "custrecord_final_payment_schedule",
            value: DEFAULT,
          });
          irsRec.setValue({
            fieldId: "custrecord_scan_paymentschedule",
            value: DEFAULT,
          });
        }
        if (notEqualPharma) {
          irsRec.setValue({
            fieldId: "customrecord_cs_item_ret_scan",
            value: true,
          });
        }
      }

      irsRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  /**
   * Update the status of a return request based on the provided options.
   *
   * @param {Object} options - The options object containing the information needed to update the return request status.
   * @param {string} options.returnRequestId - The ID of the return request to update.
   * @param {boolean} options.isForRevirefication - Indicates if the request is for re-verification.
   * @param {boolean} options.isForProcessing - Indicates if the request is for processing.
   *
   * @return {void} - This function does not return anything.
   */
  function updateReturnRequestStatus(options) {
    log.audit("updateReturnRequestStatus", options);
    let { returnRequestId, isForRevirefication, isForProcessing } = options;
    try {
      const rrRec = record.load({
        type: util.getReturnRequestType(returnRequestId),
        id: returnRequestId,
      });
      const rrStatus = rrRec.getValue("transtatus");
      if (
        rrStatus == util.rrStatus.ReceivedPendingProcessing &&
        isForProcessing == true
      ) {
        log.audit("setting to processing");
        rrRec.setValue({
          fieldId: "transtatus",
          value: util.rrStatus.Processing,
        });
      }
      if (rrStatus == util.rrStatus.Approved && isForRevirefication == true) {
        rrRec.setValue({
          fieldId: "transtatus",
          value: util.rrStatus.PendingVerification,
        });
      }
      rrRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("updateReturnRequestStatus", e.message);
    }
  }

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

  return { beforeSubmit, afterSubmit };
});
