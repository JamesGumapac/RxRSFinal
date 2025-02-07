/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search) => {
  /**
   * Get the Inventory Object Print out
   * @param {number}options.rrId
   * @param {string}options.rrType
   * @param {number}options.manufId
   * @param {array}options.returnList - Internal Id of the Return List
   * @param {string}options.inventoryStatus
   */
  function getInventoryLocationObject(options) {
    try {
      let mainFields = {};

      const rrRec = record.load({
        type: options.rrType,
        id: options.rrId,
      });
      mainFields.location = rrRec
        .getValue("custbody_location_address")
        .replaceAll("\r\n", ",");

      if (options.manufId) {
        const manufRec = record.load({
          type: "customrecord_csegmanufacturer",
          id: options.manufId,
        });
        let manuf = {
          manufName: manufRec.getValue("name").replaceAll("&", "and"),
          dea: `DEA # ${manufRec.getValue("custrecord_mfgdeanumber")}`,
          address1: manufRec.getValue("custrecord_mfgaddressline1"),
          city: manufRec.getValue("custrecord_mfgcity"),
          state: manufRec.getValue("custrecord_mfgstate"),
          zip: manufRec.getValue("custrecord_mfgzip"),
        };
        mainFields.manufInfo = `${manuf.manufName},${manuf.address1},${manuf.city} ${manuf.state} ${manuf.zip},${manuf.dea}`;
      }

      mainFields.inventoryStatus = options.inventoryStatus.includes("InDated")
        ? "Returnable In Dated"
        : options.inventoryStatus;
      mainFields.returnNo = rrRec.getValue("tranid");
      mainFields.date = rrRec.getText("trandate");
      log.error("mainFields", mainFields);
      mainFields.item = getInventoryReport({ returnList: options.returnList });
      return mainFields;
    } catch (e) {
      log.error("getInventoryLocationObject", e.message);
    }
  }

  /**
   * Get the Inventory Report
   * @param options.returnList
   */
  function getInventoryReport(options) {
    try {
      log.emergency("getInventoryReport", options.returnList);
      let item = [];
      var customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [["internalid", "anyof", options.returnList]],
        columns: [
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
            name: "custrecord_cs_item_manufacturer",
            label: "Manufacturer",
          }),
          search.createColumn({
            name: "custrecord_cs__controlnum",
            label: "Control #",
          }),
          search.createColumn({
            name: "name",
            join: "CUSTRECORD_SCAN_222FORM",
          }),
          search.createColumn({
            name: "custrecord_scanorginallotnumber",
            label: "Serial/Lot Number",
          }),
          search.createColumn({
            name: "custrecord_cs_expiration_date",
            label: "Expiration Date",
          }),
          search.createColumn({
            name: "custrecord_cs_package_size",
            label: "Package Size",
          }),
          search.createColumn({ name: "custrecord_cs_qty", label: "Qty" }),
          search.createColumn({
            name: "custrecord_scanpartialcount",
            label: "Partial Count",
          }),
        ],
      });
      let column = customrecord_cs_item_ret_scanSearchObj.columns;
      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        item.push({
          ndc: result.getValue(column[0]),
          description: result.getValue(column[1]),
          manufacturer: result
            .getValue("custrecord_cs_item_manufacturer")
            .replaceAll("&", "and"),
          ctrl: result.getValue(column[3]),
          form222: result.getValue(column[4]),
          lotNumber: result.getValue(column[5]),
          expDate: result.getValue(column[6]),
          pkSize: result.getValue(column[7]),
          full: result.getValue(column[8]) || 0,
          partial: result.getValue(column[9]) || 0,
        });
        return true;
      });
      log.error("getInventory", item);
      return item;
    } catch (e) {
      log.error("getInventoryReport", e.message);
    }
  }

  return { getInventoryLocationObject };
});
