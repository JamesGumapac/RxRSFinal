/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/search"], function (search) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {}

  /**
   * Function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @since 2015.2
   */
  function fieldChanged(scriptContext) {
    const NONRETURNABLE = 1;
    let { currentRecord, fieldId } = scriptContext;

    if (fieldId == "custrecord_cs__rqstprocesing") {
      const pharmaProcessing = currentRecord.getValue(
        "custrecord_cs__rqstprocesing",
      );
      console.log(pharmaProcessing);
      if (pharmaProcessing == NONRETURNABLE)
        currentRecord.setValue({
          fieldId: "custrecord_final_payment_schedule",
          value: 12,
        });
    }
  }

  /**
   * Function to be executed when field is slaved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   *
   * @since 2015.2
   */
  function postSourcing(scriptContext) {}

  /**
   * Function to be executed after sublist is inserted, removed, or edited.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function sublistChanged(scriptContext) {}

  /**
   * Function to be executed after line is selected.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function lineInit(scriptContext) {}

  /**
   * Validation function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @returns {boolean} Return true if field is valid
   *
   * @since 2015.2
   */
  function validateField(scriptContext) {
    let { currentRecord, fieldId } = scriptContext;
    const billInteranlId = currentRecord.getValue(
      "custrecord_rxrs_bill_internal_id",
    );
    if (!billInteranlId) return;
    try {
      if (
        fieldId == "custrecord_cs__mfgprocessing" ||
        fieldId == "custrecord_cs__rqstprocesing"
      ) {
        const billStatus = getCertainField({
          id: billInteranlId,
          type: "vendorbill",
          columns: "status",
        });
        console.log(billStatus);
        if (billStatus == "paidInFull") {
          alert(
            "Cannot change status of the processing, related bill record is already paid in full",
          );
          return false;
        } else {
          return true;
        }
      }
    } catch (e) {
      log.error("validateField", e.message);
    }
  }

  /**
   * Validation function to be executed when sublist line is committed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateLine(scriptContext) {}

  /**
   * Validation function to be executed when sublist line is inserted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateInsert(scriptContext) {}

  /**
   * Validation function to be executed when record is deleted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateDelete(scriptContext) {}

  /**
   * Validation function to be executed when record is saved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @returns {boolean} Return true if record is valid
   *
   * @since 2015.2
   */
  function saveRecord(scriptContext) {}

  /**
   * Get trancation status
   * @param {string}options.type
   * @param {string}options.id
   * @param {string}options.columns
   */
  function getCertainField(options) {
    let { type, id, columns } = options;
    try {
      const tranSearch = search.lookupFields({
        type: type,
        id: id,
        columns: [columns],
      });
      return tranSearch[columns][0].value;
    } catch (e) {
      log.error("getTrans...0Status", e.message);
    }
  }

  return {
    validateField: validateField,
    fieldChanged: fieldChanged,
  };
});
