/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 */
/**
 * Author: James Gumapac
 * Date: 08/15/2023
 * Update:
 */
define(["N/record", "N/url"], /**
 * @param{record} record
 * @param{url} url
 */ (record, url) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (context) => {
    const rec = context.newRecord;
    const id = rec.id;
    log.audit("recType", rec.type);
    try {
      if (context.type == "view") {
        if (rec.type != "customrecord_return_cover_letter") {
          const tranId = rec.getValue("tranid");
          const customer = rec.getValue("entity");
          const mrrId = rec.getValue("custbody_kd_master_return_id");
          const DEA222Fees = rec.getValue("custbody_kd_total_222_form_fee");
          let forVerificationSLUrl = url.resolveScript({
            scriptId: "customscript_sl_returnable_page",
            deploymentId: "customdeploy_sl_returnable_page",
            returnExternalUrl: false,
            params: {
              selectionType: "Returnable",
              rrId: id,
              tranId: tranId,
              mrrId: mrrId,
              rrType: rec.type,
            },
          });
          context.form.addButton({
            id: "custpage_verify",
            label: "Verify Items",
            functionName:
              'window.open("' +
              forVerificationSLUrl +
              ' ","_blank","width=1900,height=1200")',
          });
        }
        if (rec.type == "customrecord_return_cover_letter") {
          let mrrId = rec.getValue("custrecord_rcl_master_return");
          let tranId = rec.getText("custrecord_rcl_master_return");
          let rclSuiteletURL = url.resolveScript({
            scriptId: "customscript_sl_return_cover_letter",
            deploymentId: "customdeploy_sl_return_cover_letter",
            returnExternalUrl: false,
            params: {
              finalPaymentSched: false,
              mrrId: mrrId,
              tranId: tranId,
              inDated: true,
              isVerifyStaging: false,
              title: "In-Dated Inventory",
            },
          });

          context.form.addButton({
            id: "custpage_split_payment",
            label: "Split Payment",
            functionName:
              'window.open("' +
              rclSuiteletURL +
              ' ","_blank","width=1500,height=1200,left=150,top=1000")',
          });
        }
      }
    } catch (e) {
      log.error("beforeLoad", e.message);
    }
  };

  return { beforeLoad };
});