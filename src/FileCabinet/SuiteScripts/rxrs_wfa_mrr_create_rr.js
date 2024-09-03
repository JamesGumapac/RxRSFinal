/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define([
  "N/record",
  "N/runtime",
  "./Lib/rxrs_util",
  "./Lib/rxrs_custom_rec_lib",
  "./Lib/rxrs_transaction_lib",
  "N/task",
], /**
 * @param{record} record
 * @param{runtime} runtime
 * @param rxrsUtil
 * @param customRec
 * @param task
 */ (record, runtime, rxrsUtil, customRec, tranlib, task) => {
  /**
   * Defines the WorkflowAction script trigger point.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
   * @param {string} scriptContext.type - Event type
   * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
   * @since 2016.1
   */
  const onAction = (context) => {
    try {
      const masterRec = context.newRecord;
      const customer = masterRec.getValue({
        fieldId: "custrecord_mrrentity",
      });
      const planSelectionType = masterRec.getValue(
        "custrecord_mrrplanselectiontype",
      );
      const requestedDate = masterRec.getValue("custrecord_kod_mr_requestdt");
      const isLicenseExpired = masterRec.getValue(
        "custrecord_kd_license_expired",
      );
      const isStateLicenseExpired = masterRec.getValue(
        "custrecord_kd_state_license_expired",
      );
      const SERVICETYPECATEGORY = {
        mailIn: 2,
        serlfService: 1,
        refService: 3,
      };

      let category = [];
      const serviceType = masterRec.getValue("custrecord_service_type");
      if (serviceType == SERVICETYPECATEGORY.mailIn) {
        const c2 = masterRec.getValue("custrecord_kd_c2");
        const c3to5 = masterRec.getValue("custrecord_kd_c3to5");
        const rxOtc = masterRec.getValue("custrecord_kd_rxotc");
        if (c2 == true) {
          category.push({ value: 3, text: "C2" });
        }
        if (c3to5 == true) {
          category.push({ value: 4, text: "C3To5" });
        }
        if (rxOtc == true) {
          category.push({ value: 1, text: "RxOTC" });
        }
      } else if (serviceType == SERVICETYPECATEGORY.serlfService) {
        category = customRec.getItemRequested(masterRec.id);
      }

      let rrId;
      log.audit("Category", category);
      let rrCategory = [];
      category.forEach((cat) => {
        rrCategory.push({
          category: cat.value,
          item: rxrsUtil.rxrsItem[cat.text],
          requestedDate: requestedDate,
          masterRecId: masterRec.id,
          customer: customer,
          isLicenseExpired: isLicenseExpired,
          isStateLicenseExpired: isStateLicenseExpired,
          planSelectionType: planSelectionType,
        });
      });
      log.audit("rrCategory", rrCategory);
      rrCategory.forEach((rrCategory) => {
        log.audit("rrCategory", rrCategory.category == rxrsUtil.RRCATEGORY.C2);
        rrId = rxrsUtil.createReturnRequest(rrCategory);

        if (rrCategory.category == rxrsUtil.RRCATEGORY.C2) {
          rrId = tranlib.getReturnRequestPerCategory({
            mrrId: rrCategory.masterRecId,
            category: rxrsUtil.RRCATEGORY.C2,
          });
          log.audit("rrObj", rrId);
          log.audit("Creating 222 form for", rrId);
          const totalItemRequest = customRec.getC2ItemRequested(masterRec.id);
          if (totalItemRequest.length <= 20) {
            customRec.create222Form({
              rrId: rrId,
              page: 1,
            });
          } else {
            let i = totalItemRequest.length / 20;
            for (let i = 0; i < Math.ceil(i); i++) {
              customRec.create222Form({
                rrId: rrId,
                page: i,
              });
            }
          }
        }
      });
    } catch (e) {
      log.error("onAction", e.message);
    }
  };

  return { onAction };
});
