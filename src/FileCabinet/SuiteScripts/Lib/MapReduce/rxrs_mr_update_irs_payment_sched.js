/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
  "N/record",
  "N/search",
  "../rxrs_verify_staging_lib",
  "../rxrs_payment_sched_lib",
], /**
 * @param{record} record
 * @param{search} search
 * @param vs_lib
 * @param ps_lib
 */ (record, search, vs_lib, ps_lib) => {
  /**
   * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
   * @param {Object} inputContext
   * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {Object} inputContext.ObjectRef - Object that references the input data
   * @typedef {Object} ObjectRef
   * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
   * @property {string} ObjectRef.type - Type of the record instance that contains the input data
   * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
   * @since 2015.2
   */

  const getInputData = (inputContext) => {
    try {
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [
          ["custrecord_scanindated", "is", "T"],
          "AND",
          ["custrecord_ret_start_date", "isnotempty", ""],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_scan_paymentschedule",
            label: "Payment Sched",
          }),
        ],
      });

      return customrecord_cs_item_ret_scanSearchObj;
    } catch (e) {
      log.error("getInputData", e.message);
    }
  };

  /**
   * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
   * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
   * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
   *     provided automatically based on the results of the map stage.
   * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
   *     reduce function on the current group
   * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
   * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {string} reduceContext.key - Key to be processed during the reduce stage
   * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
   *     for processing
   * @since 2015.2
   */
  const reduce = (reduceContext) => {
    const DEFAULT = 12;
    const contextObj = JSON.parse(reduceContext.values);
    let irsId = contextObj.id;
    let irsRec = record.load({
      type: "customrecord_cs_item_ret_scan",
      id: irsId,
    });
    try {
      let inDays = vs_lib.getIndays(contextObj.id);
      let isDefault = Math.sign(inDays) == -1;
      log.audit("isDefault", {
        isDefault: isDefault,
        irsId: irsId,
        inDays: inDays,
      });
      let paymentSchedId =
        isDefault == true ? ps_lib.getPaymentSched(Math.abs(inDays)) : 12;

      if (paymentSchedId && isDefault === true) {
        log.audit("InDays and Payment Sched", {
          inDays,
          paymentSchedId,
          irsId,
        });
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
        log.audit("Setting indated to false", irsId);
        irsRec.setValue({
          fieldId: "custrecord_scanindated",
          value: false,
        });
      }
      irsRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("Reduce Error: " + irsId, e.message);
    }
  };

  /**
   * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
   * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
   * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
   * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
   *     script
   * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
   * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
   * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
   * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
   *     script
   * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
   * @param {Object} summaryContext.inputSummary - Statistics about the input stage
   * @param {Object} summaryContext.mapSummary - Statistics about the map stage
   * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
   * @since 2015.2
   */
  const summarize = (summaryContext) => {};

  return { getInputData, reduce, summarize };
});
