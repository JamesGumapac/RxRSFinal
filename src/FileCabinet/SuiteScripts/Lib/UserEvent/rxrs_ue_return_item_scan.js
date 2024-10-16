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
    ];
    try {
      if (
        util.checkIfThereIsUpdate({
          oldRec: oldRec,
          newRec: rec,
          FIELDS: fields,
        }) == true
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
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

  function percentToDecimal(percentStr) {
    return parseFloat(percentStr) / 100;
  }

  const afterSubmit = (context) => {
    try {
      log.audit("runtime", runtime.executionContext);
      const DEFAULT = 12;
      const rec = context.newRecord;
      const oldRec = context.oldRecord;
      log.audit("rec", rec, oldRec);
      const rrId = rec.getValue("custrecord_cs_ret_req_scan_rrid");
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
      const oldRecBin = rec.getValue("custrecord_itemscanbin");
      const RETURNABLE = 2;
      const NONRETURNABLE = 1;
      const ADJUSTMENTITEM = 917;
      /**
       * Send Email when new bin is assigned
       */
      util.sendEmailMFGProcessingIsUpdated({
        newRec: rec,
        oldBag: rec.getValue("custrecord_prev_bag_assignement"),
        newBag: rec.getValue("custrecord_scanbagtaglabel"),
        oldBin: rec.getText("custrecord_previous_bin"),
        newBin: rec.getText("custrecord_itemscanbin"),
      });
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
      let oldPharmaProcessing = null;
      let newPharmaProcessing = null;
      oldPharmaProcessing = oldRec.getValue("custrecord_cs__rqstprocesing");
      newPharmaProcessing = rec.getValue("custrecord_cs__rqstprocesing");
      const oldMFGProcessing = oldRec.getValue("custrecord_cs__mfgprocessing");
      const newMFGProcessing = rec.getValue("custrecord_cs__mfgprocessing");

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
          fieldId: "custrecord_final_payment_schedule",
          value: DEFAULT,
        });
        irsRec.setValue({
          fieldId: "custrecord_scanindated",
          value: true,
        });
      } else {
        log.audit("Setting indated to false", rec.id);
        irsRec.setValue({
          fieldId: "custrecord_scanindated",
          value: false,
        });
      }
      let isIndate = irsRec.getValue("custrecord_scanindated");
      let pharmaProcessing = irsRec.getValue("custrecord_cs__rqstprocesing");

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
      irsRec.save({
        ignoreMandatoryFields: true,
      });
      // record.submitFields.promise({
      //   type: "customrecord_kd_taglabel",
      //   id: irsRec.getValue("custrecord_prev_bag_assignement"),
      //   values: {
      //     custrecord_is_inactive: true,
      //   },
      // });
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

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
