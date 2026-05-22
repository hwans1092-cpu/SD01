sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"
], function (
    Controller, Filter, FilterOperator, JSONModel,
    SelectDialog, StandardListItem, MessageToast, MessageBox, formatter
) {
    "use strict";

    function getTodayString() {
        var d = new Date();
        return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    }

    function formatAmountShort(iAmount) {
        if (iAmount >= 100000000) {
            return { value: (Math.round((iAmount / 100000000) * 10) / 10).toString(), scale: "억" };
        }
        if (iAmount >= 10000) {
            return { value: (Math.round((iAmount / 10000) * 10) / 10).toString(), scale: "만" };
        }
        return { value: iAmount.toString(), scale: "" };
    }

    return Controller.extend("code.t4.d29.sd01.controller.Main", {

        formatter: formatter,

        onInit: function () {
            this._oCtnoDialog = null;
            this._bInitialSearchDone = false;
            this._aAllData = [];
            this._iCurrentPage = 1;
            this._iPageSize = 20;

            this.getView().setModel(new JSONModel({
                totalCount: 0, totalAmount: 0, totalAmountDisplay: "0", totalAmountScale: "",
                issuedCount: 0, pendingCount: 0, currency: "KRW", resultText: ""
            }), "summary");

            this.getView().setModel(new JSONModel({ data: [] }), "chart");
            this.getView().setModel(new JSONModel({ rows: [] }), "tableData");
            this.getView().setModel(new JSONModel({
                currentPage: 1, totalPages: 1, pageInfo: "1 / 1",
                hasPrev: false, hasNext: false, totalCount: 0
            }), "pagination");
        },

        onAfterRendering: function () {
            if (this._bInitialSearchDone) { return; }
            this._bInitialSearchDone = true;
            this._setTodayAndSearch();
        },

        _setTodayAndSearch: function () {
            var oDRS = this.byId("drsBillYmd");
            if (!oDRS) { return; }
            var oToday = new Date();
            oToday.setHours(0, 0, 0, 0);
            oDRS.setDateValue(oToday);
            oDRS.setSecondDateValue(oToday);
            this.onSearch();
        },

        _buildFilters: function () {
            var aFilters = [];
            var sCtno = this.byId("inpCtno").getValue().trim();
            if (sCtno) {
                aFilters.push(new Filter("ctno", FilterOperator.EQ, sCtno));
            }
            var oDRS = this.byId("drsBillYmd");
            var oFrom = oDRS.getDateValue();
            var oTo   = oDRS.getSecondDateValue();
            if (oFrom) {
                var oStart = new Date(oFrom); oStart.setHours(0, 0, 0, 0);
                var oEnd   = oTo ? new Date(oTo) : new Date(oFrom);
                oEnd.setDate(oEnd.getDate() + 1); oEnd.setHours(0, 0, 0, 0);
                aFilters.push(new Filter({
                    filters: [
                        new Filter("bill_ymd", FilterOperator.GE, oStart),
                        new Filter("bill_ymd", FilterOperator.LT, oEnd)
                    ],
                    and: true
                }));
            }
            var sStatus = this.byId("selStatus").getSelectedKey();
            if (sStatus === "ISSUED") {
                aFilters.push(new Filter("vbeln_iv", FilterOperator.NE, ""));
            } else if (sStatus === "PENDING") {
                aFilters.push(new Filter("vbeln_iv", FilterOperator.EQ, ""));
            }
            return aFilters;
        },

        onSearch: function () {
            this._iCurrentPage = 1;
            this._loadAllData(this._buildFilters());
        },

        onReset: function () {
            this.byId("inpCtno").setValue("");
            var oToday = new Date(); oToday.setHours(0, 0, 0, 0);
            var oDRS = this.byId("drsBillYmd");
            oDRS.setDateValue(oToday);
            oDRS.setSecondDateValue(oToday);
            this.byId("selStatus").setSelectedKey("ALL");
            this.onSearch();
        },

        onInputSubmit: function () { this.onSearch(); },

        _loadAllData: function (aFilters) {
            var oModel = this.getOwnerComponent().getModel();
            var that = this;
            oModel.read("/ZCDS_D4_SD_0005", {
                filters: aFilters,
                urlParameters: {
                    "$orderby": "bill_ymd desc",
                    "$top": "5000",
                    "$inlinecount": "allpages"
                },
                success: function (oData) {
                    var iTotal = parseInt(oData.__count, 10) || oData.results.length;
                    that._aAllData = oData.results;
                    that._updateSummary(oData.results, iTotal);
                    that._applyPage(1);
                },
                error: function () {}
            });
        },

        _applyPage: function (iPage) {
            this._iCurrentPage = iPage;
            var iSize  = this._iPageSize;
            var iTotal = this._aAllData.length;
            var iPages = Math.max(1, Math.ceil(iTotal / iSize));
            var aRows  = this._aAllData.slice((iPage - 1) * iSize, iPage * iSize);

            this.getView().getModel("tableData").setData({ rows: aRows });
            this.getView().getModel("pagination").setData({
                currentPage: iPage,
                totalPages:  iPages,
                pageInfo:    iPage + " / " + iPages,
                hasPrev:     iPage > 1,
                hasNext:     iPage < iPages,
                totalCount:  iTotal
            });
        },

        onPageFirst: function () { this._applyPage(1); },
        onPagePrev:  function () {
            if (this._iCurrentPage > 1) { this._applyPage(this._iCurrentPage - 1); }
        },
        onPageNext: function () {
            var iMax = Math.max(1, Math.ceil(this._aAllData.length / this._iPageSize));
            if (this._iCurrentPage < iMax) { this._applyPage(this._iCurrentPage + 1); }
        },
        onPageLast: function () {
            this._applyPage(Math.max(1, Math.ceil(this._aAllData.length / this._iPageSize)));
        },
        onGoToPage: function () {
            var iPage = parseInt(this.byId("stepPage").getValue(), 10);
            var iMax  = Math.max(1, Math.ceil(this._aAllData.length / this._iPageSize));
            if (iPage >= 1 && iPage <= iMax) {
                this._applyPage(iPage);
            } else {
                this.byId("stepPage").setValue(this._iCurrentPage);
            }
        },

        _updateSummary: function (aResults, iTotalCount) {
            var iTotalAmount = 0, iIssuedCount = 0, sCurrency = "", oDateMap = {};

            aResults.forEach(function (oRow) {
                var fAmt    = parseFloat(oRow.bill_amt) || 0;
                var bIssued = !!(oRow.vbeln_iv && oRow.vbeln_iv.trim());
                iTotalAmount += fAmt;
                if (bIssued) { iIssuedCount++; }
                if (oRow.waers && !sCurrency) { sCurrency = oRow.waers; }
                var sDate = formatter.formatDate(oRow.bill_ymd);
                if (sDate) {
                    if (!oDateMap[sDate]) { oDateMap[sDate] = { amount: 0, count: 0, pending: 0 }; }
                    oDateMap[sDate].amount += fAmt;
                    oDateMap[sDate].count  += 1;
                    if (!bIssued) { oDateMap[sDate].pending += 1; }
                }
            });

            var sCurr        = sCurrency || "KRW";
            var iTotalRound  = Math.round(iTotalAmount);
            var oAmtFmt      = formatAmountShort(iTotalRound);

            this.getView().getModel("summary").setData({
                totalCount:          iTotalCount,
                totalAmount:         iTotalRound,
                totalAmountDisplay:  oAmtFmt.value,
                totalAmountScale:    oAmtFmt.scale,
                issuedCount:         iIssuedCount,
                pendingCount:        iTotalCount - iIssuedCount,
                currency:            sCurr,
                resultText:          iTotalCount + "건 조회되었습니다."
            });

            var aChartData = Object.keys(oDateMap).sort().map(function (sDate) {
                var iCnt     = oDateMap[sDate].count;
                var iPending = oDateMap[sDate].pending;
                var fRatio   = iCnt > 0 ? Math.round((iPending / iCnt) * 100) : 0;
                return {
                    date:      sDate,
                    amount:    Math.round(oDateMap[sDate].amount),
                    count:     iCnt,
                    currency:  sCurr,
                    ratio:     fRatio,
                    ratioText: fRatio + "%",
                    barState:  fRatio >= 80 ? "Error" : fRatio >= 50 ? "Warning" : "Success"
                };
            });
            this.getView().getModel("chart").setProperty("/data", aChartData);

            var oMsgStrip = this.byId("msgStrip");
            if (oMsgStrip) {
                oMsgStrip.setVisible(true);
                oMsgStrip.setType(iTotalCount === 0 ? "Warning" : "Information");
            }
        },

        onRowPress: function (oEvent) {
            var oRow = oEvent.getParameter("row");
            if (!oRow) { return; }
            var oCtx = oRow.getBindingContext("tableData");
            if (!oCtx) { return; }
            var oData  = oCtx.getObject();
            var oModel = this.getOwnerComponent().getModel();
            var sPath  = oModel.createKey("ZCDS_D4_SD_0005", {
                ctno:     oData.ctno,
                bill_ymd: oData.bill_ymd
            });
            this.getOwnerComponent().getRouter().navTo("RouteDetail", { path: encodeURIComponent(sPath) });
        },

        onExport: function () {
            if (!this._aAllData || this._aAllData.length === 0) {
                MessageToast.show("다운로드할 데이터가 없습니다.");
                return;
            }
            var aData = this._aAllData;
            sap.ui.require(["sap/ui/export/Spreadsheet", "sap/ui/export/library"],
                function (Spreadsheet, exportLibrary) {
                    var EdmType  = exportLibrary.EdmType;
                    var aColumns = [
                        { label: "렌탈계약번호",   property: "ctno",      type: EdmType.String },
                        { label: "청구년월일",     property: "bill_ymd",  type: EdmType.Date   },
                        { label: "고객번호",       property: "kunnr",     type: EdmType.String },
                        { label: "판매문서유형",   property: "auart",     type: EdmType.String },
                        { label: "청구번호",       property: "vbeln_iv",  type: EdmType.String },
                        { label: "청구 예정 금액", property: "bill_amt",  type: EdmType.Number },
                        { label: "통화",           property: "waers",     type: EdmType.String },
                        { label: "실제 처리일자",  property: "proc_date", type: EdmType.Date   }
                    ];
                    var oSheet = new Spreadsheet({
                        workbook: { columns: aColumns },
                        dataSource: aData,
                        fileName: "렌탈청구계획_" + getTodayString() + ".xlsx"
                    });
                    oSheet.build()
                        .then(function () { MessageToast.show("다운로드 완료"); })
                        .catch(function () { MessageBox.error("다운로드 중 오류가 발생했습니다."); })
                        .finally(function () { oSheet.destroy(); });
                }
            );
        },

        onCtnoValueHelp: function () { this._openCtnoValueHelp(); },

        _openCtnoValueHelp: function () {
            var oView = this.getView();
            if (!this._oCtnoDialog) {
                this._oCtnoDialog = new SelectDialog({
                    title: "렌탈계약번호 선택",
                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        oEvent.getSource().getBinding("items").filter([
                            new Filter("ctno", FilterOperator.Contains, sValue)
                        ]);
                    },
                    confirm: function (oEvent) {
                        var oItem = oEvent.getParameter("selectedItem");
                        if (oItem) { this.byId("inpCtno").setValue(oItem.getTitle()); }
                    }.bind(this),
                    cancel: function (oEvent) {
                        oEvent.getSource().getBinding("items").filter([]);
                    }
                });
                this._oCtnoDialog.bindAggregation("items", {
                    path: "vh>/ctnoList",
                    template: new StandardListItem({ title: "{vh>ctno}", description: "{vh>text}" })
                });
                oView.addDependent(this._oCtnoDialog);
            }
            this._loadCtnoValueHelpData();
        },

        _loadCtnoValueHelpData: function () {
            var oModel = this.getOwnerComponent().getModel();
            var that   = this;
            oModel.read("/ZCDS_D4_SD_0005", {
                urlParameters: { "$select": "ctno,kunnr", "$orderby": "ctno", "$top": "5000" },
                success: function (oData) {
                    var oMap = {}, aList = [];
                    oData.results.forEach(function (oRow) {
                        if (oRow.ctno && !oMap[oRow.ctno]) {
                            oMap[oRow.ctno] = true;
                            aList.push({ ctno: oRow.ctno, text: oRow.kunnr ? "고객번호: " + oRow.kunnr : "" });
                        }
                    });
                    that.getView().setModel(new JSONModel({ ctnoList: aList }), "vh");
                    that._oCtnoDialog.open();
                },
                error: function () { MessageToast.show("렌탈계약번호 Search Help 조회 실패"); }
            });
        }

    });
});
