/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "N/record",
  "../rxrs_transaction_lib",
  "../rxrs_return_cover_letter_lib",
  "../rxrs_custom_rec_lib",
], /**
 * @param{serverWidget} serverWidget
 * @param record
 * @param tranLib
 * @param rclLib
 * @param custRecLib
 */ (serverWidget, record, tranLib, rclLib, custRecLib) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (context) => {
    let params = context.request.parameters;
    log.audit("params", params);
    if (context.request.method === "POST") {
      let {
        rrId,
        mrrId,
        entity,
        soDetails,
        cmDetails,
        paymentDetails,
        action,
        rclId,
        billId,
        poId,
        newPaymentId,
        returnableFee,
        vbId,
      } = params;
      try {
        let returnObj;
        log.audit("POST", params);
        switch (action) {
          case "createCustPayment":
            const paymentCreationRes = tranLib.createPayment(paymentDetails);
            log.audit("paymentCreationRes", paymentCreationRes);
            context.response.writeLine(paymentCreationRes);

            break;

          case "createCreditMemo":
            let response = custRecLib.createUpdateCM(cmDetails);
            if (response.successMessage) {
              context.response.writeLine(response.successMessage);
            }
            if (response.error) {
              context.response.writeLine("ERROR:" + response.error);
            }
            break;
          case "reloadBill":
            const vbRec = record.load({
              type: record.Type.VENDOR_BILL,
              id: billId,
              isDynamic: true,
            });
            let id = vbRec.save({ ignoreMandatoryFields: true });
            context.response.writeLine("VB ID Updated", id);
            break;
          case "createPO":
            returnObj = tranLib.createPO({
              rrId: rrId,
              mrrId: mrrId,
              entity: entity,
            });
            let { error, resMessage } = returnObj;
            if (resMessage) {
              context.response.writeLine(resMessage);
            } else {
              context.response.writeLine("ERROR:" + error);
            }
            break;
          case "updateSOItem222FormReference":
            log.debug("case", "updateSOItem222FormReference");
            returnObj = tranLib.updateSO222Form(soDetails);
            let { updateSOError, updateSOResMessage } = returnObj;
            if (updateSOResMessage) {
              context.response.writeLine(updateSOResMessage);
            } else {
              context.response.writeLine("ERROR:" + updateSOError);
            }
            break;
          case "addBillProcessingFee":
            log.debug("addBillProcessingFee executing");
            tranLib.addBillProcessingFee({
              vbId: vbId,
              rclId: rclId,
            });
            rclLib.updateReturnCoverRecord(mrrId);
            break;
          case "createBill":
            let paymentIds = [];
            //  let paymentIds = rclLib.getRCLFinalPayment({ rclId: rclId });
            let rec = record.load({
              type: "customrecord_return_cover_letter",
              id: rclId,
            });

            for (
              let i = 0;
              i < rec.getLineCount("custpage_items_sublist") - 1;
              i++
            ) {
              let bill = rec.getSublistValue({
                sublistId: "custpage_items_sublist",
                fieldId: "custpage_bill",
                line: i,
              });
              let paymentId = rec.getSublistValue({
                sublistId: "custpage_items_sublist",
                fieldId: "custpage_payment_id",
                line: i,
              });
              log.debug("values", { bill, paymentId });
              if (bill === "NO BILL") {
                paymentIds.push(paymentId);
              }
            }
            let processVB = [];
            log.emergency("createBill", { paymentIds, poId });
            paymentIds.forEach((paymentId) => {
              let returnObj = tranLib.createBill({
                mrrId: mrrId,
                finalPaymentSchedule: +paymentId,
                poId: poId,
                returnableFee: returnableFee,
              });
              let rclId = rclLib.getRCLRecord(mrrId);
              // tranLib.addBillProcessingFee({
              //   vbId: returnObj,
              //   rclId: rclId,
              // });
              rclLib.updateReturnCoverRecord(mrrId);

              log.emergency("returnObj", returnObj);
              if (returnObj) {
                processVB.push(returnObj);
              }
            });
            if (processVB.length != 0) {
              log.emergency("processVB", processVB);
              let resMessage = `Successfully created Vendor bill`;
              context.response.writeLine(resMessage);
            } else {
              context.response.writeLine(
                "ERROR:" + "Failed to create all vendor bill"
              );
            }

            break;
          case "deleteBill":
            if (billId) {
              tranLib.deleteTransaction({
                type: record.Type.VENDOR_BILL,
                id: billId,
              });
            }
            if (newPaymentId) {
              let newVBiD = tranLib.checkIfTransAlreadyExist({
                mrrId: mrrId,
                finalPaymentSchedule: newPaymentId,
                searchType: "VendBill",
              });
              if (newVBiD) {
                tranLib.deleteTransaction({
                  type: record.Type.VENDOR_BILL,
                  id: newVBiD,
                });
              }

              break;
            }
        }
      } catch (e) {
        context.response.writeLine("ERROR:" + e.message);
        log.error("creating transaction", e.message);
      }
    }
  };

  return { onRequest };
});
