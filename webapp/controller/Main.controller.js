sap.ui.define(
    [
      "sap/ui/core/mvc/Controller",
      "sap/ui/model/json/JSONModel",
      "com/nauti/controllerportal/model/formatter",
      "sap/ui/model/Filter",
      "sap/ui/model/FilterOperator",
    ],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, formatter, Filter, FilterOperator) {
      "use strict";
      const statusEnum = {
        OPEN: "Open",
        ONGOING: "Ongoing",
        CLOSED: "Closed",
      };
      return Controller.extend("com.nauti.controllerportal.controller.Main", {
        formatter: formatter,
        onInit: function () {
          this.getOwnerComponent().setModel(new JSONModel({ bidList: [] }), "bidlist");
          const bidTileModel = new JSONModel({
            Open: 0,
            Closed: 0,
            Ongoing: 0,
            All: 0,
          });
          this.getView().setModel(bidTileModel, "bidtilemodel");
          this._refreshTrigger = new sap.ui.core.IntervalTrigger(5000);
          // this._getBidList();
          this._refreshTrigger.addListener(this._getBidList.bind(this));
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.getRoute("RouteMain").attachPatternMatched(this._onObjectMatched, this);
        },
  
        _onObjectMatched: function () {
          this._BusyDialog = new sap.m.BusyDialog({
            title: "Loading...",
          });
          this._BusyDialog.open();
          this._BusyTimeout = setTimeout(() => {
            if (this._BusyDialog) this._BusyDialog.setText("This is taking forever, please wait...");
          }, 5000);
          this.getOwnerComponent().getModel("bidlist").setProperty("/bidList", []);
          this._refreshTrigger.setInterval(5000);
        },
  
        _getBidList: async function () {
          let that = this;
          let bidData = await this._fetchFromService("/BidsSet");
          await bidData.forEach(async (element, index) => {
            //ignore the error
            let current = new Date(`${formatter.dateFormat(new Date())}T${formatter.formatTime()}Z`).getTime();
            // let start = new Date("2022-09-23T10:16:00").getTime();
            let start = new Date(
              `${formatter.dateFormat(element.Chrqsdate)}T${formatter.formatTime(element.Chrqstime)}Z`
            ).getTime();
            // let end = new Date("2022-09-23T20:19:00").getTime();
            let end = new Date(
              `${formatter.dateFormat(element.Chrqedate)}T${formatter.formatTime(element.Chrqetime)}Z`
            ).getTime();
            // if (current < start) {
            //   bidData[index].status = statusEnum.OPEN;
            // } else if (current >= start && current <= end) {
            //   bidData[index].status = statusEnum.ONGOING;
            // } else {
            //   bidData[index].status = statusEnum.CLOSED;
            // }
            if (current < start || current >= end) {
              bidData[index].status = statusEnum.CLOSED;
            } else if (current >= start && current <= end) {
              bidData[index].status = statusEnum.ONGOING;
            } else {
              bidData[index].status = statusEnum.OPEN;
            }
            that.getOwnerComponent().getModel("bidlist").setProperty("/bidList", bidData);
            that._initializeTiles();
          });
          that.getOwnerComponent().getModel("bidlist").setProperty("/bidList", bidData);
          that._initializeTiles();
          if (this._BusyDialog) {
            this._BusyDialog.close();
            clearTimeout(this._BusyTimeout);
          }
        },
        _fetchFromService: function (sPath) {
          let oModel = this.getOwnerComponent().getModel();
          return new Promise(function (resolve, reject) {
            oModel.read(sPath, {
              success: function (oData) {
                resolve(oData.results);
              },
              error: function (oResponse) {
                console.log(oResponse);
              },
            });
          });
        },
  
        _initializeTiles() {
          const oBidListData = this.getOwnerComponent().getModel("bidlist").getData().bidList;
          // this.byId("openBids").setValue(oBidListData[0].filter((el) => el.status === statusEnum.OPEN).length);
          // this.byId("closedBids").setValue(oBidListData[0].filter((el) => el.status === statusEnum.CLOSED).length);
          // this.byId("ongoingBids").setValue(oBidListData[0].filter((el) => el.status === statusEnum.ONGOING).length);
          // this.byId("allBids").setValue(oBidListData[0].length);
          this.getView().getModel("bidtilemodel").getData().Open = oBidListData.filter((el) => el.Stat === "OPEN").length;
          this.getView().getModel("bidtilemodel").getData().Closed = oBidListData.filter(
            (el) => el.Stat === "CLOS"
          ).length;
          this.getView().getModel("bidtilemodel").getData().Ongoing = oBidListData.filter(
            (el) => el.Stat === "ONGO"
          ).length;
          this.getView().getModel("bidtilemodel").getData().All = oBidListData.length;
          this.getView().getModel("bidtilemodel").refresh();
        },
  
        pressOpen() {
          const oTable = this.byId("centerDataTable");
          const oFilter = new Filter("status", FilterOperator.EQ, statusEnum.OPEN);
          oTable.getBinding("items").filter(oFilter);
        },
        pressClosed() {
          const oTable = this.byId("centerDataTable");
          const oFilter = new Filter("status", FilterOperator.EQ, statusEnum.CLOSED);
          oTable.getBinding("items").filter(oFilter);
        },
        pressOngoing: function (oEvent) {
          const oTable = this.byId("centerDataTable");
          const oFilter = new Filter("status", FilterOperator.EQ, statusEnum.ONGOING);
          oTable.getBinding("items").filter(oFilter);
        },
        pressAll() {
          const oTable = this.byId("centerDataTable");
          const oFilter = [];
          oTable.getBinding("items").filter(oFilter);
        },
  
        toBiddingDetail: function (oEvent) {
          const Chrnmin = oEvent.getSource().getBindingContext("bidlist").getProperty("Chrnmin");
          const Mode = oEvent.getSource().getBindingContext("bidlist").getProperty("Zmode");
          // const Voyno = oEvent
          //   .getSource()
          //   .getBindingContext("bidlist")
          //   .getProperty("Voyno");
          this.getOwnerComponent().getModel("nav").setProperty("/navigatedCharterno", Chrnmin);
          this.getOwnerComponent().getModel("nav").setProperty("/navigatedMode", Mode);
          // this.getOwnerComponent()
          //   .getModel("nav")
          //   .setProperty("/navigatedVoyno", Voyno);
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteBidding", {});
          this._refreshTrigger.setInterval(-1);
        },
      });
    }
  );
  