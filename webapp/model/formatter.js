sap.ui.define([], function () {
  "use strict";

  return {
    statusFormatter: function (status) {
      // switch (status) {
      //   case "OPEN":
      //     return sap.ui.core.ValueState.Warning;
      //   case "CLOS":
      //     return sap.ui.core.ValueState.Error;
      //   default:
      //     return sap.ui.core.ValueState.Information;
      // }
      switch (status) {
        case "Open":
          return sap.ui.core.ValueState.Warning;
        case "Closed":
          return sap.ui.core.ValueState.Error;
        default:
          return sap.ui.core.ValueState.Information;
      }
    },
    statusTextFormatter: function (status) {
      switch (status) {
        case "OPEN":
          return "Open";
        case "CLOS":
          return "Closed";
        case "ONGO":
          return "Ongoing";
        default:
          return status;
      }
    },
    dateFormat: function (oDate) {
      let date = new Date(oDate);

      let oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
        pattern: "yyyy-MM-dd",
      });

      return oDateFormat.format(date);
    },

    formatTime: function (time = false) {
      if (time?.ms) {
        return dayjs.utc(time.ms).format("HH:mm:ss");
      } else if (!time) {
        return dayjs(new Date()).format("HH:mm:ss");
      } else {
        return "00:00:00";
      }
    },

    formatLegId: function (legid) {
      return Number(legid) || legid;
    },
    numberFormat: function (cost) {
      let oFormatOptions = {
        groupingSeparator: ",",
        decimalSeparator: ".",
        decimals: 2,
      };

      let oFloatFormat =
        sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions);

      return oFloatFormat.format(Number(cost));
    },

    formatItemBidTrueFalse: function (bool) {
      return !!bool;
    },
  };
});
