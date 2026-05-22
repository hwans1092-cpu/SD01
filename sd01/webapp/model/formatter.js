sap.ui.define([], function () {
    "use strict";

    function pad2(v) {
        return String(v).padStart(2, "0");
    }

    function formatDateObject(oDate) {
        if (!oDate || isNaN(oDate.getTime())) {
            return "";
        }
        return String(oDate.getFullYear()) + "-" + pad2(oDate.getMonth() + 1) + "-" + pad2(oDate.getDate());
    }

    return {

        formatDate: function (vDate) {
            if (!vDate) { return ""; }

            if (vDate instanceof Date) {
                var oDate = new Date(vDate);
                // SAP DATS가 OData Date로 넘어올 때 timezone 보정
                oDate.setDate(oDate.getDate() + 1);
                return formatDateObject(oDate);
            }

            if (typeof vDate === "string") {
                if (vDate.indexOf("/Date(") === 0) {
                    var iTime = parseInt(vDate.replace("/Date(", "").replace(")/", ""), 10);
                    var oD = new Date(iTime);
                    oD.setDate(oD.getDate() + 1);
                    return formatDateObject(oD);
                }
                if (/^\d{8}$/.test(vDate)) {
                    return vDate.substring(0, 4) + "-" + vDate.substring(4, 6) + "-" + vDate.substring(6, 8);
                }
                if (/^\d{4}-\d{2}-\d{2}/.test(vDate)) {
                    return vDate.substring(0, 10);
                }
            }

            var oFallback = new Date(vDate);
            if (isNaN(oFallback.getTime())) { return ""; }
            oFallback.setDate(oFallback.getDate() + 1);
            return formatDateObject(oFallback);
        },

        // 청구번호 유무에 따른 행 하이라이트 색상
        formatRowHighlight: function (sVbelnIv) {
            return sVbelnIv && sVbelnIv.trim() ? "Success" : "Warning";
        },

        // 청구번호 열 ObjectStatus state
        formatBillState: function (sVbelnIv) {
            return sVbelnIv && sVbelnIv.trim() ? "Success" : "Warning";
        },

        // 청구번호 열 ObjectStatus icon
        formatBillIcon: function (sVbelnIv) {
            return sVbelnIv && sVbelnIv.trim() ? "sap-icon://accept" : "sap-icon://pending";
        },

        // 청구번호 열 ObjectStatus text
        formatBillText: function (sVbelnIv) {
            return sVbelnIv && sVbelnIv.trim() ? sVbelnIv : "미발행";
        },

        // 미발행 타일 valueColor (건수 > 0 이면 Critical)
        formatPendingColor: function (iCount) {
            return iCount > 0 ? "Critical" : "Good";
        },

        // 총 청구 금액 타일 scale (억/만 + 통화)
        formatAmountScale: function (sScale, sCurrency) {
            var s = sScale || "";
            var c = sCurrency || "";
            return s ? s + " " + c : c;
        },

        // 천단위 구분기호 포맷 (소수점 버림)
        formatAmountComma: function (vAmount) {
            if (vAmount === null || vAmount === undefined || vAmount === "") { return ""; }
            var iNum = Math.round(Number(vAmount));
            return isNaN(iNum) ? "" : iNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    };
});
