/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/record", "N/search", "N/runtime", "../rxrs_lib_bag_label"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, runtime, baglib) => {
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
      const binNumberId = getParameter();
      log.audit("GetInput", binNumberId);
      const binRec = record.load({
        type: "bin",
        id: binNumberId,
      });
      let binNumberText;
      const binNumber = binRec.getValue("binnumber");
      log.debug("bin number", binNumber);
      let binName = binNumber.split("-")[0];
      log.debug("bin number", binName);
      let fieldToUpdate = baglib.getFieldToUpdate(binName);
      log.debug("binNummber length", binNumber.split("-").length);
      if (binNumber.split("-").length == 3) {
        binNumberText = binNumber.split("-")[2];
        log.debug("binNummber text", binNumberText.length);
        if (binNumberText.length <= 2) {
          if (binNumberText.length == 2) {
            let letters = baglib.getManufStartLetter({
              startLetter: binNumberText[0],
              endLetter: binNumberText[1],
            });
            log.audit("letters", letters);
            return baglib.getManufList({
              letterStart: letters,
              binNumber: binNumberId,
              binField: fieldToUpdate,
            });
          }
          if (binNumberText.length == 1) {
            let letters = baglib.getManufStartLetter({
              startLetter: binNumberText[0],
              endLetter: binNumberText[0],
            });
            log.audit("letters", letters);
            return baglib.getManufList({
              letterStart: letters,
              binNumber: binNumberId,
              binField: fieldToUpdate,
            });
          }
        } else {
          log.debug("getting manuf based on name contains");
          return baglib.getManufacturer({
            name: binNumberText,
          });
        }
      } else if (binNumber.split("-").length == 2) {
        binNumberText = binNumber.split("-")[1];
        if (typeof +binNumberText[binNumberText.length - 1] == "number") {
          return baglib.getManufacturer({ letter: null, binNumber: null });
        }
      }
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
    let reduceObj = JSON.parse(reduceContext.values);
    log.audit("reduceobj", reduceObj);
    try {
      const binRec = record.load({
        type: "bin",
        id: getParameter(),
      });

      const binNumber = binRec.getValue("binnumber");
      let binName = binNumber.split("-")[0];
      log.debug("bin number", binName);
      let fieldToUpdate = baglib.getFieldToUpdate(binName);

      const manufRec = record.load({
        type: "customrecord_csegmanufacturer",
        id: reduceObj,
      });
      const scriptObj = runtime.getCurrentScript();

      const binNumberId = scriptObj.getParameter({
        name: "custscript_bin",
      });
      let currentBins = manufRec.getValue(fieldToUpdate);
      currentBins.push(binNumberId.toString());
      log.audit("currentBin", { reduceObj, currentBins, binNumberId });
      manufRec.setValue({
        fieldId: fieldToUpdate,
        value: currentBins,
      });

      manufRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("reduceContext", e.message);
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
  const summarize = (summaryContext) => {
    const binRec = record.load({
      type: "bin",
      id: getParameter(),
    });
    binRec.setValue({
      fieldId: "custrecord_manuf_assignment_date",
      value: new Date(),
    });
    binRec.setValue({
      fieldId: "custrecord_assigned_to_manuf",
      value: true,
    });
    log.audit("Updating bin last manuf assigned date", binRec.save());
  };

  function getParameter() {
    const scriptObj = runtime.getCurrentScript();

    return scriptObj.getParameter({
      name: "custscript_bin",
    });
  }

  return { getInputData, reduce, summarize };
});
