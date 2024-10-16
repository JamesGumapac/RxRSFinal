/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/record", "N/search", "N/runtime"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, runtime) => {
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
      return getExpiredEntity(getParameters());
    } catch (e) {
      log.error("getInputData", e.message);
    }
  };

  /**
   * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
   * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
   * context.
   * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
   *     is provided automatically based on the results of the getInputData stage.
   * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
   *     function on the current key-value pair
   * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
   *     pair
   * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {string} mapContext.key - Key to be processed during the map stage
   * @param {string} mapContext.value - Value to be processed during the map stage
   * @since 2015.2
   */

  const map = (mapContext) => {};

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
    try {
      let licenseFieldText = getParameters().licenseField;
      // log.audit("reduce", JSON.parse(reduceContext.values));
      let updatedEntityId;

      if (licenseFieldText.includes("stae")) {
        log.audit("Updating State");
        const reduceObj = JSON.parse(reduceContext.values);
        updatedEntityId = record.submitFields({
          type: reduceObj.recType.toLowerCase(),
          id: reduceObj.id,
          values: {
            custentity_kd_stae_license_expired: true,
          },
        });
        log.audit("Updated State License Entity ", {
          updatedEntityId,
          licenseFieldText,
        });
      } else {
        const reduceObj = JSON.parse(reduceContext.values);
        log.audit("Updating DEA");
        updatedEntityId = record.submitFields({
          type: reduceObj.recType.toLowerCase(),
          id: reduceObj.id,
          values: {
            custentity_kd_license_expired: true,
          },
        });
        log.audit("Updated DEA License Entity ", {
          updatedEntityId,
          licenseFieldText,
        });
      }
    } catch (e) {
      log.error("reduce", e.message);
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

  /**
   * Get the Entity that is Expired on or before today
   * @param options.licenseDate License Date for DEA or State
   * @param options.licenseField = Checkbox for DEA or State
   * @returns {FlatArray<*[], 1>[]|*[]}
   */
  function getExpiredEntity(options) {
    log.audit("getExpiredEntity", options);
    try {
      let finalRes = [];
      const entitySearch = search.create({
        type: "entity",
        filters: [
          [options.licenseDate, "onorbefore", "today"],
          "AND",
          [options.licenseField, "is", "F"],
        ],
        columns: [
          search.createColumn({
            name: "custentity_kd_license_exp_date",
            label: "DEA License Expiration Date",
          }),
          search.createColumn({
            name: "custentity_kd_license_expired",
            label: "DEA License Expired",
          }),
          search.createColumn({
            name: "custentity_state_license_exp",
            label: "State License Expiration Date",
          }),
          search.createColumn({
            name: "custentity_kd_stae_license_expired",
            label: "State License Expired",
          }),
          search.createColumn({
            name: "formulatext",
            formula: "{type}",
            label: "Formula (Text)",
          }),
        ],
      });
      const searchResultCount = entitySearch.runPaged().count;
      log.audit("getExpiredEntity searchResultCount", searchResultCount);
      if (searchResultCount == 0) return;
      if (searchResultCount > 4000) {
        const searchObj = entitySearch.runPaged({
          pageSize: 1000,
        });
        searchObj.pageRanges.forEach(function (pageRange) {
          let resultObj = [];
          searchObj
            .fetch({
              index: pageRange.index,
            })
            .data.forEach(function (result) {
              const id = result.id;
              const dateExp = result.getValue({
                name: "custentity_kd_license_exp_date",
              });
              const stateDateExp = result.getValue({
                name: "custentity_state_license_exp",
              });
              const isExpired = result.getValue({
                name: "custentity_kd_license_expired",
              });
              const stateLicenseisExpired = result.getValue({
                name: "custentity_kd_stae_license_expired",
              });
              const recType = result.getValue({
                name: "formulatext",
                formula: "{type}",
              });
              resultObj.push({
                id: id,
                dateExp: dateExp,
                stateDateExp: stateDateExp,
                isExpired: isExpired,
                stateLicenseisExpired: stateLicenseisExpired,
                recType: recType,
              });
              return true;
            });
          finalRes.push(resultObj);
        });
        return finalRes.flat(1);
      } else {
        let resultObj = [];
        entitySearch.run().forEach(function (result) {
          const id = result.id;
          const dateExp = result.getValue({
            name: "custentity_kd_license_exp_date",
          });
          const stateDateExp = result.getValue({
            name: "custentity_state_license_exp",
          });
          const isExpired = result.getValue({
            name: "custentity_kd_license_expired",
          });
          const stateLicenseisExpired = result.getValue({
            name: "custentity_kd_stae_license_expired",
          });
          const recType = result.getValue({
            name: "formulatext",
            formula: "{type}",
          });
          resultObj.push({
            id: id,
            dateExp: dateExp,
            stateDateExp: stateDateExp,
            isExpired: isExpired,
            stateLicenseisExpired: stateLicenseisExpired,
            recType: recType,
          });
          return true;
        });
        return resultObj;
      }
    } catch (e) {
      log.error("getEntity", e.message);
    }
  }

  function getParameters() {
    let license = runtime.getCurrentScript().getParameter({
      name: "custscript_rxrs_license_field",
    });
    return {
      licenseDate: license.split(",")[0],
      licenseField: license.split(",")[1],
    };
  }

  return { getInputData, reduce, summarize };
});
