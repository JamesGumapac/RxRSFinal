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
  "../rxrs_entity_lib",
], (serverWidget, record, search, util, rxrs_tran_lib, entitylib) => {
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
    Manual: 1,
    Automatic: 2,
    Shipped: 3,
    Destruction: 4,
  };
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
    const { newRecord, type } = context;
    let idleDate;

    try {
      let tranid = "";
      const remitToPrefix = newRecord.getValue("custbody_remit_to_prefix");

      const entityId = newRecord.getValue("entity");
      const cardinalCode = entitylib.getManufInfo({ entityId: entityId });
      if (remitToPrefix) {
        switch (remitToPrefix) {
          case "MKRX":
            tranid = `${remitToPrefix}${newRecord.id}`;
            break;
          default:
            tranid = `${remitToPrefix}${newRecord.id}A${cardinalCode}`;
            break;
        }
        newRecord.setValue({
          fieldId: "tranid",
          value: tranid,
        });
      }
      const entityrec = record.load({
        type: record.Type.CUSTOMER,
        id: entityId,
      });
      let orderStatus = newRecord.getValue("custbody_orderstatus");

      let manufId = entityrec.getValue("csegmanufacturer");
      newRecord.getValue("csegmanufacturer");
      if (!manufId) return;
      newRecord.setValue({
        fieldId: "csegmanufacturer",
        value: manufId,
      });
      let returnProcedureInfo = getManufReturnProcedure(manufId);
      log.debug("returnProcedureInfo: ", returnProcedureInfo);
      newRecord.setValue({
        fieldId: "custbody_rxrs_manuf_return_procedure",
        value: returnProcedureInfo.id,
      });
      let rma_type = newRecord.getValue("custbody_kd_rma_type");
      // let category = newRecord.getValue("custbody_kd_rr_category");
      // if (category == CATEGORY.C2) {
      //   rma_type = returnProcedureInfo.custrecord_psauthtypec2;
      // } else if (category == CATEGORY.C3_5) {
      //   rma_type = returnProcedureInfo.custrecord_psauthtypec35;
      // } else {
      //   rma_type = returnProcedureInfo.custrecord_psauthtyperx;
      // }
      // if (returnProcedureInfo.custrecord_psauthtypec2) {
      //   rma_type = returnProcedureInfo.custrecord_psauthtypec2;
      //   newRecord.setValue({
      //     fieldId: "custbody_kd_rr_category",
      //     value: CATEGORY.C2,
      //   });
      // }
      // if (returnProcedureInfo.custrecord_psauthtypec35) {
      //   rma_type = returnProcedureInfo.custrecord_psauthtypec35;
      //   newRecord.setValue({
      //     fieldId: "custbody_kd_rr_category",
      //     value: CATEGORY.C3_5,
      //   });
      // }
      // if (returnProcedureInfo.custrecord_psauthtyperx) {
      //   rma_type = returnProcedureInfo.custrecord_psauthtyperx;
      //   newRecord.setValue({
      //     fieldId: "custbody_kd_rr_category",
      //     value: CATEGORY.RX,
      //   });
      // }
      switch (+rma_type) {
        case RMATYPE.Automatic:
          newRecord.setValue({
            fieldId: "custbody_kd_rma_required",
            value: false,
          });
          break;
        case RMATYPE.Manual:
          idleDate = 15;
          // newRecord.setValue({
          //   fieldId: "custbody_kd_rma_type",
          //   value: 1,
          // });
          newRecord.setValue({
            fieldId: "custbody_kd_rma_required",
            value: true,
          });
          break;
        case RMATYPE.Shipped:
          //Automatic
          // newRecord.setValue({
          //   fieldId: "custbody_kd_rma_type",
          //   value: 2,
          // });
          newRecord.setValue({
            fieldId: "custbody_kd_rma_required",
            value: true,
          });
          idleDate = 19;
          break;
        case RMATYPE.Destruction:
          newRecord.setValue({
            fieldId: "custbody_kd_rma_required",
            value: false,
          });
          break;
      }
      log.debug("status", { orderStatus, idleDate });
      if (orderStatus == ORDER_STATUS.NEW && +rma_type == RMATYPE.Manual) {
        let isIdileDate = newRecord.getValue("custbody_rxrs_idle_date");
        if (!isIdileDate) {
          newRecord.setValue({
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
        let isIdileDate = newRecord.getValue("custbody_rxrs_idle_date");
        if (!isIdileDate) {
          newRecord.setValue({
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
        newRecord.setValue({
          fieldId: "custbody_rma_authorization_email",
          value: authorizationEmail,
        });
      returnProcedureInfo.custrecord_fulfillmenttype &&
        newRecord.setValue({
          fieldId: "custbody_fulfillmenttype",
          value: returnProcedureInfo.custrecord_fulfillmenttype,
        });

      rxrs_tran_lib.setPartialAmount(newRecord);
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };
  const afterSubmit = (context) => {
    // const currentRecord = context.newRecord;
    // log.audit("context afterSubmit", context.type);
    // try {
    //   const entityId = currentRecord.getValue("entity");
    //   let rma_type = currentRecord.getValue("custbody_kd_rma_type");
    //   const rmaRequired = currentRecord.getValue("custbody_kd_rma_required");
    //   const tranId = currentRecord.getValue("tranid");
    //   log.audit("RMA VAL", { rma_type, rmaRequired, tranId });
    //   log.audit("RMA", rmaRequired == true && +rma_type == RMATYPE.Manual);
    //
    //   if (rmaRequired == true && +rma_type == RMATYPE.Manual) {
    //     util.createTaskRecord({
    //       entityId: entityId,
    //       title: `Request RMA # ${currentRecord.getValue("custbody_kd_rma_number")} for| ${tranId}`,
    //       entityName: currentRecord.getText("entity"),
    //       form: 157, //RXRS | RAM# Task Form
    //       transaction: currentRecord.id,
    //       link: `<a href ="${util.generateRedirectLink({
    //         type: "salesorder",
    //         id: currentRecord.id,
    //       })}">${currentRecord.getValue("tranid")}</a>`,
    //       replaceMessage: true,
    //     });
    //   }
    // } catch (e) {
    //   log.error("afterSubmit", e.message);
    // }
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

  return { beforeLoad, beforeSubmit, afterSubmit };
});
