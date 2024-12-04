/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
 * Author: James Gumapac
 * Date:
 * Update: So Approval workflow field automation
 */
define([
  "N/ui/serverWidget",
  "N/record",
  "N/search",
  "../rxrs_util",
  "../rxrs_transaction_lib",
], (serverWidget, record, search, util, rxrs_tran_lib) => {
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
    try {
      if (context.type === "view" || context.type === "edit") {
        const curRec = context.newRecord;
        const status = curRec.getText("custbody_orderstatus");
        const recordName = curRec.getText("custbody_so_trantype");
        log.debug("status", { status, recordName });
        if (status) {
          var hideFld = context.form.addField({
            id: "custpage_hide_buttons",
            label: "not shown - hidden",
            type: serverWidget.FieldType.INLINEHTML,
          });
          var scr = ""; //ext-element-22

          scr += `jQuery('div.uir-record-status').text('${status}');`;
          if (recordName) {
            scr += `jQuery('h1.uir-record-type').text('${recordName}');`;
          }
          log.audit("src", scr);
          hideFld.defaultValue =
            "<script>jQuery(function($){require([], function(){" +
            scr +
            "})})</script>";
        }
      }
    } catch (e) {
      log.error("beforeLoad", e.message);
    }
  };
  const beforeSubmit = (context) => {
    let currentRecord = context.newRecord;
    let idleDate;
    const ORDER_STATUS = {
      WAITING_222_FORM: 3,
      NEW: 1,
    };

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
    try {
      const entityId = currentRecord.getValue("entity");
      const entityrec = record.load({
        type: record.Type.CUSTOMER,
        id: entityId,
      });
      let orderStatus = currentRecord.getValue("custbody_orderstatus");

      let manufId = entityrec.getValue("csegmanufacturer");
      currentRecord.getValue("csegmanufacturer");
      if (!manufId) return;
      currentRecord.setValue({
        fieldId: "csegmanufacturer",
        value: manufId,
      });
      let returnProcedureInfo = getManufReturnProcedure(manufId);
      log.debug("returnProcedureInfo: ", returnProcedureInfo);
      currentRecord.setValue({
        fieldId: "custbody_rxrs_manuf_return_procedure",
        value: returnProcedureInfo.id,
      });
      let rma_type;
      let category = currentRecord.getValue("custbody_kd_rr_category");
      if (category == CATEGORY.C2) {
        rma_type = returnProcedureInfo.custrecord_psauthtypec2;
      } else if (category == CATEGORY.C3_5) {
        rma_type = returnProcedureInfo.custrecord_psauthtypec35;
      } else {
        rma_type = returnProcedureInfo.custrecord_psauthtyperx;
      }
      // if (returnProcedureInfo.custrecord_psauthtypec2) {
      //   rma_type = returnProcedureInfo.custrecord_psauthtypec2;
      //   currentRecord.setValue({
      //     fieldId: "custbody_kd_rr_category",
      //     value: CATEGORY.C2,
      //   });
      // }
      // if (returnProcedureInfo.custrecord_psauthtypec35) {
      //   rma_type = returnProcedureInfo.custrecord_psauthtypec35;
      //   currentRecord.setValue({
      //     fieldId: "custbody_kd_rr_category",
      //     value: CATEGORY.C3_5,
      //   });
      // }
      // if (returnProcedureInfo.custrecord_psauthtyperx) {
      //   rma_type = returnProcedureInfo.custrecord_psauthtyperx;
      //   currentRecord.setValue({
      //     fieldId: "custbody_kd_rr_category",
      //     value: CATEGORY.RX,
      //   });
      // }
      switch (+rma_type) {
        case RMATYPE.No_Authorization:
          currentRecord.setValue({
            fieldId: "custbody_kd_rma_required",
            value: false,
          });
          break;
        case RMATYPE.Manual:
          idleDate = 15;
          currentRecord.setValue({
            fieldId: "custbody_kd_rma_type",
            value: 1,
          });
          currentRecord.setValue({
            fieldId: "custbody_kd_rma_required",
            value: true,
          });
          break;
        case RMATYPE.Online:
          //Automatic
          currentRecord.setValue({
            fieldId: "custbody_kd_rma_type",
            value: 2,
          });
          currentRecord.setValue({
            fieldId: "custbody_kd_rma_required",
            value: true,
          });
          idleDate = 19;
          break;
        case RMATYPE.Destruction:
          currentRecord.setValue({
            fieldId: "custbody_kd_rma_required",
            value: false,
          });
          break;
      }
      log.debug("status", { orderStatus, idleDate });
      if (orderStatus == ORDER_STATUS.NEW && +rma_type == RMATYPE.Manual) {
        let isIdileDate = currentRecord.getValue("custbody_rxrs_idle_date");
        if (!isIdileDate) {
          currentRecord.setValue({
            fieldId: "custbody_rxrs_idle_date",
            value: new Date(
              util.addDaysToDate({
                date: new Date(),
                days: idleDate,
              }),
            ),
          });
        }
      }
      if (orderStatus == ORDER_STATUS.WAITING_222_FORM) {
        let isIdileDate = currentRecord.getValue("custbody_rxrs_idle_date");
        if (!isIdileDate) {
          currentRecord.setValue({
            fieldId: "custbody_rxrs_idle_date",
            value: new Date(
              util.addDaysToDate({
                date: new Date(),
                days: idleDate,
              }),
            ),
          });
        }
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

      let planSelectionType;

      if (context.type == "create") {
        const irsId = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_item_scan",
          line: 0,
        });
        if (irsId) {
          let irsSearch = search.lookupFields({
            type: "customrecord_cs_item_ret_scan",
            id: irsId,
            columns: ["custrecord_irs_plan_selection_type"],
          });
          planSelectionType =
            irsSearch.custrecord_irs_plan_selection_type[0].value;
          log.audit("res", planSelectionType);
          if (planSelectionType) {
            currentRecord.setValue({
              fieldId: "custbody_plan_type",
              value: planSelectionType,
            });
          }
        }
      }

      if (planSelectionType == 11) {
        // GOVERNMENT
        currentRecord.setValue({
          fieldId: "discountitem",
          value: 487142, //	Invoice Adjustment - Government Accounts
        });
        currentRecord = rxrs_tran_lib.setERVDiscountPrice(currentRecord);
      }
      rxrs_tran_lib.setPartialAmount(currentRecord);
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

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

  return { beforeLoad, beforeSubmit };
});
