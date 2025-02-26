/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "../rxrs_verify_staging_lib",
  "N/cache",
  "N/search",
  "N/file",
  "N/record",
  "N/redirect",
  "../rxrs_lib_bag_label",
  "../rxrs_util",
  "../rxrs_custom_rec_lib",
  "N/ui/message",
], /**
 * @param{serverWidget} serverWidget
 * @param rxrs_vs_util
 * @param cache
 * @param file
 * @param record
 * @param redirect
 */ (
  serverWidget,
  rxrs_vs_util,
  cache,
  search,
  file,
  record,
  redirect,
  bag,
  util,
  customrec,
  message,
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
      try {
        let form = displayForms(params);
        context.response.writePage(form);
      } catch (e) {
        log.error("GET", e.message);
      }
    }
  };

  /**
   * Creates a form, adds a client script to it, creates header fields, and then creates a sublist of
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
        "rxrs_cs_verifystaging.js",
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
    let { rrId, tranId, mrrId, returnList, category } = options.params;

    log.debug("createHeaderFields returnList", returnList);
    try {
      returnList = JSON.parse(options.params.returnList);
      returnList = returnList.split("_");
    } catch (e) {
      log.error("returnList", e.message);
    }

    log.emergency("returnList", returnList);
    let paramInDate = options.params.inDate;
    let manufId;
    let binSearchParams = {};
    let paramIsHazardous = options.params.isHazardous;
    let paramSelectionType = options.params.selectionType;
    let paramManufacturer = options.params.manufacturer
      ? options.params.manufacturer
      : "";
    let rrType = options.params.rrType;
    let binCategory = options.params.binCategory;
    let manualBin = options.params.manualBin;
    let returnTo = options.params.returnTo;
    let planSelectionType = "",
      rrStatus = "",
      weight = "";
    //try {
    paramManufacturer = paramManufacturer.includes("_")
      ? paramManufacturer.replaceAll("_", "&")
      : paramManufacturer;
    if (paramManufacturer) {
      manufId = rxrs_vs_util.getManufactuerId(paramManufacturer);
      form
        .addField({
          id: "custpage_manuf_id",
          label: "Manufacturer",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: "HIDDEN",
        }).defaultValue = manufId;

      let manufLinkField = form
        .addField({
          id: "custpage_manuf_link",
          label: "Manufacturer",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: "INLINE",
        });
      let manufURL = rxrs_vs_util.generateRedirectLink({
        type: "customrecord_csegmanufacturer",
        id: manufId,
      });
      manufLinkField.defaultValue = `<a href ="${manufURL}">${paramManufacturer}</a>`;
      if (manufId) {
        let manufMaximumSOAmountField = form
          .addField({
            id: "custpage_manuf_max_so_amt",
            label: "Maximum SO Amount",
            type: serverWidget.FieldType.CURRENCY,
          })
          .updateDisplayType({
            displayType: "INLINE",
          });
        manufMaximumSOAmountField.defaultValue =
          rxrs_vs_util.getManufMaxSoAmount(manufId);
      }
    }

    let htmlFileId = rxrs_vs_util.getFileId("SL_loading_html.html"); // HTML file for loading animation
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
    if (mrrId) {
      //ADD MRR FIELD LINK

      let mrrLink = rxrs_vs_util.generateRedirectLink({
        type: "customrecord_kod_masterreturn",
        id: mrrId,
      });
      form
        .addField({
          id: "custpage_mrrid_link",
          label: "Master Return Request",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        }).defaultValue = `<a href = ${mrrLink}>MRR${mrrId}</a>`;
      form
        .addField({
          id: "custpage_mrrid",
          label: "MRR ID",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        }).defaultValue = mrrId;
    }
    if (rrId) {
      let rrLink = rxrs_vs_util.generateRedirectLink({
        type: rrType,
        id: rrId,
      });
      form
        .addField({
          id: "custpage_tranid",
          label: "Return Request",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        }).defaultValue = tranId;
      form
        .addField({
          id: "custpage_rr_type",
          label: "Return Request Type",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        }).defaultValue = rrType;
      form
        .addField({
          id: "custpage_rr_link",
          label: "Return Request",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        }).defaultValue = `<a href=${rrLink}>${tranId}</a>`;
      form
        .addField({
          id: "custpage_rrid",
          label: "Return Request Id",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        }).defaultValue = rrId;
      let rslookup = search.lookupFields({
        type: rrType,
        id: rrId,
        columns: [
          "custbody_kd_rr_category",
          "status",
          "custbody_plan_type",
          "custbody_bol_fullfilment_weight",
        ],
      });
      try {
        rrStatus = rslookup.status[0].text;
        category = rslookup.custbody_kd_rr_category[0].value;
        planSelectionType = rslookup.custbody_plan_type[0].value;

        weight = rslookup.custbody_bol_fullfilment_weight;
      } catch (e) {
        log.error("Getting Lookup", e.message);
      }
      log.error("rslookup", rslookup);
      if (rslookup) {
        form
          .addField({
            id: "custpage_rrstatus",
            label: "Status",
            type: serverWidget.FieldType.TEXT,
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED,
          }).defaultValue = rrStatus;
        if (planSelectionType) {
          form
            .addField({
              id: "custpage_planselectiontype",
              label: "Plan Selection Type",
              type: serverWidget.FieldType.SELECT,
              source: "customlist_kod_customertype",
            })
            .updateDisplayType({
              displayType: serverWidget.FieldDisplayType.DISABLED,
            }).defaultValue = planSelectionType;
        }

        if (rrStatus.toUpperCase() == "APPROVED") {
          form.addPageInitMessage({
            title: "WARNING",
            message:
              "Submitting this form will set the status of the Return Request to Pending Verification.",
            type: message.Type.WARNING,
            //duration: 1500
          });
        }
        form
          .addField({
            id: "custpage_category",
            label: "Category",
            type: serverWidget.FieldType.SELECT,
            source: "customlist_kod_itemcat_list",
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED,
          }).defaultValue = category;
      }
    }
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
        mrrId: mrrId,
        rrType: rrType,
        inDated: false,
        selectionType: paramSelectionType,
      });
      log.audit("Manufacturer", manufacturer);
      //create sublist for Returnables
      log.audit(paramManufacturer);
      if (rxrs_vs_util.isEmpty(paramManufacturer)) {
        sublistFields = rxrs_vs_util.SUBLISTFIELDS.returnableSublist;
        log.emergency("returnableSublist", sublistFields);
        rxrs_vs_util.createReturnableSublist({
          form: form,
          rrTranId: rrId,
          rrName: tranId,
          rrType: rrType,
          mrrId: mrrId,
          sublistFields: sublistFields,
          value: manufacturer,
          isMainReturnable: false,
          paramManufacturer: paramManufacturer,
          title: `RO ${tranId} - RXLINEITEMS :${paramManufacturer}`,
        });
      } else {
        sublistFields = rxrs_vs_util.SUBLISTFIELDS.returnableManufacturer;
        let itemsReturnScan = rxrs_vs_util.getReturnableItemScan({
          rrId: rrId,
          mrrId: mrrId,
          rrType: rrType,
          manufacturer: paramManufacturer,
          inDated: false,
          returnList: returnList,
          isVerifyStaging: true,
        });
        log.debug("itemsReturnScan", itemsReturnScan);
        rxrs_vs_util.createReturnableSublist({
          form: form,
          rrTranId: rrId,
          documentNumber: tranId,
          sublistFields: sublistFields,
          value: itemsReturnScan,
          isMainReturnable: false,
          paramManufacturer: paramManufacturer,
          title: `RO ${tranId} - RXLINEITEMS :${paramManufacturer}`,
        });
      }
    } else if (paramSelectionType == "Destruction") {
      if (rxrs_vs_util.isEmpty(paramIsHazardous)) {
        sublistFields = rxrs_vs_util.SUBLISTFIELDS.destructionSublist;
        let destructionList = rxrs_vs_util.getItemScanByDescrutionType({
          rrId,
          tranId,
          selectionType: paramSelectionType,
          mrrId: mrrId,
          rrType: rrType,
        });
        log.emergency("fieldValue", destructionList);
        rxrs_vs_util.createDestructioneSublist({
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
        const GOVERNMENT = 10,
          TOPCO = 11;
        if (planSelectionType == GOVERNMENT || planSelectionType == TOPCO) {
          const weightField = form.addField({
            id: "custpage_weight",
            label: "Weight (LBS)",
            type: serverWidget.FieldType.TEXT,
          });
          if (weight) {
            weightField.defaultValue = weight;
          }
        }

        log.emergency("destructionlist", desctructionList);
        let sublistFields = rxrs_vs_util.SUBLISTFIELDS.descrutionField;
        rxrs_vs_util.createDestructioneSublist({
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
        sublistFields = rxrs_vs_util.SUBLISTFIELDS.returnableSublist;
        let manufByInDated = rxrs_vs_util.getReturnableManufacturer({
          rrId: rrId,
          tranId: tranId,
          mrrId: mrrId,
          rrType: rrType,
          inDated: true,
          selectionType: paramSelectionType,
        });
        rxrs_vs_util.createReturnableSublist({
          form: form,
          rrTranId: rrId,
          rrName: tranId,
          mrrId: mrrId,
          rrType: rrType,
          sublistFields: sublistFields,
          value: manufByInDated,
          isMainInDated: true,
          paramManufacturer: paramManufacturer,
          title: `RO ${tranId} - RXLINEITEMS :${paramManufacturer}`,
        });
      } else {
        sublistFields = rxrs_vs_util.SUBLISTFIELDS.returnableManufacturer;
        let itemsReturnScan = rxrs_vs_util.getReturnableItemScan({
          rrId: rrId,
          mrrId: mrrId,
          rrType: rrType,
          manufacturer: paramManufacturer,
          inDated: true,
          isVerifyStaging: true,
        });
        rxrs_vs_util.createReturnableSublist({
          form: form,
          rrTranId: rrId,
          rrName: tranId,
          sublistFields: sublistFields,
          value: itemsReturnScan,
          isMainInDated: false,
          paramManufacturer: paramManufacturer,
          inDate: true,
          returnList: returnList,
          title: `RO ${tranId} - RXLINEITEMS :${paramManufacturer}`,
        });
      }
    }
    if (manufId || paramIsHazardous) {
      let forControlReturnable = false;
      let manualBinField = form
        .addField({
          id: "custpage_manual_bin",
          label: "Manual Bin Selection",
          type: serverWidget.FieldType.CHECKBOX,
        })
        .updateDisplayType({
          displayType: "NORMAL",
        });
      if (manualBin) {
        let manualBinValue = manualBin == "true" ? "T" : "F";
        log.error("val ", { manualBin, manualBinValue });
        manualBinField.defaultValue = manualBinValue;
      }
      let binCategoryField = form
        .addField({
          id: "custpage_bincategory",
          label: "Bin Category",
          type: serverWidget.FieldType.SELECT,
        })
        .updateDisplayType({
          displayType: "DISABLED",
        });
      let binCategoryList = [];
      let binField = form
        .addField({
          id: "custpage_bin",
          label: "Bin",
          type: serverWidget.FieldType.SELECT,
        })
        .updateDisplayType({
          displayType: "DISABLED",
        });
      if (category) {
        switch (paramSelectionType) {
          case "Returnable":
            binCategoryList.push({
              text: "OutBound",
              value: 2,
            });
            binSearchParams.category = category;

            if (category != util.RRCATEGORY.RXOTC) {
              binSearchParams.forControlItems = true;
              let returnToFields = form.addField({
                id: "custpage_returnto",
                label: "Return To",
                type: serverWidget.FieldType.SELECT,
              });
              returnToFields.addSelectOption({
                text: "",
                value: 0,
              });
              const returnToInfo = customrec.getReturnToInfo({
                manufId: manufId,
              });
              binSearchParams.productCategory = category;
              const INMAR = 12502;
              const QUANALEX = 12501;
              log.error("Return to Infor", returnToInfo);
              if (returnToInfo == INMAR) {
                returnToFields.addSelectOption({
                  text: "Inmar",
                  value: 1,
                });
                binSearchParams.forInmar = INMAR;
              } else if (returnToInfo == QUANALEX) {
                returnToFields.addSelectOption({
                  text: "Quanalex ",
                  value: 2,
                });
                binSearchParams.forQuanalex = QUANALEX;
              } else {
                returnToFields.addSelectOption({
                  text: "Misc. (Return To)",
                  value: 3,
                });

                binSearchParams.miscReturnTo = true;
                binSearchParams.manufStartLetter =
                  paramManufacturer[0].toLowerCase();
              }
              delete binSearchParams.manufId;
              if (returnTo) {
                returnToFields.defaultValue = returnTo;
              }
              forControlReturnable = true;
            } else {
              binSearchParams.manufId = manufId;
              binSearchParams.specificBin = true;
              binSearchParams.binCategory = 2;
              let outBoundBinResult =
                bag.getBinPutAwayLocation(binSearchParams);
              log.audit("outBoundBin", { outBoundBinResult, binCategory });
              if (outBoundBinResult.length == 1 && manualBin !== true) {
                binField.addSelectOption({
                  text: outBoundBinResult[0].text,
                  value: outBoundBinResult[0].value,
                });
              }
            }

            break;
          case "Destruction":
            binCategoryList.push({
              text: "Destruction",
              value: 4,
            });
            binSearchParams.manufId = manufId;
            if (
              category == util.RRCATEGORY.C2 ||
              category == util.RRCATEGORY.C3TO5
            ) {
              const DESTRUCTIONBIN = 4;
              binSearchParams.forControlItems = true;
              binSearchParams.forHazardous = paramIsHazardous;
              binSearchParams.productCategory = category;
              binSearchParams.generalBin = true;
              binSearchParams.binCategory = DESTRUCTIONBIN;
              let outBoundBinResult =
                bag.getBinPutAwayLocation(binSearchParams);
              log.audit("outBoundBin", { outBoundBinResult, binCategory });
              if (outBoundBinResult.length == 1 && manualBin !== true) {
                binField.addSelectOption({
                  text: outBoundBinResult[0].text,
                  value: outBoundBinResult[0].value,
                });
              }
            }
            binSearchParams.forHazardous = paramIsHazardous;
            binSearchParams.productCategory = category;
            binSearchParams.generalBin = true;
            break;
          case "InDated":
            binSearchParams.isIndated = true;
            binSearchParams.generalBin = true;
            binCategoryList.push({
              text: "OutBound",
              value: 2,
            });
            binSearchParams.productCategory = category;
            break;
        }
      }
      binCategoryField.addSelectOption({
        text: " ",
        value: " ",
      });
      for (let i = 0; i < binCategoryList.length; i++) {
        binCategoryField.addSelectOption({
          text: binCategoryList[i].text,
          value: binCategoryList[i].value,
        });
      }

      if (binCategory) {
        binSearchParams.binCategory = binCategory;
        binCategoryField.defaultValue = binCategory;
        if (forControlReturnable == true) {
          delete binSearchParams.manufId;
        }
        log.error(binSearchParams);
        let binResult = bag.getBinPutAwayLocation(binSearchParams);
        log.emergency("Bin Results", binResult);
        binField.addSelectOption({
          text: " ",
          value: " ",
        });
        if (binResult.length > 0) {
          for (let i = 0; i < binResult.length; i++) {
            binField.addSelectOption({
              text: binResult[i].text,
              value: binResult[i].value,
            });
          }
        }
      }
    }
    return form;
    // } catch (e) {
    //   log.error("createHeaderFields", e.message);
    // }
  };

  /**
   * Populate the returnable sublist
   * @param options.sublist
   * @param options.fieldInfo
   * @param options.isMainReturnable
   */

  return { onRequest };
});
