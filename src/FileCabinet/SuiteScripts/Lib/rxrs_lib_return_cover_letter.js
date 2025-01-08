/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search) => {
  /**
   * Get customer information
   * @param {number} customerId
   */
  function getCustomerInfo(customerId) {
    try {
      let customerInfo = {};
      const entitySearchObj = search.create({
        type: "entity",
        filters: [["internalid", "anyof", customerId]],
        columns: [
          search.createColumn({ name: "altname", label: "Name" }),
          search.createColumn({ name: "address1", label: "Address 1" }),
          search.createColumn({ name: "state", label: "State/Province" }),
          search.createColumn({ name: "zipcode", label: "Zip Code" }),
          search.createColumn({
            name: "custentity_mfgprimarycontact",
            label: "Manufacturer Primary Contact",
          }),
          search.createColumn({ name: "phone", label: "Phone" }),
          search.createColumn({ name: "fax", label: "Fax" }),
          search.createColumn({
            name: "custentity_kd_license_number",
            label: "DEA License #",
          }),
        ],
      });
      entitySearchObj.run().each(function (result) {
        customerInfo.name = result.getValue("altname");
        customerInfo.addr1 = result.getValue("address1");
        customerInfo.state = result.getValue("state");
        customerInfo.zipcode = result.getValue("zipcode");
        customerInfo.contact = result.getValue("custentity_mfgprimarycontact");
        customerInfo.phone = result.getValue("phone");
        customerInfo.fax = result.getValue("fax");
        customerInfo.dea = result.getValue("custentity_kd_license_number");
        return true;
      });
      return customerInfo;
    } catch (e) {
      log.error("getCustomerInfo", e.message);
    }
  }

  /**
   * Get the returnable and non-returnable total amount
   * @param {number} options.rrId - return request Id
   * @return {number} total amount
   */
  function getItemReturnScanTotal(options) {
    try {
      log.audit("getItemReturnScanTotal", options);
      let { rrId } = options;
      let totalAmount = [];
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [
          ["custrecord_cs_ret_req_scan_rrid", "anyof", "10804"],
          "AND",
          ["custrecord_cs__mfgprocessing", "anyof", "1", "2"],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_wac_amount",
            summary: "SUM",
            label: "Amount",
          }),
          search.createColumn({
            name: "custrecord_cs__mfgprocessing",
            summary: "GROUP",
            label: "Mfg Processing",
          }),
        ],
      });

      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        let amount = result.getValue({
          name: "custrecord_wac_amount",
          summary: "SUM",
        });

        totalAmount.push(amount);
        return true;
      });

      return {
        nonReturnableAmount: totalAmount[0],
        returnableAmount: totalAmount[1],
      };
    } catch (e) {
      log.error("getItemReturnScanTotal", e.message);
    }
  }

  return {
    getCustomerInfo,
    getItemReturnScanTotal,
  };
});
