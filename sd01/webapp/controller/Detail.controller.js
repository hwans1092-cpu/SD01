sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../model/formatter"
], function (Controller, formatter) {
    "use strict";

    return Controller.extend("code.t4.d29.sd01.controller.Detail", {

        formatter: formatter,

        onInit: function () {
            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteDetail")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sPath = "/" + decodeURIComponent(
                oEvent.getParameter("arguments").path
            );

            this.getView().bindElement({ path: sPath });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        }

    });
});
