/**
 * @NApiVersion 2.1
 */
define([
  "N/https",
  "N/record",
  "N/ui/serverWidget",
  "N/url",
  "N/search",
  "./rxrs_verify_staging_lib",
] /**
 * @param{https} https
 * @param{record} record
 * @param{serverWidget} serverWidget
 * @param{url} url
 */, (https, record, serverWidget, url, search, vsLib) => {
  /**
   * Get the master return requesst all item return scan
   * @param options
   * @returns {*[]}
   */
  function getMRRIRSLine(options) {
    try {
      let itemScanList = [];
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [["custrecord_irs_master_return_request", "anyof", options]],
        columns: [
          search.createColumn({
            name: "custrecord_cs_return_req_scan_item",
            label: "Item",
          }),
          search.createColumn({
            name: "salesdescription",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            label: "Description",
          }),
          search.createColumn({
            name: "custrecord_scanmanufacturer",
            label: "Manufacturer",
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
            name: "custrecord_cs__mfgprocessing",
            label: "Mfg Processing",
          }),
          search.createColumn({
            name: "custrecord_cs__rqstprocesing",
            label: "Pharmacy Processing",
          }),
          search.createColumn({
            name: "custrecord_scannonreturnreason",
            label: "Non-Returnable",
          }),
          search.createColumn({
            name: "custrecord_cs__controlnum",
            label: "Control #",
          }),
          search.createColumn({
            name: "custrecord_isc_inputrate",
            label: "Input Rate",
          }),
          search.createColumn({
            name: "custrecord_irc_total_amount",
            label: "Amount ",
          }),
          search.createColumn({
            name: "custrecord_scanpricelevel",
            label: "Price Level",
          }),
          search.createColumn({
            name: "custrecord_scanrate",
            label: "Scan Rate",
          }),
          search.createColumn({
            name: "internalid",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
            label: "Internal ID",
          }),
          search.createColumn({
            name: "custrecord_scanpricelevel",
            label: "Price level",
          }),
        ],
      });

      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        let itemId = result.getValue({
          name: "internalid",
          join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
        });

        let ndcName = result.getText({
          name: "custrecord_cs_return_req_scan_item",
        });

        let ndcLink = vsLib.generateRedirectLink({
          type: "customrecord_cs_item_ret_scan",
          id: result.id,
        });

        itemScanList.push({
          select: " ",
          itemId: itemId,
          internalId: result.id,
          ndc: `<a href=${ndcLink}>${ndcName}</a>`,
          description: result.getValue({
            name: "salesdescription",
            join: "CUSTRECORD_CS_RETURN_REQ_SCAN_ITEM",
          }),
          manufacturer: result.getText({
            name: "custrecord_scanmanufacturer",
          }),
          quantity: result.getValue({ name: "custrecord_cs_qty" }) || 0,
          partialCount:
            result.getValue({
              name: "custrecord_scanpartialcount",
            }) || 0,
          expirationDate: result.getValue({
            name: "custrecord_cs_expiration_date",
          }),
          mfgProcessing: result.getText({
            name: "custrecord_cs__mfgprocessing",
          }),
          pharmaProcessing: result.getText({
            name: "custrecord_cs__rqstprocesing",
          }),
          changePharma: null,

          nonRetReason:
            result.getValue({
              name: "custrecord_scannonreturnreason",
            }) || 8,
          note: "",
          priceLevel: result.getText("custrecord_scanpricelevel"),
          rate:
            result.getValue({ name: "custrecord_scanrate" }) ||
            result.getValue({ name: "custrecord_isc_inputrate" }),
        });
        return true;
      });
      log.audit("itemScanList", itemScanList);
      return itemScanList;
    } catch (e) {
      log.error("getMRRIRSLine", e.message);
    }
  }

  const viewEditLineSUBLIST = [
    {
      id: "custpage_select",
      type: "CHECKBOX",
      label: "SELECT",
      updateDisplayType: "ENTRY",
    },
    {
      id: "custpage_itemid",
      type: "TEXT",
      label: "ITEM Id",
      updateDisplayType: "HIDDEN",
    },
    {
      id: "custpage_internalid",
      type: "TEXT",
      label: "Internal Id",
      updateDisplayType: "HIDDEN",
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
    {
      id: "custpage_manufacturer",
      type: "TEXT",
      label: "Manufacturer",
      updateDisplayType: "DISABLED",
    },
    {
      id: "custpage_quantity",
      type: "TEXT",
      label: "FULL",
      updateDisplayType: "DISABLED",
    },
    {
      id: "custpage_partial_count",
      type: "TEXT",
      label: "PARTIAL COUNT",
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
      id: "custpage_change_processing",
      type: "CHECKBOX",
      label: "CHANGE PHARMA PROCESSING",
      updateDisplayType: "DISABLED",
    },

    {
      id: "custpage_nonreturnable_reason",
      type: "SELECT",
      label: "Non-Ret. Reason",
      source: "customlist_kd_non_returnable_reason",
    },
    {
      id: "custpage_notes",
      type: "TEXT",
      label: "NOTES",
      updateDisplayType: "ENTRY",
    },
    {
      id: "custpage_pricelevel",
      type: "TEXT",
      label: "PRICE LEVEL",
      updateDisplayType: "INLINE",
    },
    {
      id: "custpage_rate",
      type: "TEXT",
      label: "RATE",
      updateDisplayType: "ENTRY",
    },

    {
      id: "custpage_update_product_catalog",
      type: "CHECKBOX",
      label: "Update Product Catalog",
      updateDisplayType: "DISABLED",
    },
  ];

  /**
   * Get the total MRR per pharma processing
   * @param options - MRR ID
   */
  function getPharmaProcessingGroupTotal(options) {
    try {
      let results = [];
      let total = 0;
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [
          ["custrecord_irs_master_return_request", "anyof", options],
          "AND",
          ["custrecord_cs__rqstprocesing", "noneof", "@NONE@"],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_irc_total_amount",
            summary: "SUM",
            label: "Amount ",
          }),
          search.createColumn({
            name: "custrecord_cs__rqstprocesing",
            summary: "GROUP",
            label: "Pharmacy Processing",
          }),
        ],
      });

      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        let pharmaProcessing = result.getValue({
          name: "custrecord_cs__rqstprocesing",
          summary: "GROUP",
        });
        let amount = result.getValue({
          name: "custrecord_irc_total_amount",
          summary: "SUM",
        });
        total += +amount;
        results.push({
          name: pharmaProcessing == 2 ? "YES" : "NO",
          value: +amount,
        });
        return true;
      });
      results.push({
        name: "",
        value: total,
      });
      log.audit("getPharmaProcessingGroupTotal ", results);
      return results;
    } catch (e) {
      log.error("getPharmaProcessingGroupTotal", e.message);
    }
  }

  /**
   * Get the master return request Summary Group by Payment Schedule
   * @param options - Master Return Request Id
   */
  function getMRRSummary(options) {
    try {
      let results = [];
      var customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [["custrecord_irs_master_return_request", "anyof", options]],
        columns: [
          search.createColumn({
            name: "custrecord_final_payment_schedule",
            summary: "GROUP",
            label: "Final Payment Schedule",
          }),
          search.createColumn({
            name: "custrecord_irc_total_amount",
            summary: "SUM",
            label: "Amount ",
          }),
        ],
      });

      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        results.push({
          paymentName: result.getText({
            name: "custrecord_final_payment_schedule",
            summary: "GROUP",
          }),
          amount: +result.getValue({
            name: "custrecord_irc_total_amount",
            summary: "SUM",
          }),
        });
        return true;
      });
      return results;
    } catch (e) {
      log.error("getMRRSummary", e.message);
    }
  }

  return {
    getMRRIRSLine: getMRRIRSLine,
    viewEditLineSUBLIST: viewEditLineSUBLIST,
    getMRRSummary: getMRRSummary,
    getPharmaProcessingGroupTotal: getPharmaProcessingGroupTotal,
  };
});
