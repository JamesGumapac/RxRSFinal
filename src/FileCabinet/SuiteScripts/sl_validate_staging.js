/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "./Lib/rxrs_verify_staging_lib",
  "N/cache",
  "N/file",
], /**
 * @param{serverWidget} serverWidget
 * @param rxrs_vs_util
 * @param cache
 */ (serverWidget, rxrs_vs_util, cache, file) => {
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
      try {
        let form = displayForms(params);
        context.response.writePage(form);
      } catch (e) {
        log.error("GET", e.message);
      }
    }
  };

  /**
   * It creates a form, adds a client script to it, creates header fields, and then creates a sublist of
   * items
   * @param params - parameters
   * @returns The form object is being returned.
   */
  function displayForms(params) {
    try {
      log.debug("objClientParams", params);
      let form = serverWidget.createForm({
        title: "Return Order Verification",
        hideNavBar: true,
      });
      form.clientScriptFileId = rxrs_vs_util.getFileId(
        "rxrs_cs_verify_staging.js"
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
    try {
      let rrId = options.params.rrId;
      let tranId = options.params.tranid;
      let form = options.form;
      let paramInDate = options.params.inDate
      let paramIsHazardous = options.params.isHazardous;
      let paramSelectionType = options.params.selectionType;
      let paramManufacturer = options.params.manufacturer
        ? options.params.manufacturer
        : "";
      let htmlFileId = rxrs_vs_util.getFileId("SL_loading_html.html");
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
      let rrIdField = form
        .addField({
          id: "custpage_rrid",
          label: "Return Request Id",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
      rrId ? (rrIdField.defaultValue = rrId) : null;

      let tranIdField = form
        .addField({
          id: "custpage_tranid",
          label: "Return Request",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      tranId ? (tranIdField.defaultValue = tranId) : null;
      form.addFieldGroup({
        id: "fieldgroup_options",
        label: "Selection Type",
      });

      let selectionType = form
        .addField({
          id: "custpage_radio",
          label: "Returnable",
          type: serverWidget.FieldType.RADIO,
          source: "Returnable",
          container: "fieldgroup_options",
        })
        .updateLayoutType({
          layoutType: serverWidget.FieldLayoutType.OUTSIDE,
        });
      form
        .addField({
          id: "custpage_radio",
          label: "Destruction",
          type: serverWidget.FieldType.RADIO,
          source: "Destruction",
          container: "fieldgroup_options",
        })
        .updateLayoutType({
          layoutType: serverWidget.FieldLayoutType.OUTSIDE,
        });
      form
        .addField({
          id: "custpage_radio",
          label: "In Dated",
          type: serverWidget.FieldType.RADIO,
          source: "InDated",
          container: "fieldgroup_options",
        })
        .updateLayoutType({
          layoutType: serverWidget.FieldLayoutType.OUTSIDE,
        });

      paramSelectionType
        ? (selectionType.defaultValue = paramSelectionType)
        : (selectionType.defaultValue = "Returnable");

      let sublistFields;
      if (
        paramSelectionType == "Returnable" ||
        rxrs_vs_util.isEmpty(paramSelectionType)
      ) {
        let manufacturer = rxrs_vs_util.getReturnableManufacturer({
          rrId: rrId,
          tranId: tranId,
          inDated: false,
          selectionType: paramSelectionType
        });
        //create sublist for Returnables
        log.audit(paramManufacturer);
        if (rxrs_vs_util.isEmpty(paramManufacturer)) {
          sublistFields = rxrs_vs_util.SUBLISTFIELDS.returnableSublist;
          log.emergency("returnableSublist", sublistFields)
          createReturnableSublist({
            form: form,
            rrTranId: rrId,
            rrName: tranId,
            sublistFields: sublistFields,
            value: manufacturer,
            isMainReturnable: false,
            paramManufacturer: paramManufacturer,
          });
        } else {
          sublistFields = rxrs_vs_util.SUBLISTFIELDS.returnableManufacturer;
          // let manuf = []
          // Object.values(manufacturer).map(e => {let name = e.name; manuf.push(name)} )
          let itemsReturnScan = rxrs_vs_util.getItemScanByManufacturer({
            rrId: rrId,
            manufacturer: paramManufacturer,
            inDated: false
          });
          log.debug("itemsReturnScan", itemsReturnScan);
          createReturnableSublist({
            form: form,
            rrTranId: rrId,
            documentNumber: tranId,
            sublistFields: sublistFields,
            value: itemsReturnScan,
            isMainReturnable: false,
            paramManufacturer: paramManufacturer,
          });
        }
      } else if (paramSelectionType == "Destruction") {
        if (rxrs_vs_util.isEmpty(paramIsHazardous)) {
          sublistFields = rxrs_vs_util.SUBLISTFIELDS.destructionSublist;
          let destructionList = rxrs_vs_util.getItemScanByDescrutionType({
            rrId,
            tranId,
          });
          log.emergency("fieldValue", destructionList);
          createDestructioneSublist({
            form: form,
            rrTranId: rrId,
            documentNumber: tranId,
            sublistFields: sublistFields,
            value: destructionList,
            isMainDestruction: true,
          });
        } else {
          let desctructionList = rxrs_vs_util.getDesctructionHazardous({
            rrId: rrId,
            isHazardous: paramIsHazardous,
          });
          log.emergency("destructionlist", desctructionList);
          let sublistFields = rxrs_vs_util.SUBLISTFIELDS.descrutionField;
          createDestructioneSublist({
            form: form,
            rrTranId: rrId,
            documentNumber: tranId,
            sublistFields: sublistFields,
            value: desctructionList,
            isMainDestruction: false,
          });
        }
      } else {
        if (rxrs_vs_util.isEmpty(paramManufacturer)) {
          sublistFields = rxrs_vs_util.SUBLISTFIELDS.inDateSublist;
          let manufByInDated = rxrs_vs_util.getReturnableManufacturer({
            rrId: rrId,
            tranId: tranId,
            inDated: true,
            selectionType: paramSelectionType
          });
          createReturnableSublist({
            form: form,
            rrTranId: rrId,
            rrName: tranId,
            sublistFields: sublistFields,
            value: manufByInDated,
            isMainInDated: true,
            paramManufacturer: paramManufacturer,
          });
        } else {
          sublistFields = rxrs_vs_util.SUBLISTFIELDS.returnableManufacturer;
          let itemsReturnScan = rxrs_vs_util.getItemScanByManufacturer({
            rrId: rrId,
            manufacturer: paramManufacturer,
            inDated: true

          });
          createReturnableSublist({
            form: form,
            rrTranId: rrId,
            rrName: tranId,
            sublistFields: sublistFields,
            value: itemsReturnScan,
            isMainInDated: false,
            paramManufacturer: paramManufacturer,
            paramInDate: paramInDate
          });
        }
      }

      return form;
    } catch (e) {
      log.error("createHeaderFields", e.message);
    }
  };
  /**
   * It creates a returnable sublist on the form and populates it with the items that are passed in
   * @param {object}options.form - The form object that we are adding the sublist to.
   * @param {number}options.rrTranId - Return Request Id
   * @param {object}options.sublistFields SublistFields
   * @param {array} options.value
   * @param {boolean} options.isMainReturnable
   * @param {string} options.rrName
   * @param {string} options.paramManufacturer
   * @param {string} options.paramInDate
   * @returns  Updated Form.
   */
  const createReturnableSublist = (options) => {
    try {
      log.debug("createReturnableSublist", options);
      let inDate = options.paramInDate ? " : " + options.paramInDate : ""
      let manuf = options.paramManufacturer;
      let fieldName = [];
      let form = options.form;
      let sublistFields = options.sublistFields;
      let value = options.value;
      let scriptId = rxrs_vs_util.getFileId("rxrs_cs_verify_staging.js");
      form.clientScriptFileId = scriptId;
      let sublist;

      sublist = form.addSublist({
        id: "custpage_items_sublist",
        type: serverWidget.SublistType.LIST,
        label: `RO ${options.rrName} - RXLINEITEMS :${manuf} ${inDate}`,
      });

      if (manuf) {
        //If the user is in the Manufacturing Group. Add the following UI context below
        form.addButton({
          id: "custpage_verify",
          label: "Update Verification",
          functionName: `verify()`,
        });
        form.addButton({
          id: "custpage_back",
          label: "Back",
          functionName: `backToReturnable()`,
        });
        sublist.addMarkAllButtons();
      }

      sublistFields.forEach((attri) => {
        fieldName.push(attri.id);
        sublist
          .addField({
            id: attri.id,
            type: serverWidget.FieldType[attri.type],
            label: attri.label,
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType[attri.updateDisplayType],
          });
      });

      let mainLineInfo = [];

      value.forEach((val) => {
        let value = Object.values(val);
        let fieldInfo = [];
        for (let i = 0; i < value.length; i++) {
          if(rxrs_vs_util.isEmpty(fieldName[i])) continue
          fieldInfo.push({
            fieldId: fieldName[i],
            value: value[i],
          });
        }
        mainLineInfo.push(fieldInfo);
      });

      populateSublist({
        sublist: sublist,
        fieldInfo: mainLineInfo,
        isMainReturnable: options.isMainReturnable,
      });
    } catch (e) {
      log.error("createReturnableSublist", e.message);
    }
  };
  /**
   * Populate the returnable sublist
   * @param options.sublist
   * @param options.fieldInfo
   * @param options.isMainReturnable
   */
  const populateSublist = (options) => {
    try {
      log.audit("populateSublist", options);
      let sublist = options.sublist;
      let sublistFields = options.fieldInfo;

      if (sublistFields.length > 0) {
        let lineCount = 0;
        sublistFields.forEach((element) => {
          for (let i = 0; i < element.length; i++) {
            try {
              sublist.setSublistValue({
                id: element[i].fieldId,
                line: lineCount,
                value: element[i].value ? element[i].value : " ",
              });
            } catch (e) {
              log.emergency("SetSublist", e.message);
            }
          }

          lineCount++;
        });
      }
    } catch (e) {
      log.error("populateSublist", e.message);
    }
  };
  /**
   * It creates a destruction sublist on the form and populates it with the items that are passed in
   * @param {object}options.form - The form object that we are adding the sublist to.
   * @param {number}options.rrTranId - Return Request Id
   * @param {object}options.sublistFields SublistFields
   * @param {array} options.value
   * @param {boolean} options.isMainReturnable
   * @param {string} options.documentNumber
   * @param {string} options.paramIsHazardous
   * @returns The form is being returned.
   */
  const createDestructioneSublist = (options) => {
    try {
      log.debug("createDestructioneSublist", options);

      let fieldName = [];
      let form = options.form;
      let sublistFields = options.sublistFields;
      let value = options.value;
      let scriptId = rxrs_vs_util.getFileId("rxrs_cs_verify_staging.js");
      form.clientScriptFileId = scriptId;
      let sublist;
      sublist = form.addSublist({
        id: "custpage_items_sublist",
        type: serverWidget.SublistType.LIST,
        label: `RO ${options.documentNumber} - Destruction Line Items :`,
      });

      if (options.isMainDestruction == false) {
        form.addButton({
          id: "custpage_verify",
          label: "Update Verification",
          functionName: `verify()`,
        });
        form.addButton({
          id: "custpage_back",
          label: "Back",
          functionName: `backToReturnable()`,
        });
        sublist.addMarkAllButtons();
      }

      sublistFields.forEach((attri) => {
        fieldName.push(attri.id);
        sublist
          .addField({
            id: attri.id,
            type: serverWidget.FieldType[attri.type],
            label: attri.label,
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType[attri.updateDisplayType],
          });
      });
      let mainLineInfo = [];
      value.forEach((val) => {
        let value = Object.values(val);
        let fieldInfo = [];
        for (let i = 0; i < value.length; i++) {

          fieldInfo.push({
            fieldId: fieldName[i],
            value: value[i],
          });
        }

        mainLineInfo.push(fieldInfo);
      });
      log.debug("mainlineInfo", { sublist, mainLineInfo });
      populateSublist({
        sublist: sublist,
        fieldInfo: mainLineInfo,
        isMainDestruction: null,
      });
    } catch (e) {
      log.error("createDestructioneSublist", e.message);
    }
  };
  /**
   * Populate the returnable sublist
   * @param options.sublist
   * @param options.fieldInfo
   * @param options.isMainReturnable
   */

  return { onRequest };
});
