/**
 * @NApiVersion 2.1
 */
define([
  "N/record",
  "N/render",
  "N/search",
  "N/ui/dialog",
  "N/ui/message",
  "N/ui/serverWidget",
  "./rxrs_custom_rec_lib",
  "N/url",
], /**
 * @param{record} record
 * @param{render} render
 * @param{search} search
 * @param{dialog} dialog
 * @param{message} message
 * @param{serverWidget} serverWidget
 * @param customrec
 * @param url
 */ (record, render, search, dialog, message, serverWidget, customrec, url) => {
  let SOFORM222SUBLIST = [
    {
      id: "custpage_select",
      type: "CHECKBOX",
      label: "Select",
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_item",
      type: "SELECT",
      label: "Item",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_linekey",
      type: "TEXT",
      label: "Line Key",
      updateDisplayType: "HIDDEN",
    },
    {
      id: "custpage_form222_ref",
      type: "TEXT",
      label: "222 Form Number",
      updateDisplayType: "ENTRY",
    },
  ];
  let CMUPLOADFIELDS = [
    {
      id: "custpage_creditmemo",
      type: "TEXT",
      label: "CREDIT MEMO NUMBER",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_debitmemo",
      type: "TEXT",
      label: "DEBIT MEMO",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_amount",
      type: "INTEGER",
      label: "AMOUNT",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_result",
      type: "TEXT",
      label: "RESULT",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_fullamount",
      type: "TEXT",
      label: "FULL AMOUNT",
      updateDisplayType: "INLINE",
    },

    {
      id: "custpage_error",
      type: "TEXT",
      label: "ERROR",
      updateDisplayType: "INLINE",
    },
  ];
  let ADDCREDITMEMOSUBLIST = [
    {
      id: "custpage_select",
      type: "CHECKBOX",
      label: "Select",
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_lineuniquekey",
      type: "TEXT",
      label: "Line UniqueKey",
      updateDisplayType: "HIDDEN",
    },
    {
      id: "custpage_itemid",
      type: "TEXT",
      label: "item id",
      updateDisplayType: "HIDDEN",
    },
    {
      id: "custpage_ndc",
      type: "TEXT",
      label: `<b>NDC</b>`,
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_description",
      type: "TEXT",
      label: `<b>Description </b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_lot_number",
      type: "TEXT",
      label: `<b>Lot Number</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_exp_date",
      type: "TEXT",
      label: `<b>Exp. Date</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_full_partial",
      type: "TEXT",
      label: `<b>FULL/PARTIAL  <br> PACKAGE</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_package_size",
      type: "TEXT",
      label: `<b>Package <br> Size</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_full",
      type: "TEXT",
      label: `<b>Full <br> Quantity</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_partial",
      type: "TEXT",
      label: `<b>Partial <br> Quantity</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_packing_slip_price",
      type: "CURRENCY",
      label: `<b>Packing <br>Slip Price</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_packing_slip_value",
      type: "CURRENCY",
      label: `<b>Packing<br> Slip Value</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_unit_price",
      type: "CURRENCY",
      label: `<b>UNIT PRICE</b>`,
      updateDisplayType: "ENTRY",
    },
    {
      id: "custpage_amount_paid",
      type: "CURRENCY",
      label: `<b>Credit Received</b>`,
      updateDisplayType: "ENTRY",
    },
    // {
    //   id: "custpage_erv_discounted_unit_price",
    //   type: "CURRENCY",
    //   label: "ERV DISCOUNTED UNIT PRICE",
    //   updateDisplayType: "ENTRY",
    // },
    // {
    //   id: "custpage_erv_discounted_amount",
    //   type: "CURRENCY",
    //   label: "ERV DISCOUNTED AMOUNT",
    //   updateDisplayType: "ENTRY",
    // },
    {
      id: "custpage_credit_memo",
      type: "TEXT",
      label: "CREDIT MEMO REFERENCE ID",
      source: "customrecord_credit_memo_line_applied",
      updateDisplayType: "HIDDEN",
    },
    {
      id: "custpage_credit_memo_parent",
      type: "TEXT",
      label: "ID",
      updateDisplayType: "HIDDEN",
    },
    {
      id: "custpage_credit_memo_parent2",
      type: "TEXT",
      label: `<b>CM REFERENCE</b>`,
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_paid_customer",
      type: "TEXT",
      label: `<b>PAID CUSTOMER</b>`,
      updateDisplayType: "NORMAL",
    },
  ];
  let VIEWCREDITMEMOSUBLIST = [
    {
      id: "custpage_notreconciled",
      type: "CHECKBOX",
      label: "NOT RECONCILED",
      updateDisplayType: "NORMAL",
    },
    {
      id: "custpage_internalid",
      type: "TEXT",
      label: "ID",
      updateDisplayType: "HIDDEN",
    },
    {
      id: "custpage_cm_number",
      type: "TEXT",
      label: "Credit Memo No.",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_issued_on",
      type: "TEXT",
      label: "ISSUED ON",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_created_on",
      type: "TEXT",
      label: "Created On",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_created_by",
      type: "TEXT",
      label: "Created By",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_amount",
      type: "CURRENCY",
      label: "amount",
      updateDisplayType: "INLINE",
    },
  ];
  const VIEWEDITLINESEARCHCOLUMN = [
    search.createColumn({
      name: "custrecord_cs_item_ndc",
      label: "Item Details Display - NDC",
    }),
    search.createColumn({
      name: "salesdescription",
      join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
      label: "Description",
    }),
    search.createColumn({
      name: "custrecord_cs_item_manufacturer",
      label: "Item manufacturer",
    }),
    search.createColumn({ name: "created", label: "Scanned on" }),
    search.createColumn({
      name: "custrecord_cs_lotnum",
      label: "Serial/Lot Number",
    }),
    search.createColumn({
      name: "custrecord_cs_full_partial_package",
      label: "Full/Partial Package",
    }),
    search.createColumn({
      name: "custrecord_cs_expiration_date",
      label: "Expiration Date",
    }),
    search.createColumn({
      name: "custrecord_cs__mfgprocessing",
      label: "Mfg Processing",
    }),
    search.createColumn({
      name: "custrecord_cs__rqstprocesing",
      label: "Pharmacy Processing",
    }),
    search.createColumn({
      name: "internalid",
      join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
      label: "Internal ID",
    }),

    search.createColumn({ name: "custrecord_scanrate", label: "Rate" }),
    search.createColumn({
      name: "custrecord_isc_overriderate",
      label: "Override Rate",
    }),
    search.createColumn({ name: "custrecord_cs_qty", label: "Qty" }),
    search.createColumn({
      name: "custrecord_scanbagtaglabel",
      label: "Bag Tag Label",
    }),
    search.createColumn({
      name: "custrecord_isc_inputrate",
      label: "Input Rate",
    }),
    search.createColumn({
      name: "custrecord_ret_start_date",
      label: "In Date",
    }),
    search.createColumn({
      name: "custrecord_irc_total_amount",
      sort: search.Sort.ASC,
      label: "Amount",
    }),
    search.createColumn({
      name: "custrecord_cs_return_req_scan_item",
      sort: search.Sort.ASC,
      label: "item id",
    }),
  ];
  /**
   * It creates a billable expense sublist on the form and populates it with the items that are passed in
   * @param {object}options.form - The form object that we are adding the sublist to.
   * @param {object}options.sublistFields SublistFields
   * @param {array} options.value - Saved Search results
   * @param {string} options.title - Sublist Title
   * @param {string} options.creditMemoId
   * @returns  Updated Form.
   */
  const createSublist = (options) => {
    try {
      log.debug("createSublist", options);

      let fieldName = [];
      let { form, sublistFields, title, value, clientScriptAdded } = options;
      if (!clientScriptAdded) {
        form.clientScriptFileId = getFileId("rxrs_cs_verify_staging.js");
      }

      let sublist;
      sublist = form.addSublist({
        id: "custpage_items_sublist",
        type: serverWidget.SublistType.LIST,
        label: title,
      });
      sublist.addButton({
        id: "custpage_markall",
        label: "Mark All",
        functionName: `markAll("true")`,
      });
      sublist.addButton({
        id: "custpage_unmarkall",
        label: "Unmark All",
        functionName: `markAll("false")`,
      });
      sublistFields.forEach((attri) => {
        // log.debug("attri", attri.id);
        try {
          if (attri.id == "custpage_item") {
            sublist
              .addField({
                id: attri.id,
                type: serverWidget.FieldType.SELECT,
                label: attri.label,
                source: "item",
              })
              .updateDisplayType({
                displayType:
                  serverWidget.FieldDisplayType[attri.updateDisplayType],
              });
          } else {
            sublist
              .addField({
                id: attri.id,
                type: serverWidget.FieldType[attri.type],
                label: attri.label,
              })
              .updateDisplayType({
                displayType:
                  serverWidget.FieldDisplayType[attri.updateDisplayType],
              });
          }
          if (
            attri.id === "custpage_select" ||
            attri.id === "custpage_form222_ref"
          ) {
          } else {
            fieldName.push(attri.id);
          }
        } catch (e) {
          log.error("error in ", { error: e.message, id: attri.id });
        }
      });

      // log.debug("fieldName", fieldName);
      let mainLineInfo = [];
      value.forEach((val) => {
        try {
          let value = Object.values(val);
          let fieldInfo = [];
          for (let i = 0; i < value.length; i++) {
            //  log.debug("fieldName[i]", fieldName[i]);
            if (isEmpty(fieldName[i])) continue;
            if (
              fieldName[i] == "custpage_select" ||
              fieldName[i] == "custpage_form222_ref" ||
              fieldName[i] == "custpage_nonreturnable_reason"
            ) {
            } else {
              //  log.debug("else");
              fieldInfo.push({
                fieldId: fieldName[i],
                value: value[i],
              });
            }
          }
          // log.audit("fieldInfo", fieldInfo);
          mainLineInfo.push(fieldInfo);
        } catch (e) {
          log.error("ERROR ON FIELD", {
            error: e.message,
            Field: fieldName[i],
            value: value[i],
          });
        }
      });

      populateSublist({
        sublist: sublist,
        fieldInfo: mainLineInfo,
      });
    } catch (e) {
      log.error("createSublist", e.message);
    }
  };
  /**
   * Populate the sublist
   * @param options.sublist
   * @param options.fieldInfo
   * @param options.creditMemoId
   */
  const populateSublist = (options) => {
    try {
      // log.audit("populateSublist", options);
      let sublist = options.sublist;
      let sublistFields = options.fieldInfo;
      if (sublistFields.length > 0) {
        let lineCount = 0;
        sublistFields.forEach((element) => {
          for (let i = 0; i < element.length; i++) {
            log.emergency("element", element[i]);
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
   * Return file Id based on filename
   * @param fileName
   * @returns {number}
   */
  function getFileId(fileName) {
    try {
      const fileSearch = search
        .create({
          type: "file",
          filters: [["name", "is", fileName]],
        })
        .run()
        .getRange({ start: 0, end: 1 });
      return fileSearch[0].id;
    } catch (e) {
      log.error("getFileId", e.message);
    }
  }

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

  /**
   * Create Sublist for the Item Requested of the return request
   * @param context
   */
  function addC2ItemsReqSublist(context) {
    context.form.addTab({
      id: "custpage_tab_items_requested",
      label: "Return Item Requested",
    });
    log.debug("addC2ItemsReqSublist", "Added Items Requested tab");

    const objSublist = context.form.addSublist({
      id: "custpage_sublist_items_requested",
      type: serverWidget.SublistType.LIST,
      label: "Items Requested",
      tab: "custpage_tab_items_requested",
    });
    objSublist.addField({
      id: "custpage_edit",
      type: serverWidget.FieldType.TEXT,
      label: "Edit",
    });
    objSublist
      .addField({
        id: "custpage_col_id",
        label: "ID",
        type: serverWidget.FieldType.SELECT,
        source: "customrecord_kod_mr_item_request",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    objSublist
      .addField({
        id: "custpage_col_item",
        label: "Item",
        type: serverWidget.FieldType.SELECT,
        source: "item",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    objSublist
      .addField({
        id: "custpage_col_item_description",
        label: "Item Description",
        type: serverWidget.FieldType.TEXT,
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    objSublist
      .addField({
        id: "custpage_col_item_ndc",
        label: "Item NDC",
        type: serverWidget.FieldType.TEXT,
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    objSublist
      .addField({
        id: "custpage_col_item_qty",
        label: "Quantity",
        type: serverWidget.FieldType.TEXT,
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    objSublist
      .addField({
        id: "custpage_col_item_ful_par",
        label: "Full/Partial",
        type: serverWidget.FieldType.SELECT,
        source: "customlist_kod_fullpartial",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    objSublist
      .addField({
        id: "custpage_col_item_form_222_no",
        label: "Form 222 No.",
        type: serverWidget.FieldType.TEXT,
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    objSublist.addField({
      id: "custpage_col_item_form_222_ref_no",
      type: serverWidget.FieldType.TEXT,
      label: "Form 222 Ref No.",
    });
    const itemsRequested = customrec.getReturnRequestItemRequested(
      context.newRecord.id,
    );

    const domain = url.resolveDomain({
      hostType: url.HostType.APPLICATION,
    });

    for (let i = 0; i < itemsRequested.length; i++) {
      let editUrl = url.resolveRecord({
        recordType: "customrecord_kod_mr_item_request",
        recordId: itemsRequested[i].id,
        isEditMode: true,
      });
      let lineUrl = "https://" + domain + editUrl;
      objSublist.setSublistValue({
        id: "custpage_edit",
        line: i,
        value: '<a href="' + lineUrl + '">EDIT</a>',
      });
      objSublist.setSublistValue({
        id: "custpage_col_id",
        value: itemsRequested[i].id,
        line: i,
      });
      objSublist.setSublistValue({
        id: "custpage_col_item",
        value: itemsRequested[i].item,
        line: i,
      });
      objSublist.setSublistValue({
        id: "custpage_col_item_description",
        value: itemsRequested[i].displayname,
        line: i,
      });
      objSublist.setSublistValue({
        id: "custpage_col_item_ndc",
        value: itemsRequested[i].ndc,
        line: i,
      });
      if (itemsRequested[i].qty != "") {
        objSublist.setSublistValue({
          id: "custpage_col_item_qty",
          value: itemsRequested[i].qty,
          line: i,
        });
      }
      objSublist.setSublistValue({
        id: "custpage_col_item_ful_par",
        value: itemsRequested[i].fulpar,
        line: i,
      });
      if (itemsRequested[i].form222No != "") {
        objSublist.setSublistValue({
          id: "custpage_col_item_form_222_no",
          value: itemsRequested[i].form222No,
          line: i,
        });
      }
      if (itemsRequested[i].form222RefNo != "") {
        objSublist.setSublistValue({
          id: "custpage_col_item_form_222_ref_no",
          value: itemsRequested[i].form222RefNo,
          line: i,
        });
        let form222RefNoViewUrl = url.resolveRecord({
          recordType: "customrecord_kd_222formrefnum",
          recordId: itemsRequested[i].form222RefNoId,
          isEditMode: false,
        });
        let lineUrl = "https://" + domain + editUrl;
        objSublist.setSublistValue({
          id: "custpage_col_item_form_222_ref_no",
          line: i,
          value:
            '<a href="' +
            form222RefNoViewUrl +
            '">' +
            itemsRequested[i].form222RefNo +
            "</a>",
        });
      }
    }
  }

  /**
   * Hides a specific field in a sublist on a form.
   *
   * @param {Object} options - An object containing the form object, sublist id, and field id.
   * @param {Object} options.formObj - The form object containing the sublist.
   * @param {string} options.sublistId - The id of the sublist where the field is located.
   * @param {string} options.fieldId - The id of the field to be hidden.
   *
   * @return {void} - This method does not return anything.
   */
  function hideColumnField(options) {
    log.audit("hideColumnField", options);
    const { formObj, sublistId, fieldId } = options;
    try {
      const formSublist = formObj.getSublist({
        id: sublistId,
      });
      if (formSublist) {
        const formField = formSublist.getField({
          id: fieldId,
        });
        if (
          formField &&
          typeof formField !== "undefined" &&
          formField !== null
        ) {
          formField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN,
          });
        }
      }
    } catch (error) {
      log.error({
        title: "Error occurred when hiding field",
        details: JSON.stringify({
          sublistId: sublistId,
          fieldId: fieldId,
        }),
      });
    }
  }

  return {
    createSublist: createSublist,
    getFileId,
    SOFORM222SUBLIST,
    ADDCREDITMEMOSUBLIST,
    addC2ItemsReqSublist,
    CMUPLOADFIELDS,
    VIEWCREDITMEMOSUBLIST,
    hideColumnField: hideColumnField,
  };
});
