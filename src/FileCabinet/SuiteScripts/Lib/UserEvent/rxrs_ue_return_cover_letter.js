/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/search",
  "N/url",
  "N/ui/serverWidget",
  "../rxrs_verify_staging_lib",
], /**
 * @param{record} record
 * @param{search} search
 * @param url
 * @param{serverWidget} serverWidget
 * @param rxrs_vs_util
 */ (record, search, url, serverWidget, rxrs_vs_util) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (scriptContext) => {
    try {
      const TOPCO = 10;
      if (scriptContext.type == "create") return;
      let rec = scriptContext.newRecord;
      let id = rec.id;
      const planSelectionType = rec.getValue(
        "custrecord_rcl_plan_selection_type",
      );
      const mrrId = rec.getValue("custrecord_rcl_master_return");
      let form = scriptContext.form;
      let tranName = rec.getText("custrecord_rcl_master_return");
      let nonReturnableFeeAmount = 0;
      let returnableFeePercent = 0;
      nonReturnableFeeAmount = rec.getValue(
        "custrecord_rcl_non_returnable_fee_amt",
      );
      let returnableFee = 100 - parseFloat(returnableFeePercent);
      returnableFeePercent = rec.getValue("custrecord_rcl_returnable_fee");
      if (planSelectionType != TOPCO) {
        let itemsReturnScan = rxrs_vs_util.getReturnableItemScan({
          finalPaymentSched: true,
          mrrId: mrrId,
          rclId: rec.id,
          isVerifyStaging: false,
          mrrName: tranName,
          inDated: false,
          returnableFee: returnableFee,
          nonReturnableFeeAmount: nonReturnableFeeAmount,
          initialSplitpaymentPage: true,
          customize: true,
        });
        log.audit("itemReturn Scan", itemsReturnScan);
        rxrs_vs_util.createReturnableSublist({
          form: form,
          rrTranId: mrrId,
          rrName: tranName,
          sublistFields: rxrs_vs_util.SUBLISTFIELDS.returnCoverLetterFields,
          value: itemsReturnScan,
          isMainInDated: false,
          //  inDate: true,
          returnList: itemsReturnScan,
          title: `Payments`,
        });
      }
    } catch (e) {
      log.error("beforeLoad", e.message);
    }
  };

  /**
   * Defines the function definition that is executed before record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const afterSubmit = (scriptContext) => {
    let nonReturnableFeeAmount = 0;
    const curRec = scriptContext.newRecord;
    const rec = record.load({
      type: "customrecord_return_cover_letter",
      id: curRec.id,
    });
    try {
      let mrrId = rec.getValue("custrecord_rcl_master_return");
      let nonReturnableFeePercent = rec.getValue(
        "custrecord_rcl_non_returnable_fee",
      );
      let returnableFeePercent = rec.getValue("custrecord_rcl_returnable_fee");
      let nonReturnableAmount = +rxrs_vs_util.getMrrIRSTotalAmount({
        mrrId: mrrId,
        pharmaProcessing: "1",
      });
      let returnableAmount = +rxrs_vs_util.getMrrIRSTotalAmount({
        mrrId: mrrId,
        pharmaProcessing: "2",
      });
      nonReturnableFeePercent = parseFloat(nonReturnableFeePercent) / 100;
      returnableFeePercent = parseFloat(returnableFeePercent) / 100;
      log.audit("amount", {
        returnableAmount,
        nonReturnableAmount,
        nonReturnableFeePercent,
        returnableFeePercent,
      });
      let freeOfChargeWeight = 0;
      freeOfChargeWeight = rec.getValue("custrecord_free_of_charge_weight");
      const processingWeight = rec.getValue("custrecord_processing_weight");
      const chargePerLBS = rec.getValue("custrecord_charge_per_lbs");
      const isForDisposal = rec.getValue("custrecord_for_disposal");
      if (isForDisposal == true) {
        nonReturnableFeeAmount =
          (+processingWeight - freeOfChargeWeight) * chargePerLBS;
        log.audit("Non returnable fee amt weight", nonReturnableFeeAmount);
      } else {
        nonReturnableFeeAmount = nonReturnableAmount * nonReturnableFeePercent;
      }

      rec.setValue({
        fieldId: "custrecord_rcl_returnable_amount",
        value: returnableAmount,
      });
      rec.setValue({
        fieldId: "custrecord_rcl_non_returnable_amount",
        value: nonReturnableAmount,
      });
      rec.setValue({
        fieldId: "custrecord_rcl_non_returnable_fee_amt",
        value: nonReturnableFeeAmount.toFixed(4),
      });
      const deadForm222 = rec.getValue("custrecord_rcl_dea_222_form") || 0;
      const serviceFee = rec.getValue("custrecord_rcl_credit_discount") || 0;
      const discount = rec.getValue("custrecord_rcl_credit_discount") || 0;
      let addOnFees = deadForm222 + serviceFee + discount;
      let totalCreditAmount = 0;
      totalCreditAmount =
        returnableAmount -
        returnableAmount * returnableFeePercent -
        nonReturnableAmount * nonReturnableFeePercent -
        addOnFees;

      log.audit("totalCreditAmount", totalCreditAmount);
      rec.setValue({
        fieldId: "custrecord_rcl_total_customer_credit_amt",
        value: totalCreditAmount.toFixed(2),
      });
      rec.save({
        ignoreMandatoryFields: true,
      });
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

  return { beforeLoad, afterSubmit };
});
