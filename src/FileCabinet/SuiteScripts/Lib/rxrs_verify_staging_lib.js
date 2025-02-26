/**
 * @NApiVersion 2.1
 */

define([
  "N/ui/serverWidget",
  "N/redirect",
  "N/render",
  "N/runtime",
  "N/search",
  "N/url",
  "N/record",
  "./rxrs_util",
  "./rxrs_verify_staging_lib",
  "./rxrs_print_inventory_lib",
  "./rxrs_transaction_lib",
], /**
 * @param serverWidget
 * @param{redirect} redirect
 * @param{render} render
 * @param{runtime} runtime
 * @param{search} search
 * @param{url} url
 * @param record
 * @param rxrs_util
 * @param rxrs_vs_lib
 * @param rxrs_PI_lib
 */ (
  serverWidget,
  redirect,
  render,
  runtime,
  search,
  url,
  record,
  rxrs_util,
  rxrs_vs_lib,
  rxrs_PI_lib,
  rxrs_tran_lib,
) => {
  const VERIFYSTAGINGRETURNABLECOLUMNS = [
    search.createColumn({
      name: "custrecord_is_verified",
      label: "Verified",
    }),
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
      name: "custrecord_scanorginallotnumber",
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
    search.createColumn({
      name: "custrecord_wac_amount",
      label: "WAC AMOUNT",
    }),
  ];
  const RETURNCOVERLETTERCOLUMNSFINALYPAYMENTSCHED = [
    search.createColumn({
      name: "internalid",
      summary: "MAX",
      label: "Internal ID",
    }),
    search.createColumn({
      name: "custrecord_irc_total_amount",
      summary: "SUM",
      label: "Wac Amount",
    }),
    search.createColumn({
      name: "created",
      summary: "MAX",
      label: "Date Created",
    }),
    search.createColumn({
      name: "custrecord_final_payment_schedule",
      summary: "GROUP",
      label: "Final Payment Schedule",
    }),
    search.createColumn({
      name: "internalid",
      join: "CUSTRECORD_FINAL_PAYMENT_SCHEDULE",
      summary: "GROUP",
      sort: search.Sort.ASC,
      label: "Internal ID",
    }),
  ];

  const INDATED_INVENTORY_COLUMN = [
    search.createColumn({
      name: "custrecord_irc_total_amount",
      summary: "SUM",
      label: "Amount",
    }),
    search.createColumn({
      name: "custrecord_scan_paymentschedule",
      summary: "GROUP",
      label: "Payment Sched",
    }),
  ];
  const SUBLISTFIELDS = {
    returnableSublist: [
      {
        id: "custpage_manuf_name",
        type: "TEXT",
        label: "Group By",
        updateDisplayType: "DISABLED",
      },

      {
        id: "custpage_in_date",
        type: "TEXT",
        label: "In Date",
        updateDisplayType: "HIDDEN",
      },
      {
        id: "custpage_print_inventory",
        type: "TEXT",
        label: "Print Inventory",
        updateDisplayType: "NORMAL",
      },
      {
        id: "custpage_print_label",
        type: "TEXT",
        label: "Print Label",
        updateDisplayType: "NORMAL",
      },
      {
        id: "custpage_verified",
        type: "CHECKBOX",
        label: "Verified",
        updateDisplayType: "DISABLED",
      },

      {
        id: "custpage_manuf",
        type: "TEXT",
        label: "MANUF NAME",
        updateDisplayType: "HIDDEN",
      },
      {
        id: "custpage_return_list",
        type: "TEXT",
        label: "Return List",
        updateDisplayType: "HIDDEN",
      },
    ],
    inDateSublist: [
      {
        id: "custpage_manuf_name",
        type: "TEXT",
        label: "Group By",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_in_date",
        type: "TEXT",
        label: "In Date",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_verified",
        type: "CHECKBOX",
        label: "Verified",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_manuf",
        type: "TEXT",
        label: "MANUF NAME",
        updateDisplayType: "HIDDEN",
      },
    ],
    returnableManufacturer: [
      {
        id: "custpage_internalid",
        type: "TEXT",
        label: "Internal Id",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_verified",
        type: "CHECKBOX",
        label: "Verified",
        updateDisplayType: "NORMAL",
      },

      {
        id: "custpage_ndc",
        type: "TEXT",
        label: "NDC",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_description",
        type: "TEXT",
        label: "Description",
        updateDisplayType: "DISABLED",
      },
      // {
      //   id: "custpage_manufacturer",
      //   type: "TEXT",
      //   label: "Manufacturer",
      //   updateDisplayType: "DISABLED",
      // },
      {
        id: "custpage_date_created",
        type: "TEXT",
        label: "Scanned On",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_date_serial_lot",
        type: "TEXT",
        label: "Serial/Lot Number",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_fullpartialpackage",
        type: "TEXT",
        label: "Full/Partial Package",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_expiration_date",
        type: "TEXT",
        label: "Expiration Date",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_mfgprocessing",
        type: "TEXT",
        label: "Manuf Processing",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_pharmaprocessing",
        type: "TEXT",
        label: "Pharma Processing",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_amount",
        type: "CURRENCY",
        label: "Amount",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_wac_amount",
        type: "TEXT",
        label: "wac amount",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_qty",
        type: "TEXT",
        label: "QTY",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_in_date",
        type: "TEXT",
        label: "In Date",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_bag_tag_label",
        type: "TEXT",
        label: "Bag Tag Label",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_item_id",
        type: "TEXT",
        label: "Item Id",
        updateDisplayType: "HIDDEN",
      },
      {
        id: "custpage_manuf_id",
        type: "TEXT",
        label: "Manuf Id",
        updateDisplayType: "HIDDEN",
      },

      // {
      //   id: "custpage_settononreturnable",
      //   type: "CHECKBOX",
      //   label: "Change Pharma Processing",
      //   updateDisplayType: "ENTRY",
      // },
      // {
      //   id: "custpage_nonreturnable_reason",
      //   type: "SELECT",
      //   label: "Non-Ret. Reason",
      //   source: "customlist_kd_non_returnable_reason",
      //   updateDisplayType: "DISABLED",
      // },
    ],
    returnableInDatedManufacturer: [
      {
        id: "custpage_internalid",
        type: "TEXT",
        label: "Internal Id",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_verified",
        type: "CHECKBOX",
        label: "Verified",
        updateDisplayType: "NORMAL",
      },
      {
        id: "custpage_in_dated",
        type: "TEXT",
        label: "In Date",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_ndc",
        type: "TEXT",
        label: "NDC",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_description",
        type: "TEXT",
        label: "Description",
        updateDisplayType: "DISABLED",
      },
      // {
      //   id: "custpage_manufacturer",
      //   type: "TEXT",
      //   label: "Manufacturer",
      //   updateDisplayType: "DISABLED",
      // },
      {
        id: "custpage_date_created",
        type: "TEXT",
        label: "Scanned On",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_date_serial_lot",
        type: "TEXT",
        label: "Serial/Lot Number",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_fullpartialpackage",
        type: "TEXT",
        label: "Full/Partial Package",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_expiration_date",
        type: "TEXT",
        label: "Expiration Date",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_mfgprocessing",
        type: "TEXT",
        label: "Manuf Processing",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_pharmaprocessing",
        type: "TEXT",
        label: "Pharma Processing",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_in_date",
        type: "TEXT",
        label: "In Date",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_wac_amount",
        type: "TEXT",
        label: "wac amount",
        updateDisplayType: "INLINE",
      },
    ],
    destructionSublist: [
      {
        id: "custpage_is_hazardous_name",
        type: "TEXT",
        label: "Group By",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_print_inventory",
        type: "TEXT",
        label: "Print Inventory",
        updateDisplayType: "NORMAL",
      },
      {
        id: "custpage_print_label",
        type: "TEXT",
        label: "Print Label",
        updateDisplayType: "NORMAL",
      },
      {
        id: "custpage_verified",
        type: "CHECKBOX",
        label: "Verified",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_is_hazardous",
        type: "TEXT",
        label: "Desctruction",
        updateDisplayType: "HIDDEN",
      },
    ],
    descrutionField: [
      {
        id: "custpage_internalid",
        type: "TEXT",
        label: "Internal Id",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_verified",
        type: "CHECKBOX",
        label: "Verified",
        updateDisplayType: "NORMAL",
      },
      {
        id: "custpage_aerosol",
        type: "CHECKBOX",
        label: "AERO/COMBUSTIBLE",
        updateDisplayType: "NORMAL",
      },
      {
        id: "custpage_sharp",
        type: "CHECKBOX",
        label: "SHARP/CONTAINERS",
        updateDisplayType: "NORMAL",
      },
      {
        id: "custpage_ndc",
        type: "TEXT",
        label: "NDC",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_description",
        type: "TEXT",
        label: "Description",
        updateDisplayType: "DISABLED",
      },
      // {
      //   id: "custpage_manufacturer",
      //   type: "TEXT",
      //   label: "Manufacturer",
      //   updateDisplayType: "DISABLED",
      // },
      {
        id: "custpage_date_serial_lot",
        type: "TEXT",
        label: "Serial/Lot Number",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_original_lot_number",
        type: "TEXT",
        label: "Original Lot Number",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_fullpartialpackage",
        type: "TEXT",
        label: "Full/Partial Package",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_quantity",
        type: "TEXT",
        label: "Quantity",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_partial_count",
        type: "TEXT",
        label: "Partial Count",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_expiration_date",
        type: "TEXT",
        label: "Expiration Date",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_pharmaprocessing",
        type: "TEXT",
        label: "Pharma Processing",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_mfgprocessing",
        type: "TEXT",
        label: "Manuf Processing",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_bag_tag_label",
        type: "TEXT",
        label: "Bag Tag Label",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_item_id",
        type: "TEXT",
        label: "Item Id",
        updateDisplayType: "HIDDEN",
      },
      {
        id: "custpage_nonscannable",
        type: "CHECKBOX",
        label: "Non Scannable",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_patientvial",
        type: "CHECKBOX",
        label: "Patient Vial",
        updateDisplayType: "INLINE",
      },
    ],
    returnCoverLetterFields: [
      {
        id: "custpage_due_created",
        type: "TEXT",
        label: "DUE DATE",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_amount",
        type: "TEXT",
        label: "AMOUNT",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_payment_type",
        type: "TEXT",
        label: "Payment Type",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_edit",
        type: "TEXTAREA",
        label: "View/Edit Line",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_delete",
        type: "TEXT",
        label: "Payment Sched Action",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_bill",
        type: "TEXT",
        label: "BILL",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_bill_action",
        type: "TEXT",
        label: "BILL ACTION",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_payment_id",
        type: "TEXT",
        label: "Payment Id",
        updateDisplayType: "HIDDEN",
      },
    ],
    INDATED_INVENTORY: [
      {
        id: "custpage_payment_type",
        type: "TEXT",
        label: "Payment Type",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_amount",
        type: "TEXT",
        label: "AMOUNT",
        updateDisplayType: "INLINE",
      },
      {
        id: "custpage_split_payment",
        type: "TEXT",
        label: "Split Payment",
        updateDisplayType: "DISABLED",
      },
      {
        id: "custpage_customized",
        type: "TEXT",
        label: "Customize",
        updateDisplayType: "DISABLED",
      },
    ],
  };

  /**
   * RETURNABLE FUNCTIONALITY
   */

  /**
   * Get the returnable item return scan group by manufacturer
   * @param {number}options.rrId - Return Request Id
   * @param {number}options.tranId - Document Number
   * @param {boolean} options.inDated - Returnable can be in Dated or not
   * @param {string} options.rrType - return request rec type
   * @param {number} options.mrrId - master return request Id
   * @param {string} options.selectionType - Returnable / Destruction / In Dated
   * @return {array} Return manufacturing list
   */
  function getReturnableManufacturer(options) {
    try {
      log.audit("getReturnableManufacturer", options);
      let inDated = options.inDated == false ? "F" : "T";
      let rrId = options.rrId;
      let manufacturer = [];
      let filters = [];

      filters.push(
        search.createFilter({
          name: "custrecord_cs_ret_req_scan_rrid",
          operator: "anyof",
          values: options.rrId,
        }),
      );
      filters.push(
        search.createFilter({
          name: "custrecord_cs__mfgprocessing",
          operator: "anyof",
          values: 2, // returnable = true
        }),
      );
      filters.push(
        search.createFilter({
          name: "custrecord_scanindated",
          operator: "is",
          values: inDated,
        }),
      );
      let columns = [];
      columns.push(
        search.createColumn({
          name: "custrecord_cs_item_manufacturer",
          summary: "GROUP",
        }),
      );
      if (options.inDated == true) {
        columns.push(
          search.createColumn({
            name: "custrecord_ret_start_date",
            summary: "MAX",
          }),
        );
      }

      const transactionSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: filters,
        columns: columns,
      });
      transactionSearchObj.run().each(function (result) {
        let manufName = result.getValue({
          name: "custrecord_cs_item_manufacturer",
          summary: "GROUP",
        });

        let returnableScanList = getReturnableItemScan({
          rrId: options.rrId,
          manufacturer: manufName,
          inDated: options.inDated,
          rrType: options.rrType,
          mrrId: options.mrrId,
          isVerifyStaging: true,
        });
        returnableScanList = returnableScanList.sort(
          (a, b) => parseFloat(b.amount) - parseFloat(a.amount),
        );
        let currentAmount = 0;
        returnableScanList.forEach((ret) => (currentAmount += +ret.amount));
        log.emergency("returnableScanList", { manufName, returnableScanList });
        let manufId = getManufactuerId(manufName);
        //fixed issue in the URL when there is an ampersand symbol in Manuf Name
        let manufMaximumAmount = getManufMaxSoAmount(manufId)
          ? getManufMaxSoAmount(manufId)
          : 0;
        log.audit("new info", { manufName, manufMaximumAmount, currentAmount });
        let numberOfBags;
        numberOfBags =
          +manufMaximumAmount > +currentAmount
            ? 1
            : +currentAmount / +manufMaximumAmount;
        numberOfBags = Math.ceil(numberOfBags);
        let manufURLName = manufName.replaceAll("&", "_");
        if (manufMaximumAmount == 0 || currentAmount == 0) {
          numberOfBags = 1;
        }
        log.audit("numberOfBags", numberOfBags);

        let bags = [];
        for (let i = 1; i <= numberOfBags; i++) {
          bags.push(i);
        }
        let bagList = [];
        let groupedObjects = [];
        let inDate;
        if (options.inDated == true) {
          inDate = result.getValue({
            name: "custrecord_ret_start_date",
            summary: "MAX",
          });
        }

        /**
         * Group the return item scanlist based from the manuf maximum amount
         */

        try {
          if (manufMaximumAmount >= currentAmount || manufMaximumAmount == 0) {
            let holder = [];

            returnableScanList.forEach((ret) => {
              holder.push(ret.internalId);
            });
            bagList.push(holder);
            groupedObjects.push(holder);
          } else {
            groupedObjects = groupObjectsByAmountLimit(
              returnableScanList,
              manufMaximumAmount,
            );
          }
        } catch (e) {
          log.error("GROUPING RETURN LIST", e.message);
        }
        groupedObjects = rxrs_util.removeEmptyArrays(groupedObjects);
        log.audit("groupObject ", groupedObjects);
        groupedObjects.forEach((bag) => {
          let verification = checkIfReturnScanIsVerified({
            recId: rrId,
            returnList: bag,
            inDated: inDated,
          });
          log.debug("isVerified", verification);
          let isVerified = verification.isVerified === true ? "T" : "F";
          log.debug("isVerif", verification.isVerified);
          let bagLabel = isVerified == "T" ? verification.bagLabel : "";
          let printSLURL;
          let returnList = JSON.stringify(bag.join("_"));
          let params = {
            rrId: rrId,
            rrType: options.rrType,
            manufId: manufId,
            returnList: returnList,
            inventoryStatus: options.selectionType,
          };
          if (bagLabel) {
            printSLURL = url.resolveScript({
              scriptId: "customscript_sl_print_bag_label",
              deploymentId: "customdeploy_sl_print_bag_label",
              returnExternalUrl: false,
              params: {
                recId: bagLabel,
              },
            });
          }

          let printSLInventory = url.resolveScript({
            scriptId: "customscript_sl_print_inv_report",
            deploymentId: "customdeploy_sl_print_inv_report",
            returnExternalUrl: false,
            params: params,
          });
          let stSuiteletUrl = url.resolveScript({
            scriptId: "customscript_sl_returnable_page",
            deploymentId: "customdeploy_sl_returnable_page",
            returnExternalUrl: false,
            params: {
              selectionType: options.selectionType,
              manufacturer: manufURLName,
              rrId: rrId,
              tranId: options.tranId,
              inDate: inDate,
              rrType: options.rrType,
              mrrId: options.mrrId,
              returnList: returnList,
            },
          });

          manufacturer.push({
            manufName: `<a href="${stSuiteletUrl}">${manufName}</a>`,
            inDate: inDate,
            printInventory: printSLInventory
              ? `<a href="${printSLInventory}">Print Inventory</a>`
              : "",
            printLabel: printSLURL
              ? `<a href="${printSLURL}">Print Label</a>`
              : "No Bag Label/Not Verified",
            isVerified: isVerified,
            name: manufName,
            returnableScanList: bag,
          });
          if (options.inDated == false) delete manufacturer[0].inDated;
        });

        return true;
      });
      log.debug("manufacturer", manufacturer);
      return manufacturer;
    } catch (e) {
      log.error("getReturnableManufacturer", e.message);
    }
  }

  function groupObjectsByAmountLimit(objects, limit) {
    log.audit("groupObjectsByAmountLimit", objects, limit);
    let groups = [];
    let currentGroup = [];
    let currentSum = 0;

    for (let item of objects) {
      // Check if adding the current item's amount exceeds the limit
      if (currentSum + parseFloat(item.amount) > +limit) {
        // If it exceeds, push the current group to groups and start a new group
        groups.push(currentGroup);
        currentGroup = [];
        currentSum = 0;
      }

      // Add the current item to the current group
      currentGroup.push(item.internalId);
      currentSum += +item.amount;
    }

    // Push the last group if it's not empty
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Check if the returnList is verified
   * @param {string} options.returnList
   * @param {number} options.recId
   * @param {boolean} options.inDated
   * @return {boolean}
   */
  function checkIfReturnScanIsVerified(options) {
    try {
      log.audit("checkIfReturnScanIsVerified", options);
      let ISVERIFIED = true;
      let bagLabel;
      let filters = [];
      filters.push(
        search.createFilter({
          name: "custrecord_cs_ret_req_scan_rrid",
          operator: "anyof",
          values: options.recId,
        }),
      );
      filters.push(
        search.createFilter({
          name: "custrecord_cs__mfgprocessing",
          operator: "anyof",
          values: 2,
        }),
      );
      filters.push(
        search.createFilter({
          name: "custrecord_scanindated",
          operator: "is",
          values: options.inDated,
        }),
      );
      filters.push(
        search.createFilter({
          name: "internalid",
          operator: "anyof",
          values: options.returnList,
        }),
      );

      const transactionSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: filters,

        columns: [
          search.createColumn({
            name: "custrecord_is_verified",
            summary: "GROUP",
            label: "Verified",
          }),
          search.createColumn({
            name: "custrecord_scanbagtaglabel",
            summary: "GROUP",
            label: "Bag Tag Label",
          }),
        ],
      });

      let column = transactionSearchObj.columns;
      const searchResultCount = transactionSearchObj.runPaged().count;
      transactionSearchObj.run().each(function (result) {
        let isVerified = result.getValue(column[0]);
        bagLabel = result.getValue(column[1]);

        if (isVerified == false) {
          ISVERIFIED = false;
          return false;
        }
        return true;
      });
      return {
        isVerified: ISVERIFIED == true,
        bagLabel: bagLabel,
      };
    } catch (e) {
      log.error("checkIfReturnScanIsVerified", e.message);
    }
  }

  /**
   * Get the bag label if the all the return list is verified
   * @param {array}options.returnList
   */
  function getReturnListBagLabel(options) {
    log.error("getReturnListBagLabel", options.returnList);

    try {
      let bagLabel;
      let filters = [];
      filters.push(
        search.createFilter({
          name: "internalid",
          operator: "anyof",
          values: options.returnList,
        }),
      );
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: filters,
        columns: [
          search.createColumn({
            name: "custrecord_is_verified",
            summary: "GROUP",
            label: "Verified",
          }),
          search.createColumn({
            name: "custrecord_scanbagtaglabel",
            summary: "GROUP",
            label: "Bag Tag Label",
          }),
        ],
      });
      const searchResultCount =
        customrecord_cs_item_ret_scanSearchObj.runPaged().count;
      if (searchResultCount > 1) return null;
      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        bagLabel = result.getValue({
          name: "custrecord_scanbagtaglabel",
          summary: "GROUP",
        });
        return true;
      });
      return bagLabel;
    } catch (e) {
      log.error("getReturnListBagLabel", e.message);
    }
  }

  /**
   * Check if the returnRequest Is Verified
   * @param {string} options.rrId Manufacturer Name
   * @return {boolean}
   */
  function checkIfRRIsVerified(options) {
    try {
      let manuf = options.manufName;
      //log.audit("checkIfManufIsVerified", options);
      let ISVERIFIED = true;
      let filters = [];
      filters.push(
        search.createFilter({
          name: "custrecord_cs_ret_req_scan_rrid",
          operator: "anyof",
          values: options.rrId,
        }),
      );

      const transactionSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: filters,

        columns: [
          search.createColumn({
            name: "custrecord_is_verified",
            summary: "GROUP",
            label: "Verified",
          }),
        ],
      });
      let column = transactionSearchObj.columns;
      const searchResultCount = transactionSearchObj.runPaged().count;
      transactionSearchObj.run().each(function (result) {
        let isVerified = result.getValue(column[0]);
        // log.audit("isVerified", { manuf, isVerified });
        if (isVerified == false) {
          ISVERIFIED = false;
          return false;
        }
      });
      log.audit("results", { manuf, searchResultCount, ISVERIFIED });
      return searchResultCount == 1 && ISVERIFIED == true;
    } catch (e) {
      log.error("checkIfRRIsVerified", e.message);
    }
  }

  /**
   * Get the manufacturer ID
   * @param {string}name
   */
  function getManufactuerId(name) {
    let manufId;
    var customrecord_csegmanufacturerSearchObj = search.create({
      type: "customrecord_csegmanufacturer",
      filters: [["name", "is", name]],
      columns: [
        search.createColumn({ name: "internalid", label: "Internal ID" }),
        search.createColumn({
          name: "name",
          sort: search.Sort.ASC,
          label: "Name",
        }),
      ],
    });

    customrecord_csegmanufacturerSearchObj.run().each(function (result) {
      manufId = result.id;
    });
    return manufId;
  }

  /**
   * Get non-returnable Amount
   * @param rclId
   * @return {number|Date|string|Array|boolean|*}
   */
  function getNonReturnableeFeeAmount(rclId) {
    log.audit("getNonReturnableeFeeAmount", rclId);
    let nonReturnableAmount = 0;
    try {
      let rclRec = record.load({
        type: "customrecord_return_cover_letter",
        id: rclId,
      });
      nonReturnableAmount = rclRec.getValue(
        "custrecord_rcl_non_returnable_fee_amt",
      );
      return nonReturnableAmount;
    } catch (e) {
      log.error("getNonReturnableeFeeAmount", e.message);
    }
  }

  /**
   * Get the item return scan record based on Return request and Manufacturer and In Dated Status
   * @param {number}options.rrId - Return Request Id
   * @param {number}options.rclId - Return Cover Letter Id
   * @param {string}options.manufacturer - Manufacturer Text Name
   * @param {boolean} options.inDated - Check If In dated
   * @param {string} options.rrType - Return Request Type
   * @param {number} options.mrrId - Master Return Request Id
   * @param {string} options.mrrName - Master Return Name
   * @param {boolean} options.initialSplitpaymentPage - Set to true if this is supposed to be the initial splitpayment page
   * @param {number} options.returnableFee - Returnable Fee From Vendor
   * @param {array} options.returnList - List of the return item scan
   * @param {number} options.paymentSchedId - Payment ID of the Item Return Scan
   * @param {boolean} options.edit - Check if it is edit action in the item return scan
   * @param {boolean} options.finalPaymentSched - If set to true - filter to be used is the final payment schedule else initial payment sched
   * @param {boolean} options.isVerifyStaging - Check if the suitelet is for Verify Staging else it is use for return cover letter
   * @param {bolean} options.isMFGProcessing - Set Value to Include in the filter
   * @oaran {bolean} options.allPaymentSched - Set to true to view all the payment schedule
   * @returns {object} returns the item scanlist
   */
  function getReturnableItemScan(options) {
    let paymentAmount = 0;
    let itemScanList = [];
    let filters = [];
    let target;
    let paymentFields;
    log.audit("getReturnableItemScan", options);
    let {
      rclId,
      returnList,
      paymentSchedId,
      inDated,
      manufacturer,
      rrId,
      mrrId,
      finalPaymentSched,
      isVerifyStaging,
      returnableFee,
      mrrName,
      initialSplitpaymentPage,
      isMFGProcessing,
      allPaymentSched,
      edit,
    } = options;
    if (inDated) {
      inDated = inDated == false ? "F" : "T";
    }

    log.error("indated", inDated);
    // if (inDated) {
    //
    // } else {
    //   inDated = null;
    // }

    let nonReturnableFeeAmount;
    let orginalNonReturnableFeeAmount;
    if (initialSplitpaymentPage) {
      nonReturnableFeeAmount = getNonReturnableeFeeAmount(rclId);
      orginalNonReturnableFeeAmount = nonReturnableFeeAmount;
    }

    let columns;
    let paymentColumn;
    if (finalPaymentSched == true || finalPaymentSched == "true") {
      paymentFields = "custrecord_final_payment_schedule";
      paymentColumn = RETURNCOVERLETTERCOLUMNSFINALYPAYMENTSCHED;
      target = "_blank";
    } else {
      paymentFields = "custrecord_scan_paymentschedule";
      paymentColumn = INDATED_INVENTORY_COLUMN;
      target = "_self";
      // Remove the updated item return scan in the list
      if (!isVerifyStaging) {
        filters.push(
          search.createFilter({
            name: "custrecord_payment_schedule_updated",
            operator: "is",
            values: "F",
          }),
        );
      }
    }

    try {
      columns =
        isVerifyStaging == true
          ? VERIFYSTAGINGRETURNABLECOLUMNS
          : paymentColumn;

      if (returnList) {
        filters.push(
          search.createFilter({
            name: "internalid",
            operator: "anyof",
            values: returnList,
          }),
        );
      } else {
        if (mrrId) {
          filters.push(
            search.createFilter({
              name: "custrecord_irs_master_return_request",
              operator: "anyof",
              values: mrrId,
            }),
          );
        }
        if (rrId) {
          filters.push(
            search.createFilter({
              name: "custrecord_cs_ret_req_scan_rrid",
              operator: "anyof",
              values: rrId,
            }),
          );
        }
        if (inDated == "T" || inDated == "F") {
          log.error("setting in dated value", inDated);
          filters.push(
            search.createFilter({
              name: "custrecord_scanindated",
              operator: "is",
              values: inDated,
            }),
          );
        }

        if (isVerifyStaging == true && isEmpty(paymentSchedId)) {
          manufacturer &&
            filters.push(
              search.createFilter({
                name: "custrecord_cs_item_manufacturer",
                operator: "is",
                values: manufacturer,
              }),
            );
        }
        if (paymentSchedId) {
          if (allPaymentSched == true) {
          } else {
            filters.push(
              search.createFilter({
                name: paymentFields,
                operator: "anyof",
                values: paymentSchedId,
              }),
            );
          }
        }
        if (isMFGProcessing) {
          filters.push(
            search.createFilter({
              name: "custrecord_cs__mfgprocessing",
              operator: "anyof",
              values: [2, 1],
            }),
          );
        } else {
          filters.push(
            search.createFilter({
              name: "custrecord_cs__mfgprocessing",
              operator: "anyof",
              values: 2,
            }),
          );
        }
      }
      log.audit("Get Item Return Scan Filter", filters);
      // log.audit("Get Item Return Scan Columns", columns);

      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: filters,
        columns: columns,
      });

      let column = customrecord_cs_item_ret_scanSearchObj.columns;
      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        if (isVerifyStaging == true || !isEmpty(paymentSchedId)) {
          let qty = result.getValue("custrecord_cs_qty") || 0;
          let bagTagLabel = result.getValue("custrecord_scanbagtaglabel");
          let itemId = result.getValue({
            name: "internalid",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
          });

          let amount = result.getValue("custrecord_irc_total_amount");
          if (+returnableFee > 0) {
            // if returnable fee has value calculate the total amount
            amount = (+returnableFee / 100) * amount;
          }
          let verified = result.getValue(column[0]) == true ? "T" : "F";
          let ndcName = result.getText({
            name: "custrecord_cs_return_req_scan_item",
          });

          let ndcLink = generateRedirectLink({
            type: "customrecord_cs_item_ret_scan",
            id: result.id,
          });
          let bagLabelURL = generateRedirectLink({
            type: "customrecord_kd_taglabel",
            id: bagTagLabel,
          });
          itemScanList.push({
            internalId: result.id,
            verified: verified,
            ndc: `<a href=${ndcLink + "&cf=156&e=T"}>${ndcName}</a>`,
            description: result.getValue({
              name: "salesdescription",
              join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            }),
            //manufacturer: result.getText("custrecord_cs_item_manufacturer"),
            dateCreated: result.getValue("created"),
            serialLotNumber: result.getValue("custrecord_scanorginallotnumber"),
            fullPartialPackage: result.getText(
              "custrecord_cs_full_partial_package",
            ),
            expirationDate: result.getValue("custrecord_cs_expiration_date"),
            mfgProcessing: result.getText("custrecord_cs__mfgprocessing"),
            pharmaProcessing: result.getText("custrecord_cs__rqstprocesing"),
            amount: amount || 0,
            wacAmount: result.getValue("custrecord_wac_amount"),
            qty: qty,
            inDate: result.getValue("custrecord_ret_start_date"),
            bagTagLabel: bagTagLabel
              ? `<a href ="${bagLabelURL}" target="_blank">${bagTagLabel}</a>`
              : " ",
            itemId: itemId,
            manufId: getManufactuerId(
              result.getValue("custrecord_cs_item_manufacturer"),
            ),
          });
          return true;
        } else {
          let amount = result.getValue({
            name: "custrecord_irc_total_amount",
            summary: "SUM",
          });
          if (+returnableFee > 0) {
            // if returnable fee has value calculate the total amount
            amount = (+returnableFee / 100) * amount;
          }
          let paymentSchedId = result.getValue({
            name: paymentFields,
            summary: "GROUP",
          });
          let isPOExist = rxrs_tran_lib.checkIfTransAlreadyExist({
            mrrId: mrrId,
            searchType: "PurchOrd",
          });
          log.debug("Get Returnable Item Scan isPOExist", isPOExist);
          let billURL = "";
          let billActionWord;
          let billActionURL;
          let isBillExist;
          let dueDate;
          if (isPOExist) {
            isBillExist = rxrs_tran_lib.checkIfTransAlreadyExist({
              mrrId: mrrId,
              searchType: "VendBill",
              finalPaymentSchedule: paymentSchedId,
            });
            log.audit("isBillExist", isBillExist);
            let amount;
            if (isBillExist) {
              billURL = generateRedirectLink({
                type: record.Type.VENDOR_BILL,
                id: isBillExist,
              });
              let billRec = record.load({
                type: record.Type.VENDOR_BILL,
                id: isBillExist,
              });
              dueDate = billRec.getText("duedate");
              billActionURL = url.resolveScript({
                scriptId: "customscript_sl_return_cover_letter",
                deploymentId: "customdeploy_sl_return_cover_letter",
                returnExternalUrl: false,
                params: {
                  tranId: isBillExist,
                  tranType: record.Type.VENDOR_BILL,
                  rclId: rclId,
                  action: "deleteTran",
                },
              });
              billActionWord = "Delete Bill";
            } else {
              billActionURL = url.resolveScript({
                scriptId: "customscript_sl_return_cover_letter",
                deploymentId: "customdeploy_sl_return_cover_letter",
                returnExternalUrl: false,
                params: {
                  tranId: isPOExist,
                  action: "createBill",
                  finalPaymentSched: paymentSchedId,
                  mrrId: mrrId,
                  rclId: rclId,
                },
              });
              billActionWord = "Create Bill";
            }
          } else {
            log.audit("no po");
            billActionWord = "NO PO";
          }

          let paymentSchedText = result.getText({
            name: paymentFields,
            summary: "GROUP",
          });
          let stSuiteletUrl = url.resolveScript({
            scriptId: "customscript_sl_return_cover_letter",
            deploymentId: "customdeploy_sl_return_cover_letter",
            returnExternalUrl: false,
            params: {
              paymentSchedId: paymentSchedId,
              paymentSchedText: paymentSchedText,
              mrrId: mrrId,
              tranId: mrrName,
              finalPaymentSched: finalPaymentSched,
              customize: true,
              rclId: rclId,
              billId: isBillExist,
            },
          });
          let viewEditSuiteletUrl = url.resolveScript({
            scriptId: "customscript_rxrs_sl_view_edit_line",
            deploymentId: "customdeploy_rxrs_sl_view_edit_line",
            returnExternalUrl: false,
            params: {
              edit: true,
              paymentSchedId: paymentSchedId,
              paymentSchedText: paymentSchedText,
              mrrId: mrrId,
              tranId: mrrName,
              rclId: rclId,
              finalPaymentSched: finalPaymentSched,
              customize: false,
              billId: isBillExist,
              isMFGProcessing: true,
              edit: true,
            },
          });

          paymentAmount += +amount;
          if (finalPaymentSched == "true" || finalPaymentSched == true) {
            let deleteWord = paymentSchedId != 12 ? "Unassign Payment" : " ";
            let deleteURL =
              paymentSchedId != 12
                ? url.resolveScript({
                    scriptId: "customscript_sl_return_cover_letter",
                    deploymentId: "customdeploy_sl_return_cover_letter",
                    returnExternalUrl: false,
                    params: {
                      mrrId: mrrId,
                      tranId: mrrName,
                      finalPaymentSched: finalPaymentSched,
                      rclId: rclId,
                      inDated: inDated,
                      isVerifyStaging: isVerifyStaging,
                      remove: true,
                      isMFGProcessing: true,
                      paymentId: paymentSchedId,
                    },
                  })
                : "";
            if (nonReturnableFeeAmount) {
              if (nonReturnableFeeAmount > +amount) {
                nonReturnableFeeAmount =
                  nonReturnableFeeAmount - parseInt(amount);
                amount = 0;
              } else {
                amount = +amount - nonReturnableFeeAmount;
                nonReturnableFeeAmount = 0;
              }
            }
            try {
              amount = amount.toFixed(2);
            } catch (e) {
              log.emergency("removing decimal", e.message);
            }

            /**
             * Push the default in the first result
             */
            if (paymentSchedText == "Default") {
              itemScanList.unshift({
                dateCreated: dueDate ? dueDate : " ",
                amount: "$" + amount,
                paymetnSchedule: `<a href="${stSuiteletUrl}" target="${target}" >${paymentSchedText} </a>`,
                viewEditLine: `<a href="${viewEditSuiteletUrl}" target="${target}" > <img src="https://6816904.app.netsuite.com/core/media/media.nl?id=34942&c=6816904&h=jCOGlyNQnYDecfk0JZEz7Lzb6z2sPXYZZsC9qdfQlqi5GlXe" alt="Edit-Icon" border="0" height="20px"></a> </a>`,
                delete: `<a href="${deleteURL}" target="_self" >${deleteWord}</a>`,
                billURL: billURL
                  ? `<a href="${billURL}" target="_self">${isBillExist}</a>`
                  : "NO BILL",
                billAction: `<a href="${billActionURL}" target="_self">${billActionWord}</a>`,
                paymentSchedId: paymentSchedId,
              });
            } else {
              itemScanList.push({
                dateCreated: dueDate ? dueDate : " ",
                amount: "$" + amount,
                paymetnSchedule: `<a href="${stSuiteletUrl}" target="${target}" >${paymentSchedText} </a>`,
                viewEditLine: `<a href="${viewEditSuiteletUrl}" target="${target}" > <img src="https://6816904.app.netsuite.com/core/media/media.nl?id=34942&c=6816904&h=jCOGlyNQnYDecfk0JZEz7Lzb6z2sPXYZZsC9qdfQlqi5GlXe" alt="Edit-Icon" border="0" height="20px"></a> </a>`,
                delete: `<a href="${deleteURL}" target="_self" >${deleteWord}</a>`,
                billURL: billURL
                  ? `<a href="${billURL}" target="_self">${isBillExist}</a>`
                  : "NO BILL",
                billAction: `<a href="${billActionURL}" target="_self">${billActionWord}</a>`,
                paymentSchedId: paymentSchedId,
              });
            }

            //log.error("itemScanList", itemScanList);
          } else {
            let splitPaymentURL = url.resolveScript({
              scriptId: "customscript_sl_return_cover_letter",
              deploymentId: "customdeploy_sl_return_cover_letter",
              returnExternalUrl: false,
              params: {
                mrrId: mrrId,
                tranId: mrrName,
                finalPaymentSched: finalPaymentSched,
                inDated: inDated,
                splitPayment: true,
                isReload: true,
                isVerifyStaging: isVerifyStaging,
                paymentId: paymentSchedId,
                initialSplitpaymentPage: false,
              },
            });

            let customizedURL = url.resolveScript({
              scriptId: "customscript_sl_return_cover_letter",
              deploymentId: "customdeploy_sl_return_cover_letter",
              returnExternalUrl: false,
              params: {
                paymentSchedId: paymentSchedId,
                paymentSchedText: paymentSchedText,
                mrrId: mrrId,
                tranId: mrrName,
                finalPaymentSched: finalPaymentSched,
                customize: true,
              },
            });
            try {
              amount = amount.toFixed(2);
            } catch (e) {
              log.emergency("removing decimal", e.message);
            }

            itemScanList.push({
              paymetnSchedule: `<a href="${stSuiteletUrl}" target="${target}" >${paymentSchedText} </a>`,
              amount: "$" + amount,
              splitPayment: `<a href="${splitPaymentURL}" target="${target}" >Split Payment </a>`,
              customize: `<a href="${customizedURL}" target="${target}" >Customize</a>`,
            });
          }
          return true;
        }
      });
      paymentAmount = paymentAmount - orginalNonReturnableFeeAmount;
      log.emergency("paymentAmount", paymentAmount);
      if (isVerifyStaging == false) {
        // record.submitFields({
        //   type: "customrecord_return_cover_letter",
        //   id: rclId,
        //   values: {
        //     custrecord_rcl_total_customer_credit_amt: paymentAmount.toFixed(2),
        //   },
        // });
        const rclRec = record.load({
          type: "customrecord_return_cover_letter",
          id: rclId,
        });
        rclRec.save({
          ignoreMandatoryFields: true,
        });
        itemScanList.push({
          dateCreated: " ",
          amount: "$" + paymentAmount.toFixed(2),
          paymetnSchedule: " ",
        });
      }
      if (
        initialSplitpaymentPage == "false" ||
        initialSplitpaymentPage == false
      ) {
        let customizedURL = url.resolveScript({
          scriptId: "customscript_sl_return_cover_letter",
          deploymentId: "customdeploy_sl_return_cover_letter",
          returnExternalUrl: false,
          params: {
            paymentSchedId: 12,
            paymentSchedText: "Default",
            mrrId: mrrId,
            tranId: mrrName,
            customize: true,
            finalPaymentSched: true,
          },
        });
        itemScanList.push({
          paymetnSchedule: `<a href="${customizedURL}" target="${target}" >Create Custom Split Payment</a>`,
          amount: " ",
          splitPayment: " ",
          customize: " ",
        });
      }
      log.audit("itemScanList", itemScanList);
      return itemScanList;
    } catch (e) {
      log.error("getReturnableItemScan", e.message);
    }
  }

  /**
   * HAZARDOUS FUNCTIONALITY
   */

  /**
   * return the hazardous item return scan group by Hazardous
   * @param {number} options.rrId return request Id
   * @param {string} options.tranId transaction of the return request
   * @param {string} options.rrType - return request type
   * @param {number} options.mrrId - master return request id
   * @param {string} options.selectionType - In Dated/Returnable/Destruction
   * @return {object} array object of the des destruction item return scan
   */
  function getItemScanByDescrutionType(options) {
    log.audit("getItemScanByDescrutionType", options);
    try {
      let destructionList = [];
      let rrId = options.rrId;
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [
          ["custrecord_cs__mfgprocessing", "anyof", "1"],
          "AND",
          ["custrecord_cs_ret_req_scan_rrid", "anyof", rrId],
          "AND",
          ["custrecord_scanindated", "is", "F"],
        ],
        columns: [
          search.createColumn({
            name: "custitem1",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            summary: "GROUP",
            sort: search.Sort.ASC,
            label: "Hazardous Material",
          }),
        ],
      });
      var searchResultCount =
        customrecord_cs_item_ret_scanSearchObj.runPaged().count;
      log.error("customrecord_cs_item_ret_scanSearchObj", searchResultCount);
      let column = customrecord_cs_item_ret_scanSearchObj.columns;
      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        let isHazardous = result.getValue(column[0]);
        let name =
          isHazardous == true ? "Destruction Hazardous" : "Destruction";
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_sl_returnable_page",
          deploymentId: "customdeploy_sl_returnable_page",
          returnExternalUrl: false,
          params: {
            selectionType: options.selectionType,
            isHazardous: isHazardous,
            rrId: rrId,
            tranId: options.tranId,
            rrType: options.rrType,
            mrrId: options.mrrId,
          },
        });

        let isVerified = checkIfHazardousIsVerified({
          recId: rrId,
          isHazardous: isHazardous,
        });
        let returnData = getDesctructionHazardous({
          isHazardous: isHazardous,
          rrId: rrId,
          getBagLabel: true,
        });

        let returnList = returnData.returnList.join("_");
        log.emergency("returnDatareturnList", returnList);
        let params = {
          rrId: rrId,
          rrType: options.rrType,
          returnList: JSON.stringify(returnList),
          inventoryStatus: options.selectionType,
        };

        let printSLInventory = url.resolveScript({
          scriptId: "customscript_sl_print_inv_report",
          deploymentId: "customdeploy_sl_print_inv_report",
          returnExternalUrl: false,
          params: params,
        });
        let printSLURL;
        if (isVerified === true) {
          printSLURL = url.resolveScript({
            scriptId: "customscript_sl_print_bag_label",
            deploymentId: "customdeploy_sl_print_bag_label",
            returnExternalUrl: false,
            params: {
              recId: returnData.bagTagLabel,
            },
          });
        }
        isVerified = isVerified === true ? "T" : "F";
        destructionList.push({
          destruction: `<a href="${stSuiteletUrl}">${name}</a>`,
          printInventory: printSLInventory
            ? `<a href="${printSLInventory}">Print Inventory</a>`
            : "",
          printLabel: printSLURL
            ? `<a href="${printSLURL}">Print Label</a>`
            : "No Bag Label/Not Verified",
          isVerified: isVerified,
          name: name,
        });
        return true;
      });
      log.emergency("getItemScanByDescrutionType des ", destructionList);
      return destructionList;
    } catch (e) {
      log.error("getItemScanByDescrutionType", e.message);
    }
  }

  /**
   * Check if the hazardous is verified or not
   * @param {number} options.recId Return request internal id
   * @param {boolean} options.isHazardous Item Hazardous Material Field
   * @return {boolean} return if the destruction or destruction hazardous is verified
   */
  function checkIfHazardousIsVerified(options) {
    try {
      log.emergency("checkIfHazardousIsVerified", options);
      let ISVERIFIED = true;
      let ISHAZARDOUS = options.isHazardous == true ? "T" : "F";
      var customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [
          ["custrecord_cs__mfgprocessing", "anyof", "1"],
          "AND",
          ["custrecord_cs_return_req_scan_item.custitem1", "is", ISHAZARDOUS],
          "AND",
          ["custrecord_cs_ret_req_scan_rrid", "anyof", options.recId],
        ],

        columns: [
          search.createColumn({
            name: "custrecord_is_verified",
            summary: "GROUP",
            label: "Verified",
          }),
        ],
      });
      const searchResultCount =
        customrecord_cs_item_ret_scanSearchObj.runPaged().count;
      let column = customrecord_cs_item_ret_scanSearchObj.columns;
      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        let isVerified = result.getValue(column[0]);
        if (isVerified == false) {
          ISVERIFIED = false;
          return false;
        }
        return true;
      });
      //log.audit("checkifVerified", { searchResultCount, ISVERIFIED });
      return searchResultCount == 1 && ISVERIFIED == true;
    } catch (e) {
      log.error("checkIfHazardousIsVerified", e.message);
    }
  }

  /**
   * Get all the item return scan hazardous
   * @param {boolean}options.isHazardous
   * @param {number}options.rrId
   * @param {array}options.getReturnList
   * @return {*[]} return hazardous item return scan list
   */
  function getDesctructionHazardous(options) {
    try {
      let returnList = [];
      log.audit("getDesctructionHazardous", options);
      let bagTagLabel;
      let ISHAZARDOUS =
        options.isHazardous == true || options.isHazardous == "true"
          ? "T"
          : "F";
      log.audit("ISHAZARDOUS", ISHAZARDOUS);
      let hazardousList = [];
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [
          ["custrecord_cs__mfgprocessing", "anyof", "1"],
          "AND",
          ["custrecord_cs_return_req_scan_item.custitem1", "is", ISHAZARDOUS],
          "AND",
          ["custrecord_cs_ret_req_scan_rrid", "anyof", options.rrId],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_is_verified",
            label: "Verified",
          }),
          search.createColumn({ name: "internalid", label: "Internal ID" }),
          search.createColumn({
            name: "itemid",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            label: "NDC",
          }),
          search.createColumn({
            name: "purchasedescription",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            label: "Description",
          }),
          search.createColumn({
            name: "custrecord_scanmanufacturer",
            label: "Manufacturer",
          }),
          search.createColumn({
            name: "custrecord_scanorginallotnumber",
            label: "Serial/Lot Number",
          }),
          search.createColumn({
            name: "custrecord_scanorginallotnumber",
            label: "Original Lot Number",
          }),
          search.createColumn({
            name: "custrecord_cs_full_partial_package",
            label: "Full/Partial Package",
          }),
          search.createColumn({ name: "custrecord_cs_qty", label: "Qty" }),
          search.createColumn({
            name: "custrecord_scanpartialcount",
            label: "Partial Count",
          }),
          search.createColumn({
            name: "custrecord_cs_expiration_date",
            label: "Expiration Date",
          }),
          search.createColumn({
            name: "custrecord_cs__rqstprocesing",
            label: "Pharmacy Processing",
          }),
          search.createColumn({
            name: "custrecord_cs__mfgprocessing",
            label: "Mfg Processing",
          }),
          search.createColumn({
            name: "internalid",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
          }),
          search.createColumn({
            name: "custrecord_scanbagtaglabel",
            label: "Bag Tag Label",
          }),
          search.createColumn({
            name: "custitem_item_nonscannable",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            label: "Non Scannable Item",
          }),
          search.createColumn({
            name: "custrecord_scanpatienvial",
            label: "Patient Vial",
          }),
          search.createColumn({
            name: "custrecord_itemscan_needles_sharpcont",
          }),
          search.createColumn({
            name: "custrecord_itemscan_aero_combustible",
          }),
        ],
      });
      let column = customrecord_cs_item_ret_scanSearchObj.columns;
      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        let verified = result.getValue(column[0]) == true ? "T" : "F";
        let ndcName = result.getValue(column[2]);
        let itemId = result.getValue({
          name: "internalid",
          join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
        });
        let ndcLink = generateRedirectLink({
          type: "customrecord_cs_item_ret_scan",
          id: result.id,
        });
        bagTagLabel = result.getValue("custrecord_scanbagtaglabel");
        let bagLabelURL;

        if (bagTagLabel) {
          bagLabelURL = generateRedirectLink({
            type: "customrecord_kd_taglabel",
            id: bagTagLabel,
          });
        }
        log.audit("bagTagLabel des", bagTagLabel);
        returnList.push(result.id);
        hazardousList.push({
          internalId: result.getValue("internalid"),
          verified: verified,
          aerosol:
            result.getValue("custrecord_itemscan_aero_combustible") == true
              ? "T"
              : "F",
          sharp:
            result.getValue("custrecord_itemscan_needles_sharpcont") == true
              ? "T"
              : "F",
          ndc: `<a href =${ndcLink + "&cf=156&e=T"}> ${ndcName} </a>`,
          description: result.getValue({
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            name: "itemid",
          }),
          manufacturer: result.getValue("custrecord_scanmanufacturer"),
          serialLotNumber: result.getValue("custrecord_scanmanufacturer"),
          originalLotNumber: result.getValue("custrecord_scanorginallotnumber"),
          fullPartialPackage: result.getText(
            "custrecord_cs_full_partial_package",
          ),
          quantity: result.getValue("custrecord_cs_qty"),
          partialCount: result.getValue("custrecord_scanpartialcount"),
          expirationDate: result.getValue("custrecord_cs_expiration_date"),
          pharmaProcessing: result.getText("custrecord_cs__rqstprocesing"),
          mfgProcessing: result.getText("custrecord_cs__mfgprocessing"),
          bagTagLabel: bagTagLabel
            ? `<a href ="${bagLabelURL}" target="_blank">${bagTagLabel}</a>`
            : null,
          itemId: itemId,
          nonSannable:
            result.getValue({
              name: "custitem_item_nonscannable",
              join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            }) == true
              ? "T"
              : "F",
          patientVial:
            result.getValue({
              name: "custrecord_scanpatienvial",
            }) == true
              ? "T"
              : "F",
        });
        return true;
      });
      if (options.getBagLabel == true) {
        log.audit("Value", { bagTagLabel, returnList });
        return { bagTagLabel, returnList };
      } else {
        return hazardousList;
      }
    } catch (e) {
      log.error("getDesctructionHazardous", e.message);
    }
  }

  /**
   * Return file Id based on filename
   * @param fileName
   * @returns {number}
   */
  function getFileId(fileName) {
    log.audit("getFileId", fileName);
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
      log.error("getFileId", { error: e.message, filename: fileName });
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

  function getWACPrice(itemId) {
    try {
      return rxrs_util.getItemRate({
        priceLevelName: "BASE PRICE",
        itemId: itemId,
      });
    } catch (e) {
      log.error("getWACPrice", e.message);
    }
  }

  /**
   * Get the Manufacturer Maximum SO allowed Amount
   * @param {number} manufId manufacturer Id
   * @return {number} Maximum Allowed SO Amount
   */
  function getManufMaxSoAmount(manufId) {
    try {
      let maxSOAmount;
      const customrecord_returnprocedureSearchObj = search.create({
        type: "customrecord_returnprocedure",
        filters: [["custrecord_returnprocmanufacturer", "anyof", manufId]],
        columns: [
          search.createColumn({
            name: "custrecord_psmaxvalue",
            label: "Maximum Value",
          }),
        ],
      });
      customrecord_returnprocedureSearchObj.run().each(function (result) {
        maxSOAmount = result.getValue("custrecord_psmaxvalue");
      });

      if (maxSOAmount < 1) {
        maxSOAmount = 0;
      }
      log.emergency("maxSoAmount", maxSOAmount);

      return maxSOAmount;
    } catch (e) {
      log.error("getManufMaxSoAmount", e.message);
    }
  }

  /**
   * Create a redirect link
   * @params {string} options.type
   * @params {number} options.id
   * @return {url} return URL
   */
  function generateRedirectLink(options) {
    try {
      return url.resolveRecord({
        recordType: options.type,
        recordId: options.id,
        isEditMode: false,
      });
    } catch (e) {
      log.error("generateRedirectLink", e.message);
    }
  }

  /**
   * Get the internal Id of the Entity in the Master Return Request
   * @param {number}mrrId
   * @return {number} Entity Id
   */
  function getEntityFromMrr(mrrId) {
    try {
      const rs = search.lookupFields({
        type: "customrecord_kod_masterreturn",
        id: mrrId,
        columns: ["custrecord_mrrentity"],
      });
      return +rs.custrecord_mrrentity[0].value;
    } catch (e) {
      log.error("getEntityFromMrr", e.message);
    }
  }

  /**
   * It creates a returnable sublist on the form and populates it with the items that are passed in
   * @param {object}options.form - The form object that we are adding the sublist to.
   * @param {number}options.rrTranId - Return Request Id
   * @param {object}options.sublistFields SublistFields
   * @param {array} options.value
   * @param {boolean} options.isMainReturnable
   * @param {string} options.rrName
   * @param {string} options.paramManufacturer
   * @param {number} options.mrrId
   * @param {string} options.rrType
   * @param {string} options.inDate
   * @param {string} options.title
   * @param {boolean} options.finalPaymentSched
   * @param {string} options.csName
   * @returns  Updated Form.
   */
  const createReturnableSublist = (options) => {
    try {
      // log.debug("createReturnableSublist", options);

      let fieldName = [];
      let {
        form,
        rrTranId,
        sublistFields,
        value,
        isMainReturnable,
        rrName,
        paramManufacturer,
        mrrId,
        rrType,
        inDate,
        title,
        finalPaymentSched,
        csName,
      } = options;
      let ClientScriptName = 35951;
      if (csName) {
        ClientScriptName = "rxrs_cs_viewedit_line.js";
      }
      form.clientScriptFileId = getFileId("rxrs_cs_verifystaging.js"); // 35951; // getFileId(ClientScriptName);
      let sublist;
      sublist = form.addSublist({
        id: "custpage_items_sublist",
        type: serverWidget.SublistType.LIST,
        label: title,
      });

      if (paramManufacturer) {
        //If the user is in the Manufacturing Group. Add the following UI context below

        form.addButton({
          id: "custpage_verify",
          label: "Update Verification",
          functionName: `verify()`,
        });
        form.addButton({
          id: "custpage_printlabel",
          label: "Print Label",
          functionName: `printLabel()`,
        });
        form.addButton({
          id: "custpage_back",
          label: "Back",
          functionName: `backToReturnable()`,
        });
        sublist.addMarkAllButtons();
      }
      if (ClientScriptName == "rxrs_cs_viewedit_line.js") {
        // sublist.addButton({
        //   id: "custpage_submitline",
        //   label: "SUBMIT LAST MODIFIED LINE",
        //   functionName: `submit()`,
        // });
      }
      sublistFields.forEach((attri) => {
        // log.audit("attri", attri);

        fieldName.push(attri.id);
        if (attri.source) {
          sublist.addField({
            id: attri.id,
            type: serverWidget.FieldType[attri.type],
            label: attri.label,
            source: attri.source,
          });
          if (attri.updateDisplayType) {
            sublist.updateDisplayType({
              displayType:
                serverWidget.FieldDisplayType[attri.updateDisplayType],
            });
          }
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
      });
      let mainLineInfo = [];
      value.forEach((val) => {
        let value = Object.values(val);
        let fieldInfo = [];
        for (let i = 0; i < value.length; i++) {
          if (isEmpty(fieldName[i])) continue;

          if (inDate != true && fieldName[i] == "custpage_in_date") {
            log.debug("val", [inDate, fieldName[i]]);
          } else {
            fieldInfo.push({
              fieldId: fieldName[i],
              value: value[i],
            });
          }
        }
        mainLineInfo.push(fieldInfo);
      });

      populateSublist({
        sublist: sublist,
        fieldInfo: mainLineInfo,
        isMainReturnable: isMainReturnable,
        isIndate: inDate,
      });
    } catch (e) {
      log.error("createReturnableSublist", {
        error: e.message,
        params: options,
      });
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
   * @param {number} options.mrrId
   * @param {string} options.rrType
   * @param {string} options.inDate
   * @param {string} options.title
   * @param {boolean} options.finalPaymentSched
   * @param {string} options.csName
   * @returns  Updated Form.
   */
  const createReturnableSublistEditLine = (options) => {
    try {
      // log.debug("createReturnableSublist", options);

      let fieldName = [];
      let {
        form,
        rrTranId,
        sublistFields,
        value,
        isMainReturnable,
        rrName,
        paramManufacturer,
        mrrId,
        rrType,
        inDate,
        title,
        finalPaymentSched,
        csName,
      } = options;

      let sublist;
      sublist = form.addSublist({
        id: "custpage_items_sublist",
        type: serverWidget.SublistType.LIST,
        label: title,
      });
      //
      // sublist.addButton({
      //   id: "custpage_submitline",
      //   label: "SUBMIT LAST MODIFIED LINE",
      //   functionName: `submit()`,
      // });
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
        // log.audit("attri", attri);

        fieldName.push(attri.id);
        if (attri.source) {
          sublist.addField({
            id: attri.id,
            type: serverWidget.FieldType[attri.type],
            label: attri.label,
            source: attri.source,
          });
          if (attri.updateDisplayType) {
            sublist.updateDisplayType({
              displayType:
                serverWidget.FieldDisplayType[attri.updateDisplayType],
            });
          }
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
      });
      let mainLineInfo = [];
      value.forEach((val) => {
        let value = Object.values(val);
        let fieldInfo = [];
        for (let i = 0; i < value.length; i++) {
          if (isEmpty(fieldName[i])) continue;

          if (inDate != true && fieldName[i] == "custpage_in_date") {
            log.debug("val", [inDate, fieldName[i]]);
          } else {
            fieldInfo.push({
              fieldId: fieldName[i],
              value: value[i],
            });
          }
        }
        mainLineInfo.push(fieldInfo);
      });

      populateSublist({
        sublist: sublist,
        fieldInfo: mainLineInfo,
        isMainReturnable: isMainReturnable,
        isIndate: inDate,
      });
    } catch (e) {
      log.error("createReturnableSublistEditLine", {
        error: e.message,
        params: options,
      });
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
              log.emergency("SetSublist", {
                error: e.message,
                data: element[i].value,
                fieldId: element[i].fieldId,
              });
            }
          }

          lineCount++;
        });
      }
    } catch (e) {
      log.error("populateSublist", e.message);
    }
  };
  const createDestructioneSublist = (options) => {
    try {
      log.debug("createDestructioneSublist", options);

      let fieldName = [];
      let form = options.form;
      let sublistFields = options.sublistFields;
      let value = options.value;
      let scriptId = 35951; // getFileId("rxrs_cs_verify_staging.js");
      form.clientScriptFileId = getFileId("rxrs_cs_verifystaging.js");
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
          id: "custpage_printlabel",
          label: "Print Label",
          functionName: `printLabel()`,
        });
        form.addButton({
          id: "custpage_back",
          label: "Back",
          functionName: `backToReturnable()`,
        });
        sublist.addMarkAllButtons();
      }

      sublistFields.forEach((attri) => {
        if (attri.id == "test") {
          log.emergency("not pushing aro");
        } else {
          fieldName.push(attri.id);
        }

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
      log.emergency("val", { fieldName, value });
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
   * Get the Item ReturnScan In days
   * @params {number} irsId Item Return Scan Id
   * @return {number} returns the In days of the Item return Scan
   */
  function getIndays(irsId) {
    log.audit("getIndays", irsId);
    try {
      let inDays;
      var customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [["internalid", "anyof", irsId]],
        columns: [
          search.createColumn({
            name: "custrecord_cs_return_req_scan_item",
            label: "Item",
          }),
          search.createColumn({
            name: "formulanumeric",
            formula: "{today}-{custrecord_ret_start_date}",
            label: "Formula (Numeric)",
          }),
        ],
      });

      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        inDays = result.getValue({
          name: "formulanumeric",
          formula: "{today}-{custrecord_ret_start_date}",
        });
        log.audit("inDays", { inDays, irsId });
      });
      log.audit("indaysss", parseInt(inDays));
      return parseInt(inDays);
    } catch (e) {
      log.error("getIndays", e.message);
    }
  }

  /**
   * Get the total item return scan amount per MRR and Manuf Processing
   * @param {number} options.mrrId
   * @param {string} options.pharmaProcessing
   * @param {string} options.mfgProcessing
   * @return {number} return non-returnable total amount
   *
   */
  function getMrrIRSTotalAmount(options) {
    let total = 0;
    log.audit("getMrrIRSTotalAmount", options);
    let { mrrId, pharmaProcessing, mfgProcessing } = options;
    const customrecord_cs_item_ret_scanSearchObj = search.create({
      type: "customrecord_cs_item_ret_scan",
      filters: [
        ["custrecord_irs_master_return_request", "anyof", mrrId],
        "AND",
        ["custrecord_cs__rqstprocesing", "anyof", pharmaProcessing],
      ],
      columns: [
        search.createColumn({
          name: "custrecord_irc_total_amount",
          summary: "SUM",
          label: "Wac Amount",
          sort: search.Sort.DESC,
        }),
      ],
    });
    if (mfgProcessing) {
      customrecord_cs_item_ret_scanSearchObj.filters.push(
        search.createFilter({
          name: "custrecord_cs__mfgprocessing",
          operator: "anyof",
          values: mfgProcessing,
        }),
      );
    }

    customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      total = result.getValue({
        name: "custrecord_irc_total_amount",
        summary: "SUM",
      });
    });
    return total;
  }

  return {
    getIndays,
    getReturnableManufacturer,
    createDestructioneSublist,
    createReturnableSublist,
    checkIfRRIsVerified,
    getReturnableItemScan: getReturnableItemScan,
    getDesctructionHazardous,
    getItemScanByDescrutionType,
    getFileId,
    isEmpty,
    getManufactuerId,
    getWACPrice,
    getManufMaxSoAmount,
    generateRedirectLink,
    getEntityFromMrr,
    getMrrIRSTotalAmount,
    SUBLISTFIELDS,
    createReturnableSublistEditLine,
  };
});
