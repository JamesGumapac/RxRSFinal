/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/record", "N/search", "N/currentRecord", "N/ui/dialog"], /**
 * @param{record} record
 * @param{search} search
 */ function (record, search, currentRecord, dialog) {
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
    const CATEGORY = {
      RX: 1,
      C2: 3,
      C3_5: 4,
      C1: 7,
    };
    const RMATYPE = {
      Destruction: 1,
      Manual: 2,
      No_Authorization: 3,
      Online: 4,
    };

    let { currentRecord, fieldId, sublistId } = scriptContext;
    try {
      console.log(fieldId);
      switch (fieldId) {
        case "csegmanufacturer":
          let manufId = currentRecord.getValue("csegmanufacturer");
          if (!manufId) return;

          let returnProcedureInfo = getManufReturnProcedure(manufId);
          log.debug("returnProcedureInfo: ", returnProcedureInfo);
          currentRecord.setValue({
            fieldId: "custbody_rxrs_manuf_return_procedure",
            value: returnProcedureInfo.id,
          });
          let rma_type;
          if (returnProcedureInfo.custrecord_psauthtypec2) {
            rma_type = returnProcedureInfo.custrecord_psauthtypec2;
            currentRecord.setValue({
              fieldId: "custbody_kd_rr_category",
              value: CATEGORY.C2,
            });
          }
          if (returnProcedureInfo.custrecord_psauthtypec35) {
            rma_type = returnProcedureInfo.custrecord_psauthtypec35;
            currentRecord.setValue({
              fieldId: "custbody_kd_rr_category",
              value: CATEGORY.C3_5,
            });
          }
          if (returnProcedureInfo.custrecord_psauthtyperx) {
            rma_type = returnProcedureInfo.custrecord_psauthtyperx;
            currentRecord.setValue({
              fieldId: "custbody_kd_rr_category",
              value: CATEGORY.RX,
            });
          }
          log.debug("rma_type", rma_type);
          if (rma_type == RMATYPE.Manual) {
            currentRecord.setValue({
              fieldId: "custbody_kd_rma_type",
              value: 1,
            });
          } else {
            currentRecord.setValue({
              fieldId: "custbody_kd_rma_type",
              value: 2,
            });
          }
          let authorizationEmail =
            returnProcedureInfo.custrecord_psauthemail ||
            returnProcedureInfo.custrecord_psaltpodemail;
          authorizationEmail &&
            currentRecord.setValue({
              fieldId: "custbody_rma_authorization_email",
              value: authorizationEmail,
            });
          returnProcedureInfo.custrecord_fulfillmenttype &&
            currentRecord.setValue({
              fieldId: "custbody_fulfillmenttype",
              value: returnProcedureInfo.custrecord_fulfillmenttype,
            });
          break;
      }
    } catch (e) {
      log.error("fieldChanged", e.message);
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
  function validateField(scriptContext) {}

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
  /**
   * Get the return produce information
   * @param manufId
   * @return {*}
   */
  function getManufReturnProcedure(manufId) {
    try {
      let returnProduceObj = [];
      const customrecord_returnprocedureSearchObj = search.create({
        type: "customrecord_returnprocedure",
        filters: [["custrecord_returnprocmanufacturer", "anyof", manufId]],
        columns: [
          search.createColumn({
            name: "custrecord_psauthtypec2",
            label: "Authorization Type C2",
          }),
          search.createColumn({
            name: "custrecord_psauthtypec35",
            label: "Authorization Type C35",
          }),
          search.createColumn({
            name: "custrecord_psauthrequiredrordestruction",
            label: "Authorization Required For Destruction",
          }),
          search.createColumn({
            name: "custrecord_psauthtyperx",
            label: "Authorization Type Rx",
          }),
          search.createColumn({
            name: "custrecord_psisbatchallowed",
            label: "Batch Allowed",
          }),
          search.createColumn({
            name: "custrecord_psminmaxrequired",
            label: "Is Min/Max Value Required?",
          }),
          search.createColumn({
            name: "custrecord_psincludebrandproducts",
            label: "Include Brand Products",
          }),
          search.createColumn({
            name: "custrecord_psmaxvalue",
            label: "Maximum Value",
          }),
          search.createColumn({
            name: "custrecord_psminprice",
            label: "Min Price",
          }),
          search.createColumn({
            name: "custrecord_psminvalue",
            label: "Minimum Value",
          }),
          search.createColumn({
            name: "custrecord_psnrproc",
            label: "Non-returnable Procedure",
          }),
          search.createColumn({
            name: "custrecord_psauthsendproofofdestruction",
            label: "Send Proof of Destruction",
          }),
          search.createColumn({
            name: "custrecord_showpharmacynameonps",
            label: "Show Pharmacy Name On Packing Slip",
          }),
          search.createColumn({
            name: "custrecord_psauthemail",
            label: "Authorization Email",
          }),
          search.createColumn({
            name: "custrecord_psaltpodemail",
            label: "Alternate POD Email",
          }),
          search.createColumn({
            name: "custrecord_fulfillmenttype",
            label: "Fulfillment Type",
          }),
          search.createColumn({
            name: "custrecord_returnprocmanufacturer",
            label: "Manufacturer",
          }),
          search.createColumn({ name: "custrecord_rpnote", label: "Note" }),
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name",
          }),
        ],
      });

      customrecord_returnprocedureSearchObj.run().each(function (result) {
        returnProduceObj.push({
          id: result.id,
          custrecord_psauthtypec2: result.getValue("custrecord_psauthtypec2"),
          custrecord_psauthtypec35: result.getValue("custrecord_psauthtypec35"),
          custrecord_psauthrequiredrordestruction: result.getValue(
            "custrecord_psauthrequiredrordestruction",
          ),
          custrecord_psauthtyperx: result.getValue("custrecord_psauthtyperx"),
          custrecord_psisbatchallowed: result.getValue(
            "custrecord_psisbatchallowed",
          ),
          custrecord_psminmaxrequired: result.getValue(
            "custrecord_psminmaxrequired",
          ),
          custrecord_psincludebrandproducts: result.getValue(
            "custrecord_psincludebrandproducts",
          ),
          custrecord_psmaxvalue: result.getValue("custrecord_psmaxvalue"),
          custrecord_psminprice: result.getValue("custrecord_psminprice"),
          custrecord_psminvalue: result.getValue("custrecord_psminvalue"),
          custrecord_psnrproc: result.getValue("custrecord_psnrproc"),
          custrecord_psauthsendproofofdestruction: result.getValue(
            "custrecord_psauthsendproofofdestruction",
          ),
          custrecord_showpharmacynameonps: result.getValue(
            "custrecord_showpharmacynameonps",
          ),
          custrecord_psauthemail: result.getValue("custrecord_psauthemail"),
          custrecord_psaltpodemail: result.getValue("custrecord_psaltpodemail"),
          custrecord_fulfillmenttype: result.getValue(
            "custrecord_fulfillmenttype",
          ),
          custrecord_returnprocmanufacturer: result.getValue(
            "custrecord_returnprocmanufacturer",
          ),
        });
        return true;
      });

      return returnProduceObj[0];
    } catch (e) {
      log.error("getManufReturnProcedure", e.message);
    }
  }

  /**
   * Function to prompt the user to enter an RMA number.
   * Creates an input field in a dialog and waits for user confirmation.
   * If a valid RMA number is entered, it is logged and an update function is called.
   */
  const enterRMA = () => {
    try {
      // Create an input element
      let rma = document.createElement("input");
      rma.id = "rmaNumber";
      rma.style.width = "100%";
      rma.style.padding = "5px";
      rma.style.marginTop = "10px";

      // Create a container div
      let container = document.createElement("div");

      // Append the input field to the container
      container.appendChild(rma);

      // Show the dialog
      const result = dialog.create({
        title: "Enter RMA #",
        message: container, // Now the container has the input field
        buttons: [
          { label: "Assign RMA", value: true },
          { label: "Cancel", value: false },
        ],
      });

      // Wait for user action before proceeding
      result.then((value) => {
        if (value) {
          let rmaNumber = rma.value.trim(); // Get the input value

          if (!rmaNumber) {
            throw new Error("Please enter RMA #.");
          }

          console.log("RMA NUMBER:", rmaNumber);
          updateRMA(rmaNumber);
        }
      });
    } catch (error) {
      console.error("Error in popup:", error);
    }
  };

  /**
   * Assigns a new employee to the current record by updating the 'custbody_assignee' field.
   * This function takes the employeeId as a parameter and uses it to update the record.
   * After updating the record, it reloads the page to reflect the changes made.
   *
   * @param {String} employeeId - The employee Id to be assigned to the record
   * @returns {Promise} - A promise that resolves after updating the record and reloading the page
   */
  const updateRMA = async (rmaNumber) => {
    try {
      const rec = currentRecord.get();
      record.submitFields({
        type: rec.type,
        id: rec.id,
        values: {
          custbody_kd_rma_number: rmaNumber,
        },
      });
      location.reload(); // Refresh page after updating the record
    } catch (error) {
      console.error("Error updating record:", error);
    }
  };

  function saveRecord(scriptContext) {}

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    enterRMA: enterRMA,
  };
});
