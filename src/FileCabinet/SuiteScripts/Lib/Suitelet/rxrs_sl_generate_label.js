/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "../rxrs_sl_custom_module",
  "../rxrs_transaction_lib",
  "../rxrs_util",
  "../rxrs_custom_rec_lib",
  "N/cache",
  "N/file",
  "N/record",
  "N/redirect",
  "N/search",
], /**
 * @param{serverWidget} serverWidget
 * @param rxrs_sl_module
 * @param rxrs_tran_lib
 * @param rxrs_vb_lib
 * @param rxrs_util
 * @param rxrs_custom_rec
 * @param cache
 * @param file
 * @param record
 * @param redirect
 */ (
  serverWidget,
  rxrs_sl_module,
  rxrs_tran_lib,
  rxrs_util,
  rxrs_custom_rec,
  cache,
  file,
  record,
  redirect,
  search,
) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (context) => {
    let params = context.request.parameters;

    if (context.request.method === "GET") {
      log.debug("params get", params);
      try {
        let form = displayForms(params);
        context.response.writePage(form);
      } catch (e) {
        log.error("GET", e.message);
      }
    } else {
      log.audit("params post", params);
      let {
        numberOfLabels,
        returnPackageDetails,
        rrId,
        serviceType,
        mrrId,
        action,
      } = params;
      const returnPackageObj = JSON.parse(returnPackageDetails);

      returnPackageObj.rrId = rrId
        ? rrId
        : rxrs_tran_lib.getReturnRequestPerCategory({
            mrrId: returnPackageObj.mrrId,
            category: returnPackageObj.category,
          });
      log.audit("returnPackageObj", returnPackageObj);
      for (let i = 0; i < +numberOfLabels; i++) {
        rxrs_custom_rec.createReturnPackages(returnPackageObj);
      }
      if (returnPackageObj.category == rxrs_util.RRCATEGORY.C2) {
        returnPackageObj.isC2 = true;
        let count = rxrs_custom_rec.getReturnPackageInfo({
          rrId: returnPackageObj.rrId,
          outbound: true,
          getCount: true,
        });
        log.audit("Outbound Count", count);
        if (count === 0) {
          log.audit("returnobj C2,", returnPackageObj);
          let rpId = rxrs_custom_rec.createReturnPackages(returnPackageObj);
          log.audit("rpId", rpId);
          if (rpId) {
            record.submitFields({
              type: rxrs_util.getReturnRequestType(returnPackageObj.rrId),
              id: returnPackageObj.rrId,
              values: {
                transtatus: rxrs_util.rrStatus.PendingPackageReceipt,
              },
            });
          }
        }
      } else {
        returnPackageObj.rrId = rxrs_tran_lib.getReturnRequestPerCategory({
          mrrId: returnPackageObj.mrrId,
          category: returnPackageObj.category,
        });
        record.submitFields({
          type: rxrs_util.getReturnRequestType(returnPackageObj.rrId),
          id: returnPackageObj.rrId,
          values: {
            transtatus: rxrs_util.rrStatus.PendingPackageReceipt,
          },
        });
      }
    }
  };

  /**
   * Creates a form, creates header fields, and then creates a sublist of
   * @param {object}params - parameters
   * @returns {object} form object is being returned.
   */
  function displayForms(params) {
    try {
      log.debug("objClientParams", params);
      let form = serverWidget.createForm({
        title: "Generate Label",
        hideNavBar: true,
      });
      log.audit("form", form);
      form.clientScriptFileId = rxrs_util.getFileId(
        "rxrs_cs_custom_function.js",
      );

      form = createHeaderFields({ form, params });
      return form;
    } catch (e) {
      log.error("displayForms", e.message);
    }
  }

  /**
   * Create the header fields of the Suitelet
   * @param {object}options.form Object form
   * @param {object}options.params paramters passed to the suitelet
   * @return {*}
   */
  const createHeaderFields = (options) => {
    let form = options.form;
    const SERVICE_TYPE = {
      mailIn: 2,
      selfService: 1,
      repService: 3,
    };
    let {
      mrrId,
      generateLabel,
      scheduledPickUp,
      customerId,
      rrId,
      serviceType,
    } = options.params;
    generateLabel = true;
    log.debug("createHeaderFields", options.params);

    try {
      let htmlFileId = rxrs_sl_module.getFileId("SL_loading_html.html"); // HTML file for loading animation
      if (htmlFileId) {
        const dialogHtmlField = form.addField({
          id: "custpage_jqueryui_loading_dialog",
          type: serverWidget.FieldType.INLINEHTML,
          label: "Dialog HTML Field",
        });
        dialogHtmlField.defaultValue = file
          .load({
            id: htmlFileId,
          })
          .getContents();
      }
      let customerField = form
        .addField({
          id: "custpage_entity",
          label: "Customer",
          type: serverWidget.FieldType.SELECT,
          source: "customer",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      const productGroupField = form.addField({
        id: "custpage_product_group",
        label: "Package Control",
        type: serverWidget.FieldType.SELECT,
      });
      if (customerId) {
        customerField.defaultValue = customerId;
      }
      if (serviceType == SERVICE_TYPE.mailIn) {
        productGroupField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        let returnRequestList =
          rxrs_tran_lib.getMasterReturnReturnRequest(mrrId);
        log.audit("returnRequestList", returnRequestList);
        const returnRequestField = form.addField({
          id: "custpage_returnrequest",
          label: "Return Request",
          type: serverWidget.FieldType.SELECT,
        });
        if (returnRequestList.length > 0) {
          returnRequestField.addSelectOption({
            value: " ",
            text: " ",
          });
          for (let i = 0; i < returnRequestList.length; i++) {
            returnRequestField.addSelectOption({
              value: returnRequestList[i].value,
              text: returnRequestList[i].text,
              isSelected: true,
            });
          }
        }
      }

      if (generateLabel == true) {
        let category = [];
        if (rrId) {
          category.push({ text: "C2", value: rxrs_util.RRCATEGORY.C2 });
        } else {
          category = rxrs_custom_rec.getItemRequested(mrrId);
        }

        log.emergency("category", category);

        if (category.length > 0) {
          productGroupField.addSelectOption({
            value: " ",
            text: " ",
          });
          for (let i = 0; i < category.length; i++) {
            productGroupField.addSelectOption({
              value: category[i].value,
              text: category[i].text,
              isSelected: true,
            });
          }
        }
        productGroupField.isMandatory = true;
        const numberOfLabels = form.addField({
          id: "custpage_num_of_labels",
          label: "Number of labels",
          type: serverWidget.FieldType.INTEGER,
        });

        const estimatedShipDateField = form.addField({
          id: "custpage_estimated_ship_date",
          label: "Estimated Ship Date",
          type: serverWidget.FieldType.DATE,
        });
        const weightField = form.addField({
          id: "custpage_ave_box_weight",
          label: "Ave. Box Weight (in lb)",
          type: serverWidget.FieldType.INTEGER,
        });
      } else {
        form.addFieldGroup({
          id: "fieldgroup_options",
          label: "Scheduled Pick Up",
        });
        const startField = form.addField({
          id: "custpage_pick_up_start",
          label: "Start Date",
          type: serverWidget.FieldType.DATETIMETZ,
          container: "fieldgroup_options",
        });
        const endField = form.addField({
          id: "custpage_pick_up_end",
          label: "End Date",
          type: serverWidget.FieldType.DATETIMETZ,
          container: "fieldgroup_options",
        });
      }
      form.addButton({
        id: "custpage_save",
        label: "Save",
        functionName: `createReturnPackages(${JSON.stringify(mrrId)})`,
      });

      return form;
    } catch (e) {
      log.error("createHeaderFields", e.message);
    }
  };

  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      false ||
      (stValue.constructor === Array && stValue.length == 0) ||
      (stValue.constructor === Object &&
        (function (v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  return { onRequest };
});
