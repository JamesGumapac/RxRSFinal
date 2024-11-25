/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search) => {
  function checkEntityExpiration(options) {
    log.audit("checkEntityExpiration", options);
    let result = [];
    try {
      const entitySearchObj = search.create({
        type: "entity",
        filters: [
          [
            ["custentity_kd_license_exp_date", "onorbefore", "today"],
            "AND",
            ["custentity_kd_license_expired", "is", "F"],
            "AND",
            ["custentity_kd_license_exp_date", "isnotempty", ""],
          ],
          "OR",
          [
            ["custentity_state_license_exp", "isnotempty", ""],
            "AND",
            ["custentity_kd_stae_license_expired", "is", "F"],
            "AND",
            ["custentity_state_license_exp", "onorbefore", "today"],
          ],
        ],
        columns: [
          search.createColumn({
            name: "custentity_dea_license_exp",
            label: "DEA LICENSE EXP",
          }),
          search.createColumn({
            name: "custentity_kd_license_exp_date",
            label: "DEA License Expiration Date",
          }),
          search.createColumn({
            name: "custentity_kd_stae_license_expired",
            label: "State License Expired",
          }),
          search.createColumn({
            name: "custentity_state_license_exp",
            label: "State License Expiration Date",
          }),
          search.createColumn({
            name: "formulatext",
            formula: "{type}",
            label: "Formula (Text)",
          }),
        ],
      });
      const searchResultCount = entitySearchObj.runPaged().count;
      log.debug("entitySearchObj result count", searchResultCount);
      entitySearchObj.run().each(function (result) {
        result.push({
          id: result.id,
          isDeaExpired: result.getValue("custentity_dea_license_exp"),
          deaExpirationDate: result.getValue("custentity_kd_license_exp_date"),
          isStateExpired: result.getValue("custentity_kd_stae_license_expired"),
          stateExpirationDate: result.getValue("custentity_state_license_exp"),
          type: result.getValue({
            name: "formulatext",
            formula: "{type}",
          }),
        });
        return true;
      });
    } catch (e) {
      log.error("checkEntityExpiration", e.message);
    }
  }

  return { checkEntityExpiration };
});
