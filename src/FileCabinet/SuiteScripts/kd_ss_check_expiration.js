/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/record", "N/search"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search) => {
  /**
   * Defines the Scheduled script trigger point.
   * @param {Object} scriptContext
   * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
   * @since 2015.2
   */

  const execute = (context) => {
    let dateToday;
    try {
      let customerIds = [];
      log.debug("Scheduled Script is Running");
      let today = new Date();
      let dd = String(today.getDate()).padStart(2, "0");
      let mm = String(today.getMonth() + 1); //January is 0!
      let yyyy = today.getFullYear();

      dateToday = mm + "/" + dd + "/" + yyyy;
      log.debug("Date Today" + dateToday);
      getEntity()
        .run()
        .each(function (result) {
          const id = result.id;
          const dateExp = result.getValue({
            name: "custentity_kd_license_exp_date",
          });
          const stateDateExp = result.getValue({
            name: "custentity_state_license_exp",
          });
          const isExpired = result.getValue({
            name: "custentity_kd_license_expired",
          });
          const stateLicenseisExpired = result.getValue({
            name: "custentity_kd_stae_license_expired",
          });
          const recType = result.getValue({
            name: "formulatext",
            formula: "{type}",
          });

          if (dateExp) {
            if (dateExp <= dateToday && isExpired !== true) {
              log.debug("Expiration Date " + dateExp);
              log.debug(id + " License is expired ");
              record.submitFields({
                type: recType,
                id: id,
                values: {
                  custentity_kd_license_expired: true,
                },
              });
            } else {
              log.debug(id + " License is not expired ");
              record.submitFields({
                type: recType,
                id: id,
                values: {
                  custentity_kd_license_expired: false,
                },
              });
            }
          }
          if (stateDateExp) {
            if (stateDateExp <= dateToday && stateLicenseisExpired !== true) {
              log.debug("State Expiration Date " + stateDateExp);
              log.debug(id + " License is expired ");
              record.submitFields({
                type: recType,
                id: id,
                values: {
                  custentity_kd_stae_license_expired: true,
                },
              });
            } else {
              record.submitFields({
                type: recType,
                id: id,
                values: {
                  custentity_kd_stae_license_expired: false,
                },
              });
            }
          }

          return true;
        });
    } catch (e) {
      log.error(e.message);
    }
  };

  function getEntity() {
    return search.create({
      type: "entity",
      filters: [
        [
          ["custentity_kd_license_exp_date", "isnotempty", ""],
          "OR",
          ["custentity_state_license_exp", "isnotempty", ""],
        ],
      ],
      columns: [
        search.createColumn({
          name: "custentity_kd_license_exp_date",
          label: "DEA License Expiration Date",
        }),
        search.createColumn({
          name: "custentity_kd_license_expired",
          label: "DEA License Expired",
        }),
        search.createColumn({
          name: "custentity_state_license_exp",
          label: "State License Expiration Date",
        }),
        search.createColumn({
          name: "custentity_kd_stae_license_expired",
          label: "State License Expired",
        }),
        search.createColumn({
          name: "formulatext",
          formula: "{type}",
          label: "Formula (Text)",
        }),
      ],
    });
  }

  return { execute };
});
