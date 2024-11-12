/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/file", "N/record", "N/ui/serverWidget", "../rxrs_util"] /**
 * @param{file} file
 * @param{record} record
 * @param{serverWidget} serverWidget
 */, (file, record, serverWidget, rxrs_util) => {
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
      let title = "Return Cover Letter";
      let csName = "rxrs_cs_viewedit_line.js";
      if (params.pageTitle) {
        title = params.pageTitle;
        csName = "rxrs_cs_edit_line.js";
      }
      log.audit("displayFrom csname", csName);
      let form = serverWidget.createForm({
        title: title,
        hideNavBar: true,
      });
      try {
        form.clientScriptFileId = rxrs_util.getFileId(csName);
        form.addSubmitButton({
          label: "test",
        });
      } catch (e) {
        log.error("setting client script Id", e.message);
      }
      log.audit("form", form);

      return form;
    } catch (e) {
      log.error("displayForms", e.message);
    }
  }

  return { onRequest };
});
